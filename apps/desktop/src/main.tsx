import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

import { setSourceStore } from '@marstv/ui-shared';
import { tauriSourceStore } from './lib/source-store';

setSourceStore(tauriSourceStore);

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
