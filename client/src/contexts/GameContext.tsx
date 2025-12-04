import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { GameSession } from '../types';

interface GameContextType {
  session: GameSession | null;
  startGame: (playerName: string, avatar: string, sessionData: any) => void;
  endGame: () => void;
  // NY FUNKTION: Uppdaterar ett fall som löst
  markCaseCompleted: (caseId: string, isSolved: boolean, pointsEarned: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<GameSession | null>(() => {
    // Försök hämta sparad session från localStorage vid start
    const saved = localStorage.getItem('gameSession');
    return saved ? JSON.parse(saved) : null;
  });

  // Spara till localStorage varje gång session ändras
  useEffect(() => {
    if (session) {
      localStorage.setItem('gameSession', JSON.stringify(session));
    } else {
      localStorage.removeItem('gameSession');
    }
  }, [session]);

  const startGame = (playerName: string, avatar: string, sessionData: any) => {
    const newSession: GameSession = {
      sessionId: sessionData.sessionId,
      playerName,
      avatar,
      score: 0,
      cases: sessionData.cases.map((c: any) => ({
        ...c,
        isCompleted: false, // Säkerställ att vi börjar på noll
        isSolved: false
      }))
    };
    setSession(newSession);
  };

  const endGame = () => {
    setSession(null);
  };

  // === HÄR ÄR MAGIN SOM SAKNADES ===
  const markCaseCompleted = (caseId: string, isSolved: boolean, pointsEarned: number) => {
    setSession((prev) => {
      if (!prev) return null;

      // 1. Uppdatera listan med fall
      const updatedCases = prev.cases.map((c) => {
        if (c.id === caseId) {
          return { ...c, isCompleted: true, isSolved: isSolved };
        }
        return c;
      });

      // 2. Uppdatera totalpoängen
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