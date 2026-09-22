import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useThemeStore } from '../../core/stores/theme-store';
import { ThemeToggle } from './ThemeToggle';

// Mock i18next
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
    // Reset theme store to light mode
    useThemeStore.setState({ theme: 'light' });
    // Clear document classes
    document.documentElement.classList.remove('dark');
  });

  it('shows moon icon in light mode with correct aria-label', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button', { name: 'Switch to dark mode' });
    expect(button).toBeInTheDocument();
    
    // Check for moon icon (lucide-react icons have specific attributes)
    const moonIcon = button.querySelector('svg');
    expect(moonIcon).toBeInTheDocument();
  });

  it('shows sun icon in dark mode with correct aria-label', () => {
    useThemeStore.setState({ theme: 'dark' });
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button', { name: 'Switch to light mode' });
    expect(button).toBeInTheDocument();
    
    // Check for sun icon
    const sunIcon = button.querySelector('svg');
    expect(sunIcon).toBeInTheDocument();
  });

  it('toggles theme when clicked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    
    expect(useThemeStore.getState().theme).toBe('light');
    
    const button = screen.getByRole('button', { name: 'Switch to dark mode' });
    await user.click(button);
    
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('applies correct button styling', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('min-h-10', 'min-w-10'); // icon size
    expect(button).toHaveAttribute('data-variant', 'ghost');
  });
});