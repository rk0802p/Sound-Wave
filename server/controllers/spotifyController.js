const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
];

const getJwtSecret = () => {
  if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET environment variable is missing in production.");
  }
  return process.env.JWT_SECRET || "soundwave_dev_jwt_secret_key_2026_secure";
};

/**
 * Generate cryptographically signed, expiring state token tying the OAuth
 * dance to the authenticated SOUNDWAVE user
 */
const generateOAuthState = (userId) => {
  return jwt.sign(
    {
      userId,
      nonce: crypto.randomBytes(16).toString("hex"),
      purpose: "spotify_oauth",
    },
    getJwtSecret(),
    { expiresIn: "10m" }
  );
};

/**
 * Verify and decode OAuth state token
 */
const verifyOAuthState = (state) => {
  try {
    const decoded = jwt.verify(state, getJwtSecret());
    if (decoded.purpose !== "spotify_oauth" || !decoded.userId) return null;
    return decoded.userId;
  } catch {
    return null;
  }
};

const getRedirectUri = (req) => {
  if (process.env.SPOTIFY_REDIRECT_URI) {
    return process.env.SPOTIFY_REDIRECT_URI.trim();
  }
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:5000";
  return `${protocol}://${host}/api/spotify/callback`;
};

// In-memory mutex map to prevent concurrent token refresh race conditions
const activeRefreshPromises = new Map();

/**
 * GET /api/spotify/connect
 * Initiate Spotify OAuth authorization flow
 */
const connect = async (req, res, next) => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({
        error: "Spotify integration is not configured on the server. Missing SPOTIFY_CLIENT_ID.",
        configured: false,
      });
    }

    const redirectUri = getRedirectUri(req);
    const state = generateOAuthState(req.user.id);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId.trim(),
      scope: SPOTIFY_SCOPES.join(" "),
      redirect_uri: redirectUri,
      state,
      show_dialog: "true",
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

    // Return JSON if requested by API client, or redirect directly if browser navigation
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(200).json({ authUrl, configured: true });
    }

    res.redirect(authUrl);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/spotify/callback
 * Handle redirect from Spotify with authorization code
 */
const callback = async (req, res, next) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${frontendUrl}/?spotify_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/?spotify_error=missing_parameters`);
    }

    const userId = verifyOAuthState(state);
    if (!userId) {
      return res.redirect(`${frontendUrl}/?spotify_error=invalid_or_expired_state`);
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.redirect(`${frontendUrl}/?spotify_error=user_not_found`);
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.redirect(`${frontendUrl}/?spotify_error=server_not_configured`);
    }

    const redirectUri = getRedirectUri(req);

    // 1. Exchange authorization code for tokens
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: String(code),
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString("base64")}`,
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error("Spotify token exchange failed:", tokenResponse.status, errBody);
      return res.redirect(`${frontendUrl}/?spotify_error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // 2. Fetch Spotify user profile to inspect product eligibility (premium vs free)
    let profile = { id: null, display_name: null, email: null, product: "free" };
    try {
      const profileResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      if (profileResponse.ok) {
        profile = await profileResponse.json();
      }
    } catch (profileErr) {
      console.warn("Could not retrieve Spotify profile:", profileErr.message);
    }

    // 3. Persist Spotify account linkage
    user.spotify = {
      connected: true,
      spotifyId: profile.id || null,
      displayName: profile.display_name || profile.id || "Spotify User",
      email: profile.email || null,
      product: profile.product || "free",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
      scope: tokenData.scope || SPOTIFY_SCOPES.join(" "),
    };

    await user.save();

    res.redirect(
      `${frontendUrl}/?spotify_connected=true&product=${encodeURIComponent(user.spotify.product || "free")}`
    );
  } catch (err) {
    console.error("Spotify callback error:", err);
    res.redirect(`${frontendUrl}/?spotify_error=server_error`);
  }
};

/**
 * GET /api/spotify/status
 * Return safe Spotify connection status for authenticated user
 */
const getStatus = async (req, res, next) => {
  try {
    const configured = Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
    const user = await User.findById(req.user.id);

    if (!user || !user.spotify || !user.spotify.connected) {
      return res.status(200).json({
        connected: false,
        configured,
      });
    }

    res.status(200).json({
      connected: true,
      configured,
      spotifyId: user.spotify.spotifyId,
      displayName: user.spotify.displayName,
      product: user.spotify.product,
      isEligible: user.spotify.product === "premium",
      expiresAt: user.spotify.expiresAt,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/spotify/token
 * Return a valid, short-lived access token directly to the official Web Playback SDK
 */
const getToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.spotify || !user.spotify.connected || !user.spotify.refreshToken) {
      return res.status(404).json({
        message: "No connected Spotify account found for this user",
        connected: false,
      });
    }

    const now = Date.now();
    const expiresAt = user.spotify.expiresAt ? new Date(user.spotify.expiresAt).getTime() : 0;
    const hasValidToken = user.spotify.accessToken && expiresAt - now > 60000; // 60s buffer

    if (hasValidToken) {
      return res.status(200).json({
        accessToken: user.spotify.accessToken,
        expiresIn: Math.floor((expiresAt - now) / 1000),
      });
    }

    // Refresh token with race-condition deduplication
    const userId = req.user.id;
    if (activeRefreshPromises.has(userId)) {
      const refreshedToken = await activeRefreshPromises.get(userId);
      return res.status(200).json({
        accessToken: refreshedToken.accessToken,
        expiresIn: refreshedToken.expiresIn,
      });
    }

    const refreshPromise = (async () => {
      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error("Missing server Spotify credentials");
      }

      const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.spotify.refreshToken,
      });

      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString("base64")}`,
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.warn("Spotify refresh token rejected:", response.status, errorData);
        // Authorization revoked
        user.spotify.connected = false;
        await user.save();
        const err = new Error("Spotify authorization expired or revoked");
        err.status = 401;
        throw err;
      }

      const data = await response.json();
      user.spotify.accessToken = data.access_token;
      user.spotify.expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);
      if (data.refresh_token) {
        user.spotify.refreshToken = data.refresh_token;
      }
      await user.save();

      return {
        accessToken: user.spotify.accessToken,
        expiresIn: data.expires_in || 3600,
      };
    })();

    activeRefreshPromises.set(userId, refreshPromise);

    try {
      const result = await refreshPromise;
      res.status(200).json(result);
    } finally {
      activeRefreshPromises.delete(userId);
    }
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({
        message: "Spotify authorization expired or revoked. Please reconnect.",
        connected: false,
      });
    }
    next(err);
  }
};

/**
 * POST /api/spotify/disconnect
 * Disconnect Spotify account and clear stored credentials
 */
const disconnect = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user && user.spotify) {
      user.spotify = {
        connected: false,
        spotifyId: null,
        displayName: null,
        email: null,
        product: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        scope: null,
      };
      await user.save();
    }

    res.status(200).json({
      message: "Spotify account disconnected successfully",
      connected: false,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  connect,
  callback,
  getStatus,
  getToken,
  disconnect,
  generateOAuthState,
  verifyOAuthState,
};
