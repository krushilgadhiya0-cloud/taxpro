import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';
import { installGlobalDateFormat } from './lib/dateUtils.js';

// Enforce DD/MM/YY format globally across all components
installGlobalDateFormat();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[TaxPro PWA] Service Worker registered successfully:', reg.scope))
      .catch((err) => console.log('[TaxPro PWA] Service Worker registration failed:', err));
  });
}
