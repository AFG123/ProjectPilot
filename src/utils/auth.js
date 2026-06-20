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
//   sameSite → 'lax' everywhere. The frontend (projectpilot.devbyaryan.me) and API
//              (api.devbyaryan.me) are subdomains of the SAME site (devbyaryan.me),
//              so cross-subdomain requests are same-site and Lax cookies ride along.
//              (The old 'none' was needed when they were different sites; mobile
//              browsers treat SameSite=None as third-party and DROP it.)
//   domain   → '.devbyaryan.me' in prod makes it a first-party cookie shared across
//              both subdomains, so mobile keeps it. (undefined in dev = localhost.)
function authCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain: isProd ? '.devbyaryan.me' : undefined,
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
