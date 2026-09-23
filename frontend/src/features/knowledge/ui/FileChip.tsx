import { X } from 'lucide-react';

export function FileChip({
  clearLabel,
  disabled,
  name,
  onClear,
  sizeLabel,
}: {
  clearLabel: string;
  disabled?: boolean;
  name: string;
  onClear: () => void;
  sizeLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-ui-control border border-border bg-card px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{sizeLabel}</p>
      </div>
      <button
        aria-label={clearLabel}
        className="grid min-h-9 min-w-9 place-items-center rounded-ui-control text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        disabled={disabled}
        onClick={onClear}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}