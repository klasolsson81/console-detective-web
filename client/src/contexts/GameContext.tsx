import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameSession } from '../types';

interface GameContextType {
  session: GameSession | null;
  startGame: (playerName: string, avatar: string, sessionData: any) => void;
  endGame: () => void;
  markCaseCompleted: (caseId: string, isSolved: boolean, pointsEarned: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<GameSession | null>(() => {
    // 1. Rensa alltid localStorage (för att slippa gamla buggar)
    localStorage.removeItem('gameSession');

    // 2. Läs från sessionStorage
    const saved = sessionStorage.getItem('gameSession');
    if (!saved) return null;

    try {
      return JSON.parse(saved) as GameSession;
    } catch (e) {
      console.error("Kunde inte läsa session", e);
      return null;
    }
  });

  useEffect(() => {
    if (session) {
      sessionStorage.setItem('gameSession', JSON.stringify(session));
    } else {
      sessionStorage.removeItem('gameSession');
    }
  }, [session]);

  const startGame = (playerName: string, avatarInput: string, sessionData: any) => {
    // SÄKERHETSKOLL: Tvinga avatar att vara 'man' eller 'woman'
    const validAvatar: 'man' | 'woman' = (avatarInput === 'woman') ? 'woman' : 'man';

    const newSession: GameSession = {
      sessionId: sessionData.sessionId,
      playerName,
      avatar: validAvatar, 
      score: 0,
      cases: sessionData.cases.map((c: any) => ({
        ...c,
        isCompleted: false,
        isSolved: false
      })),
      activeCaseIndex: null
    };
    setSession(newSession);
  };

  const endGame = () => {
    setSession(null);
    sessionStorage.removeItem('gameSession');
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

      return {
        ...prev,
        cases: updatedCases,
        score: prev.score + pointsEarned
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