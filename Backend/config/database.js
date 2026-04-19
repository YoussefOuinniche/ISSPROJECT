/**
 * Database client using @supabase/supabase-js over HTTPS.
 */
const _env = process.env;

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = _env.SUPABASE_URL;
const supabaseKey = _env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function isDatabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey);
}

async function testDatabaseConnection() {
  if (!isDatabaseConfigured()) {
    return {
      connected: false,
      configured: false,
      message: 'Not configured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    };
  }

  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      throw error;
    }

    return {
      connected: true,
      configured: true,
      message: 'Connected',
    };
  } catch (error) {
    return {
      connected: false,
      configured: true,
      message: error.message,
    };
  }
}

module.exports = {
  isDatabaseConfigured,
  supabase,
  testDatabaseConnection,
};
