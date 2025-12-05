import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { GameProvider } from './contexts/GameContext'; // <-- Ändrad import
import './i18n.ts';
import './index.css';
import './styles/global-noir.css'; // Global noir theme

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