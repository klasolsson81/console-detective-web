export interface User {
  id: string;
  username: string;
  email: string;
  points: number;
  isVerified: boolean;
  createdAt: string;
}

export interface Case {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string;
  possibleSuspects: string[];
  guilty: string;
  isCompleted: boolean;
  isSolved: boolean;
  createdAt: string;
  clues?: Clue[];
  interrogationSessions?: InterrogationSession[];
}

export interface Clue {
  id: string;
  text: string;
  type: string;
  discoveredAt: string;
  assignedToSuspect?: string;
}

export interface InterrogationSession {
  id: string;
  suspectName: string;
  startedAt: string;
  endedAt?: string;
  isActive: boolean;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emotionalTone?: string;
  timestamp: string;
}

export interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  playAsGuest: () => void;
}

export interface LeaderboardEntry {
  id?: string; // Gjorde denna valfri då backend ibland skickar utan ID vid submit
  playerName: string;
  avatar: string; // Ändrat till string för att vara mer förlåtande mot backend-data
  score: number;
  completedAt?: string;
}

export interface GameSession {
  sessionId: string;
  playerName: string;
  avatar: 'man' | 'woman';
  score: number;
  cases: Case[];
  activeCaseIndex: number | null;
}

export type CaseCategory = 'Mord' | 'Bankrån' | 'Inbrott' | 'Otrohet';