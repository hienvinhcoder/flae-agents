import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SidebarStatusCard() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="sidebar-indexing-title"
      className="rounded-ui-panel border border-sidebar-border bg-sidebar-accent p-4 text-sidebar-foreground"
    >
      <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
        <Activity aria-hidden className="h-3.5 w-3.5" />
        <h2 className="font-medium" id="sidebar-indexing-title">
          {t('SHELL.INDEXING_STATUS')}
        </h2>
      </div>
      <strong className="mt-2 block text-sm">{t('SHELL.INDEXING_FRESHNESS')}</strong>
      <div
        aria-label={t('SHELL.INDEXING_PROGRESS')}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={80}
        className="mt-3 h-1.5 overflow-hidden rounded-ui-status bg-sidebar-border"
        role="meter"
      >
        <span className="block h-full w-4/5 bg-brand" />
      </div>
      <p className="mt-2 text-xs text-sidebar-foreground/60">42,180 nodes · 128k edges</p>
    </section>
  );
}
