import { create } from 'zustand';
import type { IUser, IDemoAccount, UserRole } from '../types/auth.ts';
import { authService } from '../services/auth.service.ts';

interface IAuthState {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  demoAccounts: IDemoAccount[];

  login: (token: string, user: IUser) => void;
  logout: () => void;
  setUser: (user: IUser) => void;
  fetchCurrentUser: () => Promise<void>;
  loadDemoAccounts: () => Promise<IDemoAccount[]>;
  loginAsDemoUser: (role: UserRole) => Promise<IUser>;
}

export const useAuthStore = create<IAuthState>((set, get) => {
  // Initialize from localStorage
  const savedToken = localStorage.getItem('siem_access_token');
  const savedUser = localStorage.getItem('siem_user');

  return {
    token: savedToken,
    user: savedUser ? JSON.parse(savedUser) : null,
    isAuthenticated: !!savedToken,
    isLoading: false,
    demoAccounts: [],

    login: (token: string, user: IUser) => {
      localStorage.setItem('siem_access_token', token);
      localStorage.setItem('siem_user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },

    logout: () => {
      localStorage.removeItem('siem_access_token');
      localStorage.removeItem('siem_user');
      set({ token: null, user: null, isAuthenticated: false });
    },

    setUser: (user: IUser) => {
      localStorage.setItem('siem_user', JSON.stringify(user));
      set({ user });
    },

    fetchCurrentUser: async () => {
      try {
        set({ isLoading: true });
        const user = await authService.getMe();
        localStorage.setItem('siem_user', JSON.stringify(user));
        set({ user, isAuthenticated: true, isLoading: false });
      } catch {
        get().logout();
        set({ isLoading: false });
      }
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
  };
});
