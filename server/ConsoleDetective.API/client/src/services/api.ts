import axios from 'axios';

const API_BASE_URL = 'https://localhost:7001/api';

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

// === AUTH ENDPOINTS ===
export const authAPI = {
  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('playMode', 'user');
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('playMode');
    localStorage.removeItem('guestCases'); // Rensa guest data
  },

  setGuestMode: () => {
    localStorage.setItem('playMode', 'guest');
  },
};

// === CASE ENDPOINTS ===
export const caseAPI = {
  createCase: async (category: string) => {
    if (isGuestMode()) {
      // För gäster: skapa case via API men spara lokalt
      const response = await api.post('/cases/generate', { category });
      const caseData = response.data;

      // Spara i localStorage
      const guestCases = JSON.parse(localStorage.getItem('guestCases') || '[]');
      guestCases.push(caseData);
      localStorage.setItem('guestCases', JSON.stringify(guestCases));

      return caseData;
    } else {
      // För inloggade: normal API call
      const response = await api.post('/cases', { category });
      return response.data;
    }
  },

  getMyCases: async () => {
    if (isGuestMode()) {
      // Hämta från localStorage
      return JSON.parse(localStorage.getItem('guestCases') || '[]');
    } else {
      const response = await api.get('/cases/my');
      return response.data;
    }
  },

  getCaseById: async (id: string) => {
    if (isGuestMode()) {
      const guestCases = JSON.parse(localStorage.getItem('guestCases') || '[]');
      return guestCases.find((c: any) => c.id === id);
    } else {
      const response = await api.get(`/cases/${id}`);
      return response.data;
    }
  },

  investigateScene: async (caseId: string) => {
    // Denna måste alltid gå via API för AI-generering
    const response = await api.post(`/cases/${caseId}/investigate`);

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
    const response = await api.post(`/cases/${caseId}/solve`, { suspectName });

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
export const chatAPI = {
  startInterrogation: async (caseId: string, suspectName: string) => {
    const response = await api.post('/chat/interrogation/start', { caseId, suspectName });
    return response.data;
  },

  sendMessage: async (sessionId: string, message: string) => {
    // Denna måste alltid gå via API för AI-svar
    const response = await api.post('/chat/interrogation/message', { sessionId, message });
    return response.data;
  },

  endInterrogation: async (sessionId: string) => {
    const response = await api.post('/chat/interrogation/end', { sessionId });
    return response.data;
  },
};

export default api;
