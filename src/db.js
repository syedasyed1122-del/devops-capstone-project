require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  // Don't throw at import time — that would crash every cold start before
  // Express even gets a chance to respond. Log loudly instead; queries
  // will fail with a clear error until the env var is set.
  console.error('[db] DATABASE_URL is not set. Set it in your Vercel project env vars.');
}

// Vercel functions are short-lived and can run many concurrent instances,
// so keep the per-instance pool small.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }, // Required by most cloud Postgres providers (Neon, Supabase, etc.)
  max: process.env.VERCEL ? 1 : 10,
  idleTimeoutMillis: 30000,
});

/**
 * Run the initial schema migration.
 * Creates the notes table if it doesn't already exist.
 * Cached as a promise so it only runs once per warm function instance.
 */
let schemaReady;
function initDB() {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id         SERIAL PRIMARY KEY,
        title      VARCHAR(255) NOT NULL,
        body       TEXT         NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `).then(() => console.log('[db] Schema ready.'))
      .catch(err => {
        schemaReady = undefined; // allow retry on next request
        throw err;
      });
  }
  return schemaReady;
}

// In a normal long-running server, initialize eagerly. In Vercel's
// serverless environment, defer until the first request instead (see
// the middleware in app.js) so a bad/missing DATABASE_URL doesn't crash
// the whole function on cold start.
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  initDB().catch(err => console.error('[db] Failed to initialize schema:', err));
}

module.exports = { pool, initDB };