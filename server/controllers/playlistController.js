const Playlist = require("../models/Playlist");
const {
  isValidObjectId,
  sanitizePlaylistInput,
  sanitizeSongInput,
} = require("../utils/validation");
const { parseMusicSource, resolveTrackMetadata } = require("../utils/musicLinkParser");

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

// GET /api/playlists/resolve/track?url=...
const resolveTrack = async (req, res, next) => {
  try {
    const rawUrl = req.query.url || req.body?.url;
    if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
      return res.status(400).json({ message: "URL parameter is required" });
    }

    const trimmedUrl = rawUrl.trim();
    const parsed = parseMusicSource(trimmedUrl);

    if (!parsed.isValid) {
      return res.status(400).json({
        message: parsed.error || "Invalid music source URL",
        provider: parsed.provider,
        url: trimmedUrl,
      });
    }

    const resolved = await resolveTrackMetadata(trimmedUrl);
    return res.status(200).json(resolved);
  } catch (err) {
    next(err);
  }
};

// POST /api/playlists/:id/songs
const addSong = async (req, res, next) => {
  try {
    const { title, artist, album, duration, url, source, coverImage, allowDuplicate } = req.body;

    const rawUrl =
      (typeof url === "string" ? url.trim() : "") ||
      (source && typeof source.url === "string" ? source.url.trim() : "");

    // Validate provider format authoritatively if URL is provided
    let parsedSource = null;
    if (rawUrl) {
      const canonical = parseMusicSource(rawUrl);
      if (!canonical.isValid) {
        return res.status(400).json({ message: canonical.error || "Invalid music source URL" });
      }
      // If client supplied source, verify it does not contradict the canonical source
      if (source && source.provider && source.provider !== canonical.provider) {
        return res.status(400).json({
          message: `Provider mismatch: URL belongs to '${canonical.provider}' but source.provider was specified as '${source.provider}'`,
        });
      }
      if (source && source.externalId && canonical.externalId && source.externalId !== canonical.externalId) {
        return res.status(400).json({
          message: `External ID mismatch for ${canonical.provider} URL: expected '${canonical.externalId}', received '${source.externalId}'`,
        });
      }
      parsedSource = {
        provider: canonical.provider,
        externalId: canonical.externalId || null,
        url: canonical.url || rawUrl,
      };
    }

    let trimmedTitle = typeof title === "string" ? title.trim() : "";
    let trimmedArtist = typeof artist === "string" ? artist.trim() : "";
    let finalCoverImage = typeof coverImage === "string" ? coverImage.trim() : "";

    // If title or artist is omitted and URL is provided, attempt auto-resolution
    if ((!trimmedTitle || !trimmedArtist) && rawUrl) {
      const resolved = await resolveTrackMetadata(rawUrl);
      if (resolved) {
        if (!trimmedTitle && resolved.title) trimmedTitle = resolved.title;
        if (!trimmedArtist && resolved.artist) trimmedArtist = resolved.artist;
        if (!finalCoverImage && resolved.coverImage) finalCoverImage = resolved.coverImage;
      }
    }

    if (!trimmedTitle) {
      return res.status(400).json({ message: "Song title is required" });
    }

    if (!trimmedArtist) {
      return res.status(400).json({ message: "Song artist is required" });
    }

    // Duplicate detection (by title+artist, or provider externalId, or identical URL)
    const existingIndex = req.playlist.songs.findIndex((s) => {
      const matchTitleArtist =
        s.title.toLowerCase() === trimmedTitle.toLowerCase() &&
        s.artist.toLowerCase() === trimmedArtist.toLowerCase();

      const sExtId = s.source?.externalId;
      const targetExtId = parsedSource?.externalId;
      const matchExternalId = Boolean(sExtId && targetExtId && sExtId === targetExtId);

      const sUrl = s.url || s.source?.url;
      const matchUrl = Boolean(sUrl && rawUrl && sUrl.toLowerCase() === rawUrl.toLowerCase());

      return matchTitleArtist || matchExternalId || matchUrl;
    });

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
        url: rawUrl,
        source: parsedSource,
        coverImage: finalCoverImage,
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

    const { title, artist, album, duration, url, source, coverImage, position } = req.body;

    // Duplicate detection on update (performed before mutating document)
    const targetTitle = typeof title === "string" && title.trim() ? title.trim() : song.title;
    const targetArtist = typeof artist === "string" && artist.trim() ? artist.trim() : song.artist;
    const targetUrl = typeof url === "string" ? url.trim() : (source?.url?.trim() ?? song.url);
    const targetExternalId = targetUrl ? parseMusicSource(targetUrl).externalId : null;
    const isIdentityChanged =
      targetTitle.toLowerCase() !== song.title.toLowerCase() ||
      targetArtist.toLowerCase() !== song.artist.toLowerCase() ||
      targetUrl.toLowerCase() !== (song.url || "").toLowerCase();

    if (isIdentityChanged && !req.body.allowDuplicate) {
      const duplicateSong = req.playlist.songs.find((s) => {
        if (s._id.toString() === songId) return false;
        const matchTitleArtist =
          s.title.toLowerCase() === targetTitle.toLowerCase() &&
          s.artist.toLowerCase() === targetArtist.toLowerCase();
        const sExtId = s.source?.externalId;
        const matchExternalId = Boolean(sExtId && targetExternalId && sExtId === targetExternalId);
        const sUrl = s.url || s.source?.url;
        const matchUrl = Boolean(sUrl && targetUrl && sUrl.toLowerCase() === targetUrl.toLowerCase());
        return matchTitleArtist || matchExternalId || matchUrl;
      });

      if (duplicateSong) {
        return res.status(409).json({
          message: `"${targetTitle}" by ${targetArtist} is already in this playlist`,
          isDuplicate: true,
          existingSong: duplicateSong,
        });
      }
    }

    if (typeof title === "string" && title.trim()) song.title = title.trim();
    if (typeof artist === "string" && artist.trim()) song.artist = artist.trim();
    if (typeof album === "string") song.album = album.trim();
    if (typeof duration === "number" && duration >= 0) song.duration = duration;
    if (typeof coverImage === "string") song.coverImage = coverImage.trim();
    if (typeof position === "number" && position >= 0) song.position = position;

    if (typeof url === "string" || (source && typeof source === "object")) {
      const newUrl = typeof url === "string" ? url.trim() : (source?.url?.trim() ?? song.url);
      if (newUrl) {
        const canonical = parseMusicSource(newUrl);
        if (!canonical.isValid) {
          return res.status(400).json({ message: canonical.error || "Invalid music source URL" });
        }
        if (source && source.provider && source.provider !== canonical.provider) {
          return res.status(400).json({
            message: `Provider mismatch: URL belongs to '${canonical.provider}' but source.provider was specified as '${source.provider}'`,
          });
        }
        if (source && source.externalId && canonical.externalId && source.externalId !== canonical.externalId) {
          return res.status(400).json({
            message: `External ID mismatch for ${canonical.provider} URL: expected '${canonical.externalId}', received '${source.externalId}'`,
          });
        }
        song.url = newUrl;
        song.source = {
          provider: canonical.provider,
          externalId: canonical.externalId || null,
          url: newUrl,
        };
      } else {
        song.url = "";
        song.source = {
          provider: "direct",
          externalId: null,
          url: "",
        };
      }
    }

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

    // Validate no duplicates in songIds and all IDs belong to playlist
    const seenIds = new Set();
    for (const rawId of songIds) {
      const idStr = String(rawId);
      if (seenIds.has(idStr)) {
        return res.status(400).json({ message: "Duplicate song ID in reorder request" });
      }
      seenIds.add(idStr);

      if (!songMap.has(idStr)) {
        return res.status(400).json({ message: `Song ID '${idStr}' does not belong to this playlist` });
      }
    }

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
  resolveTrack,
};
