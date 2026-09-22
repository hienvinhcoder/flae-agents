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
      className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="min-w-0">
        {hasRenderableContent(eyebrow) ? (
          <p className="mb-1 text-[12px] font-medium text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1
          className="text-[24px] font-semibold leading-tight tracking-[-0.01em] text-foreground"
          id={resolvedTitleId}
        >
          {title}
        </h1>
        {hasRenderableContent(description) ? (
          <div className="mt-1 max-w-3xl text-[14px] text-muted-foreground">{description}</div>
        ) : null}
        {hasRenderableContent(metadata) ? (
          <div className="mt-2 text-[13px] text-muted-foreground">{metadata}</div>
        ) : null}
      </div>
      {hasRenderableContent(actions) ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
