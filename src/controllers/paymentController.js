const crypto = require('crypto');
const Razorpay = require('razorpay');
const pool = require('../db');
const { signAuthToken, setAuthCookie } = require('../utils/auth');

// Price is fixed server-side — never trust an amount sent from the browser.
const UNLOCK_AMOUNT_PAISE = 4900; // ₹49 (Razorpay works in the smallest currency unit)

// Lazily construct the client so the server can still boot if keys are missing
// during local setup — the error only surfaces when someone actually pays.
let razorpay;
function getRazorpay() {
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

// POST /api/payment/create-order  (requireAuth)
// Step 1 of the flow: ask Razorpay to open an order for ₹49, hand the id back
// to the browser so it can launch checkout.
async function createOrder(req, res) {
  try {
    const order = await getRazorpay().orders.create({
      amount: UNLOCK_AMOUNT_PAISE,
      currency: 'INR',
      receipt: `unlock_${req.user.userId}_${Date.now()}`,
      notes: { userId: String(req.user.userId), purpose: 'projectpilot_unlock' },
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // public key — safe to send to the browser
    });
  } catch (err) {
    console.error('Create order error:', err.message);
    return res.status(500).json({ error: 'Could not start payment. Please try again.' });
  }
}

// POST /api/payment/verify  (requireAuth)
// Step 4: the browser sends back what Razorpay gave it. We recompute the
// signature with our SECRET key — if it matches, the payment is genuinely from
// Razorpay and we can safely flip is_paid. A forged "I paid" request can't pass
// this check because the attacker never has KEY_SECRET.
async function verifyPayment(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment confirmation fields' });
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  // Constant-time compare to avoid leaking the signature via timing.
  const sigBuf = Buffer.from(razorpay_signature);
  const expBuf = Buffer.from(expected);
  const valid =
    sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

  if (!valid) {
    return res.status(400).json({ error: 'Payment verification failed' });
  }

  // ── Atomic unlock ────────────────────────────────────────────────────────
  // Two writes must succeed together: (1) record the payment in the ledger,
  // (2) flip users.is_paid. We wrap them in a single DB transaction so it's
  // all-or-nothing — if the second write fails, BEGIN..ROLLBACK undoes the
  // first, leaving no half-finished state. The user sees an error and retries.
  // Re-running is safe: the ledger's UNIQUE razorpay_payment_id + ON CONFLICT
  // makes a repeat attempt a no-op instead of a double-charge record.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO payments (user_id, razorpay_order_id, razorpay_payment_id, amount, status)
       VALUES ($1, $2, $3, $4, 'captured')
       ON CONFLICT (razorpay_payment_id) DO NOTHING`,
      [req.user.userId, razorpay_order_id, razorpay_payment_id, UNLOCK_AMOUNT_PAISE]
    );

    const { rows } = await client.query(
      `UPDATE users SET is_paid = true WHERE id = $1
       RETURNING id, google_sub, name, email, picture, is_paid`,
      [req.user.userId]
    );

    await client.query('COMMIT');

    const u = rows[0];
    // Re-issue the cookie with isPaid=true so the unlock takes effect everywhere
    // without forcing a re-login. The old cookie is overwritten.
    const token = signAuthToken({
      sub: u.google_sub, userId: u.id, name: u.name, email: u.email, picture: u.picture, isPaid: u.is_paid,
    });
    setAuthCookie(res, token);

    return res.json({
      user: { name: u.name, email: u.email, picture: u.picture, isPaid: u.is_paid },
    });
  } catch (err) {
    // Roll back so we never leave a payment recorded without the unlock (or vice
    // versa). The webhook is the safety net: Razorpay re-sends the event until
    // we 200 it, so even a transient DB blip here gets reconciled automatically.
    await client.query('ROLLBACK').catch(() => {});
    console.error('Payment verify DB error:', err.message);
    return res.status(500).json({
      error: 'Payment received but unlocking hit a snag. Please retry in a moment — you will not be charged again.',
    });
  } finally {
    client.release(); // always hand the connection back to the pool
  }
}

// POST /api/payment/webhook  (NO auth cookie — Razorpay's servers call this)
// The safety net for the whole flow. If a user pays but their browser dies
// before /verify runs (closed tab, dead network), they'd be charged but locked.
// Razorpay also POSTs every captured payment here and RETRIES until we 200,
// so the unlock eventually happens no matter what the browser did.
//
// Trust comes from the X-Razorpay-Signature header: an HMAC of the RAW request
// body using our webhook secret. That's why this route is mounted with
// express.raw() (see app.js) — req.body is the raw Buffer, not parsed JSON.
async function handleWebhook(req, res) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Webhook hit but RAZORPAY_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const signature = req.headers['x-razorpay-signature'] || '';
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  const valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Malformed webhook body' });
  }

  // We only act on a successful capture. We stamped the order with the userId in
  // `notes` at create-order time, so we know who to unlock.
  if (event.event === 'payment.captured') {
    const payment = event.payload?.payment?.entity;
    const userId = payment?.notes?.userId;
    if (payment && userId) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO payments (user_id, razorpay_order_id, razorpay_payment_id, amount, status)
           VALUES ($1, $2, $3, $4, 'captured')
           ON CONFLICT (razorpay_payment_id) DO NOTHING`,
          [userId, payment.order_id, payment.id, payment.amount]
        );
        await client.query(`UPDATE users SET is_paid = true WHERE id = $1`, [userId]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Webhook DB error:', err.message);
        // 500 → Razorpay will retry the delivery later. That's the desired
        // behavior: don't acknowledge until we've actually unlocked.
        return res.status(500).json({ error: 'Processing failed' });
      } finally {
        client.release();
      }
    }
  }

  // 200 tells Razorpay "received, stop retrying" — for both events we handled
  // and ones we simply don't care about.
  return res.json({ received: true });
}

module.exports = { createOrder, verifyPayment, handleWebhook };
