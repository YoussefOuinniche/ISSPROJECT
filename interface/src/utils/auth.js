// Auth utility functions
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
  localStorage.removeItem('user');
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};
