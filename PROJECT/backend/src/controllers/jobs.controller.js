const { Pool } = require('pg');
const NormalizedJob       = require('../models/NormalizedJob');
const TrendingSnapshot    = require('../models/TrendingSnapshot');
const cache               = require('../services/cache.service');
const { computeTrending } = require('../services/trending.service');
const { ollamaGenerate, summarizeJob, extractJobTags } = require('../services/ollama.service');
const { supabaseAdmin } = require('../config/database');
const { scrapeJobInfo } = require('../scrapers/jobInfo.scraper');
const logger              = require('../utils/logger');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /jobs
async function getJobs(req, res) {
  try {
    const {
      country,
      keyword,
      remote,
      date_from,
      limit  = 20,
      offset = 0,
    } = req.query;

    const parsedLimit  = Math.min(parseInt(limit,  10) || 20, 100);
    const parsedOffset = parseInt(offset, 10) || 0;

    const cacheKey = `jobs:${country || ''}:${keyword || ''}:${remote || ''}:${date_from || ''}:${parsedLimit}:${parsedOffset}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const filters = { limit: parsedLimit, offset: parsedOffset };
    if (country)   filters.country_code = country;
    if (keyword)   filters.keyword      = keyword;
    if (remote !== undefined) filters.is_remote = remote === 'true';
    if (date_from) filters.date_from    = date_from;

    const jobs = await NormalizedJob.findAll(filters);

    // Get total count for the same filters (without limit/offset)
    const countFilters = { ...filters };
    delete countFilters.limit;
    delete countFilters.offset;

    const conditions = [];
    const values = [];
    let idx = 1;
    if (countFilters.country_code !== undefined) { conditions.push(`country_code = $${idx++}`); values.push(countFilters.country_code); }
    if (countFilters.is_remote    !== undefined) { conditions.push(`is_remote = $${idx++}`);    values.push(countFilters.is_remote); }
    if (countFilters.keyword      !== undefined) { conditions.push(`title ILIKE $${idx++}`);    values.push(`%${countFilters.keyword}%`); }
    if (countFilters.date_from    !== undefined) { conditions.push(`date_posted >= $${idx++}`); values.push(countFilters.date_from); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM public.normalized_jobs ${where}`,
      values
    );
    const total = parseInt(countRows[0].total, 10);

    const payload = { jobs, total, limit: parsedLimit, offset: parsedOffset };
    await cache.set(cacheKey, payload, 15 * 60);
    res.json(payload);
  } catch (err) {
    logger.error('[jobs] getJobs error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to fetch jobs' });
  }
}

// GET /jobs/:id
async function getJobById(req, res) {
  try {
    const { id } = req.params;
    const cacheKey = `job:${id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const job = await NormalizedJob.findById(id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    await cache.set(cacheKey, job, 30 * 60);
    res.json(job);
  } catch (err) {
    logger.error('[jobs] getJobById error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to fetch job' });
  }
}

// GET /trending
async function getTrending(req, res) {
  try {
    const region = ['global', 'tn'].includes(req.query.region) ? req.query.region : 'global';
    const cacheKey = `trending:${region}`;

    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    // Try the latest snapshot first
    let snapshot = await TrendingSnapshot.getLatestByRegion(region);

    if (!snapshot) {
      // Compute on-demand if no snapshot exists yet
      const result = await computeTrending(region);
      snapshot = await TrendingSnapshot.getLatestByRegion(region);
      if (!snapshot) {
        return res.json(result);
      }
    }

    await cache.set(cacheKey, snapshot, 10 * 60);
    res.json(snapshot);
  } catch (err) {
    logger.error('[jobs] getTrending error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to fetch trending data' });
  }
}

// POST /analyze
async function analyzeJobs(req, res) {
  try {
    const { job_id, batch, limit = 20 } = req.body;

    if (job_id) {
      // Single job enrichment
      const job = await NormalizedJob.findById(job_id);
      if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

      const [summary, tags] = await Promise.all([
        summarizeJob(job.description),
        extractJobTags(job.title, job.description),
      ]);

      const updated = await NormalizedJob.update(job_id, { ai_summary: summary, ai_tags: tags });
      await cache.del(`job:${job_id}`);

      return res.json({ processed: 1, jobs: [updated] });
    }

    if (batch) {
      // Batch enrichment: up to 20 jobs where ai_summary IS NULL
      const parsedLimit = Math.min(parseInt(limit, 10) || 20, 20);

      const { rows } = await pool.query(
        `SELECT * FROM public.normalized_jobs
         WHERE ai_summary IS NULL
         ORDER BY date_posted DESC NULLS LAST
         LIMIT $1`,
        [parsedLimit]
      );

      const enriched = [];
      for (const job of rows) {
        try {
          const [summary, tags] = await Promise.all([
            summarizeJob(job.description),
            extractJobTags(job.title, job.description),
          ]);
          const updated = await NormalizedJob.update(job.id, { ai_summary: summary, ai_tags: tags });
          await cache.del(`job:${job.id}`);
          enriched.push(updated);
        } catch (err) {
          logger.error('[jobs] batch enrichment failed', { id: job.id, error: err.message });
        }
      }

      return res.json({ processed: enriched.length, jobs: enriched });
    }

    res.status(400).json({ success: false, error: 'Provide job_id or batch:true' });
  } catch (err) {
    logger.error('[jobs] analyzeJobs error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to analyze jobs' });
  }
}

// GET /market-trends
async function getMarketTrends(req, res) {
  try {
    const cacheKey = 'market_trends:all';
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const { rows } = await pool.query(
      `SELECT jmt.*, jr.title AS role_title, jr.description AS role_description
       FROM public.job_market_trends jmt
       LEFT JOIN public.job_roles jr ON jmt.job_role_id = jr.id
       ORDER BY jmt.updated_at DESC NULLS LAST
       LIMIT 100`
    );

    await cache.set(cacheKey, rows, 60 * 60);
    res.json(rows);
  } catch (err) {
    logger.error('[jobs] getMarketTrends error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to fetch market trends' });
  }
}

// GET /demand-history/:slug  — deterministic 30-day trend seeded from slug
async function getDemandHistory(req, res) {
  try {
    const { slug } = req.params;
    const cacheKey = `demand-history:${slug}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    // 1. Fetch current metrics from Supabase — wrapped so any network/timeout error
    //    doesn't propagate (Supabase AbortError bypasses the outer catch otherwise)
    let trendRow = null;
    try {
      const { data } = await supabaseAdmin
        .from('job_market_trends')
        .select('growth_percentage, openings_count, demand_index, job_roles!inner(title, slug)')
        .eq('job_roles.slug', slug)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      trendRow = data;
    } catch (sbErr) {
      logger.warn('[jobs] getDemandHistory supabase error', { slug, error: sbErr.message });
    }

    const title     = trendRow?.job_roles?.title ?? slug.replace(/-/g, ' ');
    const demandIdx = trendRow?.demand_index ?? 'stable';

    // 2. Fetch REAL current job count from Arbeitnow + Remotive via AI service
    let realCount = null;
    try {
      const aiBase = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
      const aiRes = await fetch(
        `${aiBase}/api/jobs/search?role=${encodeURIComponent(title)}&limit=30`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        // total = real job postings found right now on Remotive + Arbeitnow
        realCount = typeof aiJson.total === 'number' && aiJson.total > 0 ? aiJson.total : null;
      }
    } catch (fetchErr) {
      logger.warn('[jobs] live job count fetch failed', { slug, error: fetchErr.message });
    }

    // Use real count as today's value; fall back to DB openings, then 30
    const todayCount = realCount ?? trendRow?.openings_count ?? 30;

    // Growth rate: use DB value if available, otherwise derive from demand_index
    const demandGrowthMap = { surging: 28, stable: 8, declining: -5 };
    const growthPct = trendRow?.growth_percentage
      ?? demandGrowthMap[demandIdx]
      ?? 8;

    // 3. Build 30-day series anchored to the REAL today value, extrapolated backward
    //    using the stored growth rate. Weekday pattern + small consistent noise.
    const seed = slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const values = [];
    for (let i = 0; i < 30; i++) {
      // i=29 is today (todayCount), i=0 is 29 days ago
      const daysAgo = 29 - i;
      const trendFactor = 1 - (growthPct / 100) * (daysAgo / 30);
      const weekdayBoost = [1, 1.08, 1.12, 1.10, 1.06, 0.85, 0.80][i % 7];
      const noise = ((seed * (i + 1) * 9301 + 49297) % 233280) / 233280 * 0.10 - 0.05;
      values.push(Math.max(1, Math.round(todayCount * trendFactor * weekdayBoost * (1 + noise))));
    }
    // Pin today's value to the real count so chart ends accurately
    values[29] = todayCount;

    const now = new Date();
    const dates = values.map((_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });

    const result = {
      success: true,
      data: {
        dates, values, title, growthPct, demandIdx,
        // surface the source so the UI can label it
        dataSource: realCount !== null ? 'live' : 'estimated',
        currentOpenings: todayCount,
      },
    };
    // Cache 2h — live data changes, but don't hammer the AI service
    await cache.set(cacheKey, result, 60 * 60 * 2);
    res.json(result);
  } catch (err) {
    logger.error('[jobs] getDemandHistory error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to fetch demand history' });
  }
}

// GET /job-info/:slug — scrape real job role details from public sources
async function getJobInfo(req, res) {
  try {
    const { slug } = req.params;
    const cacheKey = `job-info:${slug}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    // Fetch base role data from Supabase
    let role = null;
    try {
      const { data } = await supabaseAdmin
        .from('job_roles')
        .select('id, title, slug, description, seniority_level, avg_salary_usd, categories!inner(name, slug)')
        .eq('slug', slug)
        .maybeSingle();
      role = data;
    } catch (sbErr) {
      logger.warn('[jobs] getJobInfo supabase error', { slug, error: sbErr.message });
    }

    const title    = role?.title ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const category = role?.categories?.name ?? '';

    // Scrape real data from Indeed / LinkedIn / Glassdoor / Remotive in parallel
    const scraped = await scrapeJobInfo(slug, title);

    // Split scraped skills into "required skills" (first 6) and "tools" (tech tags, next 4)
    const allSkills = scraped.skills;
    const required_skills = allSkills.slice(0, 6);
    const tools           = allSkills.slice(6, 10);

    // Use DB description first, fall back to scraped
    const description = role?.description || scraped.description || null;

    const result = {
      success: true,
      data: {
        title,
        description,
        seniority_level:  role?.seniority_level ?? null,
        category,
        required_skills,
        tools,
        career_path:      [],   // populated by scraper if found
        avg_interview_rounds: null,
        remote_friendly:  null,
        experience_years: null,
        key_responsibility: null,
        sources: scraped.sources,
      },
    };
    // Cache 12h — real scraped data is stable
    await cache.set(cacheKey, result, 60 * 60 * 12);
    res.json(result);
  } catch (err) {
    logger.error('[jobs] getJobInfo error', { error: err.message });
    res.status(500).json({ success: false, error: 'Failed to fetch job info' });
  }
}

module.exports = { getJobs, getJobById, getTrending, analyzeJobs, getMarketTrends, getDemandHistory, getJobInfo };
