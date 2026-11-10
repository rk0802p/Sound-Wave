const express = require("express");
const router = express.Router();
const { verifyToken, optionalAuth } = require("../middleware/auth");
const {
  requirePlaylistOwner,
  requirePlaylistAccess,
} = require("../middleware/ownership");
const writeRateLimiter = require("../middleware/writeRateLimiter");
const {
  getPlaylists,
  getPlaylistById,
  getPublicExplorePlaylists,
  forkPlaylist,
  duplicatePlaylist,
  getPlaylistOgMeta,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSong,
  addBatchSongs,
  updateSong,
  deleteSong,
  reorderSongs,
  resolveTrack,
} = require("../controllers/playlistController");

// Public explore feed (must be before /:id)
router.get("/public/explore", getPublicExplorePlaylists);

// Track metadata resolution (must be before /:id)
router.get("/resolve/track", verifyToken, resolveTrack);

// Playlist CRUD routes
router.get("/", verifyToken, getPlaylists);
router.post("/", verifyToken, writeRateLimiter(), createPlaylist);

// OpenGraph HTML preview for social crawlers
router.get("/:id/og", getPlaylistOgMeta);

// Fork a public playlist into user's own library
router.post("/:id/fork", verifyToken, writeRateLimiter(), forkPlaylist);

// Duplicate playlist
router.post("/:id/duplicate", verifyToken, requirePlaylistAccess, writeRateLimiter(), duplicatePlaylist);

// Single playlist view: public playlists allow guest access, private playlists require owner
router.get("/:id", optionalAuth, requirePlaylistAccess, getPlaylistById);
router.put("/:id", verifyToken, requirePlaylistOwner, writeRateLimiter(), updatePlaylist);
router.delete("/:id", verifyToken, requirePlaylistOwner, writeRateLimiter(), deletePlaylist);

// Granular and batch song operations
router.post("/:id/songs/batch", verifyToken, requirePlaylistOwner, writeRateLimiter(), addBatchSongs);
router.post("/:id/songs", verifyToken, requirePlaylistOwner, writeRateLimiter(), addSong);
router.put("/:id/songs/reorder", verifyToken, requirePlaylistOwner, writeRateLimiter(), reorderSongs);
router.put("/:id/songs/:songId", verifyToken, requirePlaylistOwner, writeRateLimiter(), updateSong);
router.delete("/:id/songs/:songId", verifyToken, requirePlaylistOwner, writeRateLimiter(), deleteSong);

module.exports = router;
