const jwt = require("jsonwebtoken");

// Generate JWT token
const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
      username: user.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Verify JWT middleware
const verifyToken = (req, res, next) => {
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
    // Older handlers read this header; never trust a client-supplied identity.
    req.headers.id = decoded.id;
    req.user = decoded; // attach user to request
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = { createToken, verifyToken };
