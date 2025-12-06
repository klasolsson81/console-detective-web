import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { GameSession } from '../types';
import { Howl } from 'howler';

interface GameContextType {
  session: GameSession | null;
  isMuted: boolean;
  // Notera: Här tillåter vi string i input, men konverterar internt
  startGame: (playerName: string, avatar: string, sessionData: any) => void;
  endGame: () => void;
  markCaseCompleted: (caseId: string, isSolved: boolean, pointsEarned: number) => void;
  toggleMute: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<GameSession | null>(() => {
    localStorage.removeItem('gameSession');
    const saved = sessionStorage.getItem('gameSession');
    // as GameSession tystar TS-felet vid inläsning
    return saved ? (JSON.parse(saved) as GameSession) : null;
  });

  // Audio mute state (persistent)
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem('audioMuted');
    return saved === 'true';
  });

  // Background music ref
  const backgroundMusicRef = useRef<Howl | null>(null);

  useEffect(() => {
    if (session) {
      sessionStorage.setItem('gameSession', JSON.stringify(session));
    } else {
      sessionStorage.removeItem('gameSession');
    }
  }, [session]);

  // Persist mute state
  useEffect(() => {
    localStorage.setItem('audioMuted', isMuted.toString());
  }, [isMuted]);

  // Start/stop background music based on session
  useEffect(() => {
    if (session && !backgroundMusicRef.current) {
      // Start background music when game session starts
      backgroundMusicRef.current = new Howl({
        src: ['/sounds/Covert_Affair_Film_Noire_Kevin_MacLeod.mp3'],
        loop: true,
        volume: 0.3,
        autoplay: !isMuted
      });
    } else if (!session && backgroundMusicRef.current) {
      // Stop and unload background music when session ends
      backgroundMusicRef.current.stop();
      backgroundMusicRef.current.unload();
      backgroundMusicRef.current = null;
    }

    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.stop();
        backgroundMusicRef.current.unload();
      }
    };
  }, [session, isMuted]);

  // Control background music based on mute state
  useEffect(() => {
    if (backgroundMusicRef.current) {
      if (isMuted) {
        backgroundMusicRef.current.pause();
      } else {
        backgroundMusicRef.current.play();
      }
    }
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const startGame = (playerName: string, avatarInput: string, sessionData: any) => {
    // FIX: Konvertera sträng till exakt typ 'man' | 'woman'
    const validAvatar: 'man' | 'woman' = (avatarInput === 'woman') ? 'woman' : 'man';

    const newSession: GameSession = {
      sessionId: sessionData.sessionId,
      playerName,
      avatar: validAvatar, // Nu matchar typen perfekt
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
    <GameContext.Provider value={{ session, isMuted, startGame, endGame, markCaseCompleted, toggleMute }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
};