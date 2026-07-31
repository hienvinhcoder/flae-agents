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
