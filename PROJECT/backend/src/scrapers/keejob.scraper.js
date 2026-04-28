const axios = require('axios');
const cheerio = require('cheerio');
const { extractTags, calculatePopularityScore } = require('../services/normalization.service');
const logger = require('../utils/logger');

const BASE_URL = 'https://www.keejob.com/offres-emploi/';
const SOURCE = 'keejob';
const COUNTRY_CODE = 'tn';
const MAX_PAGES = 3;
const REQUEST_DELAY_MS = 1500;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  Accept: 'text/html,application/xhtml+xml,application/xhtml;q=0.9,*/*;q=0.8',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  const cleaned = dateStr.trim();
  // Try direct parse first
  const direct = new Date(cleaned);
  if (!isNaN(direct.getTime())) return direct.toISOString();

  // French relative dates: "Il y a X jours", "Aujourd'hui", "Hier"
  const lower = cleaned.toLowerCase();
  const now = new Date();
  if (lower.includes("aujourd")) return now.toISOString();
  if (lower.includes("hier")) {
    now.setDate(now.getDate() - 1);
    return now.toISOString();
  }
  const daysMatch = lower.match(/il y a (\d+) jour/);
  if (daysMatch) {
    now.setDate(now.getDate() - parseInt(daysMatch[1], 10));
    return now.toISOString();
  }

  return new Date().toISOString();
}

function parseLocation(locationStr) {
  if (!locationStr) return 'Tunisie';
  return locationStr.trim().replace(/\s+/g, ' ');
}

function isRemote(title, description) {
  const combined = `${title} ${description}`.toLowerCase();
  return (
    combined.includes('télétravail') ||
    combined.includes('remote') ||
    combined.includes('à distance')
  );
}

async function fetchPage(page) {
  const params = { keywords: 'informatique' };
  if (page > 1) params.page = page;

  const response = await axios.get(BASE_URL, {
    params,
    headers: HEADERS,
    timeout: 20000,
  });
  return response.data;
}

function parseJobCards($) {
  const jobs = [];

  // Keejob uses .offer-container or .job-result-item for job cards
  $('article.offer, .offer-container, .job-result-item, .offre-emploi-item').each((_, el) => {
    const $el = $(el);

    const titleEl = $el.find('h3 a, h2 a, .offer-title a, .job-title a').first();
    const title = titleEl.text().trim();
    const relativeUrl = titleEl.attr('href') || '';
    const sourceUrl = relativeUrl.startsWith('http')
      ? relativeUrl
      : `https://www.keejob.com${relativeUrl}`;

    const company = $el
      .find('.company-name, .employer-name, .offer-company, [itemprop="hiringOrganization"]')
      .first()
      .text()
      .trim();

    const location = parseLocation(
      $el.find('.location, .offer-location, .job-location, [itemprop="jobLocation"]').first().text()
    );

    const dateText = $el
      .find('.date, .offer-date, .job-date, time, .posted-date')
      .first()
      .text()
      .trim();

    const description = $el.find('.offer-description, .job-description, .description').first().text().trim();

    if (!title || !sourceUrl || sourceUrl === 'https://www.keejob.com') return;

    const externalId = relativeUrl.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 100);

    jobs.push({
      external_id: externalId,
      source: SOURCE,
      title,
      company: company || 'Confidentiel',
      location: location || 'Tunisie',
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

async function scrapeKeejob() {
  logger.info({ message: 'Keejob scraper started', maxPages: MAX_PAGES });

  const allJobs = [];
  const seenUrls = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      logger.info({ message: 'Scraping Keejob page', page });
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

      logger.info({ message: 'Keejob page scraped', page, found: jobs.length, total: allJobs.length });

      if (page < MAX_PAGES) {
        await sleep(REQUEST_DELAY_MS);
      }
    } catch (err) {
      logger.error({ message: 'Error scraping Keejob page', page, error: err.message });
    }
  }

  logger.info({ message: 'Keejob scraper complete', totalJobs: allJobs.length });
  return allJobs;
}

module.exports = { scrapeKeejob };
