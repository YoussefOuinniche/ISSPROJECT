import client from './client';
import { mockRequest } from './mockServer';

const useMock = import.meta.env.VITE_USE_MOCK_API === 'true';

async function withFallback(action, realCall, payload) {
  if (useMock) {
    return mockRequest(action, payload);
  }
  try {
    return await realCall();
  } catch (error) {
    if (error?.status === 404 || error?.status === 405 || error?.status === 501) {
      return mockRequest(action, payload);
    }
    throw error;
  }
}

export function getSettings() {
  return withFallback('getSettings', () => client.request('/api/public/admin/settings'));
}

export function updateSettings(partial) {
  return withFallback(
    'updateSettings',
    () => client.request('/api/public/admin/settings', { method: 'PATCH', body: partial }),
    partial,
  );
}

export function getAdminAccount() {
  return withFallback('getAdminAccount', () => client.request('/api/public/admin/account'));
}

export function updateAdminAccount(partial) {
  return withFallback(
    'updateAdminAccount',
    () => client.request('/api/public/admin/account', { method: 'PATCH', body: partial }),
    partial,
  );
}

export function changePassword(payload) {
  return withFallback(
    'changePassword',
    () => client.request('/api/auth/change-password', { method: 'POST', body: payload }),
    payload,
  );
}

export function runAnalysis() {
  return withFallback(
    'runAnalysis',
    () => client.request('/api/public/admin/profile/recompute', { method: 'POST' }),
  );
}

export function getUsers({ query, role, page, pageSize }) {
  return withFallback(
    'getUsers',
    () => client.request('/api/public/admin/users', { params: { q: query, role, page, pageSize } }),
    { query, role, page, pageSize },
  );
}

export function updateUser({ id, patch }) {
  return withFallback(
    'updateUser',
    () => client.request(`/api/public/admin/users/${id}`, { method: 'PATCH', body: patch }),
    { id, patch },
  );
}

export function deleteUser(id) {
  return withFallback(
    'deleteUser',
    () => client.request(`/api/public/admin/users/${id}`, { method: 'DELETE' }),
    { id },
  );
}

export function getNotifications() {
  return withFallback('getNotifications', () => client.request('/api/public/admin/notifications'));
}

export function markAllNotificationsRead() {
  return withFallback(
    'markAllNotificationsRead',
    () => client.request('/api/public/admin/notifications/read-all', { method: 'POST' }),
  );
}
