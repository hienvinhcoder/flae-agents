export interface SkeletonProps {
  label?: string;
  lines?: number;
}

export function Skeleton({ label = 'Loading', lines = 3 }: SkeletonProps) {
  return <div aria-label={label} className="grid gap-3" role="status"><span className="sr-only">{label}</span>{Array.from({ length: lines }, (_, index) => <span aria-hidden className="h-4 animate-pulse rounded-ui-control bg-muted motion-reduce:animate-none" key={index} />)}</div>;
}
