require('dotenv').config();
const pool = require('../src/db');

async function main() {
  console.log('Running auth migration...');

  // 1. Allow google_sub to be null for credential-based users
  await pool.query(`
    ALTER TABLE users ALTER COLUMN google_sub DROP NOT NULL;
  `);
  console.log('✓ Made google_sub nullable');

  // 2. Add password_hash column if it doesn't exist
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
  `);
  console.log('✓ Added password_hash column');

  // 3. Ensure email has a unique index on lowercase email
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(lower(email));
  `);
  console.log('✓ Ensured unique index on lower(email)');

  await pool.end();
  console.log('Migration completed successfully!');
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
