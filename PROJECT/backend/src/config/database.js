const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey || supabaseServiceKey.includes('your_') || supabaseServiceKey.includes('here_')) {
  console.log('⚠️  Service role key not configured, using anon key for backend operations');
  supabaseServiceKey = supabaseAnonKey;
}

// Wrap every Supabase request with a 12-second abort so slow/paused free-tier
// projects never hang the Express response indefinitely.
const SUPABASE_TIMEOUT_MS = 12_000;

function withTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

const clientOptions = { global: { fetch: withTimeout } };

const supabase      = createClient(supabaseUrl, supabaseAnonKey,    clientOptions);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, clientOptions);

const testConnection = async () => {
  try {
    const { error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (error) throw error;
    console.log('✅ Connected to Supabase successfully');
  } catch (err) {
    console.error('❌ Supabase connection error:', err.message);
    console.log('⚠️  Make sure your Supabase project is active and tables are created');
  }
};

testConnection();

module.exports = { supabase, supabaseAdmin };
