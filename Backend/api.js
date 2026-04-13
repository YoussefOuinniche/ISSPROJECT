import axios from 'axios';

// This is the bridge between your Frontend (3000) and Backend (4000)
const api = axios.create({
  baseURL: 'http://localhost:4000', 
  withCredentials: true, // Required for your app.js CORS settings
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;