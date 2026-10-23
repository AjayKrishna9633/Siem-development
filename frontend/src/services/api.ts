import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('siem_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized and on a protected route, could clear session
      const currentPath = window.location.pathname;
      if (
        !currentPath.includes('/login') &&
        !currentPath.includes('/setup-super-admin') &&
        !currentPath.includes('/accept-invite') &&
        !currentPath.includes('/forgot-password')
      ) {
        localStorage.removeItem('siem_access_token');
        localStorage.removeItem('siem_user');
      }
    }
    return Promise.reject(error);
  },
);
