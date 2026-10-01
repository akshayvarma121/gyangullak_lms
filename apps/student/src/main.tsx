import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { I18nProvider } from './i18n/Context';
import { initDb } from './db/store';
import '@chalk/ui/src/index.css';

async function bootstrap() {
  try {
    await initDb();
  } catch (err) {
    console.error('Failed to init DB', err);
  }

  const root = document.getElementById('root');
  if (!root) throw new Error('No root element found');

  createRoot(root).render(
    <React.StrictMode>
      <MemoryRouter>
        <I18nProvider>
          <App />
        </I18nProvider>
      </MemoryRouter>
    </React.StrictMode>
  );
}

bootstrap();
