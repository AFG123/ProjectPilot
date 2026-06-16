const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === 'production';

// Single source of truth for the JWT shape, so login and payment stay in sync.
function signAuthToken({ sub, userId, name, email, picture, isPaid }) {
  return jwt.sign(
    { sub, userId, name, email, picture, isPaid },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// The security upgrade: the JWT rides in an httpOnly cookie instead of a JSON
// body the frontend stores in localStorage.
//   httpOnly → JavaScript can't read it, so an XSS bug can't steal the session
//   secure   → only transmitted over HTTPS (production only; localhost is http)
//   sameSite → 'lax' in dev (same-site localhost). In prod the frontend (Vercel)
//              and API (Railway) are different sites, so 'none' + secure is required.
function authCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, { ...authCookieOptions(), maxAge: SEVEN_DAYS_MS });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, authCookieOptions());
}

module.exports = { COOKIE_NAME, signAuthToken, setAuthCookie, clearAuthCookie };
