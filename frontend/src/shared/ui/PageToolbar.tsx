import type { PropsWithChildren } from 'react';

export interface PageToolbarProps extends PropsWithChildren {
  ariaLabel: string;
  className?: string;
}

export function PageToolbar({ ariaLabel, children, className = '' }: PageToolbarProps) {
  return (
    <div
      aria-label={ariaLabel}
      className={`flex flex-wrap items-end gap-3 border-y border-ui-divider bg-ui-raised/55 px-3 py-3 sm:px-4 ${className}`}
      role="toolbar"
    >
      {children}
    </div>
  );
}
