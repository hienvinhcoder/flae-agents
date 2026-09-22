import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';
const STORAGE_KEY = 'flae_theme';

function applyDom(theme: ThemeMode) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function readStoredTheme(): ThemeMode {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === 'dark' ? 'dark' : 'light';
}

export function applyStoredTheme() {
  const theme = readStoredTheme();
  useThemeStore.setState({ theme });
  applyDom(theme);
}

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    applyDom(theme);
    set({ theme });
  },
  toggleTheme: () => {
    get().setTheme(get().theme === 'light' ? 'dark' : 'light');
  },
}));