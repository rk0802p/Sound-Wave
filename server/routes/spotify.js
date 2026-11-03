const express = require("express");
const verifyToken = require("../middleware/auth");
const {
  connect,
  callback,
  getStatus,
  getToken,
  disconnect,
} = require("../controllers/spotifyController");

const router = express.Router();

// 1. Connect initiates OAuth dance
router.get("/connect", verifyToken, connect);

// 2. Callback handles Spotify redirect
router.get("/callback", callback);

// 3. Status checks connection & eligibility
router.get("/status", verifyToken, getStatus);

// 4. Token retrieves short-lived access token for Web Playback SDK
router.post("/token", verifyToken, getToken);
router.get("/token", verifyToken, getToken);

// 5. Disconnect revokes local connection
router.post("/disconnect", verifyToken, disconnect);

module.exports = router;
