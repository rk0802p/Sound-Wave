const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { isValidEmail, isValidPassword } = require("../utils/validation");

const getJwtSecret = () => process.env.JWT_SECRET || "music_playlist_secret_key_2026";
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || "7d";

const signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || typeof username !== "string" || username.trim().length < 2) {
      return res.status(400).json({ message: "Username must be at least 2 characters" });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    if (!password || !isValidPassword(password)) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username: username.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const tokenPayload = {
      id: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email,
    };

    const token = jwt.sign(tokenPayload, getJwtSecret(), {
      expiresIn: getJwtExpiresIn(),
    });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (!existingUser) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const tokenPayload = {
      id: existingUser._id.toString(),
      username: existingUser.username,
      email: existingUser.email,
    };

    const token = jwt.sign(tokenPayload, getJwtSecret(), {
      expiresIn: getJwtExpiresIn(),
    });

    res.status(200).json({
      token,
      user: {
        id: existingUser._id,
        email: existingUser.email,
        username: existingUser.username,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, login };
