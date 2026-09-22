# Shared UI Primitives — `frontend/src/shared/ui/`

## Button
- Path: `frontend/src/shared/ui/Button.tsx`
- Description: Primary action control

```tsx
import { LoaderCircle } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonSize = 'default' | 'icon' | 'sm';
type ButtonVariant = 'danger' | 'ghost' | 'outline' | 'primary' | 'secondary';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  pill?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'min-h-10 px-4 py-2',
  icon: 'min-h-10 min-w-10 p-2',
  sm: 'min-h-10 px-3 py-1.5 text-sm',
};

const variantClasses: Record<ButtonVariant, string> = {
  danger: 'border-destructive bg-destructive text-destructive-foreground hover:opacity-90',
  ghost: 'border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  outline: 'border-border bg-card text-foreground hover:bg-secondary',
  primary: 'flae-button-primary border-transparent bg-primary-control text-primary-control-foreground hover:bg-primary-control-hover active:bg-primary-control-active',
  secondary: 'border-border bg-secondary text-secondary-foreground hover:bg-accent',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className = '',
    disabled,
    isLoading = false,
    loadingText = 'Loading',
    pill = false,
    size = 'default',
    variant = 'primary',
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      aria-busy={isLoading || undefined}
      className={`inline-flex items-center justify-center gap-2 border font-semibold transition-colors duration-200 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 ${pill ? 'rounded-ui-status' : 'rounded-ui-control'} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      data-variant={variant}
      disabled={disabled || isLoading}
      ref={ref}
    >
      {isLoading ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
      {isLoading ? loadingText : children}
    </button>
  );
});

```

## Input
- Path: `frontend/src/shared/ui/Input.tsx`
- Description: Labeled text field

```tsx
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  hint?: ReactNode;
  label: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', error, hint, id: suppliedId, label, ...props },
  ref,
) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="grid gap-2">
      <label className="font-semibold text-foreground" htmlFor={id}>{label}</label>
      <input
        {...props}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={`min-h-10 w-full rounded-ui-control border border-input bg-card px-3 py-2 text-foreground shadow-none transition-colors duration-200 placeholder:text-muted-foreground hover:border-ui-line-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 motion-reduce:transition-none ${className}`}
        id={id}
        ref={ref}
      />
      {hint ? <div className="text-sm text-muted-foreground" id={hintId}>{hint}</div> : null}
      {error ? <div className="text-sm text-destructive" id={errorId}>{error}</div> : null}
    </div>
  );
});

```

## Card
- Path: `frontend/src/shared/ui/Card.tsx`
- Description: Bordered surface panel

```tsx
import type { HTMLAttributes, ReactNode } from 'react';

type CardElement = 'article' | 'div' | 'section';
type CardPadding = 'none' | 'sm' | 'md';
type CardVariant = 'default' | 'inverse' | 'muted';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  children: ReactNode;
  padding?: CardPadding;
  variant?: CardVariant;
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
};

const variantClasses: Record<CardVariant, string> = {
  default: 'border-border bg-card text-card-foreground',
  inverse: 'border-sidebar-border bg-sidebar text-sidebar-foreground',
  muted: 'border-border bg-muted text-foreground',
};

export function Card({
  as: Element = 'div',
  children,
  className = '',
  padding = 'md',
  variant = 'default',
  ...props
}: CardProps) {
  return (
    <Element
      {...props}
      className={`rounded-ui-panel border ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </Element>
  );
}

```

## Dialog
- Path: `frontend/src/shared/ui/Dialog.tsx`
- Description: Modal dialog

```tsx
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4" role="presentation">
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-lg rounded-ui-dialog border border-border bg-popover p-5 text-popover-foreground shadow-ui-overlay sm:p-6"
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
            <h2 className="text-lg font-semibold text-foreground" id={titleId}>{title}</h2>
            {description ? <p className="mt-2 text-secondary-foreground" id={descriptionId}>{description}</p> : null}
          </div>
          {dismissible ? (
            <button aria-label={closeLabel} className="grid min-h-10 min-w-10 place-items-center rounded-ui-control text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground" data-dialog-close onClick={onClose} type="button">
              <X aria-hidden className="h-5 w-5" />
            </button>
          ) : null}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

```

## Badge
- Path: `frontend/src/shared/ui/Badge.tsx`
- Description: Status chip

```tsx
import type { HTMLAttributes } from 'react';

export type BadgeVariant = 'destructive' | 'neutral' | 'primary' | 'success' | 'warning';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  destructive: 'bg-state-danger-soft text-destructive',
  neutral: 'bg-secondary text-muted-foreground',
  primary: 'bg-primary-soft text-brand-text',
  success: 'bg-state-success-soft text-state-success',
  warning: 'bg-state-warning-soft text-state-warning',
};

export function Badge({ children, className = '', variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={`inline-flex items-center gap-1 rounded-ui-status px-2 py-1 text-xs font-medium ${variantClasses[variant]} ${className}`}
      data-variant={variant}
    >
      {children}
    </span>
  );
}

```

## PageHeader
- Path: `frontend/src/shared/ui/PageHeader.tsx`
- Description: Page title band

```tsx
import { Children, useId, type ReactNode } from 'react';

export interface PageHeaderProps {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  metadata?: ReactNode;
  title: ReactNode;
  titleId?: string;
}

function hasRenderableContent(value: ReactNode): boolean {
  return Children.toArray(value).length > 0;
}

export function PageHeader({ actions, description, eyebrow, metadata, title, titleId }: PageHeaderProps) {
  const generatedTitleId = useId();
  const resolvedTitleId = titleId ?? generatedTitleId;

  return (
    <header
      aria-labelledby={resolvedTitleId}
      className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="min-w-0">
        {hasRenderableContent(eyebrow) ? <p className="text-metadata">{eyebrow}</p> : null}
        <h1
          className="mt-2 text-[clamp(1.75rem,3vw,2rem)] font-semibold leading-tight tracking-[-0.02em] text-foreground"
          id={resolvedTitleId}
        >
          {title}
        </h1>
        {hasRenderableContent(description) ? (
          <div className="mt-2 max-w-3xl text-secondary-foreground">{description}</div>
        ) : null}
        {hasRenderableContent(metadata) ? (
          <div className="mt-3 text-sm text-muted-foreground">{metadata}</div>
        ) : null}
      </div>
      {hasRenderableContent(actions) ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </header>
  );
}

```

## PageToolbar
- Path: `frontend/src/shared/ui/PageToolbar.tsx`
- Description: Filter/action toolbar

```tsx
import type { PropsWithChildren } from 'react';

export interface PageToolbarProps extends PropsWithChildren {
  ariaLabel: string;
  className?: string;
}

export function PageToolbar({ ariaLabel, children, className = '' }: PageToolbarProps) {
  return (
    <div
      aria-label={ariaLabel}
      className={`flex flex-wrap items-end gap-3 border-y border-border bg-muted/60 px-3 py-3 sm:px-4 ${className}`}
      role="toolbar"
    >
      {children}
    </div>
  );
}

```

## Select
- Path: `frontend/src/shared/ui/Select.tsx`
- Description: Labeled native select

```tsx
import { ChevronDown } from 'lucide-react';
import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  hint?: ReactNode;
  label: string;
  options: readonly SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = '', error, hint, id: suppliedId, label, options, ...props },
  ref,
) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="grid gap-2">
      <label className="font-semibold text-foreground" htmlFor={id}>{label}</label>
      <div className="relative">
        <select
          {...props}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={`min-h-10 w-full appearance-none rounded-ui-control border border-input bg-card py-2 pl-3 pr-10 text-sm font-medium text-foreground shadow-none transition-colors duration-200 hover:border-ui-line-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 motion-reduce:transition-none ${className}`}
          id={id}
          ref={ref}
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {hint ? <div className="text-sm text-muted-foreground" id={hintId}>{hint}</div> : null}
      {error ? <div className="text-sm text-destructive" id={errorId}>{error}</div> : null}
    </div>
  );
});

```

## EmptyState
- Path: `frontend/src/shared/ui/EmptyState.tsx`
- Description: Empty placeholder

```tsx
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  action?: ReactNode;
  description: ReactNode;
  icon?: LucideIcon;
  title: ReactNode;
}

export function EmptyState({ action, description, icon: Icon, title }: EmptyStateProps) {
  return (
    <section className="mx-auto grid max-w-2xl justify-items-center px-4 py-12 text-center">
      {Icon ? (
        <span
          aria-hidden
          className="grid h-14 w-14 place-items-center rounded-ui-control border border-border bg-card text-brand-text"
        >
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <h2 className="mt-5 text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-2 max-w-xl text-secondary-foreground">{description}</div>
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </section>
  );
}

```

## ErrorState
- Path: `frontend/src/shared/ui/ErrorState.tsx`
- Description: Error panel

```tsx
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

```

## Skeleton
- Path: `frontend/src/shared/ui/Skeleton.tsx`
- Description: Loading pulse

```tsx
export interface SkeletonProps {
  label?: string;
  lines?: number;
}

export function Skeleton({ label = 'Loading', lines = 3 }: SkeletonProps) {
  return <div aria-label={label} className="grid gap-3" role="status"><span className="sr-only">{label}</span>{Array.from({ length: lines }, (_, index) => <span aria-hidden className="h-4 animate-pulse rounded-ui-control bg-muted motion-reduce:animate-none" key={index} />)}</div>;
}

```
