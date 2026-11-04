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
    const raw = req.playlist.toObject ? req.playlist.toObject() : req.playlist;
    if (raw.songs && raw.songs.length > 0) {
      raw.songs.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }

    const creatorName = req.playlist.userId?.username || "Soundwave Curator";
    const creatorId = req.playlist.userId?._id || req.playlist.userId;

    const responseData = {
      ...raw,
      userId: creatorId,
      creator: {
        _id: creatorId,
        username: creatorName,
      },
      isOwner: Boolean(req.isOwner),
    };

    res.status(200).json(responseData);
  } catch (err) {
    next(err);
  }
};

// GET /api/playlists/public/explore
const getPublicExplorePlaylists = async (req, res, next) => {
  try {
    const { search, genre, provider, sort, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const query = { isPublic: true };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { "songs.title": searchRegex },
        { "songs.artist": searchRegex },
      ];
    }

    if (genre && genre.trim() && genre.toLowerCase() !== "all") {
      const gRegex = new RegExp(genre.trim(), "i");
      query.$or = query.$or || [];
      query.$or.push({ tags: gRegex }, { "songs.genre": gRegex }, { description: gRegex });
    }

    if (provider && provider.trim() && provider.toLowerCase() !== "all") {
      query["songs.source.provider"] = provider.trim().toLowerCase();
    }

    let sortObj = { createdAt: -1 };
    if (sort === "updated") {
      sortObj = { updatedAt: -1 };
    } else if (sort === "forks") {
      sortObj = { forkCount: -1, createdAt: -1 };
    }

    const [playlists, total] = await Promise.all([
      Playlist.find(query)
        .populate("userId", "username")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Playlist.countDocuments(query),
    ]);

    const sanitizedList = playlists.map((p) => {
      const creatorName = p.userId?.username || "Soundwave Curator";
      const creatorId = p.userId?._id || p.userId;
      return {
        ...p,
        userId: creatorId,
        creator: {
          _id: creatorId,
          username: creatorName,
        },
      };
    });

    res.status(200).json({
      playlists: sanitizedList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/playlists/:id/fork
const forkPlaylist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body || {};

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid playlist ID format" });
    }

    const source = await Playlist.findById(id).lean();
    if (!source) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    const isSourceOwner = String(source.userId) === String(req.user.id);
    if (!source.isPublic && !isSourceOwner) {
      return res.status(403).json({ message: "Cannot fork a private playlist" });
    }

    const clonedSongs = (source.songs || []).map((s, idx) => ({
      title: s.title,
      artist: s.artist,
      album: s.album || "",
      duration: s.duration || 0,
      position: idx,
      url: s.url || "",
      source: s.source
        ? {
            provider: s.source.provider || "direct",
            externalId: s.source.externalId || null,
            url: s.source.url || "",
          }
        : { provider: "direct", externalId: null, url: s.url || "" },
      coverImage: s.coverImage || "",
      license: s.license || "",
      licenseUrl: s.licenseUrl || "",
      attribution: s.attribution || "",
    }));

    const forked = new Playlist({
      name: name && String(name).trim() ? String(name).trim() : "Copy of " + source.name,
      description: source.description
        ? source.description + " (Forked from " + source.name + ")"
        : "Forked from " + source.name,
      coverImage: source.coverImage || "",
      userId: req.user.id,
      isPublic: false,
      forkedFrom: source._id,
      tags: source.tags || [],
      songs: clonedSongs,
    });

    const saved = await forked.save();
    await Playlist.findByIdAndUpdate(source._id, { $inc: { forkCount: 1 } });

    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

// GET /api/playlists/:id/og
const getPlaylistOgMeta = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).send("Invalid playlist ID");
    }

    const playlist = await Playlist.findById(id).populate("userId", "username").lean();
    if (!playlist || !playlist.isPublic) {
      return res.status(404).send("Playlist not found or private");
    }

    const creatorName = playlist.userId?.username || "Soundwave Curator";
    const frontendUrl = process.env.FRONTEND_URL || "https://music-playlist-pp8l.vercel.app";
    const canonicalUrl = frontendUrl + "/playlist/" + playlist._id;
    const cover = playlist.coverImage || frontendUrl + "/favicon.ico";
    const trackCount = playlist.songs ? playlist.songs.length : 0;
    const desc = playlist.description || "Curated mixtape with " + trackCount + " tracks on SOUNDWAVE.";
    const songsListHtml = playlist.songs && playlist.songs.length > 0
      ? "<ul>" + playlist.songs.slice(0, 10).map((s) => "<li>" + s.title + " - " + s.artist + "</li>").join("") + "</ul>"
      : "";

    const html = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>" + playlist.name + " — SOUNDWAVE Mixtape</title>\n  <meta property=\"og:title\" content=\"" + playlist.name + " by " + creatorName + "\" />\n  <meta property=\"og:description\" content=\"" + desc + "\" />\n  <meta property=\"og:type\" content=\"music.playlist\" />\n  <meta property=\"og:url\" content=\"" + canonicalUrl + "\" />\n  <meta property=\"og:image\" content=\"" + cover + "\" />\n  <meta name=\"twitter:card\" content=\"summary_large_image\" />\n  <meta name=\"twitter:title\" content=\"" + playlist.name + " — SOUNDWAVE\" />\n  <meta name=\"twitter:description\" content=\"" + desc + "\" />\n  <meta name=\"twitter:image\" content=\"" + cover + "\" />\n  <link rel=\"canonical\" href=\"" + canonicalUrl + "\" />\n</head>\n<body>\n  <h1>" + playlist.name + "</h1>\n  <p>" + desc + "</p>\n  <p>Curated by " + creatorName + " (" + trackCount + " tracks)</p>\n  " + songsListHtml + "\n  <a href=\"" + canonicalUrl + "\">Open in SOUNDWAVE</a>\n</body>\n</html>";

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
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
    const { title, artist, album, duration, url, source, coverImage, allowDuplicate, license, licenseUrl, attribution } = req.body;

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
      const clientExtId = source && source.externalId ? source.externalId.replace(new RegExp('^' + canonical.provider + ':'), '') : null;
      if (source && clientExtId && canonical.externalId && clientExtId !== canonical.externalId) {
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
        license,
        licenseUrl,
        attribution,
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
    if (typeof req.body.license === "string") song.license = req.body.license.trim();
    if (typeof req.body.licenseUrl === "string") song.licenseUrl = req.body.licenseUrl.trim();
    if (typeof req.body.attribution === "string") song.attribution = req.body.attribution.trim();

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
};