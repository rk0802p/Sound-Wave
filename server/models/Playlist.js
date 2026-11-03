const mongoose = require("mongoose");

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
    coverImage: {
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

// Pre-save hook: ensure deterministic ordering
playlistSchema.pre("save", function (next) {
  if (this.songs && this.songs.length > 0) {
    this.songs.forEach((song, idx) => {
      if (typeof song.position !== "number" || isNaN(song.position)) {
        song.position = idx;
      }
    });
  }
  next();
});

module.exports = mongoose.model("Playlist", playlistSchema);
