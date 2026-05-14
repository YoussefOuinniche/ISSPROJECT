#!/usr/bin/env node
/**
 * Pulls remote IT jobs from Remotive's public API and inserts them into
 * Supabase: one row per job in public.raw_jobs, then a matching row in
 * public.normalized_jobs.
 *
 * Run with:
 *   cd PROJECT/backend
 *   npm run seed:remotive                 # default cap 300 jobs
 *   npm run seed:remotive -- --limit=1000
 *
 * Idempotent: existing rows (matched by source+external_id on raw_jobs,
 * or by source_url on normalized_jobs) are skipped.
 *
 * Requires the migration `migration_add_remotive_source.sql` to have been
 * applied — it widens the raw_jobs.source CHECK to allow 'remotive'.
 */
'use strict';

require('dotenv').config();
const https = require('https');
const { supabaseAdmin } = require('../src/config/database');

const REMOTIVE_BASE = 'https://remotive.com/api/remote-jobs';

// Remotive's API ignores `?limit=` for most endpoints. Hitting each category
// returns the full set for that category, so we just sweep all of them.
const CATEGORIES = [
  'software-dev',
  'devops',
  'qa',
  'data',
  'design',
  'product',
  'marketing',
  'customer-support',
  'sales',
  'business',
  'finance-legal',
  'all-others',
];

const args = process.argv.slice(2).reduce((acc, arg) => {
  const m = /^--([\w-]+)(?:=(.*))?$/.exec(arg);
  if (m) acc[m[1]] = m[2] ?? 'true';
  return acc;
}, {});

const MAX_TOTAL = Math.max(20, parseInt(args.limit || '300', 10));

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'NexaPath-Seeder/1.0' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isoOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function looksRemote(loc) {
  if (!loc) return true;
  const v = String(loc).toLowerCase();
  return v.includes('remote') || v.includes('worldwide') || v.includes('anywhere');
}

function detectCountryCode(loc) {
  if (!loc) return null;
  const v = String(loc).toLowerCase();
  if (/usa|united states|us-only|^us$/.test(v)) return 'US';
  if (/uk|united kingdom|britain/.test(v)) return 'GB';
  if (/canada/.test(v)) return 'CA';
  if (/germany/.test(v)) return 'DE';
  if (/france/.test(v)) return 'FR';
  if (/spain/.test(v)) return 'ES';
  if (/italy/.test(v)) return 'IT';
  if (/india/.test(v)) return 'IN';
  if (/europe/.test(v)) return 'EU';
  return null;
}

async function preflight() {
  // Verify the tables exist and our source value is accepted.
  const { error: rawErr } = await supabaseAdmin
    .from('raw_jobs')
    .select('id', { head: true, count: 'exact' })
    .limit(1);
  if (rawErr) {
    console.error('[seed-remotive] raw_jobs preflight failed:', rawErr.message);
    console.error(
      '[seed-remotive] Hint: apply migration_add_job_aggregation.sql in Supabase SQL editor.',
    );
    process.exit(1);
  }

  // Cheap probe to ensure 'remotive' is allowed by the check constraint.
  const probeId = `__probe__${Date.now()}`;
  const { data: probed, error: probeErr } = await supabaseAdmin
    .from('raw_jobs')
    .insert({ external_id: probeId, source: 'remotive', raw_payload: { probe: true } })
    .select('id')
    .maybeSingle();
  if (probeErr) {
    console.error('[seed-remotive] CHECK constraint probe failed:', probeErr.message);
    console.error(
      "[seed-remotive] Hint: apply migration_add_remotive_source.sql to allow source='remotive'.",
    );
    process.exit(1);
  }
  if (probed?.id) {
    await supabaseAdmin.from('raw_jobs').delete().eq('id', probed.id);
  }
}

async function existsNormalized(url) {
  if (!url) return false;
  const { data } = await supabaseAdmin
    .from('normalized_jobs')
    .select('id')
    .eq('source_url', url)
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

async function insertJob(job) {
  const externalId = job.id ? String(job.id) : job.url;

  // 1. Upsert raw_jobs row (idempotent via unique source+external_id).
  const { data: rawRow, error: rawErr } = await supabaseAdmin
    .from('raw_jobs')
    .upsert(
      {
        external_id: externalId,
        source: 'remotive',
        raw_payload: job,
      },
      { onConflict: 'source,external_id' },
    )
    .select('id')
    .maybeSingle();

  if (rawErr) throw new Error(`raw_jobs upsert: ${rawErr.message}`);
  if (!rawRow?.id) throw new Error('raw_jobs upsert returned no id');

  // 2. Skip if normalized row already exists for this URL.
  if (await existsNormalized(job.url)) {
    return 'skipped';
  }

  // 3. Insert normalized_jobs row.
  const tagsRaw = Array.isArray(job.tags) ? job.tags.filter(Boolean) : null;
  const { error: normErr } = await supabaseAdmin.from('normalized_jobs').insert({
    raw_job_id: rawRow.id,
    title: job.title || 'Untitled role',
    company: job.company_name || null,
    location: job.candidate_required_location || 'Remote',
    country_code: detectCountryCode(job.candidate_required_location),
    description: stripHtml(job.description).slice(0, 4000),
    tags: tagsRaw,
    is_remote: looksRemote(job.candidate_required_location),
    source: 'remotive.com',
    source_url: job.url,
    date_posted: isoOrNull(job.publication_date),
    popularity_score: 0,
    is_trending: false,
  });

  if (normErr) throw new Error(`normalized_jobs insert: ${normErr.message}`);
  return 'inserted';
}

async function run() {
  console.log(`[seed-remotive] starting · target up to ${MAX_TOTAL} jobs`);
  await preflight();

  const all = new Map(); // url → job
  for (const category of CATEGORIES) {
    const url = `${REMOTIVE_BASE}?category=${encodeURIComponent(category)}`;
    try {
      const json = await fetchJson(url);
      const jobs = Array.isArray(json.jobs) ? json.jobs : [];
      let added = 0;
      for (const job of jobs) {
        if (!job.url) continue;
        if (!all.has(job.url)) {
          all.set(job.url, { ...job, _category: category });
          added += 1;
        }
      }
      console.log(`[seed-remotive] ${category}: +${added} unique (running total ${all.size})`);
      if (all.size >= MAX_TOTAL) break;
    } catch (err) {
      console.warn(`[seed-remotive] failed category=${category}: ${err.message}`);
    }
  }

  const candidates = Array.from(all.values()).slice(0, MAX_TOTAL);
  console.log(`[seed-remotive] preparing to write ${candidates.length} jobs to Supabase`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const job of candidates) {
    try {
      const result = await insertJob(job);
      if (result === 'inserted') inserted += 1;
      else skipped += 1;
    } catch (err) {
      failed += 1;
      console.warn(`[seed-remotive] insert failed for "${job.title}": ${err.message}`);
    }
  }

  console.log(`[seed-remotive] done · inserted=${inserted} skipped=${skipped} failed=${failed}`);
}

run().catch((err) => {
  console.error('[seed-remotive] fatal:', err.message || err);
  process.exit(1);
});
