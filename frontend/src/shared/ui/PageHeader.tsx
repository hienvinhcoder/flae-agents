import { Children, useId, type ReactNode } from 'react';

export interface PageHeaderProps {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  metadata?: ReactNode;
  title: ReactNode;
  titleId?: string;
}

function hasRenderableContent(value: ReactNode): boolean {
  return Children.toArray(value).length > 0;
}

export function PageHeader({ actions, description, eyebrow, metadata, title, titleId }: PageHeaderProps) {
  const generatedTitleId = useId();
  const resolvedTitleId = titleId ?? generatedTitleId;

  return (
    <header
      aria-labelledby={resolvedTitleId}
      className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="min-w-0">
        {hasRenderableContent(eyebrow) ? <p className="text-metadata">{eyebrow}</p> : null}
        <h1
          className="mt-2 text-[clamp(1.75rem,3vw,2rem)] font-semibold leading-tight tracking-[-0.02em] text-foreground"
          id={resolvedTitleId}
        >
          {title}
        </h1>
        {hasRenderableContent(description) ? (
          <div className="mt-2 max-w-3xl text-secondary-foreground">{description}</div>
        ) : null}
        {hasRenderableContent(metadata) ? (
          <div className="mt-3 text-sm text-muted-foreground">{metadata}</div>
        ) : null}
      </div>
      {hasRenderableContent(actions) ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </header>
  );
}
