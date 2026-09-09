import { Network } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

import {
  ClaudeMark,
  CodexMark,
  CompanyDocsMark,
  CursorMark,
  GoogleDriveMark,
  GoogleMeetMark,
  McpMark,
  NotionMark,
  SlackMark,
} from './BrandMarks';

/*
 * Clean Modular 3-Column Pipeline (Vercel / Stripe Architecture Style)
 *
 *   Sources Ingestion  ──→  FLAE Company Memory  ──→  AI Agents
 *   (Notion, Drive,         (Neural Synthesis Hub)    (Cursor, Claude,
 *    Meet, Docs, Slack)                                Codex, MCP)
 */

interface SourceChip {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  top: string;
  visibility: string;
  path: string;
  iconColor: string;
  iconBg: string;
}

interface AgentChip {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  top: string;
  visibility: string;
  path: string;
  iconColor: string;
  iconBg: string;
}

const SOURCES: SourceChip[] = [
  {
    Icon: NotionMark,
    label: 'Notion',
    top: 'top-[10%]',
    visibility: 'flex',
    path: 'M 28,10 C 33,10 34,46 36,46',
    iconColor: 'text-white',
    iconBg: 'bg-white/10 border-white/15',
  },
  {
    Icon: GoogleDriveMark,
    label: 'Google Drive',
    top: 'top-[28%]',
    visibility: 'flex',
    path: 'M 28,28 C 33,28 34,48 36,48',
    iconColor: 'text-[#4285F4]',
    iconBg: 'bg-[#4285F4]/10 border-[#4285F4]/20',
  },
  {
    Icon: GoogleMeetMark,
    label: 'Google Meet',
    top: 'top-[46%]',
    visibility: 'hidden lg:flex',
    path: 'M 28,46 L 36,50',
    iconColor: 'text-[#00AC47]',
    iconBg: 'bg-[#00AC47]/10 border-[#00AC47]/20',
  },
  {
    Icon: CompanyDocsMark,
    label: 'Company docs',
    top: 'top-[64%]',
    visibility: 'hidden lg:flex',
    path: 'M 28,64 C 33,64 34,52 36,52',
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10 border-orange-400/20',
  },
  {
    Icon: SlackMark,
    label: 'Slack',
    top: 'top-[82%]',
    visibility: 'hidden xl:flex',
    path: 'M 28,82 C 33,82 34,54 36,54',
    iconColor: 'text-[#ECB22E]',
    iconBg: 'bg-[#ECB22E]/10 border-[#ECB22E]/20',
  },
];

const AGENTS: AgentChip[] = [
  {
    Icon: CursorMark,
    label: 'Cursor',
    top: 'top-[16%]',
    visibility: 'flex',
    path: 'M 64,46 C 66,46 67,16 72,16',
    iconColor: 'text-[#38bdf8]',
    iconBg: 'bg-[#38bdf8]/10 border-[#38bdf8]/20',
  },
  {
    Icon: ClaudeMark,
    label: 'Claude',
    top: 'top-[38%]',
    visibility: 'flex',
    path: 'M 64,48 C 66,48 67,38 72,38',
    iconColor: 'text-[#D97706]',
    iconBg: 'bg-[#D97706]/10 border-[#D97706]/20',
  },
  {
    Icon: CodexMark,
    label: 'Codex',
    top: 'top-[60%]',
    visibility: 'hidden lg:flex',
    path: 'M 64,52 C 66,52 67,60 72,60',
    iconColor: 'text-[#10B981]',
    iconBg: 'bg-[#10B981]/10 border-[#10B981]/20',
  },
  {
    Icon: McpMark,
    label: 'Any MCP agent',
    top: 'top-[82%]',
    visibility: 'hidden xl:flex',
    path: 'M 64,54 C 66,54 67,82 72,82',
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10 border-orange-400/20',
  },
];

function SourceCard({ chip }: { chip: SourceChip }) {
  const Icon = chip.Icon;
  return (
    <div
      className={[
        'absolute left-0 z-10 w-[30%] items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-white/5',
        'px-3 py-2 text-xs font-medium text-glass-ink backdrop-blur-md transition-all sm:text-sm',
        'shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]',
        chip.top,
        '-translate-y-1/2',
        chip.visibility,
      ].join(' ')}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${chip.iconBg} ${chip.iconColor} p-1 shadow-sm`}
        >
          <Icon className="h-4 w-4 shrink-0" />
        </div>
        <span className="truncate">{chip.label}</span>
      </div>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/90 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
    </div>
  );
}

function AgentCard({ chip }: { chip: AgentChip }) {
  const Icon = chip.Icon;
  return (
    <div
      className={[
        'absolute right-0 z-10 w-[30%] items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-white/5',
        'px-3 py-2 text-xs font-medium text-glass-ink backdrop-blur-md transition-all sm:text-sm',
        'shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]',
        chip.top,
        '-translate-y-1/2',
        chip.visibility,
      ].join(' ')}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orb-primary shadow-[0_0_6px_rgba(249,115,22,0.9)]" />
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="truncate">{chip.label}</span>
        <div
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${chip.iconBg} ${chip.iconColor} p-1 shadow-sm`}
        >
          <Icon className="h-4 w-4 shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function KnowledgeMemoryPanel() {
  return (
    <section
      aria-hidden="true"
      className="glass-panel glass-grid pointer-events-none relative isolate flex min-h-88 flex-col justify-between overflow-hidden p-5 sm:p-6 md:min-h-full"
      data-testid="knowledge-memory-panel"
    >
      {/* Soft ambient center glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orb-primary/10 blur-3xl" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-glass-ink-muted" />
          <p className="font-code text-[11px] font-semibold uppercase tracking-[0.16em] text-glass-ink-muted">
            Sources
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 shadow-sm backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-orb-primary shadow-[0_0_6px_rgb(249_115_22/0.8)]" />
          <span className="font-code text-[10px] font-semibold uppercase tracking-[0.14em] text-glass-ink">
            Knowledge synthesis
          </span>
        </div>

        <div className="flex items-center gap-2">
          <p className="font-code text-[11px] font-semibold uppercase tracking-[0.16em] text-glass-ink-muted">
            AI agents
          </p>
          <span className="h-1.5 w-1.5 rounded-full bg-orb-amber" />
        </div>
      </div>

      {/* Pipeline Work Area */}
      <div className="relative my-4 flex-1">
        {/* SVG Connector Bus */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          fill="none"
          focusable="false"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          {/* Source convergence lines */}
          {SOURCES.map((chip, index) => (
            <g className={chip.visibility === 'flex' ? '' : chip.visibility} key={`line-src-${chip.label}`}>
              <path
                d={chip.path}
                opacity="0.15"
                stroke="#f5f0e8"
                strokeWidth="1.2"
                vectorEffect="non-scaling-stroke"
              />
              <path
                className={`memory-flow memory-flow-muted ${index % 2 === 1 ? 'memory-flow-delay' : ''}`}
                d={chip.path}
              />
            </g>
          ))}

          {/* Agent distribution lines */}
          {AGENTS.map((chip, index) => (
            <g className={chip.visibility === 'flex' ? '' : chip.visibility} key={`line-agt-${chip.label}`}>
              <path
                d={chip.path}
                opacity="0.15"
                stroke="#fb923c"
                strokeWidth="1.2"
                vectorEffect="non-scaling-stroke"
              />
              <path
                className={`memory-flow ${index % 2 === 1 ? 'memory-flow-delay' : ''}`}
                d={chip.path}
              />
            </g>
          ))}
        </svg>

        {/* Source Cards */}
        {SOURCES.map((chip) => (
          <SourceCard chip={chip} key={chip.label} />
        ))}

        {/* Central FLAE Memory Core */}
        <div className="absolute left-1/2 top-1/2 z-20 flex w-[32%] max-w-52.5 -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl border border-orange-400/30 bg-linear-to-b from-white/8 via-orange-950/25 to-black/60 p-4 text-center shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-linear-to-b from-orange-500/20 to-transparent opacity-40 blur-sm" />

          <div className="relative mb-1.5 grid h-9 w-9 place-items-center rounded-xl border border-amber-300/30 bg-orange-500/20 shadow-[0_0_14px_rgba(249,115,22,0.35)]">
            <Network className="h-4.5 w-4.5 text-amber-200" strokeWidth={2} />
          </div>

          <p className="relative text-base font-bold tracking-[0.18em] text-white">FLAE</p>
          <p className="relative mt-0.5 rounded-full border border-white/12 bg-white/10 px-2.5 py-0.5 font-code text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-200">
            Company memory
          </p>

          <div className="relative my-2.5 h-px w-full bg-white/10" />

          {/* Telemetry Specs */}
          <div className="relative w-full space-y-1.5 text-left">
            <div className="flex items-center justify-between rounded-lg bg-black/40 px-2.5 py-1.5 border border-white/5">
              <span className="font-code text-[9px] font-semibold uppercase tracking-wider text-glass-ink-secondary">
                Knowledge sync
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                Active
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-black/40 px-2.5 py-1.5 border border-white/5">
              <span className="font-code text-[9px] font-semibold uppercase tracking-wider text-glass-ink-secondary">
                Agents connected
              </span>
              <span className="text-xs font-semibold text-amber-300">4 live</span>
            </div>
          </div>
        </div>

        {/* Agent Cards */}
        {AGENTS.map((chip) => (
          <AgentCard chip={chip} key={chip.label} />
        ))}
      </div>

      {/* Bottom Status Bar */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-3 font-code text-[10px] text-glass-ink-muted sm:text-[11px]">
        <span>Continuous sync · Low latency</span>
        <span>Zero retention leak</span>
      </div>
    </section>
  );
}
