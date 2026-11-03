const mongoose = require("mongoose");
const { parseMusicSource } = require("../utils/musicLinkParser");

const sourceSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["direct", "youtube", "spotify", "archive", "jamendo", "audius", "external"],
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
  if (doc && doc.url && (!doc.source || !doc.source.url)) {
    const parsed = parseMusicSource(doc.url);
    doc.source = {
      provider: parsed.provider,
      externalId: parsed.externalId,
      url: doc.url,
    };
  }
});

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
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
playlistSchema.index({ name: "text", description: "text" });

// Virtuals
playlistSchema.virtual("songCount").get(function () {
  return this.songs ? this.songs.length : 0;
});

playlistSchema.virtual("totalDuration").get(function () {
  if (!this.songs || !this.songs.length) return 0;
  return this.songs.reduce((acc, song) => acc + (song.duration || 0), 0);
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
    });
  }
  next();
});

module.exports = mongoose.model("Playlist", playlistSchema);
