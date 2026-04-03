import client from './client';

export function getAdminOverview() {
  return client.request('/api/public/admin/overview');
}

export function getAdminUserDetail(id) {
  return client.request(`/api/public/admin/users/${id}`);
}

export function recomputeAdminUserAnalysis({ id, targetRole }) {
  return client.request(`/api/public/admin/users/${id}/recompute`, {
    method: 'POST',
    body: targetRole ? { targetRole } : {},
  });
}

export function refreshAdminTrendSignals() {
  return client.request('/api/public/admin/trends/refresh', {
    method: 'POST',
  });
}

export function getSkills({ limit = 200, category } = {}) {
  return client.request('/api/skills', {
    params: { limit, category },
  });
}

export function getSkillCategories() {
  return client.request('/api/skills/categories');
}

export function createSkill(payload) {
  return client.request('/api/skills', {
    method: 'POST',
    body: payload,
  });
}

export function updateSkill({ id, patch }) {
  return client.request(`/api/skills/${id}`, {
    method: 'PUT',
    body: patch,
  });
}

export function deleteSkill(id) {
  return client.request(`/api/skills/${id}`, {
    method: 'DELETE',
  });
}

export function getTrends({ limit = 120, domain } = {}) {
  return client.request('/api/trends', {
    params: { limit, domain },
  });
}

export function getTrendDomains() {
  return client.request('/api/trends/domains');
}

export function createTrend(payload) {
  return client.request('/api/trends', {
    method: 'POST',
    body: payload,
  });
}

export function updateTrend({ id, patch }) {
  return client.request(`/api/trends/${id}`, {
    method: 'PUT',
    body: patch,
  });
}

export function deleteTrend(id) {
  return client.request(`/api/trends/${id}`, {
    method: 'DELETE',
  });
}
