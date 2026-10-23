import { create } from 'zustand';
import type { IUser, IDemoAccount, UserRole } from '../types/auth.ts';
import { authService } from '../services/auth.service.ts';
import { refreshSession, setAccessToken, setSessionListener } from '../services/api.ts';

interface IAuthState {
  user: IUser | null;
  isAuthenticated: boolean;
  // True until the startup refresh has decided whether a session exists
  isLoading: boolean;
  demoAccounts: IDemoAccount[];

  login: (token: string, user: IUser) => void;
  logout: () => void;
  setUser: (user: IUser) => void;
  restoreSession: () => Promise<void>;
  loadDemoAccounts: () => Promise<IDemoAccount[]>;
  loginAsDemoUser: (role: UserRole) => Promise<IUser>;
}

// Tokens used to be persisted here; clear leftovers from older builds
try {
  localStorage.removeItem('siem_access_token');
  localStorage.removeItem('siem_user');
} catch {
  // Storage unavailable — nothing to clean up
}

export const useAuthStore = create<IAuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  demoAccounts: [],

  login: (token: string, user: IUser) => {
    setAccessToken(token);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
    // Revokes the refresh-token family server-side and clears the cookie
    authService.logout().catch(() => {});
  },

  setUser: (user: IUser) => set({ user }),

  restoreSession: async () => {
    await refreshSession();
    set({ isLoading: false });
  },

  loadDemoAccounts: async () => {
    try {
      const res = await authService.seedDemo();
      set({ demoAccounts: res.accounts });
      return res.accounts;
    } catch (err) {
      console.warn('Failed to load demo accounts', err);
      return [];
    }
  },

  loginAsDemoUser: async (role: UserRole) => {
    let accounts = get().demoAccounts;
    if (accounts.length === 0) {
      accounts = await get().loadDemoAccounts();
    }

    const match = accounts.find((a) => a.role === role);
    if (!match) {
      throw new Error(`Demo account for ${role} not found`);
    }

    const res = await authService.login(match.email, match.password);
    get().login(res.accessToken, res.user);
    return res.user;
  },
}));

// Every refresh (startup or a retried 401) updates or ends the session here
setSessionListener((session) => {
  if (session) {
    useAuthStore.setState({ user: session.user, isAuthenticated: true });
  } else {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  }
});
