'use strict';
/**
 * qwenController.js
 * Proxy to Qwen 2.5-14B via its OpenAI-compatible REST API.
 * Set QWEN_API_KEY and QWEN_BASE_URL in .env to activate the real model.
 * Without a key the endpoints return deterministic mock responses so the
 * frontend can be developed and tested offline.
 *
 * ENV vars:
 *   QWEN_API_KEY   — your Alibaba Cloud / DashScope / Together.ai key
 *   QWEN_BASE_URL  — base URL for the OpenAI-compatible endpoint
 *                    default: https://dashscope.aliyuncs.com/compatible-mode/v1
 *   QWEN_MODEL     — model ID (default: qwen2.5-14b-instruct)
 */

const axios = require('axios');

const QWEN_BASE   = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const QWEN_MODEL  = process.env.QWEN_MODEL    || 'qwen2.5-14b-instruct';
const QWEN_KEY    = process.env.QWEN_API_KEY  || '';
const MOCK_MODE   = !QWEN_KEY;

// ─── Shared Qwen API caller ───────────────────────────────────────────────────

async function callQwen({ systemPrompt, messages, temperature = 0.7, maxTokens = 1200 }) {
  const payload = {
    model: QWEN_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };

  const response = await axios.post(`${QWEN_BASE}/chat/completions`, payload, {
    headers: {
      Authorization: `Bearer ${QWEN_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 45_000,
  });

  const choice = response.data.choices?.[0];
  if (!choice) throw new Error('Qwen returned no choices');

  return {
    content: choice.message?.content ?? '',
    usage: response.data.usage ?? {},
    model: response.data.model ?? QWEN_MODEL,
  };
}

// ─── Mock helpers (used when no API key is configured) ────────────────────────

function mockChat(userMessage) {
  const msg = (userMessage || '').toLowerCase();
  if (msg.includes('name') || msg.includes('who'))
    return "Got it! What's your target role — the job title you're aiming for?";
  if (msg.includes('react') || msg.includes('node') || msg.includes('python'))
    return "Nice stack! How many years of professional experience do you have?";
  if (msg.includes('year') || /\d/.test(msg))
    return "Understood. Can you rate your proficiency in state management on a scale of 1-10?";
  return "Thanks for that. Let's move on — can you explain the difference between REST and GraphQL?";
}

function mockScore(answer) {
  const words = answer.trim().split(/\s+/).length;
  if (words < 3)  return 2;
  if (words < 10) return 5;
  if (words < 25) return 7;
  return 9;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/qwen/chat
 * Body: { systemPrompt, messages: [{role, content}], temperature? }
 * Returns: { content, usage, model, mock }
 */
async function chat(req, res, next) {
  try {
    const { systemPrompt = '', messages = [], temperature = 0.7 } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages array is required' });
    }

    if (MOCK_MODE) {
      const last = messages[messages.length - 1]?.content ?? '';
      return res.json({
        success: true,
        content: mockChat(last),
        usage:   { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        model:   'mock',
        mock:    true,
      });
    }

    const result = await callQwen({ systemPrompt, messages, temperature });
    res.json({ success: true, ...result, mock: false });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/qwen/score
 * Body: { question, answer, role }
 * Returns: { score (1-10), feedback, mock }
 * Score reflects how well the candidate answered the technical question.
 */
async function score(req, res, next) {
  try {
    const { question = '', answer = '', role = '' } = req.body;

    if (!answer.trim()) {
      return res.status(400).json({ success: false, error: 'answer is required' });
    }

    if (MOCK_MODE) {
      const s = mockScore(answer);
      return res.json({
        success:  true,
        score:    s,
        feedback: s >= 7 ? 'Good answer.' : s >= 4 ? 'Partial understanding.' : 'Needs more depth.',
        mock:     true,
      });
    }

    const system = `You are a strict technical interviewer for ${role || 'software engineering'} positions.
Evaluate the candidate's answer to the following question and return a JSON object with:
  "score": integer 1-10 (10 = perfect, 1 = completely wrong or no answer)
  "feedback": one sentence explaining the score
Respond with ONLY valid JSON — no markdown, no explanation outside the object.`;

    const userMsg = `Question: ${question}\n\nCandidate answer: ${answer}`;
    const result  = await callQwen({
      systemPrompt: system,
      messages: [{ role: 'user', content: userMsg }],
      temperature: 0.2,
      maxTokens: 200,
    });

    let parsed;
    try {
      const cleaned = result.content.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { score: mockScore(answer), feedback: result.content.slice(0, 120) };
    }

    res.json({
      success:  true,
      score:    Math.min(10, Math.max(1, Number(parsed.score) || 5)),
      feedback: parsed.feedback || '',
      mock:     false,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/qwen/roadmap
 * Body: { name, role, basicScores, advancedScores, educationLevel, yearsExperience }
 * Returns: { steps, mock }
 * steps: Array<{ order, title, description, isWeak }>
 */
async function generateRoadmap(req, res, next) {
  try {
    const {
      name            = 'User',
      role            = 'Software Engineer',
      basicScores     = [],
      advancedScores  = [],
      educationLevel  = 'bachelor',
      yearsExperience = 0,
    } = req.body;

    // Compute average score
    const allScores = [...basicScores, ...advancedScores];
    const avg = allScores.length
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 5;

    // Determine weak areas (score < 6)
    const weakCount = allScores.filter(s => s < 6).length;

    const stepCount = Math.min(10, Math.max(1, weakCount || Math.ceil((10 - avg))));

    if (MOCK_MODE) {
      const steps = Array.from({ length: stepCount }, (_, i) => ({
        order:       i + 1,
        title:       `Learn ${['Fundamentals', 'State Management', 'Testing', 'Performance', 'Security',
                               'CI/CD', 'System Design', 'APIs', 'Databases', 'DevOps'][i] || `Topic ${i + 1}`}`,
        description: `Strengthen your understanding of this core area for ${role}.`,
        isWeak:      true,
      }));
      return res.json({ success: true, steps, avg, mock: true });
    }

    const system = `You are a career roadmap expert. Given a candidate's assessment scores,
generate a learning roadmap as JSON. Return ONLY valid JSON, no markdown.
Schema:
{
  "steps": [
    {
      "order": 1,
      "title": "short topic name",
      "description": "one sentence why this is needed for the target role",
      "isWeak": true
    }
  ]
}
Rules:
- Include ${stepCount} steps total, ordered from most fundamental to most advanced
- Focus on areas where scores were low
- Tailor to the role: ${role}
- Keep titles concise (3-6 words)`;

    const userMsg = `
Candidate: ${name}
Role: ${role}
Education: ${educationLevel}, Experience: ${yearsExperience} years
Basic assessment scores (1-10): ${basicScores.join(', ') || 'N/A'}
Advanced assessment scores (1-10): ${advancedScores.join(', ') || 'N/A'}
Average score: ${avg.toFixed(1)}/10
Number of roadmap steps needed: ${stepCount}
Generate the roadmap JSON now.`;

    const result = await callQwen({
      systemPrompt: system,
      messages: [{ role: 'user', content: userMsg }],
      temperature: 0.4,
      maxTokens: 800,
    });

    let parsed;
    try {
      const cleaned = result.content.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback steps
      parsed = {
        steps: Array.from({ length: stepCount }, (_, i) => ({
          order: i + 1,
          title: `Step ${i + 1}`,
          description: `Focus area for ${role}`,
          isWeak: true,
        })),
      };
    }

    res.json({
      success:         true,
      steps:           parsed.steps || [],
      avg,
      mock:            false,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/qwen/status
 * Returns whether the real Qwen API is configured.
 */
function status(req, res) {
  res.json({
    success:    true,
    configured: !MOCK_MODE,
    model:      MOCK_MODE ? 'mock' : QWEN_MODEL,
    baseUrl:    MOCK_MODE ? null : QWEN_BASE,
  });
}

module.exports = { chat, score, generateRoadmap, status };
