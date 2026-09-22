import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../core/stores/theme-store';
import { Button } from '../../shared/ui/Button';

export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <Button
      aria-label={isDark ? t('SHELL.THEME_LIGHT') : t('SHELL.THEME_DARK')}
      onClick={toggleTheme}
      size="icon"
      type="button"
      variant="ghost"
    >
      {isDark ? <Sun aria-hidden className="h-4 w-4" /> : <Moon aria-hidden className="h-4 w-4" />}
    </Button>
  );
}