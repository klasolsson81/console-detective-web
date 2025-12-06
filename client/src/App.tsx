import { Routes, Route, Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useGame } from './contexts/GameContext';
import LandingPage from './pages/LandingPage';
import SetupPage from './pages/SetupPage';
import Dashboard from './pages/Dashboard';
import CasePage from './pages/CasePage';
import InterrogationPage from './pages/InterrogationPage';
import MuteButton from './components/MuteButton';

// === FIX: Flytta ut RequireSession hit ===
// Nu är det en stabil komponent som inte återskapas varje gång App renderas om.
const RequireSession = ({ children }: { children: ReactNode }) => {
  const { session } = useGame();
  
  if (!session) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function App() {
  // Vi behöver inte hämta session här inne längre för skyddet
  return (
    <div className="min-h-screen bg-noir-darkest text-gray-100 font-detective">
      {/* Global mute button - visible on all pages */}
      <MuteButton />

      <Routes>
        {/* Startsida */}
        <Route path="/" element={<LandingPage />} />

        {/* Ny sida: Välj namn och avatar */}
        <Route path="/setup" element={<SetupPage />} />

        {/* Skyddade sidor (Kräver session) */}
        <Route
          path="/dashboard"
          element={
            <RequireSession>
              <Dashboard />
            </RequireSession>
          }
        />

        <Route
          path="/case/:caseId"
          element={
            <RequireSession>
              <CasePage />
            </RequireSession>
          }
        />

        <Route
          path="/interrogation/:sessionId"
          element={
            <RequireSession>
              <InterrogationPage />
            </RequireSession>
          }
        />
        
        {/* Fånga upp felaktiga länkar */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;