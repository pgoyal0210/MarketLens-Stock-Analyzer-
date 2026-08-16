// Deployment URLs disabled for local development debugging.
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://marketlens-stock-analyzer.onrender.com';
// const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://marketlens-stock-analyzer.onrender.com';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export { API_BASE_URL, SOCKET_URL };
