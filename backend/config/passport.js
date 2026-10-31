const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:1001/api/v1/user/auth/google/callback",
  }, async (_accessToken, _refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id }).select("+sessionVersion");
      if (!user) {
        const email = profile.emails?.[0]?.value;
        if (!email || await User.exists({ email })) {
          return done(null, false);
        }
        user = await User.create({
          username: `google_${profile.id}`, email, googleId: profile.id,
          authProvider: "google", role: "user",
        });
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  }));
}

module.exports = passport;
