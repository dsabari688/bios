import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './app/App.tsx';
import './index.css';
import { initMockApi } from './api/mockApi.ts';
import { migrateLocalStorageToIndexedDB } from './db/migrateLocalStorage.ts';

import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';

// Initialize Client-side API Mock Interception before React boot safely
try {
  initMockApi();
} catch (err) {
  console.warn("[initMockApi] Failed to initialize mock API interceptor:", err);
}

// Run one-time legacy localStorage to IndexedDB migration safely
try {
  migrateLocalStorageToIndexedDB().catch((err) =>
    console.warn("[migration] IndexedDB migration deferred:", err)
  );
} catch (err) {
  console.warn("[migration] Failed to execute storage migration:", err);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Forcefully unregister any legacy service workers and clear cache storage to eliminate white screen caching issues
if (typeof window !== "undefined") {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then(() => {
          console.log("[PWA] Unregistered legacy Service Worker:", registration.scope);
        });
      }
    }).catch(() => {});
  }
  if ("caches" in window) {
    caches.keys().then((keys) => {
      for (const key of keys) {
        caches.delete(key).then(() => {
          console.log("[PWA] Purged legacy cache storage:", key);
        });
      }
    }).catch(() => {});
  }
}



