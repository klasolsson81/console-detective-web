import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, isGuestMode } from '../services/api';
import { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Kolla om användaren är inloggad eller i guest mode
    const token = localStorage.getItem('authToken');
    const playMode = localStorage.getItem('playMode');

    if (playMode === 'guest') {
      setIsGuest(true);
      setIsAuthenticated(false);
    } else if (token) {
      // Här skulle vi kunna validera token mot backend
      // För nu antar vi att token är giltig
      setIsAuthenticated(true);
      setIsGuest(false);

      // TODO: Hämta user-info från backend med token
      // För nu skapar vi en placeholder user
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      setUser(response.user);
      setIsAuthenticated(true);
      setIsGuest(false);
      localStorage.setItem('user', JSON.stringify(response.user));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await authAPI.register(username, email, password);
      // Efter registrering, logga in automatiskt
      await login(email, password);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(false);
    localStorage.removeItem('user');
  };

  const playAsGuest = () => {
    authAPI.setGuestMode();
    setIsGuest(true);
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        isAuthenticated,
        login,
        register,
        logout,
        playAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
