import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { ErrorState } from '../../shared/ui/ErrorState';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const { t } = useTranslation();
  const message = isRouteErrorResponse(error) && error.status === 404
    ? t('ERROR_PAGE.NOT_FOUND')
    : t('ERROR_PAGE.GENERAL');
  return <main aria-label={t('ERROR_PAGE.APP_ARIA')} className="grid min-h-screen place-items-center bg-ui-canvas p-4"><div className="w-full max-w-xl"><ErrorState message={message} onRetry={() => window.location.reload()} retryLabel={t('ERROR_PAGE.RETRY')} title={t('ERROR_PAGE.TITLE')} /></div></main>;
}
