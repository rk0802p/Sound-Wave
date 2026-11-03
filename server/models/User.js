const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    spotify: {
      connected: { type: Boolean, default: false },
      spotifyId: { type: String, default: null, trim: true },
      displayName: { type: String, default: null, trim: true },
      email: { type: String, default: null, trim: true },
      product: { type: String, default: null, trim: true },
      accessToken: { type: String, default: null },
      refreshToken: { type: String, default: null },
      expiresAt: { type: Date, default: null },
      scope: { type: String, default: null },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        if (ret.spotify) {
          delete ret.spotify.accessToken;
          delete ret.spotify.refreshToken;
        }
        return ret;
      },
    },
  }
);

module.exports = mongoose.model("User", userSchema);
