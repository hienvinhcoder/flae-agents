import {
  Bot,
  Brain,
  BriefcaseBusiness,
  Database,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";

import { getAgentAvatarColor } from "./agent-avatar-color";

const avatarIcons: Record<string, LucideIcon> = {
  bot: Bot,
  brain: Brain,
  briefcase: BriefcaseBusiness,
  database: Database,
  sparkles: Sparkles,
  terminal: Terminal,
};

interface AgentAvatarIconProps {
  className?: string;
  icon: string;
}

export function AgentAvatarIcon({ className, icon }: AgentAvatarIconProps) {
  const Icon = avatarIcons[icon] ?? Bot;
  return <Icon className={className} />;
}

interface AgentAppearancePreviewProps {
  color: string;
  colorLabel: string;
  colorValue: string;
  icon: string;
  iconLabel: string;
  iconValue: string;
}

export function AgentAppearancePreview({
  color,
  colorLabel,
  colorValue,
  icon,
  iconLabel,
  iconValue,
}: AgentAppearancePreviewProps) {
  return (
    <div
      aria-label={`${colorLabel}: ${colorValue}; ${iconLabel}: ${iconValue}`}
      className="flex min-h-full items-center gap-4 rounded-ui-control border border-ui-divider bg-ui-interactive p-4"
      role="group"
    >
      <div
        aria-hidden
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${getAgentAvatarColor(color)}`}
      >
        <AgentAvatarIcon className="h-7 w-7" icon={icon} />
      </div>
      <dl className="min-w-0 space-y-2 text-sm">
        <div>
          <dt className="text-ui-ink-muted">{colorLabel}</dt>
          <dd className="font-semibold text-ui-ink">{colorValue}</dd>
        </div>
        <div>
          <dt className="text-ui-ink-muted">{iconLabel}</dt>
          <dd className="font-semibold text-ui-ink">{iconValue}</dd>
        </div>
      </dl>
    </div>
  );
}
