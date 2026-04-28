/**
 * jobInfo.scraper.js
 * Scrapes real job role metadata from public sources.
 *
 * Sources (no auth required):
 *  1. Indeed career pages  — skills, salary, description
 *  2. Glassdoor career overview — duties, skills
 *  3. LinkedIn public job search — skill tags from listings
 *
 * Falls back gracefully if a source blocks or times out.
 */

const axios  = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

const TIMEOUT = 12_000;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// Known skill keywords for frequency analysis
const SKILL_KEYWORDS = [
  'React','Vue','Angular','TypeScript','JavaScript','Node.js','Python','Java','Go','Rust',
  'C#','.NET','PHP','Ruby','Swift','Kotlin','Flutter','Dart','Scala','R',
  'SQL','PostgreSQL','MySQL','MongoDB','Redis','Elasticsearch','Cassandra','DynamoDB',
  'AWS','Azure','GCP','Docker','Kubernetes','Terraform','Ansible','Jenkins','CI/CD',
  'Git','Linux','Bash','REST','GraphQL','gRPC','Microservices','Kafka','RabbitMQ',
  'TensorFlow','PyTorch','scikit-learn','Pandas','NumPy','Spark','Hadoop',
  'Figma','Sketch','Tailwind','SASS','CSS','HTML','Next.js','Nuxt','Django',
  'Flask','FastAPI','Spring','Laravel','Express','NestJS',
];

function extractSkillsFromText(text) {
  if (!text) return [];
  const found = new Map();
  const lower = text.toLowerCase();
  for (const skill of SKILL_KEYWORDS) {
    const re = new RegExp(`\\b${skill.replace('.', '\\.').replace('+', '\\+')}\\b`, 'i');
    if (re.test(lower)) {
      found.set(skill, (found.get(skill) || 0) + 1);
    }
  }
  return Array.from(found.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);
}

// ── 1. Indeed career page ─────────────────────────────────────────────────────
async function scrapeIndeed(titleSlug) {
  // indeed.com/career/[title] returns a role overview page
  const slug  = titleSlug.replace(/-/g, '-');
  const url   = `https://www.indeed.com/career/${encodeURIComponent(slug)}`;

  try {
    const { data } = await axios.get(url, { headers: HEADERS, timeout: TIMEOUT });
    const $ = cheerio.load(data);

    const description = $('[data-testid="JobDescription"], .jobsearch-JobComponent-description, .icl-u-xs-mb--sm')
      .first().text().trim().slice(0, 800);

    // Skills section on Indeed career pages
    const skills = [];
    $('[data-testid="SkillsList"] li, .css-1m0gkmt li, [class*="skill"] li').each((_, el) => {
      const t = $(el).text().trim();
      if (t && t.length < 60) skills.push(t);
    });

    const salaryText = $('[data-testid="SalaryEstimate"], [class*="salary"]').first().text().trim();

    return { description, skills: skills.slice(0, 8), salaryText, source: 'indeed' };
  } catch (err) {
    logger.debug(`[jobInfo] Indeed scrape failed for ${titleSlug}: ${err.message}`);
    return null;
  }
}

// ── 2. LinkedIn public job search (no auth) ───────────────────────────────────
async function scrapeLinkedIn(title) {
  const query  = encodeURIComponent(title);
  const url    = `https://www.linkedin.com/jobs/search/?keywords=${query}&sortBy=DD`;

  try {
    const { data } = await axios.get(url, { headers: HEADERS, timeout: TIMEOUT });
    const $ = cheerio.load(data);

    const descriptions = [];
    $('.base-card__full-link, .job-search-card__title').each((_, el) => {
      const t = $(el).closest('.base-card').find('.base-card__full-link, [class*="description"]').text();
      if (t) descriptions.push(t);
    });

    // Also grab skills from job cards
    const allText = descriptions.join(' ');
    const skills  = extractSkillsFromText(allText).slice(0, 10);

    // Grab job card snippets for description
    const snippet = $('.base-search-card__metadata, .job-search-card__snippet')
      .first().text().trim().slice(0, 500);

    return { description: snippet || null, skills, source: 'linkedin' };
  } catch (err) {
    logger.debug(`[jobInfo] LinkedIn scrape failed for ${title}: ${err.message}`);
    return null;
  }
}

// ── 3. Glassdoor career overview ─────────────────────────────────────────────
async function scrapeGlassdoor(title) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const url  = `https://www.glassdoor.com/Career/${slug}-career_KO0,${slug.length}.htm`;

  try {
    const { data } = await axios.get(url, { headers: HEADERS, timeout: TIMEOUT });
    const $ = cheerio.load(data);

    const description = $('[data-test="career-overview-description"], .career-overview__description, .d-flex.flex-column p')
      .first().text().trim().slice(0, 700);

    const skills = [];
    $('[data-test="career-skills"] li, .skill-pill, [class*="skill"]').each((_, el) => {
      const t = $(el).text().trim();
      if (t && t.length < 60) skills.push(t);
    });

    return { description: description || null, skills: skills.slice(0, 8), source: 'glassdoor' };
  } catch (err) {
    logger.debug(`[jobInfo] Glassdoor scrape failed for ${title}: ${err.message}`);
    return null;
  }
}

// ── 4. Remotive.io — remote-specific job info ─────────────────────────────────
async function scrapeRemotive(title) {
  const query = encodeURIComponent(title);
  const url   = `https://remotive.com/remote-jobs/software-dev?search=${query}`;

  try {
    const { data } = await axios.get(url, { headers: HEADERS, timeout: TIMEOUT });
    const $     = cheerio.load(data);
    const texts = [];
    $('[class*="job-description"], [class*="description"]').each((_, el) => {
      texts.push($(el).text());
    });
    const allText = texts.join(' ');
    const skills  = extractSkillsFromText(allText).slice(0, 10);
    return { description: null, skills, source: 'remotive' };
  } catch (err) {
    logger.debug(`[jobInfo] Remotive scrape failed for ${title}: ${err.message}`);
    return null;
  }
}

// ── Main export ──────────────────────────────────────────────────────────────
/**
 * Scrape job role info from multiple sources in parallel.
 * Returns merged, deduplicated skills + best description found.
 */
async function scrapeJobInfo(titleSlug, jobTitle) {
  const title = jobTitle || titleSlug.replace(/-/g, ' ');

  // Run all scrapers in parallel, ignore individual failures
  const [indeed, linkedin, glassdoor, remotive] = await Promise.allSettled([
    scrapeIndeed(titleSlug),
    scrapeLinkedIn(title),
    scrapeGlassdoor(title),
    scrapeRemotive(title),
  ]);

  const results = [indeed, linkedin, glassdoor, remotive]
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);

  // Merge skills — frequency across sources wins
  const skillFreq = new Map();
  for (const r of results) {
    for (const s of (r.skills || [])) {
      skillFreq.set(s, (skillFreq.get(s) || 0) + 1);
    }
  }
  const mergedSkills = Array.from(skillFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s)
    .slice(0, 10);

  // Best description: longest one found
  const description = results
    .map(r => r.description)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0] || null;

  const sources = results.map(r => r.source);
  logger.info(`[jobInfo] scraped ${title}: ${mergedSkills.length} skills, desc=${!!description}, sources=${sources}`);

  return { skills: mergedSkills, description, sources };
}

module.exports = { scrapeJobInfo, extractSkillsFromText };
