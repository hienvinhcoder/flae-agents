import {
  Bot,
  Brain,
  BriefcaseBusiness,
  Database,
  Sparkles,
  Terminal,
} from "lucide-react";

interface AgentAvatarIconProps {
  className?: string;
  icon: string;
}

export function AgentAvatarIcon({ className, icon }: AgentAvatarIconProps) {
  if (icon === "brain") return <Brain className={className} />;
  if (icon === "briefcase") return <BriefcaseBusiness className={className} />;
  if (icon === "database") return <Database className={className} />;
  if (icon === "sparkles") return <Sparkles className={className} />;
  if (icon === "terminal") return <Terminal className={className} />;
  return <Bot className={className} />;
}
