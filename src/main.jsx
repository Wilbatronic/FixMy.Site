import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './Components/ErrorBoundary.jsx'
import './index.css'
import posthogClient from './services/posthog';
import errorHandler from './utils/errorHandler';

// Initialize error handling first
errorHandler.init();

// Initialize PostHog with error handling
try {
  posthogClient.init();
} catch (error) {
  console.warn('PostHog initialization failed:', error);
}

// Global error handlers to prevent unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection:', event.reason);
  event.preventDefault(); // Prevent the default browser behavior
});

window.addEventListener('error', (event) => {
  console.warn('Global error caught:', event.error);
  event.preventDefault(); // Prevent the default browser behavior
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
