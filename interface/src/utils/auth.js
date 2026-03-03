// Auth utility functions
const USER_STORAGE_KEY = 'user';
const USER_UPDATED_EVENT = 'skillpulse:user-updated';

const emitUserUpdated = () => {
  window.dispatchEvent(new Event(USER_UPDATED_EVENT));
};

const normalizeUser = (user) => {
  if (!user) return null;
  const fullName = user.fullName || user.full_name || '';
  return {
    ...user,
    fullName,
    full_name: fullName,
  };
};

export const setAuthTokens = (token, refreshToken) => {
  localStorage.setItem('token', token);
  localStorage.setItem('refreshToken', refreshToken);
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

export const clearAuthTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem(USER_STORAGE_KEY);
  emitUserUpdated();
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export const setUser = (user) => {
  const normalized = normalizeUser(user);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized));
  emitUserUpdated();
  return normalized;
};

export const getUser = () => {
  const userStr = localStorage.getItem(USER_STORAGE_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

export const updateUserProfile = (patch = {}) => {
  const currentUser = getUser() || {};
  const merged = normalizeUser({
    ...currentUser,
    ...patch,
  });
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(merged));
  emitUserUpdated();
  return merged;
};

export const USER_UPDATE_EVENT_NAME = USER_UPDATED_EVENT;
