import { CircleAlert } from 'lucide-react';

import { Button } from './Button';

export interface ErrorStateProps {
  announce?: boolean;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  title?: string;
}

export function ErrorState({ announce = true, message, onRetry, retryLabel = 'Try again', title = 'Something went wrong' }: ErrorStateProps) {
  return <section className="rounded-ui-panel border border-destructive bg-state-danger-soft p-6" role={announce ? 'alert' : undefined}><CircleAlert aria-hidden className="h-6 w-6 text-destructive" /><h2 className="mt-3 text-lg font-semibold text-foreground">{title}</h2><p className="mt-2 text-secondary-foreground">{message}</p>{onRetry ? <Button className="mt-5" onClick={onRetry} variant="secondary">{retryLabel}</Button> : null}</section>;
}
