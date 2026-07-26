import { LoaderCircle } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'button-primary',
  secondary: 'border-ui-line bg-ui-raised text-ui-ink hover:bg-ui-interactive',
  danger: 'border-state-danger bg-state-danger-soft text-state-danger hover:bg-ui-interactive',
  ghost: 'border-transparent bg-transparent text-ui-ink-secondary hover:bg-ui-interactive hover:text-ui-ink',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className = '', disabled, isLoading = false, loadingText = 'Loading', variant = 'primary', ...props },
  ref,
) {
  return (
    <button
      {...props}
      aria-busy={isLoading || undefined}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-ui-control border px-4 py-2 font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      ref={ref}
    >
      {isLoading ? <LoaderCircle aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
      {isLoading ? loadingText : children}
    </button>
  );
});
