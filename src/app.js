require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const generateRouter = require('./routes/generate');
const authRouter = require('./routes/auth');
const deepDiveRouter = require('./routes/deepDive');
const resumeRouter = require('./routes/resume');
const generationsRouter = require('./routes/generations');
const paymentRouter = require('./routes/payment');
const { handleWebhook } = require('./controllers/paymentController');
const { sameSiteCsrf } = require('./middleware/csrf');

const app = express();

// Behind Railway's proxy the real client IP arrives in X-Forwarded-For. Without
// this, express-rate-limit can't tell users apart (and warns/errors). '1' = trust
// exactly one proxy hop (Railway), not arbitrary spoofed headers.
app.set('trust proxy', 1);

// Sensible security headers (HSTS, no-sniff, frameguard, etc.). Allow our JSON
// responses to be read cross-origin since the frontend is on a different origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS must name the exact frontend origin (no wildcard) AND allow credentials,
// otherwise the browser refuses to send/receive the auth cookie.
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({ origin: CLIENT_URL, credentials: true }));

// Razorpay webhook MUST see the raw request bytes to verify its signature, so it
// is mounted BEFORE express.json() (which would consume and discard the raw
// body). It's a server-to-server call from Razorpay — no auth cookie, no CSRF
// check — so it sits ahead of those middlewares too.
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json({ limit: '1mb' })); // JSON payloads are small; caps abuse
app.use(cookieParser());

// CSRF guard for the cookie-authenticated API: reject cross-site writes by
// checking the browser-set Origin/Referer. (The webhook above is already past
// this point, so it's unaffected.)
app.use(sameSiteCsrf(CLIENT_URL));

// Throttle the endpoints that cost money (Gemini) or touch payments, so a
// script can't burn the API quota or hammer Razorpay.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' },
});
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment attempts. Please wait and try again.' },
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/generate', aiLimiter, generateRouter);
app.use('/api/project/deep-dive', aiLimiter, deepDiveRouter);
app.use('/api/resume', aiLimiter, resumeRouter);
app.use('/api/payment', paymentLimiter, paymentRouter);
app.use('/api/auth', authRouter);
app.use('/api/generations', generationsRouter);

module.exports = app;
