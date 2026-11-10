const mongoose = require("mongoose");
const { parseMusicSource } = require("../utils/musicLinkParser");

const sourceSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["direct", "youtube", "spotify", "archive", "jamendo", "audius", "deezer", "itunes", "external"],
      default: "direct",
    },
    externalId: {
      type: String,
      default: null,
      trim: true,
    },
    url: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    artist: {
      type: String,
      required: true,
      trim: true,
    },
    album: {
      type: String,
      trim: true,
      default: "",
    },
    duration: {
      type: Number,
      default: 0,
      min: 0,
    },
    position: {
      type: Number,
      min: 0,
    },
    url: {
      type: String,
      trim: true,
      default: "",
    },
    provider: {
      type: String,
      enum: ["direct", "youtube", "spotify", "archive", "jamendo", "audius", "deezer", "itunes", "external"],
      default: "direct",
      trim: true,
    },
    providerTrackId: {
      type: String,
      default: null,
      trim: true,
    },
    isPreview: {
      type: Boolean,
      default: false,
    },
    previewDurationMs: {
      type: Number,
      default: null,
      min: 0,
    },
    source: {
      type: sourceSchema,
      default: () => ({ provider: "direct", externalId: null, url: "" }),
    },
    coverImage: {
      type: String,
      trim: true,
      default: "",
    },
    license: {
      type: String,
      trim: true,
      default: "",
    },
    licenseUrl: {
      type: String,
      trim: true,
      default: "",
    },
    attribution: {
      type: String,
      trim: true,
      default: "",
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// Hydrate source for legacy documents that only have url
songSchema.pre("init", function (doc) {
  if (doc) {
    if (doc.url && (!doc.source || !doc.source.url)) {
      const parsed = parseMusicSource(doc.url);
      doc.source = {
        provider: parsed.provider,
        externalId: parsed.externalId,
        url: doc.url,
      };
    }
    if (!doc.provider) {
      doc.provider = doc.source?.provider || "direct";
    }
    if (doc.providerTrackId === undefined) {
      doc.providerTrackId = doc.source?.externalId || null;
    }
  }
});

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },
    coverImage: {
      type: String,
      trim: true,
      default: "",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    forkedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Playlist",
      default: null,
    },
    forkCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    songs: [songSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
playlistSchema.index({ userId: 1, createdAt: -1 });
playlistSchema.index({ isPublic: 1, createdAt: -1 });
playlistSchema.index({ name: "text", description: "text" });

// Virtuals
playlistSchema.virtual("songCount").get(function () {
  return this.songs ? this.songs.length : 0;
});

playlistSchema.virtual("totalDuration").get(function () {
  if (!this.songs || !this.songs.length) return 0;
  return this.songs.reduce((acc, song) => acc + (song.duration || 0), 0);
});

playlistSchema.virtual("totalDurationMs").get(function () {
  if (!this.songs || !this.songs.length) return 0;
  return this.songs.reduce((acc, song) => acc + ((song.duration || 0) * 1000), 0);
});

// Pre-save hook: ensure deterministic ordering and provider synchronization
playlistSchema.pre("save", function (next) {
  if (this.songs && this.songs.length > 0) {
    this.songs.forEach((song, idx) => {
      if (typeof song.position !== "number" || isNaN(song.position)) {
        song.position = idx;
      }

      // Synchronize url and source
      const effectiveUrl = song.url || song.source?.url || "";
      if (effectiveUrl) {
        if (!song.source || !song.source.url || (!song.source.externalId && (effectiveUrl.includes("youtu") || effectiveUrl.includes("spotify")))) {
          const parsed = parseMusicSource(effectiveUrl);
          song.source = {
            provider: parsed.provider,
            externalId: parsed.externalId,
            url: effectiveUrl,
          };
        }
        if (!song.url) {
          song.url = effectiveUrl;
        }
      }

      // Synchronize provider and providerTrackId
      song.provider = song.source?.provider || song.provider || "direct";
      song.providerTrackId = song.source?.externalId || song.providerTrackId || null;
      if (song.source && song.providerTrackId && !song.source.externalId) {
        song.source.externalId = song.providerTrackId;
      }
      if (song.source && song.provider) {
        song.source.provider = song.provider;
      }

      if ((song.provider === "deezer" || song.provider === "itunes") && !song.isPreview) {
        song.isPreview = true;
        if (!song.previewDurationMs) {
          song.previewDurationMs = 30000;
        }
      }
    });
  }
  next();
});

module.exports = mongoose.model("Playlist", playlistSchema);
