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
      <label className="font-semibold text-ui-ink" htmlFor={id}>{label}</label>
      <input
        {...props}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={`min-h-11 w-full rounded-ui-control border border-ui-line bg-ui-raised px-3 py-2 text-ui-ink transition-colors duration-200 motion-reduce:transition-none placeholder:text-ui-ink-muted hover:border-ui-line-strong ${className}`}
        id={id}
        ref={ref}
      />
      {hint ? <div className="text-sm text-ui-ink-muted" id={hintId}>{hint}</div> : null}
      {error ? <div className="text-sm text-state-danger" id={errorId}>{error}</div> : null}
    </div>
  );
});
