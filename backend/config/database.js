/**
 * Database pool loader.
 * Attempts to create a real Postgres Pool when DATABASE_URL or PG* env vars are present.
 * Otherwise exports a lightweight mock pool with `query()` and `end()` so the app can run in dev.
 */
const { env } = process;

let pool;
let isMock = false;

if (env.DATABASE_URL || env.PGHOST || env.PGHOSTADDR) {
  try {
    const { Pool } = require('pg');

    const config = env.DATABASE_URL
      ? {
          connectionString: env.DATABASE_URL,
          // Required for SSL on hosted DBs (e.g. Supabase, Railway, Render)
          ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        }
      : {
          host:     env.PGHOST,
          port:     env.PGPORT ? parseInt(env.PGPORT, 10) : 5432,
          user:     env.PGUSER,
          password: env.PGPASSWORD,
          database: env.PGDATABASE,
          ssl:      env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        };

    // Connection pool tuning
    config.max                = parseInt(env.PG_POOL_MAX, 10)          || 10;   // max connections
    config.idleTimeoutMillis  = parseInt(env.PG_IDLE_TIMEOUT, 10)      || 30_000;
    config.connectionTimeoutMillis = parseInt(env.PG_CONN_TIMEOUT, 10) || 5_000;

    pool = new Pool(config);

    // Surface connection errors immediately instead of failing silently at first query
    pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err.message);
    });

    // Verify the connection is reachable at startup
    pool.query('SELECT 1').then(() => {
      console.log('[DB] PostgreSQL connected successfully.');
    }).catch((err) => {
      console.error('[DB] Initial connection test failed:', err.message);
    });

  } catch (err) {
    console.warn('[DB] pg not available or failed to load, falling back to mock pool:', err.message || err);
  }
}

if (!pool) {
  isMock = true;

  // Warn loudly so developers don't accidentally run against the mock in staging/production
  if (env.NODE_ENV === 'production') {
    console.error('[DB] FATAL: No database connection in production. Set DATABASE_URL or PG* env vars.');
    process.exit(1);
  }

  console.warn('[DB] No database configured — using in-memory mock pool (dev only).');

  pool = {
    async query(sql, _params) {
      if (typeof sql === 'string' && /SELECT\s+NOW\(\)/i.test(sql)) {
        return { rows: [{ now: new Date().toISOString() }] };
      }
      if (typeof sql === 'string' && /SELECT\s+1/i.test(sql)) {
        return { rows: [{ '?column?': 1 }] };
      }
      return { rows: [] };
    },
    async end() {},
  };
}

module.exports = { pool, isMock };