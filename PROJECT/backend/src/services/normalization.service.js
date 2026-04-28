const NormalizedJob = require('../models/NormalizedJob');
const logger = require('../utils/logger');

const TECH_KEYWORDS = [
  'React', 'Node.js', 'Python', 'Docker', 'AWS', 'TypeScript', 'SQL',
  'JavaScript', 'Java', 'Go', 'Kubernetes', 'MongoDB', 'PostgreSQL',
  'Redis', 'GraphQL', 'REST', 'Angular', 'Vue', 'Linux', 'Git',
  'CI/CD', 'Azure', 'GCP', 'Machine Learning', 'AI', 'TensorFlow',
  'PHP', 'Laravel', 'Django', 'Flask', 'Spring', 'Ruby', 'Rails',
  'Swift', 'Kotlin', 'Android', 'iOS', 'Flutter', 'React Native',
  'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'Elasticsearch',
  'Microservices', 'Agile', 'Scrum', 'Jira', 'HTML', 'CSS', 'Sass',
  'Next.js', 'Express', 'FastAPI', 'NestJS', 'MySQL', 'SQLite',
  'Hadoop', 'Spark', 'Kafka', 'RabbitMQ', 'WebSocket', 'OAuth',
  'C++', 'C#', '.NET', 'Rust', 'Scala', 'R',
];

function extractTags(text) {
  if (!text) return [];
  const found = new Set();
  for (const keyword of TECH_KEYWORDS) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      found.add(keyword);
    }
  }
  return Array.from(found);
}

function calculatePopularityScore(job) {
  let score = 0;

  // Recency: up to 50 pts, linear decay over 30 days
  if (job.date_posted) {
    const ageMs = Date.now() - new Date(job.date_posted).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    score += Math.max(0, 50 - ageDays * (50 / 30));
  }

  // Tag richness: 2 pts per tag, capped at 30
  const tags = Array.isArray(job.tags) ? job.tags : [];
  score += Math.min(30, tags.length * 2);

  // Remote-friendly bonus
  if (job.is_remote) score += 20;

  return Math.round(score);
}

async function normalizeAndSave(jobs) {
  let savedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  logger.info({ message: 'normalizeAndSave started', total: jobs.length });

  for (const job of jobs) {
    try {
      const extractedTags = extractTags(job.description);
      const mergedTags = Array.from(new Set([...(job.tags || []), ...extractedTags]));
      const popularityScore = calculatePopularityScore({ ...job, tags: mergedTags });

      await NormalizedJob.create({
        raw_job_id: job.raw_job_id ?? null,
        title: job.title,
        company: job.company,
        location: job.location,
        country_code: job.country_code,
        salary_min: job.salary_min ?? null,
        salary_max: job.salary_max ?? null,
        salary_currency: job.salary_currency ?? null,
        description: job.description,
        tags: mergedTags,
        is_remote: job.is_remote ?? false,
        source: job.source,
        source_url: job.source_url,
        date_posted: job.date_posted ?? null,
        popularity_score: popularityScore,
        is_trending: false,
      });

      savedCount++;
    } catch (err) {
      // Unique constraint violation — duplicate entry, skip silently
      if (err.code === '23505') {
        skippedCount++;
      } else {
        errorCount++;
        logger.error({
          message: 'Failed to save normalized job',
          error: err.message,
          source: job.source,
          source_url: job.source_url,
        });
      }
    }
  }

  logger.info({
    message: 'normalizeAndSave complete',
    saved: savedCount,
    skipped: skippedCount,
    errors: errorCount,
  });

  return { savedCount, skippedCount, errorCount };
}

module.exports = { normalizeAndSave, extractTags, calculatePopularityScore };
