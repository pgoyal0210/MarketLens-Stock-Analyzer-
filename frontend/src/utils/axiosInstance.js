import axios from 'axios';
import { API_BASE_URL } from '../config';

/**
 * Shared axios instance.
 * - baseURL points to the local backend in dev, Render in prod (via config.js).
 * - A request interceptor automatically attaches the JWT from localStorage
 *   as an Authorization: Bearer header so we don't need withCredentials / cookies.
 */
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
