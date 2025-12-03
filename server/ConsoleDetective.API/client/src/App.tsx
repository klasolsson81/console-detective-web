import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import CasePage from './pages/CasePage';
import InterrogationPage from './pages/InterrogationPage';

function App() {
  const { isAuthenticated, isGuest } = useAuth();

  // Helper för protected routes
  const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    if (!isAuthenticated && !isGuest) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <div className="min-h-screen bg-noir-darkest">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/case/:caseId"
          element={
            <ProtectedRoute>
              <CasePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/interrogation/:sessionId"
          element={
            <ProtectedRoute>
              <InterrogationPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
