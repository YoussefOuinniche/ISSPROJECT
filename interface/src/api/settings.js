import client from './client';

// Settings/account/notification calls were migrated to generated OpenAPI hooks.
// This module now only serves legacy user-list management helpers.

export function getUsers({ query, role, page, pageSize }) {
  return client.request('/api/public/admin/users', { params: { q: query, role, page, pageSize } });
}

export function updateUser({ id, patch }) {
  return client.request(`/api/public/admin/users/${id}`, { method: 'PATCH', body: patch });
}

export function deleteUser(id) {
  return client.request(`/api/public/admin/users/${id}`, { method: 'DELETE' });
}
