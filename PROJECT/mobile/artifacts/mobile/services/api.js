import axios from 'axios';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(
      '[API Error]',
      error.config?.url,
      error.response?.status,
      error.message
    );
    return Promise.reject(error);
  }
);

export const getJobs = (params) =>
  api.get('/api/v1/jobs', { params }).then((r) => r.data);

export const getJobById = (id) =>
  api.get(`/api/v1/jobs/${id}`).then((r) => r.data);

export const getTrending = (region = 'global') =>
  api.get('/api/v1/trending', { params: { region } }).then((r) => r.data);

export const getMarketTrends = () =>
  api.get('/api/v1/market-trends').then((r) => r.data);

export default api;
