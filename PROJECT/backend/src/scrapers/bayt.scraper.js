const axios = require('axios');
const cheerio = require('cheerio');
const { extractTags, calculatePopularityScore } = require('../services/normalization.service');
const logger = require('../utils/logger');

const BASE_URL = 'https://www.bayt.com/en/tunisia/jobs/';
const SOURCE = 'bayt';
const COUNTRY_CODE = 'tn';
const MAX_PAGES = 3;
const REQUEST_DELAY_MS = 1500;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xhtml;q=0.9,*/*;q=0.8',
  Referer: 'https://www.bayt.com/',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  const cleaned = dateStr.trim().toLowerCase();

  const direct = new Date(dateStr.trim());
  if (!isNaN(direct.getTime())) return direct.toISOString();

  const now = new Date();
  if (cleaned.includes('today') || cleaned.includes('just now')) return now.toISOString();
  if (cleaned.includes('yesterday')) {
    now.setDate(now.getDate() - 1);
    return now.toISOString();
  }

  // "X days ago", "X hours ago"
  const daysMatch = cleaned.match(/(\d+)\s*day/);
  if (daysMatch) {
    now.setDate(now.getDate() - parseInt(daysMatch[1], 10));
    return now.toISOString();
  }
  const hoursMatch = cleaned.match(/(\d+)\s*hour/);
  if (hoursMatch) {
    now.setHours(now.getHours() - parseInt(hoursMatch[1], 10));
    return now.toISOString();
  }

  return new Date().toISOString();
}

function isRemote(title, description) {
  const combined = `${title} ${description}`.toLowerCase();
  return (
    combined.includes('remote') ||
    combined.includes('work from home') ||
    combined.includes('telecommute') ||
    combined.includes('télétravail')
  );
}

async function fetchPage(page) {
  const url = page === 1 ? BASE_URL : `${BASE_URL}?page=${page}`;
  const response = await axios.get(url, {
    headers: HEADERS,
    timeout: 20000,
  });
  return response.data;
}

function parseJobCards($) {
  const jobs = [];

  // Bayt uses li[data-js-job] or .media for job listings
  $('li[data-js-job], .media.u-block, .col-sm-8.t-small').each((_, el) => {
    const $el = $(el);

    const titleEl = $el.find('h2 a[data-js-aid], h2.t-large a, .media-heading a, h2 a').first();
    const title = titleEl.text().trim();
    const relativeUrl = titleEl.attr('href') || '';
    const sourceUrl = relativeUrl.startsWith('http')
      ? relativeUrl
      : `https://www.bayt.com${relativeUrl}`;

    const company = $el
      .find('[data-automation-id="job-card-company-name"], .t-default.t-black-l.u-block, span[data-js-aid="JobCardCompany"]')
      .first()
      .text()
      .trim();

    const location = $el
      .find('[data-automation-id="job-card-location"], .t-mute, span[data-js-aid="JobCardLocation"]')
      .first()
      .text()
      .trim();

    const dateText = $el
      .find('time, .t-xsmall, [data-automation-id="job-card-posted-at"]')
      .first()
      .text()
      .trim();

    const description = $el.find('.t-small, .job-description, .card-desc').first().text().trim();

    if (!title || !sourceUrl || sourceUrl === 'https://www.bayt.com') return;

    const externalId = relativeUrl
      .replace(/^\/|\/$/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(-100);

    jobs.push({
      external_id: externalId || `bayt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      source: SOURCE,
      title,
      company: company || 'Confidential',
      location: location || 'Tunisia',
      country_code: COUNTRY_CODE,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      description,
      tags: extractTags(`${title} ${description}`),
      is_remote: isRemote(title, description),
      source_url: sourceUrl,
      date_posted: parseDate(dateText),
    });
  });

  return jobs;
}

async function scrapeBayt() {
  logger.info({ message: 'Bayt scraper started', maxPages: MAX_PAGES });

  const allJobs = [];
  const seenUrls = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      logger.info({ message: 'Scraping Bayt page', page });
      const html = await fetchPage(page);
      const $ = cheerio.load(html);
      const jobs = parseJobCards($);

      if (!jobs.length) {
        logger.info({ message: 'No jobs found on page, stopping', page });
        break;
      }

      for (const job of jobs) {
        if (!seenUrls.has(job.source_url)) {
          seenUrls.add(job.source_url);
          job.popularity_score = calculatePopularityScore(job);
          allJobs.push(job);
        }
      }

      logger.info({ message: 'Bayt page scraped', page, found: jobs.length, total: allJobs.length });

      if (page < MAX_PAGES) {
        await sleep(REQUEST_DELAY_MS);
      }
    } catch (err) {
      logger.error({ message: 'Error scraping Bayt page', page, error: err.message });
    }
  }

  logger.info({ message: 'Bayt scraper complete', totalJobs: allJobs.length });
  return allJobs;
}

module.exports = { scrapeBayt };
