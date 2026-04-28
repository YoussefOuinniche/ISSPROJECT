const cron = require('node-cron');
const logger = require('../utils/logger');
const { runAdzunaIngestion } = require('../services/adzuna.service');
const { scrapeBayt }         = require('../scrapers/bayt.scraper');
const { scrapeKeejob }       = require('../scrapers/keejob.scraper');
const { computeTrending }    = require('../services/trending.service');
const { summarizeJob, extractJobTags } = require('../services/ollama.service');
const cache                  = require('../services/cache.service');
const NormalizedJob          = require('../models/NormalizedJob');

// ── Schedule 1: fetch all job sources every 3 hours ─────────────────────────
cron.schedule('0 */3 * * *', async () => {
  logger.info('[cron:aggregator] starting job fetch');
  let total = 0;

  try {
    for (const country of ['gb', 'us', 'tn']) {
      const { savedCount = 0 } = await runAdzunaIngestion(country).catch((err) => {
        logger.error('[cron:aggregator] adzuna failed', { country, error: err.message });
        return {};
      });
      total += savedCount;
      logger.info('[cron:aggregator] adzuna done', { country, saved: savedCount });
    }
  } catch (err) {
    logger.error('[cron:aggregator] adzuna run error', { error: err.message });
  }

  try {
    const keejobJobs = await scrapeKeejob();
    total += keejobJobs.length;
    logger.info('[cron:aggregator] keejob done', { fetched: keejobJobs.length });
  } catch (err) {
    logger.error('[cron:aggregator] keejob failed', { error: err.message });
  }

  try {
    const baytJobs = await scrapeBayt();
    total += baytJobs.length;
    logger.info('[cron:aggregator] bayt done', { fetched: baytJobs.length });
  } catch (err) {
    logger.error('[cron:aggregator] bayt failed', { error: err.message });
  }

  logger.info('[cron:aggregator] fetch complete', { totalJobs: total });
});

// ── Schedule 2: compute trending every hour ──────────────────────────────────
cron.schedule('0 * * * *', async () => {
  logger.info('[cron:trending] starting trending computation');

  for (const region of ['global', 'tn']) {
    try {
      await computeTrending(region);
      await cache.del(`trending:${region}`);
      logger.info('[cron:trending] done + cache invalidated', { region });
    } catch (err) {
      logger.error('[cron:trending] failed', { region, error: err.message });
    }
  }
});

// ── Schedule 3: AI enrichment every 6 hours ──────────────────────────────────
cron.schedule('0 */6 * * *', async () => {
  logger.info('[cron:ai] starting AI enrichment');

  try {
    const jobs = await NormalizedJob.findAll({ limit: 20 });
    // Filter for un-enriched jobs
    const unenriched = jobs.filter((j) => !j.ai_summary);

    if (unenriched.length === 0) {
      logger.info('[cron:ai] no un-enriched jobs found');
      return;
    }

    let processed = 0;
    for (const job of unenriched) {
      try {
        const [summary, tags] = await Promise.all([
          summarizeJob(job.description),
          extractJobTags(job.title, job.description),
        ]);

        await NormalizedJob.update(job.id, {
          ai_summary: summary,
          ai_tags: tags,
        });
        processed++;
      } catch (err) {
        logger.error('[cron:ai] enrichment failed for job', { id: job.id, error: err.message });
      }
    }

    logger.info('[cron:ai] enrichment complete', { processed, total: unenriched.length });
  } catch (err) {
    logger.error('[cron:ai] run error', { error: err.message });
  }
});

logger.info('[cron] all schedules registered (aggregator=3h, trending=1h, ai=6h)');
