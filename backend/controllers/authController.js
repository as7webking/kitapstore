const { createToken } = require("../utils/jwt");

function googleCallback(req, res) {
  if (req.user.role === "admin") {
    return res.status(403).json({ message: "Admins cannot login via Google" });
  }
  const target = new URL("/profile", process.env.FRONTEND_URL || "http://localhost:5173");
  target.search = new URLSearchParams({
    token: createToken(req.user), id: String(req.user._id), role: req.user.role,
  }).toString();
  res.redirect(target.toString());
}

module.exports = { googleCallback };
