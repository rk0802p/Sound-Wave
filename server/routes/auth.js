const express = require("express");
const { signup, login } = require("../controllers/authController");
const verifyToken = require("../middleware/auth");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

router.get("/me", verifyToken, (req, res) => {
  res.json({ user: req.user });
});

router.get("/protected", verifyToken, (req, res) => {
  res.json({ message: `Welcome, user ${req.user.id}!`, user: req.user });
});

module.exports = router;
