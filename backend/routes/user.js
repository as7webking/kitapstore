const express = require("express");
const router = express.Router();
const passport = require("passport");
const { googleCallback } = require("../controllers/authController");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { createToken } = require("../utils/jwt");
const { registration, escapeRegex } = require("../utils/accountValidation");
const { createAuthLimiter } = require("../middleware/authRateLimit");
const signupLimit = createAuthLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });
const signinLimit = createAuthLimiter({ limit: 15, windowMs: 15 * 60 * 1000 });
const crypto = require("crypto");
const { authentificateToken } = require("./userAuth");
const sendEmail = require("../utils/mailer");

const requireOAuthProvider = (provider) => (req, res, next) => {
  if (!passport._strategy(provider)) {
    return res.status(503).json({ message: `${provider} login is not configured` });
  }
  next();
};

// --- SIGN UP ---
router.post("/sign-up", signupLimit, async (req, res) => {
  const { errors, values } = registration(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ message: "Check the highlighted fields.", errors });
  const { username, email, password, address } = values;
  try {
    // Match legacy mixed-case addresses without rewriting existing accounts.
    const existingUser = await User.findOne({ $or: [{ username }, { email: { $regex: `^${escapeRegex(email)}$`, $options: "i" } }] });
    if (existingUser) {
      const duplicates = {};
      if (existingUser.username === username) duplicates.username = "This username is already registered.";
      if (existingUser.email.toLowerCase() === email) duplicates.email = "This email is already registered.";
      return res.status(409).json({ message: "Username or email is already registered.", errors: duplicates });
    }
    await User.create({ username, email, address, password: await bcrypt.hash(password, 12), role: "user", authProvider: "local" });
    // Notifications are best-effort and do not delay account creation.
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      sendEmail(email, "Welcome to KitapStore", `Hi ${username}, your account was created!`)
        .catch(() => console.warn("Registration notification could not be sent"));
    }
    return res.status(201).json({ message: "Account created. You can now log in." });
  } catch (error) {
    if (error.code === 11000) {
      const keys = Object.keys(error.keyPattern || error.keyValue || {}).filter((key) => ["username", "email"].includes(key));
      const duplicates = Object.fromEntries((keys.length ? keys : ["username", "email"]).map((key) => [key, "This username or email is already registered."]));
      return res.status(409).json({ message: "Username or email is already registered.", errors: duplicates });
    }
    return res.status(500).json({ message: "Could not create your account. Please try again." });
  }
});

// --- SIGN IN ---
router.post("/sign-in", signinLimit, async (req, res) => {
  const { username, password } = req.body || {};
  const errors = {};
  if (typeof username !== "string" || !username.trim() || username.length > 254) errors.username = "Enter your username or email.";
  if (typeof password !== "string" || !password || password.length > 1024) errors.password = "Enter your password.";
  if (Object.keys(errors).length) return res.status(400).json({ message: "Check the highlighted fields.", errors });
  try {
    const identifier = username.trim();
    const query = identifier.includes("@") ? { email: { $regex: `^${escapeRegex(identifier.toLowerCase())}$`, $options: "i" } } : { username: identifier };
    const user = await User.findOne(query).select("+sessionVersion");
    // Compare a real bcrypt hash for absent accounts too, avoiding a fast failure path.
    const fallbackHash = "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
    const matches = await bcrypt.compare(password, user?.password || fallbackHash);
    if (!user?.password || !matches) return res.status(401).json({ message: "Incorrect username/email or password." });
    const token = createToken(user);
    return res.json({ id: user._id, role: user.role, token });
  } catch {
    return res.status(503).json({ message: "Login is unavailable. Please try again." });
  }
});

router.post("/sign-out", authentificateToken, async (req, res) => {
  try {
    await User.updateOne({ _id: req.user.id }, { $inc: { sessionVersion: 1 } });
    return res.json({ message: "Signed out on all devices." });
  } catch {
    return res.status(503).json({ message: "Could not end your session. Please try again." });
  }
});

// --- GOOGLE AUTH ---
router.get(
  "/auth/google",
  requireOAuthProvider("google"),
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  requireOAuthProvider("google"),
  passport.authenticate("google", { session: false }),
  googleCallback
);

// --- FACEBOOK AUTH ---
router.get(
  "/auth/facebook",
  requireOAuthProvider("facebook"),
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/auth/facebook/callback",
  requireOAuthProvider("facebook"),
  passport.authenticate("facebook", { session: false }),
  (req, res) => {
    const token = createToken(req.user);

    res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/profile?token=${token}&id=${req.user._id}&role=${req.user.role}`
    );
  }
);


// --- GET USER INFO ---
router.get("/get-user-information", authentificateToken, (req, res) => {
  const { _id, username, email, address, avatar, role } = req.authUser;
  return res.json({ _id, username, email, address, avatar, role });
});

// --- FORGOT PASSWORD (Generate Token) ---
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email not found" });

    // Generate a secure random reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Save token and expiration (valid for 1 hour) to the database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    // Link for the Frontend
    const resetUrl = `/reset-password/${resetToken}`;
    await sendEmail(
      email,
      "Password Reset Request",
      `Click the link to reset your password: ${resetUrl}`
    );

    res.status(200).json({ message: "Reset link sent to your email" });
  } catch (error) {
    res.status(500).json({ message: "Error in forgot-password" });
  }
});

// --- RESET PASSWORD (Update Password with Token) ---
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;
    // Find user with valid token and check if token hasn't expired
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res
        .status(400)
        .json({ message: "Token is invalid or has expired" });

    // Hash new password and clear reset fields
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error in reset-password" });
  }
});

// --- DELETE ACCOUNT ---
router.delete("/delete-account", authentificateToken, async (req, res) => {
  try {
    const { id } = req.headers;
    const user = await User.findByIdAndDelete(id);

    if (user) {
      await sendEmail(
        user.email,
        "Account Deleted",
        "Your account and data have been removed from BookStore."
      );
      return res.status(200).json({ message: "Account deleted successfully" });
    }
    return res.status(404).json({ message: "User not found" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
