const { Pool } = require('pg');
const TrendingSnapshot = require('../models/TrendingSnapshot');
const logger = require('../utils/logger');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SENIOR_REGEX = /^\s*(senior|junior|lead|sr\.|jr\.)\s+/i;

function normalizeTitle(title) {
  return title.toLowerCase().replace(SENIOR_REGEX, '').trim();
}

async function computeTrending(region = 'global') {
  logger.info(`[trending] computing for region=${region}`);

  const regionFilter = region === 'tn' ? `AND country_code = 'tn'` : '';

  // ── Title counts (72h total) ─────────────────────────────────────────────
  const titleRows = await pool.query(
    `SELECT title, COUNT(*) AS cnt
     FROM public.normalized_jobs
     WHERE date_posted >= NOW() - INTERVAL '72 hours'
     ${regionFilter}
     GROUP BY title
     ORDER BY cnt DESC
     LIMIT 200`
  );

  // ── Title counts last 24h ────────────────────────────────────────────────
  const title24hRows = await pool.query(
    `SELECT title, COUNT(*) AS cnt
     FROM public.normalized_jobs
     WHERE date_posted >= NOW() - INTERVAL '24 hours'
     ${regionFilter}
     GROUP BY title`
  );

  // ── Title counts 24–72h ago ──────────────────────────────────────────────
  const titlePrevRows = await pool.query(
    `SELECT title, COUNT(*) AS cnt
     FROM public.normalized_jobs
     WHERE date_posted >= NOW() - INTERVAL '72 hours'
       AND date_posted <  NOW() - INTERVAL '24 hours'
     ${regionFilter}
     GROUP BY title`
  );

  // Aggregate by normalized title
  const titleMap = new Map();  // normalizedTitle → { count, count24h, countPrev }

  for (const row of titleRows.rows) {
    const key = normalizeTitle(row.title);
    const existing = titleMap.get(key) || { count: 0, count24h: 0, countPrev: 0 };
    existing.count += parseInt(row.cnt, 10);
    titleMap.set(key, existing);
  }
  for (const row of title24hRows.rows) {
    const key = normalizeTitle(row.title);
    const existing = titleMap.get(key) || { count: 0, count24h: 0, countPrev: 0 };
    existing.count24h += parseInt(row.cnt, 10);
    titleMap.set(key, existing);
  }
  for (const row of titlePrevRows.rows) {
    const key = normalizeTitle(row.title);
    const existing = titleMap.get(key) || { count: 0, count24h: 0, countPrev: 0 };
    existing.countPrev += parseInt(row.cnt, 10);
    titleMap.set(key, existing);
  }

  const roles = Array.from(titleMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([title, { count, count24h, countPrev }]) => {
      let growth_pct = 0;
      if (countPrev > 0) {
        growth_pct = Math.round(((count24h - countPrev) / countPrev) * 100);
      } else if (count24h > 0) {
        growth_pct = 100;
      }
      return { title, count, growth_pct };
    });

  // ── Skill tag counts ─────────────────────────────────────────────────────
  const skillRows = await pool.query(
    `SELECT LOWER(tag) AS skill, COUNT(*) AS cnt
     FROM public.normalized_jobs,
          LATERAL unnest(tags) AS tag
     WHERE date_posted >= NOW() - INTERVAL '72 hours'
       AND tags IS NOT NULL
     ${regionFilter}
     GROUP BY skill
     ORDER BY cnt DESC
     LIMIT 15`
  );

  const skills = skillRows.rows.map((row) => ({
    name: row.skill,
    count: parseInt(row.cnt, 10),
  }));

  // ── Build result ──────────────────────────────────────────────────────────
  const generated_at = new Date().toISOString();
  const result = { roles, skills, region, generated_at };

  // ── Persist snapshot ──────────────────────────────────────────────────────
  try {
    await TrendingSnapshot.create({
      region,
      trending_data: result,
      generated_by: 'cron',
      snapshot_at: new Date(),
    });
    logger.info(`[trending] snapshot saved`, { region, roles: roles.length, skills: skills.length });
  } catch (err) {
    logger.error(`[trending] failed to save snapshot`, { region, error: err.message });
  }

  return result;
}

module.exports = { computeTrending };
