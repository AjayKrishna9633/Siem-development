import { create } from 'zustand';
import type { IUser } from '../types/auth.ts';
import { authService } from '../services/auth.service.ts';
import { refreshSession, setAccessToken, setSessionListener } from '../services/api.ts';

interface IAuthState {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (token: string, user: IUser) => void;
  logout: () => void;
  setUser: (user: IUser) => void;
  restoreSession: () => Promise<void>;
}

try {
  localStorage.removeItem('siem_access_token');
  localStorage.removeItem('siem_user');
} catch {}

export const useAuthStore = create<IAuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: (token: string, user: IUser) => {
    setAccessToken(token);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
    authService.logout().catch(() => {});
  },

  setUser: (user: IUser) => set({ user }),

  restoreSession: async () => {
    await refreshSession();
    set({ isLoading: false });
  },
}));

setSessionListener((session) => {
  if (session) {
    useAuthStore.setState({ user: session.user, isAuthenticated: true });
  } else {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  }
});
