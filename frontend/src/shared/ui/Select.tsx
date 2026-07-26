import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label: string;
  options: readonly SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = '', error, id: suppliedId, label, options, ...props },
  ref,
) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="grid gap-2">
      <label className="font-semibold text-ui-ink" htmlFor={id}>{label}</label>
      <select
        {...props}
        aria-describedby={errorId}
        aria-invalid={Boolean(error)}
        className={`min-h-11 rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2 text-ui-ink transition-colors duration-200 hover:border-ui-line-strong ${className}`}
        id={id}
        ref={ref}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error ? <div className="text-sm text-state-danger" id={errorId}>{error}</div> : null}
    </div>
  );
});
