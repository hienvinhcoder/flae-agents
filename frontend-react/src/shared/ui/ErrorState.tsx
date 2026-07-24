import { CircleAlert } from 'lucide-react';

import { Button } from './Button';

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
}

export function ErrorState({ message, onRetry, retryLabel = 'Try again', title = 'Something went wrong' }: ErrorStateProps) {
  return <section className="rounded-ui-panel border border-state-danger bg-state-danger-soft p-6" role="alert"><CircleAlert aria-hidden className="h-6 w-6 text-state-danger" /><h2 className="mt-3 text-lg font-semibold text-ui-ink">{title}</h2><p className="mt-2 text-ui-ink-secondary">{message}</p>{onRetry ? <Button className="mt-5" onClick={onRetry} variant="secondary">{retryLabel}</Button> : null}</section>;
}
