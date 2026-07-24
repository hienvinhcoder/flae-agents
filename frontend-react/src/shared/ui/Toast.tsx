import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useEffect, type PropsWithChildren } from 'react';

type ToastTone = 'info' | 'success' | 'error';

export interface ToastProps {
  duration?: number;
  message: string;
  onDismiss?: () => void;
  tone?: ToastTone;
}

const toneClasses: Record<ToastTone, string> = {
  info: 'border-state-info text-state-info',
  success: 'border-state-success text-state-success',
  error: 'border-state-danger text-state-danger',
};

const icons = { info: Info, success: CircleCheck, error: CircleAlert };

export function Toast({ duration = 4000, message, onDismiss, tone = 'info' }: ToastProps) {
  useEffect(() => {
    if (!onDismiss || duration <= 0) return undefined;
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [duration, onDismiss]);
  const Icon = icons[tone];
  return (
    <div className={`flex items-start gap-3 rounded-ui-panel border bg-ui-raised p-4 text-ui-ink shadow-ui-panel ${toneClasses[tone]}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="flex-1 text-ui-ink">{message}</p>
      {onDismiss ? <button aria-label="Dismiss notification" className="rounded-ui-control p-1 text-ui-ink-secondary hover:bg-ui-interactive" onClick={onDismiss} type="button"><X aria-hidden className="h-4 w-4" /></button> : null}
    </div>
  );
}

export function ToastViewport({ children }: PropsWithChildren) {
  return <div aria-label="Notifications" className="pointer-events-none fixed bottom-4 right-4 z-50 grid w-[min(24rem,calc(100vw-2rem))] gap-3 [&>*]:pointer-events-auto" aria-live="polite">{children}</div>;
}
