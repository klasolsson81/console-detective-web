import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameSession } from '../types';

interface GameContextType {
  session: GameSession | null;
  startGame: (playerName: string, avatar: 'man' | 'woman', sessionData: any) => void;
  endGame: () => void;
  markCaseCompleted: (caseId: string, isSolved: boolean, pointsEarned: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<GameSession | null>(() => {
    const saved = localStorage.getItem('gameSession');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
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
      score: 0,
      cases: sessionData.cases.map((c: any) => ({
        ...c,
        isCompleted: false,
        isSolved: false
      })),
      activeCaseIndex: null // <-- HÄR VAR DEN SAKNADE RADEN!
    };
    setSession(newSession);
  };

  const endGame = () => {
    setSession(null);
  };

  const markCaseCompleted = (caseId: string, isSolved: boolean, pointsEarned: number) => {
    setSession((prev) => {
      if (!prev) return null;

      const updatedCases = prev.cases.map((c) => {
        if (c.id === caseId) {
          return { ...c, isCompleted: true, isSolved: isSolved };
        }
        return c;
      });

      const newScore = prev.score + pointsEarned;

      return {
        ...prev,
        cases: updatedCases,
        score: newScore
      };
    });
  };

  return (
    <GameContext.Provider value={{ session, startGame, endGame, markCaseCompleted }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};