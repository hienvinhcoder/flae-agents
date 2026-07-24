import { Dialog } from '../../shared/ui/Dialog';
import { useTranslation } from 'react-i18next';

export interface ConnectionDialogProps { onRetry: () => void; open: boolean; }

export function ConnectionDialog({ onRetry, open }: ConnectionDialogProps) {
  const { t } = useTranslation();
  return <Dialog closeLabel={t('SHELL.CLOSE_DIALOG')} description={t('CONNECTION_MODAL.MESSAGE')} onClose={onRetry} open={open} title={t('CONNECTION_MODAL.TITLE')}><button className="button-primary" onClick={onRetry} type="button">{t('CONNECTION_MODAL.RETRY_BTN')}</button></Dialog>;
}
