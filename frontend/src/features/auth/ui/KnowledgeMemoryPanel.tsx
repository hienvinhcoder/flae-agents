import {
  Bot,
  Braces,
  FileText,
  GitPullRequestArrow,
  Network,
  Users,
  type LucideIcon,
} from 'lucide-react';

interface MemoryNodeProps {
  className: string;
  icon: LucideIcon;
  label: string;
}

function MemoryNode({ className, icon: Icon, label }: MemoryNodeProps) {
  return (
    <div
      className={[
        'absolute z-10 flex items-center gap-2 rounded-ui-control',
        'border border-ui-divider bg-ui-canvas/95 px-3 py-2 shadow-sm',
        'text-xs font-medium text-ui-ink sm:text-sm',
        className,
      ].join(' ')}
    >
      <Icon className="h-4 w-4 shrink-0 text-brand-text" strokeWidth={1.8} />
      <span>{label}</span>
    </div>
  );
}

export function KnowledgeMemoryPanel() {
  return (
    <section
      aria-hidden="true"
      className="auth-grid pointer-events-none relative isolate min-h-[22rem] overflow-hidden rounded-ui-panel border border-ui-divider bg-ui-panel shadow-ui-panel md:min-h-full"
      data-testid="knowledge-memory-panel"
    >
      <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute inset-0 bg-ui-canvas/15" />

      <p className="absolute left-4 top-4 z-20 rounded-ui-control border border-ui-divider bg-ui-canvas/90 px-3 py-1.5 font-code text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-ink-secondary sm:left-6 sm:top-6 sm:text-[11px]">
        Living knowledge graph
      </p>

      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full text-brand-text"
        fill="none"
        focusable="false"
        preserveAspectRatio="none"
        viewBox="0 0 720 680"
      >
        <path className="memory-flow" d="M360 332C272 285 215 228 144 164" />
        <path
          className="memory-flow memory-flow-delay"
          d="M360 332C463 269 531 230 594 174"
        />
        <path
          className="memory-flow hidden lg:block"
          d="M360 332C248 368 182 424 126 496"
        />
        <path
          className="memory-flow memory-flow-delay hidden xl:block"
          d="M360 332C473 374 535 427 600 506"
        />
        <path className="memory-flow" d="M360 332C361 430 361 482 360 564" />
      </svg>

      <div className="memory-pulse absolute left-1/2 top-[53%] z-20 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-ui-divider bg-primary-control text-center text-primary-control-foreground">
        <Network className="mb-2 h-6 w-6" strokeWidth={1.8} />
        <span className="max-w-20 text-sm font-semibold leading-tight">Company Memory</span>
      </div>

      <MemoryNode className="left-[5%] top-[22%]" icon={FileText} label="Documents" />
      <MemoryNode className="right-[5%] top-[22%]" icon={Braces} label="Code" />
      <MemoryNode
        className="left-[5%] top-[68%] hidden lg:flex"
        icon={GitPullRequestArrow}
        label="Decisions"
      />
      <MemoryNode
        className="right-[6%] top-[68%] hidden xl:flex"
        icon={Users}
        label="People"
      />
      <MemoryNode
        className="left-1/2 top-[83%] -translate-x-1/2 -translate-y-1/2"
        icon={Bot}
        label="Agents"
      />

      <div className="absolute bottom-6 left-6 z-20 hidden items-center gap-8 rounded-ui-control border border-ui-divider bg-ui-canvas/90 px-4 py-3 shadow-sm lg:flex">
        <div>
          <p className="font-code text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-ink-secondary">
            Knowledge sync
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-ui-ink">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Active
          </p>
        </div>
        <div className="hidden border-l border-ui-divider pl-8 xl:block">
          <p className="font-code text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-ink-secondary">
            Connected sources
          </p>
          <p className="mt-1 text-sm font-semibold text-ui-ink">12 live</p>
        </div>
      </div>
    </section>
  );
}
