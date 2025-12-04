import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { inject } from '@vercel/analytics';
import App from './App.tsx';
import { GameProvider } from './contexts/GameContext'; // <-- Ändrad import
import './i18n.ts';
import './index.css';

// Initialize Vercel Web Analytics
inject();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {/* Vi använder nu GameProvider istället för AuthProvider */}
      <GameProvider>
        <App />
      </GameProvider>
    </BrowserRouter>
  </StrictMode>,
);