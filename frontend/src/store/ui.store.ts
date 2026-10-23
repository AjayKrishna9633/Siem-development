import { create } from 'zustand';

interface IUiState {
  sidebarExpanded: boolean;
  toggleSidebar: () => void;
}

const readExpanded = () => {
  try {
    return localStorage.getItem('siem_sidebar_expanded') === 'true';
  } catch {
    return false;
  }
};

export const useUiStore = create<IUiState>((set, get) => ({
  sidebarExpanded: readExpanded(),
  toggleSidebar: () => {
    const next = !get().sidebarExpanded;
    try {
      localStorage.setItem('siem_sidebar_expanded', String(next));
    } catch {
      // Storage unavailable (private mode) — keep the in-memory value
    }
    set({ sidebarExpanded: next });
  },
}));
