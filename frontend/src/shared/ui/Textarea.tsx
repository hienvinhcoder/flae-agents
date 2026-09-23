import {
  forwardRef,
  useId,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  hint?: ReactNode;
  label: ReactNode;
  /** Optional trailing control row (e.g. formatting affordances). */
  labelAccessory?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      className = "",
      error,
      hint,
      id: suppliedId,
      label,
      labelAccessory,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const id = suppliedId ?? generatedId;
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label
            className="text-[13px] font-medium text-foreground"
            htmlFor={id}
          >
            {label}
          </label>
          {labelAccessory}
        </div>
        <textarea
          {...props}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={`min-h-[200px] w-full resize-y rounded-ui-control border border-input bg-card px-4 py-3 text-[14px] leading-relaxed text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/60 hover:border-ui-line-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          id={id}
          ref={ref}
        />
        {hint ? (
          <div className="text-sm text-muted-foreground" id={hintId}>
            {hint}
          </div>
        ) : null}
        {error ? (
          <div className="text-sm text-destructive" id={errorId}>
            {error}
          </div>
        ) : null}
      </div>
    );
  },
);
