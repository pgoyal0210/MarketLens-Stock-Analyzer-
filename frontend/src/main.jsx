import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

// Set up global request interceptor for JWT authentication headers
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// NOTE: StrictMode removed intentionally — it causes double-mount in dev which
// triggers the WebSocket to connect/disconnect in a loop. Re-enable for production audits.
createRoot(document.getElementById('root')).render(
  <App />
)
