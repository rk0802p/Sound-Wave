const express = require("express");
const router = express.Router();
const { verifyToken, optionalAuth } = require("../middleware/auth");
const {
  requirePlaylistOwner,
  requirePlaylistAccess,
} = require("../middleware/ownership");
const {
  getPlaylists,
  getPlaylistById,
  getPublicExplorePlaylists,
  forkPlaylist,
  getPlaylistOgMeta,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSong,
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
router.post("/", verifyToken, createPlaylist);

// OpenGraph HTML preview for social crawlers
router.get("/:id/og", getPlaylistOgMeta);

// Fork a public playlist into user's own library
router.post("/:id/fork", verifyToken, forkPlaylist);

// Single playlist view: public playlists allow guest access, private playlists require owner
router.get("/:id", optionalAuth, requirePlaylistAccess, getPlaylistById);
router.put("/:id", verifyToken, requirePlaylistOwner, updatePlaylist);
router.delete("/:id", verifyToken, requirePlaylistOwner, deletePlaylist);

// Granular song operations
router.post("/:id/songs", verifyToken, requirePlaylistOwner, addSong);
router.put("/:id/songs/reorder", verifyToken, requirePlaylistOwner, reorderSongs);
router.put("/:id/songs/:songId", verifyToken, requirePlaylistOwner, updateSong);
router.delete("/:id/songs/:songId", verifyToken, requirePlaylistOwner, deleteSong);

module.exports = router;
