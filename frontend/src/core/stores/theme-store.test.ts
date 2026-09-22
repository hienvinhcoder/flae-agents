import { beforeEach, describe, expect, it } from 'vitest';
import { applyStoredTheme, useThemeStore } from './theme-store';

describe('theme-store', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    useThemeStore.setState({ theme: 'light' });
  });

  it('defaults to light and does not add .dark', () => {
    applyStoredTheme();
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists dark and applies .dark class', () => {
    useThemeStore.getState().setTheme('dark');
    expect(localStorage.getItem('flae_theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('reads stored theme from localStorage', () => {
    localStorage.setItem('flae_theme', 'dark');
    applyStoredTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles between light and dark', () => {
    expect(useThemeStore.getState().theme).toBe('light');
    
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});