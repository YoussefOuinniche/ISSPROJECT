const { supabaseAdmin } = require('../config/database');

async function getOrCreateProfileId(userId) {
  // Try to find existing profile
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing?.id) return existing.id;

  // Auto-create a minimal profile so chat sessions can be saved
  const { data: created } = await supabaseAdmin
    .from('profiles')
    .insert([{ user_id: userId }])
    .select('id')
    .single();
  return created?.id ?? null;
}

// GET /api/user/ai/history
const getChatHistory = async (req, res) => {
  try {
    const profileId = await getOrCreateProfileId(req.user.id);
    if (!profileId) return res.json({ success: true, data: { messages: [] } });

    // Get the most recent active session
    const { data: session } = await supabaseAdmin
      .from('chat_sessions')
      .select('id')
      .eq('profile_id', profileId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) return res.json({ success: true, data: { messages: [] } });

    const { data: messages, error } = await supabaseAdmin
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const formatted = (messages || []).map(m => ({
      id:         m.id,
      role:       m.role,
      message:    m.content,
      created_at: m.created_at,
    }));

    return res.json({ success: true, data: { messages: formatted } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/user/ai/chat
const sendChatMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    const profileId = await getOrCreateProfileId(req.user.id);

    // Get or create an active session
    let sessionId;
    if (profileId) {
      const { data: existing } = await supabaseAdmin
        .from('chat_sessions')
        .select('id')
        .eq('profile_id', profileId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        sessionId = existing.id;
      } else {
        const { data: created } = await supabaseAdmin
          .from('chat_sessions')
          .insert([{ profile_id: profileId, title: 'AI Chat', status: 'active' }])
          .select('id')
          .single();
        sessionId = created?.id;
      }

      // Persist the user message
      if (sessionId) {
        await supabaseAdmin.from('chat_messages').insert([{
          session_id: sessionId,
          role: 'user',
          content: message.trim(),
          metadata: {},
        }]);
      }
    }

    // Forward to Python AI service if available, otherwise return a placeholder
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    let aiResponse = 'I am here to help you build your career path. Tell me about your goals and I will guide you.';
    let messageId = null;

    try {
      const aiRes = await fetch(`${aiServiceUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ai-service-token': process.env.AI_SERVICE_TOKEN || '',
        },
        body: JSON.stringify({ message: message.trim(), user_id: req.user.id }),
        signal: AbortSignal.timeout(180000),
      });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        aiResponse = aiData.response || aiData.message || aiResponse;
        messageId  = aiData.message_id || null;
      }
    } catch {
      // AI service unavailable — use fallback response
    }

    // Persist the assistant message
    if (sessionId) {
      const { data: savedMsg } = await supabaseAdmin
        .from('chat_messages')
        .insert([{ session_id: sessionId, role: 'assistant', content: aiResponse, metadata: {} }])
        .select('id')
        .single();
      messageId = messageId || savedMsg?.id || null;
    }

    return res.json({
      success: true,
      data: {
        response: aiResponse,
        message_id: messageId,
        conversation_summary: { skills_mentioned: [], goals_mentioned: [] },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/user/ai/jobs/search?role=&limit=
const searchJobs = async (req, res) => {
  try {
    const { role, limit = 10, ai_summary = false } = req.query;
    if (!role?.trim()) {
      return res.status(422).json({ success: false, error: 'role query parameter is required' });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const params = new URLSearchParams({ role: role.trim(), limit: String(limit), ai_summary: String(ai_summary) });

    let data = [];
    try {
      const aiRes = await fetch(`${aiServiceUrl}/api/jobs/search?${params}`, {
        signal: AbortSignal.timeout(20000),
        headers: { 'x-ai-service-token': process.env.AI_SERVICE_TOKEN || '' },
      });
      if (aiRes.ok) {
        const json = await aiRes.json();
        data = json.results || [];
      }
    } catch {
      // AI service unavailable — return empty
    }

    return res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/user/ai/jobs/trending?country=
const getTrendingJobs = async (req, res) => {
  try {
    const { country = 'global', limit = 15 } = req.query;
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const params = new URLSearchParams({ country, limit: String(limit) });

    let data = [];
    try {
      const aiRes = await fetch(`${aiServiceUrl}/api/jobs/trending?${params}`, {
        signal: AbortSignal.timeout(20000),
        headers: { 'x-ai-service-token': process.env.AI_SERVICE_TOKEN || '' },
      });
      if (aiRes.ok) {
        const json = await aiRes.json();
        data = json.results || [];
      }
    } catch {
      // AI service unavailable — return empty
    }

    return res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/user/ai/roadmap
const generateRoadmap = async (req, res) => {
  try {
    const { role, targetRole, timeframeMonths } = req.body;
    const resolvedRole = (role || targetRole || '').trim();
    if (!resolvedRole) {
      return res.status(422).json({ success: false, error: 'role is required' });
    }

    const profileId = await getProfileId(req.user.id);
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    // Fetch the user's current skills to pass to the AI
    let userSkills = [];
    if (profileId) {
      const { data: skills } = await supabaseAdmin
        .from('user_skills')
        .select('skills(name), proficiency_level')
        .eq('profile_id', profileId);
      userSkills = (skills || []).map(s => ({
        skill: s.skills?.name || '',
        level: s.proficiency_level || 'beginner',
      })).filter(s => s.skill);
    }

    let roadmapData = null;
    try {
      const aiRes = await fetch(`${aiServiceUrl}/ai/generate-roadmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ai-service-token': process.env.AI_SERVICE_TOKEN || '',
        },
        body: JSON.stringify({
          role: resolvedRole,
          user_profile: {
            skills: userSkills,
            timeframe_months: timeframeMonths || null,
          },
          // Ask the AI service to populate per-step learning resources for
          // multi-platform display in the mobile UI. The service should
          // return each step with a `resources` array of
          // { provider: 'coursera'|'udemy'|'youtube'|'edx'|'other',
          //   title: string, url: string, free?: boolean }.
          // Mobile renders search-URL fallbacks if missing, so ignoring this
          // flag is safe — UI never breaks.
          include_resources: true,
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (aiRes.ok) {
        roadmapData = await aiRes.json();
      } else {
        const errBody = await aiRes.json().catch(() => ({}));
        return res.status(aiRes.status).json({ success: false, error: errBody.detail || 'AI service error' });
      }
    } catch (err) {
      return res.status(503).json({ success: false, error: 'AI service unavailable. Make sure it is running.' });
    }

    return res.json({ success: true, data: roadmapData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

function normalizeOllamaBaseUrl(rawUrl) {
  return String(rawUrl || 'http://localhost:11434').trim().replace(/\/+$/, '');
}

async function requestOllamaCompletion({ baseUrl, model, messages, temperature, signal }) {
  const normalizedBaseUrl = normalizeOllamaBaseUrl(baseUrl);
  const openAiBaseUrl = normalizedBaseUrl.endsWith('/v1')
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/v1`;

  const response = await fetch(`${openAiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature }),
    signal,
  });

  if (!response.ok) {
    return { ok: false, status: response.status, content: '' };
  }

  const data = await response.json();
  return {
    ok: true,
    status: response.status,
    content: data?.choices?.[0]?.message?.content?.trim() || '',
  };
}

// POST /api/user/ai/complete
// Proxies raw completion requests through the backend so mobile devices never
// call Ollama directly.
const ollamaComplete = async (req, res) => {
  try {
    const { system_prompt, messages, temperature = 0.7 } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages array is required' });
    }

    const ollamaBaseUrl = process.env.OLLAMA_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL_CHAT || process.env.OLLAMA_MODEL || 'qwen2.5:7b';

    const fullMessages = system_prompt
      ? [{ role: 'system', content: system_prompt }, ...messages]
      : messages;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);

    let content = '';
    try {
      const completion = await requestOllamaCompletion({
        baseUrl: ollamaBaseUrl,
        model,
        messages: fullMessages,
        temperature,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!completion.ok) {
        return res.status(502).json({ success: false, error: `AI completion HTTP ${completion.status}` });
      }
      content = completion.content;
    } catch (err) {
      clearTimeout(timer);
      return res.status(504).json({ success: false, error: 'AI completion request timed out or is unreachable' });
    }

    return res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getChatHistory, sendChatMessage, searchJobs, getTrendingJobs, generateRoadmap, ollamaComplete };
