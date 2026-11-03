const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth");
const {
  requirePlaylistOwner,
  requirePlaylistAccess,
} = require("../middleware/ownership");
const {
  getPlaylists,
  getPlaylistById,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSong,
  updateSong,
  deleteSong,
  reorderSongs,
  resolveTrack,
} = require("../controllers/playlistController");

// Track metadata resolution (must be before /:id)
router.get("/resolve/track", verifyToken, resolveTrack);

// Playlist CRUD routes
router.get("/", verifyToken, getPlaylists);
router.post("/", verifyToken, createPlaylist);
router.get("/:id", verifyToken, requirePlaylistAccess, getPlaylistById);
router.put("/:id", verifyToken, requirePlaylistOwner, updatePlaylist);
router.delete("/:id", verifyToken, requirePlaylistOwner, deletePlaylist);

// Granular song operations
router.post("/:id/songs", verifyToken, requirePlaylistOwner, addSong);
router.put("/:id/songs/reorder", verifyToken, requirePlaylistOwner, reorderSongs);
router.put("/:id/songs/:songId", verifyToken, requirePlaylistOwner, updateSong);
router.delete("/:id/songs/:songId", verifyToken, requirePlaylistOwner, deleteSong);

module.exports = router;
