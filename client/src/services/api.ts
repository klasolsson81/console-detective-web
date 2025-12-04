import axios from 'axios';

// Använd environment variable om tillgänglig, annars localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - lägg till JWT token om det finns
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token && !isGuestMode()) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - hantera errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired eller ogiltig
      localStorage.removeItem('authToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Hjälpfunktion för att kolla om vi är i guest mode
export const isGuestMode = (): boolean => {
  return localStorage.getItem('playMode') === 'guest';
};

export const gameAPI = {
  startSession: async () => {
    const response = await api.post('/game/start-session');
    return response.data; // Returnerar { sessionId, cases: [] }
  },

  getLeaderboard: async () => {
    const response = await api.get('/game/leaderboard');
    return response.data;
  },

  submitScore: async (playerName: string, avatar: string, score: number) => {
    const response = await api.post('/game/leaderboard', { playerName, avatar, score });
    return response.data;
  }
};


// === CASE ENDPOINTS ===
export const caseAPI = {
  createCase: async (category: string) => {
    if (isGuestMode()) {
      // För gäster: skapa case via API men spara lokalt
      const response = await api.post('/case/generate', { category });
      const caseData = response.data;

      // Spara i localStorage
      const guestCases = JSON.parse(localStorage.getItem('guestCases') || '[]');
      guestCases.push(caseData);
      localStorage.setItem('guestCases', JSON.stringify(guestCases));

      return caseData;
    } else {
      // För inloggade: normal API call
      const response = await api.post('/case', { category });
      return response.data;
    }
  },

  getMyCases: async () => {
    if (isGuestMode()) {
      // Hämta från localStorage
      return JSON.parse(localStorage.getItem('guestCases') || '[]');
    } else {
      const response = await api.get('/case');
      return response.data;
    }
  },

  getCaseById: async (id: string) => {
    if (isGuestMode()) {
      const guestCases = JSON.parse(localStorage.getItem('guestCases') || '[]');
      return guestCases.find((c: any) => c.id === id);
    } else {
      const response = await api.get(`/case/${id}`);
      return response.data;
    }
  },

  investigateScene: async (caseId: string) => {
    // Denna måste alltid gå via API för AI-generering
    const response = await api.post(`/case/${caseId}/investigate`);

    if (isGuestMode()) {
      // Uppdatera localStorage
      const guestCases = JSON.parse(localStorage.getItem('guestCases') || '[]');
      const caseIndex = guestCases.findIndex((c: any) => c.id === caseId);
      if (caseIndex !== -1) {
        if (!guestCases[caseIndex].clues) guestCases[caseIndex].clues = [];
        guestCases[caseIndex].clues.push(response.data);
        localStorage.setItem('guestCases', JSON.stringify(guestCases));
      }
    }

    return response.data;
  },

  solveCase: async (caseId: string, suspectName: string) => {
    const response = await api.post(`/case/${caseId}/accuse`, { suspectName });

    if (isGuestMode()) {
      // Uppdatera localStorage
      const guestCases = JSON.parse(localStorage.getItem('guestCases') || '[]');
      const caseIndex = guestCases.findIndex((c: any) => c.id === caseId);
      if (caseIndex !== -1) {
        guestCases[caseIndex].isCompleted = true;
        guestCases[caseIndex].isSolved = response.data.isCorrect;
        localStorage.setItem('guestCases', JSON.stringify(guestCases));
      }
    }

    return response.data;
  },
};

// === CHAT/INTERROGATION ENDPOINTS ===
// === CHAT/INTERROGATION ENDPOINTS ===
export const chatAPI = {
  startInterrogation: async (caseId: string, suspectName: string) => {
    const response = await api.post('/chat/start-interrogation', { caseId, suspectName });
    return response.data;
  },

  // === NY METOD ===
  getSession: async (sessionId: string) => {
    const response = await api.get(`/chat/session/${sessionId}`);
    return response.data;
  },
  // ================

  sendMessage: async (sessionId: string, message: string) => {
    const response = await api.post('/chat/ask', { sessionId, question: message });
    return response.data; // Detta returnerar nu meddelande-objektet direkt
  },

  endInterrogation: async (sessionId: string) => {
    const response = await api.post(`/chat/${sessionId}/end`);
    return response.data;
  },
};

export default api;
