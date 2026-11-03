const Playlist = require("../models/Playlist");
const {
  isValidObjectId,
  sanitizePlaylistInput,
  sanitizeSongInput,
} = require("../utils/validation");

// GET /api/playlists
const getPlaylists = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const query = { userId: req.user.id };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [{ name: searchRegex }, { description: searchRegex }];
    }

    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const [playlists, total] = await Promise.all([
        Playlist.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        Playlist.countDocuments(query),
      ]);

      return res.status(200).json({
        playlists,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    // Default: return full array preserving existing frontend contract
    const playlists = await Playlist.find(query).sort({ createdAt: -1 });
    res.status(200).json(playlists);
  } catch (err) {
    next(err);
  }
};

// GET /api/playlists/:id
const getPlaylistById = async (req, res, next) => {
  try {
    // req.playlist is populated and verified by ownership/access middleware
    const playlist = req.playlist;
    if (playlist.songs && playlist.songs.length > 0) {
      playlist.songs.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
    res.status(200).json(playlist);
  } catch (err) {
    next(err);
  }
};

// POST /api/playlists
const createPlaylist = async (req, res, next) => {
  try {
    const { name, description, coverImage, isPublic, songs } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Playlist name is required" });
    }

    let initialSongs = [];
    if (Array.isArray(songs)) {
      initialSongs = songs.map((s, idx) => sanitizeSongInput(s, idx)).filter(Boolean);
    }

    const newPlaylist = new Playlist({
      name: name.trim(),
      description: typeof description === "string" ? description.trim() : "",
      coverImage: typeof coverImage === "string" ? coverImage.trim() : "",
      isPublic: Boolean(isPublic),
      userId: req.user.id,
      songs: initialSongs,
    });

    const savedPlaylist = await newPlaylist.save();
    res.status(201).json(savedPlaylist);
  } catch (err) {
    next(err);
  }
};

// PUT /api/playlists/:id
const updatePlaylist = async (req, res, next) => {
  try {
    const playlist = req.playlist;
    const sanitized = sanitizePlaylistInput(req.body);

    if (sanitized.name !== undefined) {
      if (!sanitized.name) {
        return res.status(400).json({ message: "Playlist name cannot be empty" });
      }
      playlist.name = sanitized.name;
    }

    if (sanitized.description !== undefined) {
      playlist.description = sanitized.description;
    }

    if (sanitized.coverImage !== undefined) {
      playlist.coverImage = sanitized.coverImage;
    }

    if (sanitized.isPublic !== undefined) {
      playlist.isPublic = sanitized.isPublic;
    }

    // Backwards-compatibility for existing frontend bulk song update
    if (sanitized.songs !== undefined) {
      playlist.songs = sanitized.songs;
    }

    const updated = await playlist.save();
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/playlists/:id
const deletePlaylist = async (req, res, next) => {
  try {
    await Playlist.findByIdAndDelete(req.playlist._id);
    res.status(200).json({ message: "Playlist deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// POST /api/playlists/:id/songs
const addSong = async (req, res, next) => {
  try {
    const { title, artist, album, duration, url, coverImage, allowDuplicate } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Song title is required" });
    }

    if (!artist || typeof artist !== "string" || !artist.trim()) {
      return res.status(400).json({ message: "Song artist is required" });
    }

    const trimmedTitle = title.trim();
    const trimmedArtist = artist.trim();

    // Duplicate detection (case-insensitive title and artist)
    const existingIndex = req.playlist.songs.findIndex(
      (s) =>
        s.title.toLowerCase() === trimmedTitle.toLowerCase() &&
        s.artist.toLowerCase() === trimmedArtist.toLowerCase()
    );

    if (existingIndex !== -1 && !allowDuplicate) {
      return res.status(409).json({
        message: `"${trimmedTitle}" by ${trimmedArtist} is already in this playlist`,
        isDuplicate: true,
        existingSong: req.playlist.songs[existingIndex],
      });
    }

    const nextPosition = req.playlist.songs.length;
    const songData = sanitizeSongInput(
      {
        title: trimmedTitle,
        artist: trimmedArtist,
        album,
        duration: typeof duration === "number" ? duration : 0,
        position: nextPosition,
        url,
        coverImage,
      },
      nextPosition
    );

    req.playlist.songs.push(songData);
    const updated = await req.playlist.save();
    const addedSong = updated.songs[updated.songs.length - 1];

    res.status(201).json({
      playlist: updated,
      addedSong,
      message: "Song added successfully",
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/playlists/:id/songs/:songId
const updateSong = async (req, res, next) => {
  try {
    const { songId } = req.params;

    if (!isValidObjectId(songId)) {
      return res.status(400).json({ message: "Invalid song ID format" });
    }

    const song = req.playlist.songs.id(songId);
    if (!song) {
      return res.status(404).json({ message: "Song not found in playlist" });
    }

    const { title, artist, album, duration, url, coverImage, position } = req.body;

    if (typeof title === "string" && title.trim()) song.title = title.trim();
    if (typeof artist === "string" && artist.trim()) song.artist = artist.trim();
    if (typeof album === "string") song.album = album.trim();
    if (typeof duration === "number" && duration >= 0) song.duration = duration;
    if (typeof url === "string") song.url = url.trim();
    if (typeof coverImage === "string") song.coverImage = coverImage.trim();
    if (typeof position === "number" && position >= 0) song.position = position;

    const updated = await req.playlist.save();
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/playlists/:id/songs/:songId
const deleteSong = async (req, res, next) => {
  try {
    const { songId } = req.params;

    if (!isValidObjectId(songId)) {
      return res.status(400).json({ message: "Invalid song ID format" });
    }

    const song = req.playlist.songs.id(songId);
    if (!song) {
      return res.status(404).json({ message: "Song not found in playlist" });
    }

    req.playlist.songs.pull({ _id: songId });

    // Normalize positions
    req.playlist.songs.forEach((s, idx) => {
      s.position = idx;
    });

    const updated = await req.playlist.save();
    res.status(200).json({
      message: "Song removed successfully",
      playlist: updated,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/playlists/:id/songs/reorder
const reorderSongs = async (req, res, next) => {
  try {
    const { songIds } = req.body;

    if (!Array.isArray(songIds)) {
      return res.status(400).json({ message: "songIds array is required" });
    }

    // Map existing songs by their ID string
    const songMap = new Map();
    req.playlist.songs.forEach((song) => {
      songMap.set(song._id.toString(), song);
    });

    const reordered = [];
    for (let i = 0; i < songIds.length; i++) {
      const idStr = String(songIds[i]);
      if (songMap.has(idStr)) {
        const song = songMap.get(idStr);
        song.position = i;
        reordered.push(song);
        songMap.delete(idStr);
      }
    }

    // Append any unmentioned songs to the end to prevent accidental data loss
    songMap.forEach((remainingSong) => {
      remainingSong.position = reordered.length;
      reordered.push(remainingSong);
    });

    req.playlist.songs = reordered;
    const updated = await req.playlist.save();

    res.status(200).json({
      message: "Songs reordered successfully",
      playlist: updated,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPlaylists,
  getPlaylistById,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSong,
  updateSong,
  deleteSong,
  reorderSongs,
};
