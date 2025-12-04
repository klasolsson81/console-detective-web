import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameSession, Case } from '../types';

interface GameContextType {
  session: GameSession | null;
  startGame: (name: string, avatar: 'man' | 'woman', sessionData: any) => void;
  updateScore: (points: number) => void;
  completeCase: (caseId: string, isSolved: boolean, points: number) => void;
  endGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<GameSession | null>(() => {
    // Försök ladda från localStorage vid refresh
    const saved = localStorage.getItem('gameSession');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    // Spara session till localStorage vid ändringar
    if (session) {
      localStorage.setItem('gameSession', JSON.stringify(session));
    } else {
      localStorage.removeItem('gameSession');
    }
  }, [session]);

  const startGame = (playerName: string, avatar: 'man' | 'woman', sessionData: any) => {
    const newSession: GameSession = {
      sessionId: sessionData.sessionId,
      playerName,
      avatar,
      score: 0, // Börjar på 0
      cases: sessionData.cases,
      activeCaseIndex: null
    };
    setSession(newSession);
  };

  const updateScore = (points: number) => {
    if (!session) return;
    setSession(prev => prev ? { ...prev, score: prev.score + points } : null);
  };

  const completeCase = (caseId: string, isSolved: boolean, points: number) => {
    if (!session) return;
    
    const updatedCases = session.cases.map(c => 
      c.id === caseId ? { ...c, isCompleted: true, isSolved } : c
    );

    setSession(prev => prev ? {
      ...prev,
      cases: updatedCases,
      score: prev.score + points
    } : null);
  };

  const endGame = () => {
    setSession(null);
    localStorage.removeItem('gameSession');
  };

  return (
    <GameContext.Provider value={{ session, startGame, updateScore, completeCase, endGame }}>
      {children}
    </GameContext.Provider>
  );
};