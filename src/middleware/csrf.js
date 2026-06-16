// CSRF defense for a cookie-authenticated API.
//
// Our auth cookie is sent with `sameSite:'none'` in production (the frontend on
// Cloudflare and the API on Railway are different sites). That convenience means
// the browser WILL attach the cookie to cross-site requests too — which is
// exactly what a CSRF attack relies on: a malicious page silently POSTing to our
// API using the victim's logged-in cookie.
//
// The fix: on every state-changing request (POST/PUT/PATCH/DELETE) require the
// browser-set Origin (or Referer) header to match our own frontend. A browser
// will not let a page forge these headers, and a real cross-site attacker's page
// carries ITS OWN origin — so the check rejects it. Safe (read-only) methods are
// allowed through untouched.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function sameSiteCsrf(allowedOrigin) {
  return function (req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.headers.origin;
    const referer = req.headers.referer;

    // Prefer Origin (sent on all cross-origin browser writes). Fall back to
    // Referer for the rare browser that omits Origin.
    const source = origin || referer || '';
    if (source && source.startsWith(allowedOrigin)) return next();

    return res.status(403).json({ error: 'Request blocked: invalid origin.' });
  };
}

module.exports = { sameSiteCsrf };
