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
