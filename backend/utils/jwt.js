const jwt = require("jsonwebtoken");
const User = require("../models/user");

// Generate JWT token
const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      version: user.sessionVersion || 0,
      role: user.role,
      email: user.email,
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Verify JWT middleware
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (!decoded.id || typeof decoded.id !== "string") {
      return res.status(401).json({ message: "Please sign in again" });
    }
    if (req.headers.id && req.headers.id !== decoded.id) {
      return res.status(403).json({ message: "User does not match the session" });
    }
    if (!/^[a-f0-9]{24}$/i.test(decoded.id)) return res.status(401).json({ message: "Invalid session" });
    const user = await User.findById(decoded.id).select("+sessionVersion -password");
    if (!user || (decoded.version ?? 0) !== (user.sessionVersion || 0)) {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }
    req.authUser = user;
    decoded.role = user.role;
    // Older handlers read this header; never trust a client-supplied identity.
    req.headers.id = decoded.id;
    req.user = decoded; // attach user to request
    next();
  } catch (err) {
    if (!(err instanceof jwt.JsonWebTokenError)) {
      return res.status(503).json({ message: "Session check unavailable. Please try again." });
    }
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.authUser?.role !== "admin") return res.status(403).json({ message: "Administrator access required" });
  next();
};
module.exports = { createToken, verifyToken, requireAdmin };
