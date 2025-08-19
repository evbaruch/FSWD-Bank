// Google OAuth Authentication

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { getMySQLPool } = require('./mysql');
const jwt = require('jsonwebtoken');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const pool = getMySQLPool();
    const [users] = await pool.execute(
      'SELECT id, email, first_name, last_name, role, status FROM users WHERE id = ?',
      [id]
    );
    
    if (users.length === 0) {
      return done(null, false);
    }
    
    done(null, users[0]);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy (only if environment variables are set)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/auth/google/callback',
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    const pool = getMySQLPool();
    
    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id, email, first_name, last_name, role, status FROM users WHERE google_id = ? OR email = ?',
      [profile.id, profile.emails[0].value]
    );

    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      
      // If user exists but doesn't have google_id, update it
      if (!user.google_id) {
        await pool.execute(
          'UPDATE users SET google_id = ? WHERE id = ?',
          [profile.id, user.id]
        );
      }
      
      return done(null, user);
    }

    // Create new user
    const [result] = await pool.execute(
      `INSERT INTO users (
        google_id, email, first_name, last_name, role, status, 
        profile_picture, created_at
      ) VALUES (?, ?, ?, ?, 'customer', 'active', ?, NOW())`,
      [
        profile.id,
        profile.emails[0].value,
        profile.name.givenName || profile.displayName.split(' ')[0],
        profile.name.familyName || profile.displayName.split(' ').slice(1).join(' ') || 'User',
        profile.photos[0]?.value || null
      ]
    );

    const newUser = {
      id: result.insertId,
      email: profile.emails[0].value,
      first_name: profile.name.givenName || profile.displayName.split(' ')[0],
      last_name: profile.name.familyName || profile.displayName.split(' ').slice(1).join(' ') || 'User',
      role: 'customer',
      status: 'active'
    };

    done(null, newUser);
  } catch (error) {
    console.error('Google OAuth error:', error);
    done(error, null);
  }
  }));
} else {
      console.log('[WARNING] Google OAuth not configured - skipping Google authentication strategy');
}

module.exports = passport; 