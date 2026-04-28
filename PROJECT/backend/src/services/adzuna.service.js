const axios = require('axios');
const RawJob = require('../models/RawJob');
const NormalizedJob = require('../models/NormalizedJob');
const { retryWithBackoff } = require('../utils/retry');
const { extractTags, calculatePopularityScore } = require('./normalization.service');
const logger = require('../utils/logger');

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY;
const BASE_URL = 'https://api.adzuna.com/v1/api/jobs';

const SUPPORTED_COUNTRIES = ['gb', 'us', 'tn'];
const PAGES_PER_RUN = 5;
const RESULTS_PER_PAGE = 50;

const TECH_REGEX = /\b(React|Node\.js|Python|Docker|AWS|TypeScript|SQL|JavaScript|Java|Kubernetes|MongoDB|PostgreSQL|Redis|GraphQL|Angular|Vue|Linux|Git|CI\/CD|Azure|GCP|TensorFlow|PHP|Laravel|Django|Flask|Spring|Swift|Kotlin|Flutter|Terraform|Ansible|Jenkins|Elasticsearch|Microservices|Sass|Next\.js|Express|FastAPI|NestJS|MySQL|Hadoop|Spark|Kafka|C\+\+|C#|\.NET|Rust|Scala)\b/gi;

function extractTagsFromText(text) {
  if (!text) return [];
  const matches = text.match(TECH_REGEX) || [];
  return Array.from(new Set(matches.map((m) => m)));
}

function mapAdzunaJob(raw, country) {
  const descriptionText = raw.description || '';
  const categoryTag = raw.category?.tag || '';

  const descriptionTags = extractTagsFromText(descriptionText);
  const categoryTags = categoryTag ? [categoryTag] : [];
  const tags = Array.from(new Set([...categoryTags, ...descriptionTags]));

  const titleLower = (raw.title || '').toLowerCase();
  const descLower = descriptionText.toLowerCase();
  const isRemote =
    titleLower.includes('remote') ||
    descLower.includes('remote') ||
    descLower.includes('work from home') ||
    descLower.includes('télétravail');

  return {
    external_id: String(raw.id),
    source: 'adzuna',
    title: raw.title || '',
    company: raw.company?.display_name || 'Unknown',
    location: raw.location?.display_name || '',
    country_code: country,
    salary_min: raw.salary_min != null ? Math.round(raw.salary_min) : null,
    salary_max: raw.salary_max != null ? Math.round(raw.salary_max) : null,
    salary_currency: raw.salary_min != null ? (country === 'gb' ? 'GBP' : country === 'us' ? 'USD' : 'TND') : null,
    description: descriptionText,
    tags,
    is_remote: isRemote,
    source_url: raw.redirect_url || '',
    date_posted: raw.created ? new Date(raw.created).toISOString() : new Date().toISOString(),
  };
}

async function fetchPage(country, page) {
  const url = `${BASE_URL}/${country}/search/${page}`;
  const response = await retryWithBackoff(
    () =>
      axios.get(url, {
        params: {
          app_id: ADZUNA_APP_ID,
          app_key: ADZUNA_API_KEY,
          results_per_page: RESULTS_PER_PAGE,
          content_type: 'application/json',
        },
        timeout: 15000,
      }),
    3,
    1000
  );
  return response.data?.results || [];
}

async function saveJobPair(normalized) {
  const rawRecord = await RawJob.create({
    external_id: normalized.external_id,
    source: normalized.source,
    raw_payload: normalized,
    fetched_at: new Date(),
    is_processed: false,
  });

  try {
    const tags = Array.from(new Set([...normalized.tags, ...extractTags(normalized.description)]));
    const popularityScore = calculatePopularityScore({ ...normalized, tags });

    await NormalizedJob.create({
      raw_job_id: rawRecord.id,
      title: normalized.title,
      company: normalized.company,
      location: normalized.location,
      country_code: normalized.country_code,
      salary_min: normalized.salary_min,
      salary_max: normalized.salary_max,
      salary_currency: normalized.salary_currency,
      description: normalized.description,
      tags,
      is_remote: normalized.is_remote,
      source: normalized.source,
      source_url: normalized.source_url,
      date_posted: normalized.date_posted,
      popularity_score: popularityScore,
      is_trending: false,
    });
    return { saved: true };
  } catch (err) {
    if (err.code === '23505') return { saved: false, reason: 'duplicate' };
    throw err;
  }
}

async function runAdzunaIngestion(countries = SUPPORTED_COUNTRIES) {
  if (!ADZUNA_APP_ID || !ADZUNA_API_KEY) {
    logger.error({ message: 'Adzuna credentials missing. Set ADZUNA_APP_ID and ADZUNA_API_KEY.' });
    return;
  }

  logger.info({ message: 'Adzuna ingestion started', countries, pages: PAGES_PER_RUN });

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const country of countries) {
    logger.info({ message: 'Fetching country', country });

    for (let page = 1; page <= PAGES_PER_RUN; page++) {
      try {
        const results = await fetchPage(country, page);

        if (!results.length) {
          logger.info({ message: 'No more results', country, page });
          break;
        }

        logger.info({ message: 'Fetched page', country, page, count: results.length });

        for (const rawJob of results) {
          try {
            const normalized = mapAdzunaJob(rawJob, country);
            const { saved } = await saveJobPair(normalized);
            if (saved) totalSaved++;
            else totalSkipped++;
          } catch (err) {
            totalErrors++;
            logger.error({
              message: 'Error saving Adzuna job',
              country,
              page,
              jobId: rawJob.id,
              error: err.message,
            });
          }
        }
      } catch (err) {
        totalErrors++;
        logger.error({
          message: 'Error fetching Adzuna page',
          country,
          page,
          error: err.message,
          status: err.response?.status,
        });
      }
    }
  }

  logger.info({
    message: 'Adzuna ingestion complete',
    saved: totalSaved,
    skipped: totalSkipped,
    errors: totalErrors,
  });

  return { totalSaved, totalSkipped, totalErrors };
}

module.exports = { runAdzunaIngestion };
