import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../core/stores/theme-store';

export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      aria-label={isDark ? t('SHELL.THEME_LIGHT') : t('SHELL.THEME_DARK')}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={toggleTheme}
      type="button"
    >
      {isDark ? (
        <Sun aria-hidden className="h-[18px] w-[18px]" />
      ) : (
        <Moon aria-hidden className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
