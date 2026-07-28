import type { HTMLAttributes } from 'react';

export type BadgeVariant = 'destructive' | 'neutral' | 'primary' | 'success' | 'warning';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  destructive: 'bg-state-danger-soft text-state-danger',
  neutral: 'bg-ui-interactive text-ui-ink-secondary',
  primary: 'bg-brand-soft text-brand-text',
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
