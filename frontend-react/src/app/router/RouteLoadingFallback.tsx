import { useTranslation } from 'react-i18next';

import { Skeleton } from '../../shared/ui/Skeleton';

export function RouteLoadingFallback() {
  const { t } = useTranslation();
  return <div className="p-6"><Skeleton label={t('SHELL.LOADING_ROUTE', { defaultValue: 'Loading page' })} /></div>;
}
