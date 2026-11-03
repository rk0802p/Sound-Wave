const Playlist = require("../models/Playlist");
const { isValidObjectId } = require("../utils/validation");

/**
 * Middleware to check playlist ownership for modification (PUT, DELETE, adding songs, etc.)
 */
const requirePlaylistOwner = async (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid playlist ID format" });
  }

  try {
    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    if (playlist.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to modify this playlist" });
    }

    req.playlist = playlist;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware to check playlist access for reading (GET)
 * Allows access if user is owner OR if playlist is public
 */
const requirePlaylistAccess = async (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid playlist ID format" });
  }

  try {
    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    const isOwner = req.user && playlist.userId.toString() === req.user.id;
    if (!isOwner && !playlist.isPublic) {
      return res.status(403).json({ message: "Not authorized to view this private playlist" });
    }

    req.playlist = playlist;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requirePlaylistOwner,
  requirePlaylistAccess,
};
