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

const DEFAULT_HEALTH_TABLE = (_env.DB_HEALTH_TABLE || 'users').trim() || 'users';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const classifyConnectivityError = (error) => {
  const message = String(error?.message || error || 'Unknown database error');
  const normalized = message.toLowerCase();

  if (
    normalized.includes('enotfound') ||
    normalized.includes('getaddrinfo') ||
    normalized.includes('dns') ||
    normalized.includes('name resolution')
  ) {
    return {
      reason: 'dns_resolution_failed',
      hint: 'SUPABASE_URL host cannot be resolved. Verify the project URL and local DNS/network.',
    };
  }

  if (normalized.includes('paused')) {
    return {
      reason: 'project_paused',
      hint: 'Supabase project appears paused. Resume it in the Supabase dashboard, then retry.',
    };
  }

  if (
    normalized.includes('fetch failed') ||
    normalized.includes('etimedout') ||
    normalized.includes('econnreset') ||
    normalized.includes('network')
  ) {
    return {
      reason: 'network_or_paused',
      hint: 'Network issue or cold-start/pause state. Retry shortly and confirm project is active.',
    };
  }

  if (
    normalized.includes('invalid api key') ||
    normalized.includes('invalid jwt') ||
    normalized.includes('jwt') ||
    normalized.includes('permission denied')
  ) {
    return {
      reason: 'credentials_or_permission_issue',
      hint: 'Verify SUPABASE_SERVICE_ROLE_KEY and API permissions for this project.',
    };
  }

  if (normalized.includes('relation') && normalized.includes('does not exist')) {
    return {
      reason: 'schema_missing_or_mismatch',
      hint: 'Schema objects are missing. Apply Backend/database/schema.sql to the active Supabase project.',
    };
  }

  return {
    reason: 'unknown_connectivity_issue',
    hint: 'Check Supabase project status, credentials, and schema setup.',
  };
};

const checkDatabaseConnection = async (options = {}) => {
  const table = (options.table || DEFAULT_HEALTH_TABLE).trim() || DEFAULT_HEALTH_TABLE;
  const retries = Number.isFinite(Number(options.retries)) ? Number(options.retries) : 0;
  const retryDelayMs = Number.isFinite(Number(options.retryDelayMs)) ? Number(options.retryDelayMs) : 1000;
  const maxAttempts = Math.max(1, retries + 1);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = Date.now();

    try {
      const { error } = await supabase
        .from(table)
        .select('id', { head: true, count: 'exact' })
        .limit(1);

      if (error) throw error;

      return {
        ok: true,
        reason: 'connected',
        hint: 'Supabase reachable',
        attempts: attempt,
        table,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      const classification = classifyConnectivityError(error);
      const isLastAttempt = attempt === maxAttempts;

      if (isLastAttempt) {
        return {
          ok: false,
          reason: classification.reason,
          hint: classification.hint,
          attempts: attempt,
          table,
          durationMs: Date.now() - startedAt,
          errorMessage: String(error?.message || error || 'Unknown database error'),
        };
      }

      if (retryDelayMs > 0) {
        await wait(retryDelayMs);
      }
    }
  }

  return {
    ok: false,
    reason: 'unknown_connectivity_issue',
    hint: 'Unexpected DB check flow',
    attempts: maxAttempts,
    table,
    durationMs: 0,
    errorMessage: 'DB check ended unexpectedly.',
  };
};

module.exports = {
  supabase,
  checkDatabaseConnection,
  classifyConnectivityError,
};
