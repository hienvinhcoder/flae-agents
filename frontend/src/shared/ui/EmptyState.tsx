import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  action?: ReactNode;
  description: ReactNode;
  icon?: LucideIcon;
  title: ReactNode;
}

export function EmptyState({ action, description, icon: Icon, title }: EmptyStateProps) {
  return (
    <section className="mx-auto grid max-w-2xl justify-items-center px-4 py-12 text-center">
      {Icon ? (
        <span
          aria-hidden
          className="grid h-14 w-14 place-items-center rounded-ui-control border border-ui-divider bg-ui-panel text-brand-text"
        >
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <h2 className="mt-5 text-xl font-semibold text-ui-ink">{title}</h2>
      <div className="mt-2 max-w-xl text-ui-ink-secondary">{description}</div>
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </section>
  );
}
