import { Dialog } from '../../shared/ui/Dialog';
import { useTranslation } from 'react-i18next';

export interface ConnectionDialogProps {
  checking?: boolean;
  onRetry: () => void;
  open: boolean;
}

export function ConnectionDialog({ checking = false, onRetry, open }: ConnectionDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      description={t('CONNECTION_MODAL.MESSAGE')}
      dismissible={false}
      onClose={onRetry}
      open={open}
      title={t('CONNECTION_MODAL.TITLE')}
    >
      <button
        className="button-primary min-w-44"
        disabled={checking}
        onClick={onRetry}
        type="button"
      >
        {checking ? t('CONNECTION_MODAL.CHECKING') : t('CONNECTION_MODAL.RETRY_BTN')}
      </button>
    </Dialog>
  );
}
