import User from "../models/user.js";
import { createToken } from "../utils/jwt.js";

// Google OAuth callback logic
export const googleCallback = async (req, res) => {
  try {
    const { email, name } = req.user;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name,
        role: "user", // Force user role
        authProvider: "google",
      });
    }

    // Block admins from OAuth login
    if (user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Admins cannot login via Google" });
    }

    const token = createToken(user);

    // Redirect back to frontend
    res.redirect(
      `http://localhost:5173/profile?token=${token}&id=${user._id}&role=${user.role}`
    );
  } catch (err) {
    res.status(500).json({ message: "Google auth failed" });
  }
};
