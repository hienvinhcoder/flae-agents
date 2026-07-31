export interface PlaceholderPageProps {
  description: string;
  title: string;
}

export function PlaceholderPage({ description, title }: PlaceholderPageProps) {
  return (
    <section aria-labelledby="page-title" className="mx-auto w-full max-w-7xl">
      <p className="text-metadata">FLAE workspace</p>
      <h1 className="mt-2 text-[1.75rem] font-semibold leading-[2.1rem] tracking-[-0.02em] text-foreground" id="page-title">{title}</h1>
      <div className="surface-panel mt-6 p-6 sm:p-8">
        <p className="max-w-2xl text-secondary-foreground">{description}</p>
      </div>
    </section>
  );
}
