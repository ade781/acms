import axios from 'axios';

// Create configured Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('arff_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized and normalize data envelope
api.interceptors.response.use(
  (response) => {
    // If backend uses standard envelope { success: true, data: ... }
    // Attach top-level aliases to response.data so both res.data.key and res.data.data.key work
    if (
      response.data &&
      typeof response.data === 'object' &&
      'data' in response.data &&
      response.data.data !== null &&
      typeof response.data.data === 'object'
    ) {
      if (Array.isArray(response.data.data)) {
        // If data is array (e.g. list of personnel/incidents)
        response.data.items = response.data.data;
      } else {
        Object.keys(response.data.data).forEach((key) => {
          if (!(key in response.data)) {
            response.data[key] = response.data.data[key];
          }
        });
      }
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and broadcast logout if unauthorized
      localStorage.removeItem('arff_token');
      localStorage.removeItem('arff_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
