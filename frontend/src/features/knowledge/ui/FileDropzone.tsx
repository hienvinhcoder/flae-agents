import { CloudUpload, FileText, Trash2 } from "lucide-react";
import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

export interface FileDropzoneProps {
  accept: string;
  clearLabel: string;
  disabled?: boolean;
  dropLabel: string;
  error?: string;
  file: File | undefined;
  id: string;
  label: string;
  maxSizeLabel: string;
  name?: string;
  onClear: () => void;
  onFileChange: (file: File | undefined) => void;
  typeChips: readonly string[];
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function FileDropzone({
  accept,
  clearLabel,
  disabled,
  dropLabel,
  error,
  file,
  id,
  label,
  maxSizeLabel,
  name,
  onClear,
  onFileChange,
  typeChips,
}: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setIsDragActive(true);
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget === event.target) setIsDragActive(false);
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;
    const next = event.dataTransfer.files?.[0];
    if (next) onFileChange(next);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFileChange(event.target.files?.[0]);
  };

  const errorId = `${id}-error`;

  return (
    <div className="grid gap-2">
      <span className="sr-only" id={`${id}-label`}>
        {label}
      </span>
      {!file ? (
        <div
          className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card p-10 text-center transition-colors motion-reduce:transition-none ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-input hover:border-primary/50 hover:bg-primary/5"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            accept={accept}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={Boolean(error)}
            aria-labelledby={`${id}-label`}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            disabled={disabled}
            id={id}
            name={name}
            onChange={handleInputChange}
            ref={inputRef}
            type="file"
          />
          <div
            aria-hidden
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary motion-reduce:transition-none"
          >
            <CloudUpload className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <p className="text-[14px] font-medium text-foreground">{dropLabel}</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            {typeChips.map((chip) => (
              <span
                className="rounded bg-secondary px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground"
                key={chip}
              >
                {chip}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">{maxSizeLabel}</p>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-ui-control border border-input bg-card p-3 shadow-sm">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <div
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400"
            >
              <FileText className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-foreground">
                {file.name}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          <button
            aria-label={clearLabel}
            className="flex h-7 w-7 items-center justify-center rounded-ui-control text-muted-foreground transition-colors hover:bg-accent hover:text-destructive disabled:opacity-50 motion-reduce:transition-none"
            disabled={disabled}
            onClick={() => {
              onClear();
              if (inputRef.current) inputRef.current.value = "";
            }}
            type="button"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
          </button>
          <input
            accept={accept}
            aria-invalid={Boolean(error)}
            aria-label={label}
            className="sr-only"
            disabled={disabled}
            id={id}
            name={name}
            onChange={handleInputChange}
            ref={inputRef}
            type="file"
          />
        </div>
      )}
      {error ? (
        <p className="text-sm text-destructive" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
