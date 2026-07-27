import { useId, type ReactNode } from 'react';

export interface PageHeaderProps {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  metadata?: ReactNode;
  title: ReactNode;
  titleId?: string;
}

export function PageHeader({ actions, description, eyebrow, metadata, title, titleId }: PageHeaderProps) {
  const generatedTitleId = useId();
  const resolvedTitleId = titleId ?? generatedTitleId;

  return (
    <header
      aria-labelledby={resolvedTitleId}
      className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="min-w-0">
        {eyebrow ? <p className="text-metadata">{eyebrow}</p> : null}
        <h1
          className="mt-2 text-[clamp(1.75rem,3vw,2.35rem)] font-semibold leading-tight tracking-[-0.025em] text-ui-ink"
          id={resolvedTitleId}
        >
          {title}
        </h1>
        {description ? <div className="mt-2 max-w-3xl text-ui-ink-secondary">{description}</div> : null}
        {metadata ? <div className="mt-3 text-sm text-ui-ink-muted">{metadata}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
