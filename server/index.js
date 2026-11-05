const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// Load environment configuration: checks root and server directories for .env.local and .env
const rootDir = path.resolve(__dirname, "..");
const envCandidates = [
  path.join(rootDir, ".env.local"),
  path.join(__dirname, ".env.local"),
  path.join(rootDir, ".env"),
  path.join(__dirname, ".env"),
];

if (process.env.NODE_ENV !== "test") {
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }
  dotenv.config();
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const protectedRoutes = require("./routes/protected");
const playlistRoutes = require("./routes/playlist");
const spotifyRoutes = require("./routes/spotify");
const searchRoutes = require("./routes/search");
const logger = require("./utils/logger");
const registry = require("./providers/ProviderRegistry");

const app = express();

// Dynamic CORS configuration
const defaultAllowedOrigins = [
  "https://music-playlist-pp8l.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

const extraOrigins = [
  process.env.ALLOWED_ORIGINS,
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
]
  .filter(Boolean)
  .flatMap((o) => o.split(","))
  .map((o) => o.trim())
  .filter(Boolean);

const configuredOrigins = Array.from(new Set([...defaultAllowedOrigins, ...extraOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed =
        configuredOrigins.includes(origin) ||
        (/^https:\/\/music-playlist-pp8l.*\.vercel\.app$/.test(origin) && origin.includes("rajs-projects")) ||
        (process.env.NODE_ENV !== "production" && (origin.includes("localhost") || origin.includes("127.0.0.1")));

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
    exposedHeaders: ["x-request-id"],
  })
);

app.use(logger.requestCorrelationMiddleware);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Serverless-optimized MongoDB connection caching
let cachedConnection = global.mongoose;
if (!cachedConnection) {
  cachedConnection = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI environment variable is not defined.");
  }

  if (cachedConnection.conn && mongoose.connection.readyState === 1) {
    return cachedConnection.conn;
  }

  if (!cachedConnection.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    };

    cachedConnection.promise = mongoose.connect(process.env.MONGO_URI, opts).then((m) => {
      console.log("✅ MongoDB Connected successfully");
      return m;
    });
  }

  try {
    cachedConnection.conn = await cachedConnection.promise;
  } catch (error) {
    cachedConnection.promise = null;
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }

  return cachedConnection.conn;
};

// Root landing endpoint
app.get("/", (req, res) => {
  res.json({
    name: "SOUNDWAVE Music Playlist API",
    status: "online",
    database: mongoose.connection.readyState === 1 ? "connected" : "ready",
    endpoints: {
      health: "/api/test",
      auth: "/api/auth",
      playlists: "/api/playlists",
    },
    frontendUrl: process.env.FRONTEND_URL || "https://music-playlist-pp8l.vercel.app",
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint (always responds even if DB is still connecting)
app.get("/api/test", async (req, res) => {
  let dbStatus = "disconnected";
  let dbError = null;

  if (mongoose.connection.readyState === 1) {
    dbStatus = "connected";
  } else if (process.env.MONGO_URI) {
    try {
      await connectDB();
      dbStatus = "connected";
    } catch (err) {
      dbStatus = "error";
      dbError = err.message;
    }
  } else {
    dbStatus = "missing_mongo_uri";
  }

  // Provider health summary
  const providerSummary = { total: 0, available: 0, degraded: 0, circuit_broken: 0, unconfigured: 0 };
  try {
    const provList = registry.getAllStatus();
    providerSummary.total = provList.length;
    for (const p of provList) {
      if (!p.isConfigured || p.status === "unconfigured") {
        providerSummary.unconfigured += 1;
      } else if (p.circuitBreaker?.isOpen) {
        providerSummary.circuit_broken += 1;
      } else if (p.status === "degraded" || p.status === "timeout" || p.status === "rate_limited") {
        providerSummary.degraded += 1;
      } else {
        providerSummary.available += 1;
      }
    }
  } catch (e) {}

  res.json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    message: "Music Playlist API is operational",
    process: {
      uptime: Math.round(process.uptime()),
      pid: process.pid,
      environment: process.env.NODE_ENV || "development",
    },
    database: {
      status: dbStatus,
      readyState: mongoose.connection.readyState,
      readyStateName:
        ["disconnected", "connected", "connecting", "disconnecting"][
          mongoose.connection.readyState
        ] || "unknown",
      error: dbError,
      suggestion: dbError
        ? "Ensure MongoDB Atlas Network Access has 0.0.0.0/0 allowed, and verify MONGO_URI in Vercel settings."
        : null,
    },
    providers: providerSummary,
    configured: {
      hasMongoUri: Boolean(process.env.MONGO_URI),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      frontendUrl: process.env.FRONTEND_URL || null,
      hasJamendoClient: Boolean(process.env.JAMENDO_CLIENT_ID),
      hasSpotifyClient: Boolean(process.env.SPOTIFY_CLIENT_ID),
    },
    timestamp: new Date().toISOString(),
  });
});

// Database connection middleware for protected data endpoints
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api/search")) return next();
  if (process.env.NODE_ENV !== "test") {
    try {
      await connectDB();
    } catch (err) {
      return res.status(500).json({
        error: "Database connection failed",
        message: err.message,
        suggestion:
          "If using MongoDB Atlas, make sure you have added 0.0.0.0/0 to Network Access in Atlas, and redeployed on Vercel after updating environment variables.",
      });
    }
  }
  next();
});

// Mounted routes
app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/spotify", spotifyRoutes);
app.use("/api/search", searchRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ error: "CORS Error", message: err.message });
  }

  const statusCode = err.status || err.statusCode || 500;
  console.error("Server error:", err);

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
});

// Environment fail-fast validation
const validateEnvironment = () => {
  if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET environment variable is missing in production.");
  }
};

// Standalone server startup (if executed directly e.g. 'node index.js')
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "test" && require.main === module) {
  validateEnvironment();
  connectDB()
    .catch((err) => console.warn("Starting server without active DB connection:", err.message))
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Music Playlist Server running on http://localhost:${PORT}`);
      });
    });
}

module.exports = app;
module.exports.connectDB = connectDB;
module.exports.validateEnvironment = validateEnvironment;
