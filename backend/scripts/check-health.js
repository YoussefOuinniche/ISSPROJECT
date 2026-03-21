#!/usr/bin/env node
'use strict';

const HEALTHCHECK_URL = process.env.HEALTHCHECK_URL || 'http://localhost:4000/health';
const TIMEOUT_MS = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 15000);
const EXPECT_DB_CONNECTED = (process.env.HEALTHCHECK_EXPECT_DB || 'true').toLowerCase() !== 'false';

async function run() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(HEALTHCHECK_URL, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      console.error(`[healthcheck] FAIL ${response.status} ${response.statusText}`);
      if (payload) console.error(`[healthcheck] payload: ${JSON.stringify(payload)}`);
      process.exitCode = 1;
      return;
    }

    if (EXPECT_DB_CONNECTED && payload?.database !== 'connected') {
      console.error('[healthcheck] FAIL API responded but database is not connected.');
      if (payload) console.error(`[healthcheck] payload: ${JSON.stringify(payload)}`);
      process.exitCode = 1;
      return;
    }

    console.log(`[healthcheck] OK ${HEALTHCHECK_URL}`);
    if (payload) console.log(`[healthcheck] payload: ${JSON.stringify(payload)}`);
  } catch (error) {
    console.error(`[healthcheck] FAIL request error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
}

run();
