const axios = require('axios');
const logger = require('../utils/logger');

const BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL    = process.env.OLLAMA_MODEL    || 'qwen2.5:7b';
const TIMEOUT  = 180_000;

async function ollamaGenerate(prompt, options = {}) {
  const response = await axios.post(
    `${BASE_URL}/api/generate`,
    {
      model: MODEL,
      prompt,
      stream: false,
      options: { num_predict: options.maxTokens ?? 256, ...options.modelOptions },
    },
    { timeout: TIMEOUT }
  );
  return response.data.response ?? '';
}

async function summarizeJob(description) {
  if (!description) return null;
  try {
    const prompt =
      `Write a 2-sentence plain-English summary of the following job description. ` +
      `Be concise and factual. Do not include headers or bullet points.\n\n${description.slice(0, 2000)}`;
    const text = await ollamaGenerate(prompt, { maxTokens: 150 });
    return text.trim() || null;
  } catch (err) {
    logger.error('[ollama] summarizeJob failed', { error: err.message });
    return null;
  }
}

async function extractJobTags(title, description) {
  const empty = { skills: [], seniority: '', work_type: '' };
  try {
    const prompt =
      `Extract structured metadata from this job posting. ` +
      `Respond ONLY with valid JSON matching this exact shape — no markdown, no explanation:\n` +
      `{"skills":["string"],"seniority":"junior|mid|senior|lead|unknown","work_type":"remote|onsite|hybrid|unknown"}\n\n` +
      `Title: ${title}\nDescription: ${(description || '').slice(0, 1500)}`;

    const raw = await ollamaGenerate(prompt, { maxTokens: 200 });

    // Extract first JSON object from the response
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return empty;

    const parsed = JSON.parse(match[0]);
    return {
      skills:    Array.isArray(parsed.skills)    ? parsed.skills.map(String)  : [],
      seniority: typeof parsed.seniority === 'string' ? parsed.seniority      : 'unknown',
      work_type: typeof parsed.work_type === 'string' ? parsed.work_type      : 'unknown',
    };
  } catch (err) {
    logger.error('[ollama] extractJobTags failed', { error: err.message });
    return empty;
  }
}

async function analyzeTrends(jobs) {
  if (!jobs || jobs.length === 0) return null;
  try {
    const sample = jobs.slice(0, 50);
    const jobList = sample
      .map((j) => `- ${j.title}${j.tags?.length ? ` [${j.tags.slice(0, 5).join(', ')}]` : ''}`)
      .join('\n');

    const prompt =
      `You are a job market analyst. Based on the following list of recent job postings, ` +
      `write a 3-5 sentence market insight paragraph covering demand trends, ` +
      `in-demand skills, and any notable patterns.\n\nJobs:\n${jobList}`;

    const text = await ollamaGenerate(prompt, { maxTokens: 350 });
    return text.trim() || null;
  } catch (err) {
    logger.error('[ollama] analyzeTrends failed', { error: err.message });
    return null;
  }
}

module.exports = { ollamaGenerate, summarizeJob, extractJobTags, analyzeTrends };
