import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { AppProviders } from './providers/AppProviders';
import { createAppRouter } from './router/router';
import '../core/config/env';
import { initializeI18n } from '../shared/i18n';
import '../styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

await initializeI18n();
const router = createAppRouter();

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <App router={router} />
    </AppProviders>
  </StrictMode>,
);
