import { FileUp } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';

import { FileChip } from './FileChip';

export interface FileDropzoneProps {
  accept: string; // ".pdf,.md,.txt"
  disabled?: boolean;
  error?: string;
  file: File | undefined;
  hint?: string;
  id: string;
  label: string;
  name?: string;
  onClear: () => void;
  onFileChange: (file: File | undefined) => void;
  browseLabel: string;
  dropLabel: string;
  typesLabel: string; // e.g. "PDF · MD · TXT"
  clearLabel: string;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function FileDropzone({
  accept,
  disabled,
  error,
  file,
  hint,
  id,
  label,
  name,
  onClear,
  onFileChange,
  browseLabel,
  dropLabel,
  typesLabel,
  clearLabel,
}: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileChange(files[0]);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileChange(files[0]);
    } else {
      onFileChange(undefined);
    }
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  if (file) {
    return (
      <div className="space-y-2">
        <label htmlFor={id} className="font-semibold text-foreground">
          {label}
        </label>
        <FileChip
          clearLabel={clearLabel}
          disabled={disabled}
          name={file.name}
          onClear={onClear}
          sizeLabel={formatFileSize(file.size)}
        />
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && (
          <p id={`${id}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
        <input
          ref={inputRef}
          accept={accept}
          className="sr-only"
          disabled={disabled}
          id={id}
          name={name}
          onChange={handleInputChange}
          type="file"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-label={label}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="font-semibold text-foreground">
        {label}
      </label>
      <div
        className={`
          relative rounded-ui-control border-2 border-dashed p-6 text-center transition-colors
          ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border'
          }
          ${disabled ? 'opacity-50' : ''}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-ui-control bg-muted">
            <FileUp className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{dropLabel}</p>
            <p className="text-xs text-muted-foreground">{typesLabel}</p>
          </div>
          <button
            type="button"
            className="text-sm text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50"
            disabled={disabled}
            onClick={handleClick}
          >
            {browseLabel}
          </button>
        </div>
        <input
          ref={inputRef}
          accept={accept}
          className="sr-only"
          disabled={disabled}
          id={id}
          name={name}
          onChange={handleInputChange}
          type="file"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-label={label}
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}