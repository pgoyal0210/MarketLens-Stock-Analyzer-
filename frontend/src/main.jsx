import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// NOTE: StrictMode removed intentionally — it causes double-mount in dev which
// triggers the WebSocket to connect/disconnect in a loop. Re-enable for production audits.
createRoot(document.getElementById('root')).render(
  <App />
)
