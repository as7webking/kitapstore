const express = require("express");
const router = express.Router();
const passport = require("passport");
const { googleCallback } = require("../controllers/authController");
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const { createToken } = require("../utils/jwt");
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
router.post("/sign-up", async (req, res) => {
  try {
    const { username, email, password, address } = req.body;

    // Validation: Username length
    if (typeof username !== "string" || username.length < 4) {
      return res
        .status(400)
        .json({ message: "Username should be > 3 characters" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username or Email already exists" });
    }

    // Password validation and hashing
    if (typeof password !== "string" || password.length < 7) {
      return res
        .status(400)
        .json({ message: "Password should be > 6 characters" });
    }
    const hashPass = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashPass, address });
    await newUser.save();

    // Notification failures must not turn a saved registration into an error.
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await sendEmail(email, "Welcome to KitapStore", `Hi ${username}, your account was created!`);
        if (process.env.EMAIL_TO) {
          await sendEmail(process.env.EMAIL_TO, "New User Registered", `New user: ${username}`);
        }
      } catch {
        console.warn("Registration notification could not be sent");
      }
    }

    return res.status(200).json({ message: "SignUp Successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- SIGN IN ---
router.post("/sign-in", async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({ username });
    if (!existingUser) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (isMatch) {
      const token = createToken(existingUser);

      return res.status(200).json({
        id: existingUser._id,
        role: existingUser.role,
        token: token,
      });
    } else {
      return res.status(400).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
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
router.get("/get-user-information", authentificateToken, async (req, res) => {
  try {
    const { id } = req.headers;
    const data = await User.findById(id).select("-password"); // Find user, exclude password field
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
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
