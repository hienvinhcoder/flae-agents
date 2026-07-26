import { X } from 'lucide-react';
import { useEffect, useId, useRef, type PropsWithChildren } from 'react';

export interface DialogProps extends PropsWithChildren {
  closeLabel?: string;
  description?: string;
  dismissible?: boolean;
  onClose: () => void;
  open: boolean;
  title: string;
}

function focusableElements(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((element) => !element.hasAttribute('hidden'));
}

export function Dialog({ children, closeLabel = 'Close dialog', description, dismissible = true, onClose, open, title }: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const elements = focusableElements(panel ?? document.body);
    (elements.find((element) => !element.hasAttribute('data-dialog-close')) ?? elements[0] ?? panel)?.focus();
    return () => returnFocusRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ui-canvas/85 p-4" role="presentation">
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-lg rounded-ui-dialog border border-ui-line-strong bg-ui-raised p-6 shadow-ui-overlay"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && dismissible) {
            event.preventDefault();
            onClose();
            return;
          }
          if (event.key !== 'Tab') return;
          const elements = focusableElements(event.currentTarget);
          const first = elements[0];
          const last = elements.at(-1);
          if (!first || !last) {
            event.preventDefault();
            event.currentTarget.focus();
            return;
          }
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ui-ink" id={titleId}>{title}</h2>
            {description ? <p className="mt-2 text-ui-ink-secondary" id={descriptionId}>{description}</p> : null}
          </div>
          {dismissible ? (
            <button aria-label={closeLabel} className="grid min-h-10 min-w-10 place-items-center rounded-ui-control text-ui-ink-secondary transition-colors duration-200 hover:bg-ui-interactive hover:text-ui-ink" data-dialog-close onClick={onClose} type="button">
              <X aria-hidden className="h-5 w-5" />
            </button>
          ) : null}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
