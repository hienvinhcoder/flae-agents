import { useTranslation } from 'react-i18next';

import { Skeleton } from '../shared/ui/Skeleton';

export function AppLoadingFallback() {
  const { t } = useTranslation();
  return <main aria-label={t('APP.ARIA')} className="min-h-screen bg-ui-canvas p-8"><Skeleton label={t('APP.LOADING')} /></main>;
}
