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

const extraOrigins = [
  process.env.ALLOWED_ORIGINS,
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
]
  .filter(Boolean)
  .flatMap((o) => o.split(","))
  .map((o) => o.trim())
  .filter(Boolean);

const configuredOrigins = Array.from(new Set([...defaultAllowedOrigins, ...extraOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed =
        configuredOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        (process.env.NODE_ENV !== "production" && origin.includes("localhost"));

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Serverless-optimized MongoDB connection caching
let cachedConnection = global.mongoose;
if (!cachedConnection) {
  cachedConnection = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI environment variable is not defined.");
  }

  if (cachedConnection.conn && mongoose.connection.readyState === 1) {
    return cachedConnection.conn;
  }

  if (!cachedConnection.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    };

    cachedConnection.promise = mongoose.connect(process.env.MONGO_URI, opts).then((m) => {
      console.log("✅ MongoDB Connected successfully");
      return m;
    });
  }

  try {
    cachedConnection.conn = await cachedConnection.promise;
  } catch (error) {
    cachedConnection.promise = null;
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }

  return cachedConnection.conn;
};

// Health check endpoint (always responds even if DB is still connecting)
app.get("/api/test", async (req, res) => {
  let dbStatus = "disconnected";
  let dbError = null;

  if (process.env.MONGO_URI) {
    try {
      await connectDB();
      dbStatus = "connected";
    } catch (err) {
      dbStatus = "error";
      dbError = err.message;
    }
  } else {
    dbStatus = "missing_mongo_uri";
  }

  res.json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    message: "Music Playlist API is operational",
    database: {
      status: dbStatus,
      error: dbError,
      suggestion: dbError
        ? "Ensure MongoDB Atlas Network Access has 0.0.0.0/0 allowed, and verify MONGO_URI in Vercel settings."
        : null,
    },
    configured: {
      hasMongoUri: Boolean(process.env.MONGO_URI),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      frontendUrl: process.env.FRONTEND_URL || null,
    },
    timestamp: new Date().toISOString(),
  });
});

// Database connection middleware for protected data endpoints
app.use(async (req, res, next) => {
  if (process.env.NODE_ENV !== "test") {
    try {
      await connectDB();
    } catch (err) {
      return res.status(500).json({
        error: "Database connection failed",
        message: err.message,
        suggestion:
          "If using MongoDB Atlas, make sure you have added 0.0.0.0/0 to Network Access in Atlas, and redeployed on Vercel after updating environment variables.",
      });
    }
  }
  next();
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
