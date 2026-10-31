import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/App';
import { createQueryClient } from '@/lib/query-client';
import { createAppRouter } from '@/router';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in index.html');

createRoot(root).render(
  <StrictMode>
    <App queryClient={createQueryClient()} router={createAppRouter()} />
  </StrictMode>,
);
