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
  if (typeof body.name === "string") {
    allowed.name = body.name.trim();
  }
  if (typeof body.description === "string") {
    allowed.description = body.description.trim();
  }
  if (typeof body.coverImage === "string") {
    allowed.coverImage = body.coverImage.trim();
  }
  if (typeof body.isPublic === "boolean") {
    allowed.isPublic = body.isPublic;
  }
  // Backwards compatibility: allow updating songs array if provided
  if (Array.isArray(body.songs)) {
    allowed.songs = body.songs.map((s, index) => sanitizeSongInput(s, index));
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

  let parsedSource;
  if (song.source && typeof song.source === "object" && song.source.provider) {
    parsedSource = {
      provider: ["direct", "youtube", "spotify", "archive", "jamendo", "audius", "external"].includes(song.source.provider)
        ? song.source.provider
        : "direct",
      externalId: typeof song.source.externalId === "string" ? song.source.externalId.trim() : null,
      url: effectiveUrl,
    };
  } else {
    parsedSource = parseMusicSource(effectiveUrl);
  }

  return {
    ...(song._id && isValidObjectId(song._id) ? { _id: song._id } : {}),
    title: typeof song.title === "string" ? song.title.trim() : "Untitled Track",
    artist: typeof song.artist === "string" ? song.artist.trim() : "Unknown Artist",
    album: typeof song.album === "string" ? song.album.trim() : "",
    duration: typeof song.duration === "number" && song.duration >= 0 ? song.duration : 0,
    position: typeof song.position === "number" && song.position >= 0 ? song.position : fallbackPosition,
    url: effectiveUrl,
    source: parsedSource,
    coverImage: typeof song.coverImage === "string" ? song.coverImage.trim() : "",
    license: typeof song.license === "string" ? song.license.trim() : "",
    licenseUrl: typeof song.licenseUrl === "string" ? song.licenseUrl.trim() : "",
    attribution: typeof song.attribution === "string" ? song.attribution.trim() : "",
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
