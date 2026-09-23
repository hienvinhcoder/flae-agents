import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export type InputDensity = "default" | "compact";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  density?: InputDensity;
  error?: string;
  hint?: ReactNode;
  label: ReactNode;
  /** Renders muted “(hint)” after the label — e.g. optional fields. */
  optionalHint?: string;
}

const densityClasses: Record<
  InputDensity,
  { field: string; label: string; stack: string }
> = {
  default: {
    field:
      "min-h-10 px-3 py-2 text-foreground shadow-none focus-visible:ring-2 focus-visible:ring-ring/25",
    label: "font-semibold text-foreground",
    stack: "grid gap-2",
  },
  compact: {
    field:
      "min-h-9 px-3 py-1.5 text-[13px] text-foreground shadow-sm focus-visible:ring-1 focus-visible:ring-primary",
    label: "text-[13px] font-medium text-foreground",
    stack: "grid gap-1.5",
  },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className = "",
    density = "default",
    error,
    hint,
    id: suppliedId,
    label,
    optionalHint,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const tokens = densityClasses[density];

  return (
    <div className={tokens.stack}>
      <label className={tokens.label} htmlFor={id}>
        {label}
        {optionalHint ? (
          <>
            {" "}
            <span className="font-normal text-muted-foreground">
              ({optionalHint})
            </span>
          </>
        ) : null}
      </label>
      <input
        {...props}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-ui-control border border-input bg-card transition-colors duration-200 placeholder:text-muted-foreground hover:border-ui-line-strong focus-visible:border-primary focus-visible:outline-none motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 ${tokens.field} ${className}`}
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
});
