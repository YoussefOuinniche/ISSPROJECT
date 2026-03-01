/**
 * Database pool loader.
 * Attempts to create a real Postgres Pool when DATABASE_URL or PG* env vars are present.
 * Otherwise exports a lightweight mock pool with `query()` and `end()` so the app can run in dev.
 */
const { env } = process;

let pool;

if (env.DATABASE_URL || env.PGHOST || env.PGHOSTADDR) {
  try {
    const { Pool } = require('pg');
    const config = {};
    if (env.DATABASE_URL) {
      config.connectionString = env.DATABASE_URL;
    } else {
      config.host = env.PGHOST;
      config.port = env.PGPORT ? parseInt(env.PGPORT, 10) : 5432;
      config.user = env.PGUSER;
      config.password = env.PGPASSWORD;
      config.database = env.PGDATABASE;
    }
    pool = new Pool(config);
    // Simple test to surface connection errors later (not executed here)
  } catch (err) {
    // If pg isn't available, fall back to mock below
    console.warn('pg not available or failed to load, falling back to mock pool', err.message || err);
  }
}

if (!pool) {
  // Mock pool for local/dev when a real DB isn't configured or `pg` isn't installed.
  pool = {
    async query(sql, params) {
      // Very small heuristic: if the app checks time, return now
      if (typeof sql === 'string' && /SELECT\s+NOW\(\)/i.test(sql)) {
        return { rows: [{ now: new Date().toISOString() }] };
      }
      return { rows: [] };
    },
    async end() {
      return;
    }
  };
}

module.exports = { pool };
