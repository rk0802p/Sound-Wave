const mongoose = require("mongoose");
const { parseMusicSource } = require("./musicLinkParser");

/**
 * Validates if string is a valid MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
};

/**
 * Simple email format validation
 */
const isValidEmail = (email) => {
  if (typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Password validation: at least 6 characters
 */
const isValidPassword = (password) => {
  return typeof password === "string" && password.length >= 6;
};

/**
 * Whitelist and sanitize playlist update inputs
 * Prevents userId, _id, or timestamps manipulation
 */
const sanitizePlaylistInput = (body) => {
  const allowed = {};
  if (!body || typeof body !== "object") return allowed;

  if (typeof body.name === "string") {
    allowed.name = body.name.trim().replace(/\0/g, "");
  }
  if (typeof body.description === "string") {
    allowed.description = body.description.trim().replace(/\0/g, "");
  }
  if (typeof body.coverImage === "string") {
    allowed.coverImage = body.coverImage.trim().replace(/\0/g, "");
  }
  if (typeof body.isPublic === "boolean") {
    allowed.isPublic = body.isPublic;
  }
  // Backwards compatibility: allow updating songs array if provided
  if (Array.isArray(body.songs)) {
    allowed.songs = body.songs.map((s, index) => sanitizeSongInput(s, index)).filter(Boolean);
  }
  return allowed;
};

/**
 * Whitelist and sanitize song inputs
 */
const sanitizeSongInput = (song, fallbackPosition = 0) => {
  if (!song || typeof song !== "object") return null;

  const rawUrl = typeof song.url === "string" ? song.url.trim() : "";
  const rawSourceUrl = song.source && typeof song.source.url === "string" ? song.source.url.trim() : "";
  const effectiveUrl = rawUrl || rawSourceUrl;

  const validProviders = [
    "direct",
    "youtube",
    "spotify",
    "archive",
    "jamendo",
    "audius",
    "deezer",
    "itunes",
    "external",
  ];

  let parsedSource;
  if (song.source && typeof song.source === "object" && song.source.provider) {
    parsedSource = {
      provider: validProviders.includes(song.source.provider)
        ? song.source.provider
        : "direct",
      externalId: typeof song.source.externalId === "string" ? song.source.externalId.trim() : null,
      url: effectiveUrl,
    };
  } else {
    parsedSource = parseMusicSource(effectiveUrl);
  }

  const finalProvider = song.provider && validProviders.includes(song.provider)
    ? song.provider
    : (parsedSource.provider || "direct");
  const finalExternalId = (typeof song.providerTrackId === "string" && song.providerTrackId.trim())
    ? song.providerTrackId.trim()
    : (parsedSource.externalId || null);

  const isPreview = Boolean(song.isPreview || finalProvider === "deezer" || finalProvider === "itunes");
  const previewDurationMs = typeof song.previewDurationMs === "number" && song.previewDurationMs >= 0
    ? song.previewDurationMs
    : (isPreview ? 30000 : null);

  return {
    ...(song._id && isValidObjectId(song._id) ? { _id: song._id } : {}),
    title: typeof song.title === "string" ? song.title.trim().replace(/\0/g, "") : "Untitled Track",
    artist: typeof song.artist === "string" ? song.artist.trim().replace(/\0/g, "") : "Unknown Artist",
    album: typeof song.album === "string" ? song.album.trim().replace(/\0/g, "") : "",
    duration: typeof song.duration === "number" && song.duration >= 0 ? song.duration : 0,
    position: typeof song.position === "number" && song.position >= 0 ? song.position : fallbackPosition,
    url: effectiveUrl,
    provider: finalProvider,
    providerTrackId: finalExternalId,
    isPreview,
    previewDurationMs,
    source: {
      provider: finalProvider,
      externalId: finalExternalId,
      url: effectiveUrl,
    },
    coverImage: typeof song.coverImage === "string" ? song.coverImage.trim().replace(/\0/g, "") : "",
    license: typeof song.license === "string" ? song.license.trim().replace(/\0/g, "") : "",
    licenseUrl: typeof song.licenseUrl === "string" ? song.licenseUrl.trim().replace(/\0/g, "") : "",
    attribution: typeof song.attribution === "string" ? song.attribution.trim().replace(/\0/g, "") : "",
    addedAt: song.addedAt ? new Date(song.addedAt) : new Date(),
  };
};

module.exports = {
  isValidObjectId,
  isValidEmail,
  isValidPassword,
  sanitizePlaylistInput,
  sanitizeSongInput,
};
