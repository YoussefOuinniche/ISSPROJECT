#!/usr/bin/env node
'use strict';

require('dotenv').config();
const dns = require('dns').promises;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HEALTH_TABLE = (process.env.DB_HEALTH_TABLE || 'users').trim() || 'users';
const TIMEOUT_MS = Number(process.env.DB_STATUS_TIMEOUT_MS || 15000);

function fail(message) {
  console.error(`[db:status] FAIL ${message}`);
  const err = new Error(message);
  err._alreadyLogged = true;
  throw err;
}

function classifyBody(text) {
  const normalized = String(text || '').toLowerCase();
  if (normalized.includes('paused')) return 'project_paused';
  if (normalized.includes('invalid api key') || normalized.includes('invalid jwt')) return 'invalid_credentials';
  if (normalized.includes('relation') && normalized.includes('does not exist')) return 'schema_missing_or_mismatch';
  return 'unknown';
}

async function run() {
  if (!SUPABASE_URL) fail('SUPABASE_URL is missing in Backend/.env');
  if (!SUPABASE_SERVICE_ROLE_KEY) fail('SUPABASE_SERVICE_ROLE_KEY is missing in Backend/.env');

  let host;
  try {
    host = new URL(SUPABASE_URL).hostname;
  } catch {
    fail('SUPABASE_URL is not a valid URL');
  }

  try {
    const records = await dns.lookup(host, { all: true });
    console.log(`[db:status] DNS OK ${host} -> ${records.map((r) => r.address).join(', ')}`);
  } catch (error) {
    fail(`DNS resolution failed for ${host}: ${error.message}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(HEALTH_TABLE)}?select=id&limit=1`;
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: 'application/json',
      },
    });

    const body = await response.text();

    if (response.ok) {
      console.log(`[db:status] OK Supabase reachable and table check passed (${HEALTH_TABLE}).`);
      return;
    }

    const reason = classifyBody(body);
    fail(`HTTP ${response.status}. reason=${reason}. body=${body}`);
  } catch (error) {
    fail(`Request failed: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

run().catch((error) => {
  if (!error?._alreadyLogged) {
    console.error(`[db:status] FAIL ${error.message}`);
  }
  process.exitCode = 1;
});
