// First, before any module that uses zod (see the file for why).
import './zod-config.ts';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
