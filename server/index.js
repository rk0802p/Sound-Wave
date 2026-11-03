const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const protectedRoutes = require("./routes/protected");
const playlistRoutes = require("./routes/playlist");

const app = express();

// Dynamic CORS configuration
const defaultAllowedOrigins = [
  "https://music-playlist-pp8l.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

const configuredOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : defaultAllowedOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Check configured origins, Vercel deployments, or non-production localhost
      const isAllowed =
        configuredOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        (process.env.NODE_ENV !== "production" && origin.includes("localhost"));

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy does not allow access from this origin."));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Database connection helper
let isConnected = false;
const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) return;

  if (!process.env.MONGO_URI) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("⚠️  MONGO_URI not configured in environment variables.");
    }
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log("✅ MongoDB Connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
};

// Connect DB middleware for serverless invocations
app.use(async (req, res, next) => {
  if (process.env.NODE_ENV !== "test" && process.env.MONGO_URI) {
    try {
      await connectDB();
    } catch (err) {
      return res.status(500).json({ error: "Database connection failed" });
    }
  }
  next();
});

// Health check endpoint
app.get("/api/test", (req, res) => {
  res.json({
    status: "ok",
    message: "Music Playlist API is operational",
    timestamp: new Date().toISOString(),
  });
});

// Mounted routes
app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/playlists", playlistRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.path,
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ error: "CORS Error", message: err.message });
  }

  const statusCode = err.status || err.statusCode || 500;
  console.error("Server error:", err);

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
});

// Standalone server startup (if executed directly e.g. 'node index.js')
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "test" && require.main === module) {
  connectDB()
    .catch((err) => console.warn("Starting server without active DB connection:", err.message))
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Music Playlist Server running on http://localhost:${PORT}`);
      });
    });
}

module.exports = app;
module.exports.connectDB = connectDB;
