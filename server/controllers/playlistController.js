const Playlist = require("../models/Playlist");
const {
  isValidObjectId,
  sanitizePlaylistInput,
  sanitizeSongInput,
} = require("../utils/validation");
const { parseMusicSource, resolveTrackMetadata } = require("../utils/musicLinkParser");

// Helper to format summary mode representation of a playlist
const formatPlaylistSummary = (p) => ({
  _id: p._id,
  id: p._id,
  name: p.name,
  description: p.description || "",
  isPublic: Boolean(p.isPublic),
  songCount: p.songs ? p.songs.length : 0,
  totalDurationMs: (p.songs || []).reduce((acc, s) => acc + ((s.duration || 0) * 1000), 0),
  totalDuration: (p.songs || []).reduce((acc, s) => acc + (s.duration || 0), 0),
  coverImage: p.coverImage || "",
  cover: p.coverImage || "",
  forkCount: p.forkCount || 0,
  tags: p.tags || [],
  updatedAt: p.updatedAt,
  createdAt: p.createdAt,
});

// GET /api/playlists
const getPlaylists = async (req, res, next) => {
  try {
    const { search, page, limit, summary } = req.query;
    const isSummary = summary === "true" || summary === "1";
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
        playlists: isSummary ? playlists.map(formatPlaylistSummary) : playlists,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    // Default: return full array preserving existing frontend contract
    const playlists = await Playlist.find(query).sort({ createdAt: -1 });
    res.status(200).json(isSummary ? playlists.map(formatPlaylistSummary) : playlists);
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
      return res.status(400).json({ message: "Invalid playlist ID format", code: "INVALID_ID" });
    }

    const source = await Playlist.findById(id).lean();
    if (!source) {
      return res.status(404).json({ message: "Playlist not found", code: "NOT_FOUND" });
    }

    const isSourceOwner = String(source.userId) === String(req.user.id);
    if (!source.isPublic && !isSourceOwner) {
      return res.status(403).json({ message: "Cannot fork a private playlist", code: "FORBIDDEN" });
    }

    const userPlaylistCount = await Playlist.countDocuments({ userId: req.user.id });
    if (userPlaylistCount >= 100) {
      return res.status(400).json({
        message: "User playlist limit reached (maximum 100 playlists)",
        code: "LIMIT_REACHED",
      });
    }

    const clonedSongs = (source.songs || []).slice(0, 1000).map((s, idx) => ({
      title: s.title,
      artist: s.artist,
      album: s.album || "",
      duration: s.duration || 0,
      position: idx,
      url: s.url || "",
      provider: s.provider || s.source?.provider || "direct",
      providerTrackId: s.providerTrackId || s.source?.externalId || null,
      isPreview: Boolean(s.isPreview),
      previewDurationMs: s.previewDurationMs || null,
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

    const forkedName = name && String(name).trim() ? String(name).trim().slice(0, 80) : ("Copy of " + source.name).slice(0, 80);
    const forked = new Playlist({
      name: forkedName,
      description: source.description
        ? (source.description + " (Forked from " + source.name + ")").slice(0, 300)
        : ("Forked from " + source.name).slice(0, 300),
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

// POST /api/playlists/:id/duplicate
const duplicatePlaylist = async (req, res, next) => {
  try {
    const userPlaylistCount = await Playlist.countDocuments({ userId: req.user.id });
    if (userPlaylistCount >= 100) {
      return res.status(400).json({
        message: "User playlist limit reached (maximum 100 playlists)",
        code: "LIMIT_REACHED",
      });
    }

    const source = req.playlist;
    const requestedName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    let duplicateName = requestedName || `${source.name} (Copy)`;
    if (duplicateName.length > 80) {
      duplicateName = duplicateName.slice(0, 80).trim();
    }

    const requestedDesc = typeof req.body?.description === "string"
      ? req.body.description.trim().slice(0, 300)
      : (source.description || "").slice(0, 300);

    const clonedSongs = (source.songs || []).slice(0, 1000).map((s, idx) => ({
      title: s.title,
      artist: s.artist,
      album: s.album || "",
      duration: s.duration || 0,
      position: idx,
      url: s.url || "",
      provider: s.provider || s.source?.provider || "direct",
      providerTrackId: s.providerTrackId || s.source?.externalId || null,
      isPreview: Boolean(s.isPreview),
      previewDurationMs: s.previewDurationMs || null,
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

    const duplicate = new Playlist({
      name: duplicateName,
      description: requestedDesc,
      coverImage: source.coverImage || "",
      userId: req.user.id,
      isPublic: false,
      forkedFrom: source._id,
      tags: source.tags || [],
      songs: clonedSongs,
    });

    const saved = await duplicate.save();
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
    const { name, description, coverImage, isPublic, songs } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Playlist name is required", code: "VALIDATION_ERROR" });
    }

    const trimmedName = name.trim().replace(/\0/g, "");
    if (trimmedName.length > 80) {
      return res.status(400).json({
        message: "Playlist name cannot exceed 80 characters",
        code: "LIMIT_REACHED",
      });
    }

    const trimmedDescription = typeof description === "string" ? description.trim().replace(/\0/g, "") : "";
    if (trimmedDescription.length > 300) {
      return res.status(400).json({
        message: "Playlist description cannot exceed 300 characters",
        code: "LIMIT_REACHED",
      });
    }

    const userPlaylistCount = await Playlist.countDocuments({ userId: req.user.id });
    if (userPlaylistCount >= 100) {
      return res.status(400).json({
        message: "User playlist limit reached (maximum 100 playlists)",
        code: "LIMIT_REACHED",
      });
    }

    let initialSongs = [];
    if (Array.isArray(songs)) {
      if (songs.length > 1000) {
        return res.status(400).json({
          message: "Playlist cannot contain more than 1,000 songs",
          code: "LIMIT_REACHED",
        });
      }
      initialSongs = songs.map((s, idx) => sanitizeSongInput(s, idx)).filter(Boolean);
    }

    const newPlaylist = new Playlist({
      name: trimmedName,
      description: trimmedDescription,
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
        return res.status(400).json({ message: "Playlist name cannot be empty", code: "VALIDATION_ERROR" });
      }
      if (sanitized.name.length > 80) {
        return res.status(400).json({
          message: "Playlist name cannot exceed 80 characters",
          code: "LIMIT_REACHED",
        });
      }
      playlist.name = sanitized.name;
    }

    if (sanitized.description !== undefined) {
      if (sanitized.description.length > 300) {
        return res.status(400).json({
          message: "Playlist description cannot exceed 300 characters",
          code: "LIMIT_REACHED",
        });
      }
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
      if (sanitized.songs.length > 1000) {
        return res.status(400).json({
          message: "Playlist cannot contain more than 1,000 songs",
          code: "LIMIT_REACHED",
        });
      }
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
      return res.status(400).json({ message: "URL parameter is required", code: "VALIDATION_ERROR" });
    }

    const trimmedUrl = rawUrl.trim();
    const parsed = parseMusicSource(trimmedUrl);

    if (!parsed.isValid) {
      return res.status(400).json({
        message: parsed.error || "Invalid music source URL",
        provider: parsed.provider,
        url: trimmedUrl,
        code: "INVALID_URL",
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
    if (req.playlist.songs.length >= 1000) {
      return res.status(400).json({
        message: "Playlist song limit reached (maximum 1,000 songs)",
        code: "LIMIT_REACHED",
      });
    }

    const {
      title,
      artist,
      album,
      duration,
      url,
      source,
      coverImage,
      allowDuplicate,
      license,
      licenseUrl,
      attribution,
      position,
      provider,
      providerTrackId,
      isPreview,
      previewDurationMs,
    } = req.body || {};

    const rawUrl =
      (typeof url === "string" ? url.trim() : "") ||
      (source && typeof source.url === "string" ? source.url.trim() : "");

    // Validate provider format authoritatively if URL is provided
    let parsedSource = null;
    if (rawUrl) {
      const canonical = parseMusicSource(rawUrl);
      if (!canonical.isValid) {
        return res.status(400).json({
          message: canonical.error || "Invalid music source URL",
          code: "INVALID_URL",
        });
      }
      // If client supplied source, verify it does not contradict the canonical source
      if (source && source.provider && source.provider !== canonical.provider) {
        return res.status(400).json({
          message: `Provider mismatch: URL belongs to '${canonical.provider}' but source.provider was specified as '${source.provider}'`,
          code: "PROVIDER_MISMATCH",
        });
      }
      const clientExtId = source && source.externalId ? source.externalId.replace(new RegExp('^' + canonical.provider + ':'), '') : null;
      if (source && clientExtId && canonical.externalId && clientExtId !== canonical.externalId) {
        return res.status(400).json({
          message: `External ID mismatch for ${canonical.provider} URL: expected '${canonical.externalId}', received '${source.externalId}'`,
          code: "EXTERNAL_ID_MISMATCH",
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
      return res.status(400).json({ message: "Song title is required", code: "VALIDATION_ERROR" });
    }

    if (!trimmedArtist) {
      return res.status(400).json({ message: "Song artist is required", code: "VALIDATION_ERROR" });
    }

    const finalProvider = parsedSource?.provider || provider || "direct";
    const finalExternalId = parsedSource?.externalId || providerTrackId || null;
    const isPreviewFlag = Boolean(isPreview || finalProvider === "deezer" || finalProvider === "itunes");
    const previewMs = typeof previewDurationMs === "number" && previewDurationMs >= 0
      ? previewDurationMs
      : (isPreviewFlag ? 30000 : null);

    // Duplicate detection (by title+artist, or matching provider+externalId, or identical URL)
    const existingIndex = req.playlist.songs.findIndex((s) => {
      const matchTitleArtist =
        s.title.toLowerCase() === trimmedTitle.toLowerCase() &&
        s.artist.toLowerCase() === trimmedArtist.toLowerCase();

      const sExtId = s.providerTrackId || s.source?.externalId;
      const sProvider = s.provider || s.source?.provider || "direct";
      const matchExternalId = Boolean(
        sExtId &&
        finalExternalId &&
        sExtId === finalExternalId &&
        sProvider === finalProvider
      );

      const sUrl = s.url || s.source?.url;
      const matchUrl = Boolean(sUrl && rawUrl && sUrl.toLowerCase() === rawUrl.toLowerCase());

      return matchTitleArtist || matchExternalId || matchUrl;
    });

    if (existingIndex !== -1 && !allowDuplicate) {
      return res.status(409).json({
        message: `"${trimmedTitle}" by ${trimmedArtist} is already in this playlist`,
        isDuplicate: true,
        code: "DUPLICATE_TRACK",
        existingSong: req.playlist.songs[existingIndex],
      });
    }

    let targetPosition = req.playlist.songs.length;
    const parsedPos = typeof position === "number" ? position : (typeof position === "string" && position.trim() !== "" ? Number(position) : NaN);
    const hasPosition = !isNaN(parsedPos) && parsedPos >= 0;
    if (hasPosition) {
      targetPosition = Math.max(0, Math.min(req.playlist.songs.length, Math.floor(parsedPos)));
    }

    const songData = sanitizeSongInput(
      {
        title: trimmedTitle,
        artist: trimmedArtist,
        album,
        duration: typeof duration === "number" ? duration : 0,
        position: targetPosition,
        url: rawUrl,
        provider: finalProvider,
        providerTrackId: finalExternalId,
        isPreview: isPreviewFlag,
        previewDurationMs: previewMs,
        source: parsedSource || source,
        coverImage: finalCoverImage,
        license,
        licenseUrl,
        attribution,
      },
      targetPosition
    );

    if (hasPosition) {
      req.playlist.songs.splice(targetPosition, 0, songData);
      req.playlist.songs.forEach((s, idx) => {
        s.position = idx;
      });
    } else {
      req.playlist.songs.push(songData);
    }

    const updated = await req.playlist.save();
    const addedSong = updated.songs[targetPosition] || updated.songs[updated.songs.length - 1];

    res.status(201).json({
      playlist: updated,
      addedSong,
      message: "Song added successfully",
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/playlists/:id/songs/batch
const addBatchSongs = async (req, res, next) => {
  try {
    const { songs, allowDuplicate } = req.body || {};

    if (!Array.isArray(songs) || songs.length === 0) {
      return res.status(400).json({
        message: "A non-empty 'songs' array is required",
        code: "INVALID_INPUT",
      });
    }

    if (songs.length > 50) {
      return res.status(400).json({
        message: "Batch size cannot exceed 50 songs",
        code: "LIMIT_REACHED",
      });
    }

    if (req.playlist.songs.length >= 1000) {
      return res.status(400).json({
        message: "Playlist song limit reached (maximum 1,000 songs)",
        code: "LIMIT_REACHED",
      });
    }

    const added = [];
    const duplicates = [];
    const failures = [];
    const allowDupGlobal = Boolean(allowDuplicate);

    for (const rawSong of songs) {
      if (!rawSong || typeof rawSong !== "object") {
        failures.push({ song: rawSong, error: "Invalid song object", code: "INVALID_INPUT" });
        continue;
      }

      if (req.playlist.songs.length >= 1000) {
        failures.push({
          song: rawSong,
          error: "Playlist song limit reached (maximum 1,000 songs)",
          code: "LIMIT_REACHED",
        });
        continue;
      }

      let title = typeof rawSong.title === "string" ? rawSong.title.trim() : "";
      let artist = typeof rawSong.artist === "string" ? rawSong.artist.trim() : "";
      const rawUrl = typeof rawSong.url === "string" ? rawSong.url.trim() : (rawSong.source?.url?.trim() || "");

      // Auto-resolve if needed and url present
      if ((!title || !artist) && rawUrl) {
        try {
          const resolved = await resolveTrackMetadata(rawUrl);
          if (resolved) {
            if (!title && resolved.title) title = resolved.title;
            if (!artist && resolved.artist) artist = resolved.artist;
          }
        } catch (_) {}
      }

      if (!title) {
        failures.push({ song: rawSong, error: "Song title is required", code: "VALIDATION_ERROR" });
        continue;
      }

      if (!artist) {
        failures.push({ song: rawSong, error: "Song artist is required", code: "VALIDATION_ERROR" });
        continue;
      }

      let parsedSource = null;
      if (rawUrl) {
        const canonical = parseMusicSource(rawUrl);
        if (!canonical.isValid) {
          failures.push({ song: rawSong, error: canonical.error || "Invalid music source URL", code: "INVALID_URL" });
          continue;
        }
        parsedSource = {
          provider: canonical.provider,
          externalId: canonical.externalId || null,
          url: canonical.url || rawUrl,
        };
      }

      const finalProvider = parsedSource?.provider || rawSong.provider || "direct";
      const finalExternalId = parsedSource?.externalId || rawSong.providerTrackId || null;
      const isPreviewFlag = Boolean(rawSong.isPreview || finalProvider === "deezer" || finalProvider === "itunes");
      const previewMs = typeof rawSong.previewDurationMs === "number" && rawSong.previewDurationMs >= 0
        ? rawSong.previewDurationMs
        : (isPreviewFlag ? 30000 : null);

      const itemAllowDup = allowDupGlobal || Boolean(rawSong.allowDuplicate);

      const dupMatch = req.playlist.songs.find((s) => {
        const matchTitleArtist =
          s.title.toLowerCase() === title.toLowerCase() &&
          s.artist.toLowerCase() === artist.toLowerCase();
        const sExtId = s.providerTrackId || s.source?.externalId;
        const sProvider = s.provider || s.source?.provider || "direct";
        const matchExt = Boolean(
          sExtId &&
          finalExternalId &&
          sExtId === finalExternalId &&
          sProvider === finalProvider
        );
        const sUrl = s.url || s.source?.url;
        const matchUrl = Boolean(sUrl && rawUrl && sUrl.toLowerCase() === rawUrl.toLowerCase());
        return matchTitleArtist || matchExt || matchUrl;
      });

      if (dupMatch && !itemAllowDup) {
        duplicates.push({
          song: { title, artist, url: rawUrl, provider: finalProvider },
          reason: `"${title}" by ${artist} is already in this playlist`,
          code: "DUPLICATE_TRACK",
          existingSongId: dupMatch._id,
        });
        continue;
      }

      const nextPos = req.playlist.songs.length;
      const sanitized = sanitizeSongInput(
        {
          ...rawSong,
          title,
          artist,
          position: nextPos,
          url: rawUrl,
          provider: finalProvider,
          providerTrackId: finalExternalId,
          isPreview: isPreviewFlag,
          previewDurationMs: previewMs,
          source: parsedSource || rawSong.source,
        },
        nextPos
      );

      req.playlist.songs.push(sanitized);
      const addedDoc = req.playlist.songs[req.playlist.songs.length - 1];
      added.push(addedDoc);
    }

    if (added.length > 0) {
      await req.playlist.save();
    }

    const statusCode = added.length > 0 ? 201 : 200;
    res.status(statusCode).json({
      message: `Processed ${songs.length} tracks: ${added.length} added, ${duplicates.length} duplicates, ${failures.length} failures`,
      added,
      duplicates,
      failures,
      playlist: req.playlist,
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
      return res.status(400).json({ message: "Invalid song ID format", code: "INVALID_ID" });
    }

    const song = req.playlist.songs.id(songId);
    if (!song) {
      return res.status(404).json({ message: "Song not found in playlist", code: "NOT_FOUND" });
    }

    const { title, artist, album, duration, url, source, coverImage, position, provider, providerTrackId, isPreview, previewDurationMs, allowDuplicate } = req.body || {};

    // Duplicate detection on update (performed before mutating document)
    const targetTitle = typeof title === "string" && title.trim() ? title.trim() : song.title;
    const targetArtist = typeof artist === "string" && artist.trim() ? artist.trim() : song.artist;
    const targetUrl = typeof url === "string" ? url.trim() : (source?.url?.trim() ?? song.url);
    const parsedTargetSource = targetUrl ? parseMusicSource(targetUrl) : null;
    const targetExternalId = parsedTargetSource ? parsedTargetSource.externalId : (providerTrackId || song.providerTrackId);
    const targetProvider = parsedTargetSource ? parsedTargetSource.provider : (provider || song.provider || song.source?.provider || "direct");
    const isIdentityChanged =
      targetTitle.toLowerCase() !== song.title.toLowerCase() ||
      targetArtist.toLowerCase() !== song.artist.toLowerCase() ||
      targetUrl.toLowerCase() !== (song.url || "").toLowerCase();

    if (isIdentityChanged && !allowDuplicate) {
      const duplicateSong = req.playlist.songs.find((s) => {
        if (s._id.toString() === songId) return false;
        const matchTitleArtist =
          s.title.toLowerCase() === targetTitle.toLowerCase() &&
          s.artist.toLowerCase() === targetArtist.toLowerCase();
        const sExtId = s.providerTrackId || s.source?.externalId;
        const sProvider = s.provider || s.source?.provider || "direct";
        const matchExternalId = Boolean(
          sExtId &&
          targetExternalId &&
          sExtId === targetExternalId &&
          sProvider === targetProvider
        );
        const sUrl = s.url || s.source?.url;
        const matchUrl = Boolean(sUrl && targetUrl && sUrl.toLowerCase() === targetUrl.toLowerCase());
        return matchTitleArtist || matchExternalId || matchUrl;
      });

      if (duplicateSong) {
        return res.status(409).json({
          message: `"${targetTitle}" by ${targetArtist} is already in this playlist`,
          isDuplicate: true,
          code: "DUPLICATE_TRACK",
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
    if (typeof isPreview === "boolean") song.isPreview = isPreview;
    if (typeof previewDurationMs === "number" && previewDurationMs >= 0) song.previewDurationMs = previewDurationMs;

    if (typeof url === "string" || (source && typeof source === "object") || provider || providerTrackId) {
      const newUrl = typeof url === "string" ? url.trim() : (source?.url?.trim() ?? song.url);
      if (newUrl) {
        const canonical = parseMusicSource(newUrl);
        if (!canonical.isValid) {
          return res.status(400).json({ message: canonical.error || "Invalid music source URL", code: "INVALID_URL" });
        }
        if (source && source.provider && source.provider !== canonical.provider) {
          return res.status(400).json({
            message: `Provider mismatch: URL belongs to '${canonical.provider}' but source.provider was specified as '${source.provider}'`,
            code: "PROVIDER_MISMATCH",
          });
        }
        if (source && source.externalId && canonical.externalId && source.externalId !== canonical.externalId) {
          return res.status(400).json({
            message: `External ID mismatch for ${canonical.provider} URL: expected '${canonical.externalId}', received '${source.externalId}'`,
            code: "EXTERNAL_ID_MISMATCH",
          });
        }
        song.url = newUrl;
        song.provider = canonical.provider;
        song.providerTrackId = canonical.externalId || null;
        song.source = {
          provider: canonical.provider,
          externalId: canonical.externalId || null,
          url: newUrl,
        };
      } else {
        song.url = "";
        song.provider = provider || "direct";
        song.providerTrackId = providerTrackId || null;
        song.source = {
          provider: provider || "direct",
          externalId: providerTrackId || null,
          url: "",
        };
      }
    }

    const updated = await req.playlist.save();
    const updatedObj = updated.toObject ? updated.toObject() : updated;
    res.status(200).json({
      ...updatedObj,
      playlist: updatedObj,
      updatedSong: song,
      message: "Song updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/playlists/:id/songs/:songId
const deleteSong = async (req, res, next) => {
  try {
    const { songId } = req.params;

    if (!isValidObjectId(songId)) {
      return res.status(400).json({ message: "Invalid song ID format", code: "INVALID_ID" });
    }

    const song = req.playlist.songs.id(songId);
    if (!song) {
      return res.status(404).json({ message: "Song not found in playlist", code: "NOT_FOUND" });
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
      deletedSong: song,
      removedSong: song,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/playlists/:id/songs/reorder
const reorderSongs = async (req, res, next) => {
  try {
    const { songIds } = req.body || {};

    if (!Array.isArray(songIds)) {
      return res.status(400).json({ message: "songIds array is required", code: "INVALID_INPUT" });
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
        return res.status(400).json({ message: "Duplicate song ID in reorder request", code: "INVALID_INPUT" });
      }
      seenIds.add(idStr);

      if (!songMap.has(idStr)) {
        return res.status(400).json({ message: `Song ID '${idStr}' does not belong to this playlist`, code: "NOT_FOUND" });
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
};