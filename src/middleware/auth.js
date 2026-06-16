const jwt = require('jsonwebtoken');
const { COOKIE_NAME } = require('../utils/auth');

// The JWT now lives in an httpOnly cookie (set at login / payment), so we read
// it from req.cookies instead of the Authorization header. cookie-parser
// (registered in app.js) populates req.cookies.
function getToken(req) {
  return req.cookies?.[COOKIE_NAME];
}

function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Attaches req.user if a valid cookie is present, but never blocks the request.
// Used on routes that are public but save extra data for logged-in users.
function optionalAuth(req, res, next) {
  const token = getToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // invalid token — continue as guest
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
