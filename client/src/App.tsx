import { Routes, Route, Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useGame } from './contexts/GameContext'; // <-- Ändrad import
import LandingPage from './pages/LandingPage';
import SetupPage from './pages/SetupPage';
import Dashboard from './pages/Dashboard';
import CasePage from './pages/CasePage';
import InterrogationPage from './pages/InterrogationPage';

function App() {
  const { session } = useGame(); // <-- Använd useGame och session

  // Helper för att skydda routes (kräver en aktiv spelsession)
  const RequireSession = ({ children }: { children: ReactNode }) => {
    if (!session) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <div className="min-h-screen bg-noir-darkest text-gray-100 font-detective">
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