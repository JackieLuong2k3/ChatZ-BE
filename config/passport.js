const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth 2.0 Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 
        `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id: googleId, emails, displayName: name, photos } = profile;
        const email = emails && emails[0] ? emails[0].value : null;
        const picture = photos && photos[0] ? photos[0].value : null;

        if (!email) {
          return done(new Error('Email not provided by Google'), null);
        }

        // Find or create user
        let user = await User.findOne({
          $or: [{ googleId }, { email }]
        });

        if (user) {
          // Update user if they logged in with email before
          if (!user.googleId) {
            user.googleId = googleId;
            if (picture && !user.avatar) user.avatar = picture;
            if (name && !user.username) user.username = name;
            await user.save();
          }
        } else {
          // Create new user
          user = await User.create({
            googleId,
            email,
            username: name || email.split('@')[0],
            avatar: picture,
            lastActiveAt: new Date()
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;

