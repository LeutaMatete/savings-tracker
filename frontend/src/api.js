import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized = () => {};
export function setOnUnauthorized(fn) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.friendlyMessage = 'Cannot reach the server. Check your connection and try again.';
    } else if (error.response.status === 401) {
      error.friendlyMessage = error.response.data?.error || 'Session expired, please log in again';
      onUnauthorized();
    } else {
      error.friendlyMessage = error.response.data?.error || 'Something went wrong';
    }
    return Promise.reject(error);
  }
);

export default api;