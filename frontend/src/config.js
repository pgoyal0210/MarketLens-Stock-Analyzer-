// In development (npm run dev), these fall back to the local backend.
// In production, set VITE_API_BASE_URL and VITE_SOCKET_URL in your .env / hosting env vars.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export { API_BASE_URL, SOCKET_URL };
