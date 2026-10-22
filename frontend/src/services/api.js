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

let isRedirecting = false;

// Response interceptor to handle 401 Unauthorized and normalize data envelope safely
api.interceptors.response.use(
  (response) => {
    // If backend uses standard envelope { success: true, message: ..., data: ... }
    // Wrap response.data with a safe Proxy fallback so callers can read res.data.data
    // or direct properties without mutating the envelope or shadowing standard keys.
    if (
      response.data &&
      typeof response.data === 'object' &&
      'data' in response.data &&
      response.data.data !== null &&
      typeof response.data.data === 'object'
    ) {
      const payload = response.data.data;
      response.data = new Proxy(response.data, {
        get(target, prop, receiver) {
          if (prop in target) {
            return Reflect.get(target, prop, receiver);
          }
          if (payload && typeof payload === 'object' && prop in payload) {
            return payload[prop];
          }
          return undefined;
        },
      });
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthLogin = error.config?.url?.includes('/auth/login');
      if (!isAuthLogin) {
        localStorage.removeItem('arff_token');
        localStorage.removeItem('arff_user');
        window.dispatchEvent(new CustomEvent('arff:unauthorized'));

        if (window.location.pathname !== '/login' && !isRedirecting) {
          isRedirecting = true;
          setTimeout(() => {
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            isRedirecting = false;
          }, 100);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
