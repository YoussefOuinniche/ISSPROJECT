/**
 * Database client — uses @supabase/supabase-js (HTTPS-based).
 *
 * Why: Supabase free-tier projects migrated to IPv6-only direct connections.
 * The old pg / DATABASE_URL approach fails with ENOTFOUND on db.*.supabase.co.
 * The Supabase JS client communicates over HTTPS, which always works.
 *
 * Required .env variables:
 *   SUPABASE_URL              https://<project-ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  sb_secret_...  (from Project Settings → API)
 */
const _env = process.env; // keep reference before dotenv mutates

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = _env.SUPABASE_URL;
const supabaseKey = _env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[DB] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env');
  console.error('[DB] Get them from: Supabase Dashboard → Project Settings → API');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test connectivity at startup so misconfiguration shows immediately.
(async () => {
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) {
    console.error('[DB] Supabase connectivity test failed:', error.message);
    console.error('[DB] Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    console.error('[DB] Also make sure the schema has been applied (Backend/database/schema.sql)');
  } else {
    console.log('[DB] Supabase connected successfully via HTTPS.');
  }
})();

module.exports = { supabase };
