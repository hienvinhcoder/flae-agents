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
  danger: 'border-state-danger bg-state-danger-soft text-state-danger hover:bg-ui-interactive',
  ghost: 'border-transparent bg-transparent text-ui-ink-secondary hover:bg-ui-interactive hover:text-ui-ink',
  outline: 'border-ui-divider bg-ui-raised text-ui-ink hover:bg-ui-interactive',
  primary: 'button-primary border-transparent bg-brand-cta text-brand-cta-foreground hover:bg-brand-cta-hover active:bg-brand-cta-active',
  secondary: 'border-ui-line bg-ui-raised text-ui-ink hover:bg-ui-interactive',
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
      disabled={disabled || isLoading}
      ref={ref}
    >
      {isLoading ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
      {isLoading ? loadingText : children}
    </button>
  );
});
