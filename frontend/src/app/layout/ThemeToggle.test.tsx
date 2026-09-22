import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useThemeStore } from '../../core/stores/theme-store';
import { ThemeToggle } from './ThemeToggle';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'SHELL.THEME_LIGHT': 'Switch to light mode',
        'SHELL.THEME_DARK': 'Switch to dark mode',
      };
      return translations[key] || key;
    },
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'light' });
    document.documentElement.classList.remove('dark');
  });

  it('shows moon icon in light mode with correct aria-label', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Switch to dark mode' });
    expect(button).toBeInTheDocument();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('shows sun icon in dark mode with correct aria-label', () => {
    useThemeStore.setState({ theme: 'dark' });
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Switch to light mode' });
    expect(button).toBeInTheDocument();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('toggles theme when clicked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    expect(useThemeStore.getState().theme).toBe('light');
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('applies compact ghost styling', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toHaveClass('rounded-md', 'p-1.5');
  });
});
