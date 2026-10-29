const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const pool = require('../db');
const { signAuthToken, setAuthCookie, clearAuthCookie } = require('../utils/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/register — creates a new account using email and password
async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  // Extract username automatically from everything before the '@'
  const username = normalizedEmail.split('@')[0]?.trim();
  if (!username) {
    return res.status(400).json({ error: 'Invalid email address format' });
  }

  try {
    // Check if account already exists
    const existing = await pool.query(
      'SELECT id, google_sub, password_hash FROM users WHERE lower(email) = $1',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      if (!existing.rows[0].password_hash && existing.rows[0].google_sub) {
        return res.status(400).json({
          error: 'This email is already registered via Google. Please sign in with Google.',
        });
      }
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, is_paid`,
      [username, normalizedEmail, passwordHash]
    );

    const { id: userId, is_paid: isPaid } = rows[0];

    // Issue JWT cookie so the user is immediately signed in after registration
    const token = signAuthToken({
      sub: null,
      userId,
      name: username,
      email: normalizedEmail,
      picture: null,
      isPaid: !!isPaid,
    });
    setAuthCookie(res, token);

    return res.status(201).json({
      user: {
        name: username,
        email: normalizedEmail,
        picture: null,
        isPaid: !!isPaid,
      },
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
}

// POST /api/auth/login — authenticates existing users with email and password
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, picture, password_hash, is_paid, google_sub
       FROM users
       WHERE lower(email) = $1`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];

    // Account created with Google only (no local password set)
    if (!user.password_hash) {
      return res.status(400).json({
        error: 'This account was registered using Google. Please click "Continue with Google".',
      });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signAuthToken({
      sub: user.google_sub || null,
      userId: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      isPaid: !!user.is_paid,
    });
    setAuthCookie(res, token);

    return res.json({
      user: {
        name: user.name,
        email: user.email,
        picture: user.picture,
        isPaid: !!user.is_paid,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Failed to sign in. Please try again.' });
  }
}

// POST /api/auth/google — verifies Google ID token and creates or links account
async function googleAuth(req, res) {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Google credential required' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub, name, email, picture } = ticket.getPayload();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Check if account already exists by either google_sub or email
    const { rows: existing } = await pool.query(
      `SELECT id, name, email, picture, is_paid, google_sub, password_hash
       FROM users
       WHERE google_sub = $1 OR lower(email) = $2
       LIMIT 1`,
      [sub, normalizedEmail]
    );

    let userId, isPaid, userName, userPicture;

    if (existing.length > 0) {
      const user = existing[0];
      userId = user.id;
      isPaid = user.is_paid;
      userName = user.name || name;
      userPicture = picture || user.picture;

      // Link Google account to this existing user (updates google_sub and profile picture)
      // Preserves existing password_hash, payment status, and history
      await pool.query(
        `UPDATE users
         SET google_sub = $1,
             picture = COALESCE($2, picture),
             name = COALESCE(name, $3)
         WHERE id = $4`,
        [sub, picture, name, userId]
      );
    } else {
      // First-time sign-up via Google
      const { rows: inserted } = await pool.query(
        `INSERT INTO users (google_sub, name, email, picture)
         VALUES ($1, $2, $3, $4)
         RETURNING id, is_paid`,
        [sub, name, normalizedEmail, picture]
      );
      userId = inserted[0].id;
      isPaid = inserted[0].is_paid;
      userName = name;
      userPicture = picture;
    }

    // Token goes into an httpOnly cookie — never returned in the body, so the
    // frontend can't (and doesn't need to) touch it.
    const token = signAuthToken({
      sub,
      userId,
      name: userName,
      email: normalizedEmail,
      picture: userPicture,
      isPaid: !!isPaid,
    });
    setAuthCookie(res, token);

    return res.json({
      user: {
        name: userName,
        email: normalizedEmail,
        picture: userPicture,
        isPaid: !!isPaid,
      },
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    return res.status(401).json({ error: 'Invalid Google token' });
  }
}

// GET /api/auth/me (requireAuth) — lets the frontend rehydrate the user on page
// load, since it can no longer read the JWT itself. req.user comes from the
// verified cookie.
//
// We re-read is_paid from the DB here (not just trust the cookie) so a webhook
// that unlocked the user AFTER their cookie was issued still takes effect on
// their next visit. If it changed, we re-sign the cookie so the rest of the
// app (deep-dive gate, etc.) sees the fresh value too.
async function me(req, res) {
  const { sub, userId, name, email, picture, isPaid: cookieIsPaid } = req.user;
  try {
    const { rows } = await pool.query('SELECT is_paid FROM users WHERE id = $1', [userId]);
    const isPaid = !!rows[0]?.is_paid;
    if (isPaid !== !!cookieIsPaid) {
      const token = signAuthToken({ sub, userId, name, email, picture, isPaid });
      setAuthCookie(res, token);
    }
    return res.json({ user: { name, email, picture, isPaid } });
  } catch (err) {
    // DB hiccup — fall back to the cookie's value rather than failing the page.
    console.error('me reconcile error:', err.message);
    return res.json({ user: { name, email, picture, isPaid: !!cookieIsPaid } });
  }
}

// POST /api/auth/logout — clears the cookie server-side.
function logout(req, res) {
  clearAuthCookie(res);
  return res.json({ ok: true });
}

module.exports = { register, login, googleAuth, me, logout };
