const { OAuth2Client } = require('google-auth-library');
const pool = require('../db');
const { signAuthToken, setAuthCookie, clearAuthCookie } = require('../utils/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function googleAuth(req, res) {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Google credential required' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub, name, email, picture } = ticket.getPayload();

    // Upsert: create user on first login, update name/picture on repeat logins.
    // is_paid stays unchanged on conflict — only the payment flow flips it.
    const { rows } = await pool.query(
      `INSERT INTO users (google_sub, name, email, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_sub) DO UPDATE
         SET name = EXCLUDED.name, picture = EXCLUDED.picture
       RETURNING id, is_paid`,
      [sub, name, email, picture]
    );

    const { id: userId, is_paid: isPaid } = rows[0];

    // Token goes into an httpOnly cookie — never returned in the body, so the
    // frontend can't (and doesn't need to) touch it.
    const token = signAuthToken({ sub, userId, name, email, picture, isPaid });
    setAuthCookie(res, token);

    return res.json({ user: { name, email, picture, isPaid } });
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

module.exports = { googleAuth, me, logout };
