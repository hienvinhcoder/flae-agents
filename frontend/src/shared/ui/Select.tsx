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
      <label className="font-semibold text-ui-ink" htmlFor={id}>{label}</label>
      <select
        {...props}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={`min-h-11 rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2 text-ui-ink transition-colors duration-200 motion-reduce:transition-none hover:border-ui-line-strong ${className}`}
        id={id}
        ref={ref}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {hint ? <div className="text-sm text-ui-ink-muted" id={hintId}>{hint}</div> : null}
      {error ? <div className="text-sm text-state-danger" id={errorId}>{error}</div> : null}
    </div>
  );
});
