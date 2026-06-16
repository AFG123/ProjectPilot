// One-off, idempotent schema setup. Safe to run any number of times.
//   node scripts/init-db.js
// Creates the payments ledger used by the Razorpay verify + webhook flow.
require('dotenv').config();
const pool = require('../src/db');

async function main() {
  // Every successful capture is recorded here BEFORE we flip users.is_paid, in
  // the same transaction. razorpay_payment_id is UNIQUE so the same payment can
  // never be processed twice (idempotency) — the verify call and the webhook can
  // both fire for one payment, and only the first INSERT wins.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id                  SERIAL PRIMARY KEY,
      user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      razorpay_order_id   TEXT NOT NULL,
      razorpay_payment_id TEXT UNIQUE NOT NULL,
      amount              INTEGER NOT NULL,
      status              TEXT NOT NULL DEFAULT 'captured',
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id);`);

  console.log('✓ payments table ready');
  await pool.end();
}

main().catch((err) => {
  console.error('init-db failed:', err);
  process.exit(1);
});
