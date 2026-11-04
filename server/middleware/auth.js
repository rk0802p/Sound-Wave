const jwt = require("jsonwebtoken");

const getJwtSecret = () => {
  if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET environment variable is missing in production.");
  }
  return process.env.JWT_SECRET || "soundwave_dev_jwt_secret_key_2026_secure";
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided", code: "NO_TOKEN" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ message: "Invalid or malformed token", code: "INVALID_TOKEN" });
  }
};

module.exports = verifyToken;
