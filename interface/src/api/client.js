const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function buildUrl(path, params) {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: 'Invalid JSON response' };
  }
}

function normalizeError(status, body, fallbackMessage) {
  return {
    status,
    message: body?.message || fallbackMessage || 'Request failed',
    details: body,
  };
}

export async function request(path, { method = 'GET', body, params, headers = {}, signal } = {}) {
  const token = localStorage.getItem('token');

  const response = await fetch(buildUrl(path, params), {
    method,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    throw normalizeError(response.status, payload, `Request failed with status ${response.status}`);
  }

  if (payload?.success === false) {
    throw normalizeError(response.status, payload, payload.message || 'Request unsuccessful');
  }

  return payload?.data ?? payload;
}

export default { request };
