import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";

export interface DialogProps extends PropsWithChildren {
  closeLabel?: string;
  description?: string;
  dismissible?: boolean;
  /** `composer` matches Superdesign Knowledge modals: flush panel, header bar, padded body slot. */
  layout?: "default" | "composer";
  onClose: () => void;
  open: boolean;
  size?: "lg" | "xl";
  title: string;
}

function focusableElements(container: HTMLElement) {
  return [
    ...container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => !element.hasAttribute("hidden"));
}

const sizeClass = { lg: "max-w-lg", xl: "max-w-xl" } as const;

const EXIT_FALLBACK_MS = 300;

export function Dialog({
  children,
  closeLabel = "Close dialog",
  description,
  dismissible = true,
  layout = "default",
  onClose,
  open,
  size = "lg",
  title,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const exitTimeoutRef = useRef<number | null>(null);
  const [present, setPresent] = useState(open);
  const [phase, setPhase] = useState<"in" | "out">(open ? "in" : "out");
  const isComposer = layout === "composer";

  const clearExitTimeout = useCallback(() => {
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (open) {
      clearExitTimeout();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Dialog enter/exit mount lifecycle
      setPresent(true);
      setPhase("in");
    } else if (present) {
      setPhase("out");
      exitTimeoutRef.current = window.setTimeout(() => {
        setPresent(false);
      }, EXIT_FALLBACK_MS);
    }
    return clearExitTimeout;
  }, [open, present, clearExitTimeout]);

  useEffect(() => {
    if (!present || phase !== "in") return undefined;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const panel = panelRef.current;
    const elements = focusableElements(panel ?? document.body);
    (
      elements.find((el) => !el.hasAttribute("data-dialog-close")) ??
      elements[0] ??
      panel
    )?.focus();
    return () => returnFocusRef.current?.focus();
  }, [present, phase]);

  useEffect(() => {
    if (!present) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [present]);

  if (!present) return null;

  const overlayMotion =
    phase === "in" ? "animate-ui-overlay" : "animate-ui-overlay-out";
  const panelMotion =
    phase === "in" ? "animate-ui-panel" : "animate-ui-panel-out";
  const isExiting = phase === "out";

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] grid place-items-center p-4 ${
        isComposer ? "bg-foreground/10" : "bg-background/50"
      } ${overlayMotion} ${isExiting ? "pointer-events-none" : ""}`}
      role="presentation"
    >
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`relative z-10 w-full ${sizeClass[size]} rounded-ui-dialog border border-border bg-popover text-popover-foreground shadow-ui-overlay ${panelMotion} ${
          isComposer
            ? "flex max-h-[min(90vh,720px)] flex-col overflow-hidden p-0"
            : "p-5 sm:p-6"
        }`}
        inert={isExiting ? "" : undefined}
        onAnimationEnd={(event) => {
          if (phase === "out" && event.target === event.currentTarget) {
            clearExitTimeout();
            setPresent(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && dismissible) {
            event.preventDefault();
            onClose();
            return;
          }
          if (event.key !== "Tab") return;
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
        <div
          className={
            isComposer
              ? "flex shrink-0 items-start justify-between gap-4 border-b border-border/50 px-6 pb-4 pt-6"
              : "flex items-start justify-between gap-4"
          }
        >
          <div>
            <h2
              className="text-lg font-semibold tracking-tight text-foreground"
              id={titleId}
            >
              {title}
            </h2>
            {description ? (
              <p
                className={
                  isComposer
                    ? "mt-1 text-[13px] text-muted-foreground"
                    : "mt-2 text-secondary-foreground"
                }
                id={descriptionId}
              >
                {description}
              </p>
            ) : null}
          </div>
          {dismissible ? (
            <button
              aria-label={closeLabel}
              className={
                isComposer
                  ? "grid h-8 w-8 place-items-center rounded-ui-control text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  : "grid min-h-10 min-w-10 place-items-center rounded-ui-control text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
              }
              data-dialog-close
              onClick={onClose}
              type="button"
            >
              <X aria-hidden className="h-[18px] w-[18px]" />
            </button>
          ) : null}
        </div>
        <div
          className={
            isComposer
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "mt-6"
          }
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
