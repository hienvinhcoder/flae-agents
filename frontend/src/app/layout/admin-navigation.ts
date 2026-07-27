import {
  BookOpen,
  Bot,
  FileText,
  Inbox,
  MessageSquare,
  Network,
  Settings,
  Sparkles,
  Tags,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavigationGroupId = "focus" | "intelligence" | "workspace";

export interface AdminNavigationItem {
  readonly key: string;
  readonly to: string;
  readonly icon: LucideIcon;
}

export interface AdminNavigationGroup {
  readonly id: NavigationGroupId;
  readonly key: string;
  readonly items: readonly AdminNavigationItem[];
}

export const navigationGroups: readonly AdminNavigationGroup[] = [
  {
    id: "focus",
    key: "SHELL.NAV_GROUP_FOCUS",
    items: [
      {
        key: "NAV.BRIEFING",
        to: "/dashboard/briefing",
        icon: Sparkles,
      },
      {
        key: "NAV.CHAT",
        to: "/dashboard/chat",
        icon: MessageSquare,
      },
      {
        key: "NAV.INBOX",
        to: "/dashboard/inbox",
        icon: Inbox,
      },
    ],
  },
  {
    id: "intelligence",
    key: "SHELL.NAV_GROUP_INTELLIGENCE",
    items: [
      {
        key: "NAV.AGENTS",
        to: "/dashboard/agents",
        icon: Bot,
      },
      {
        key: "NAV.KNOWLEDGE",
        to: "/dashboard/knowledge",
        icon: BookOpen,
      },
      {
        key: "SHELL.KNOWLEDGE_GRAPH",
        to: "/dashboard/knowledge/graph",
        icon: Network,
      },
      {
        key: "NAV.TOPICS",
        to: "/dashboard/topics",
        icon: Tags,
      },
      {
        key: "NAV.REPORTS",
        to: "/dashboard/reports",
        icon: FileText,
      },
    ],
  },
  {
    id: "workspace",
    key: "SHELL.NAV_GROUP_WORKSPACE",
    items: [
      {
        key: "NAV.SETTINGS",
        to: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

export function findActiveNavigationItem(
  pathname: string,
): AdminNavigationItem | undefined {
  const cleanPathname = pathname.split(/[?#]/, 1)[0] ?? pathname;
  let activeItem: AdminNavigationItem | undefined;

  for (const group of navigationGroups) {
    for (const item of group.items) {
      const matchesRoute =
        cleanPathname === item.to || cleanPathname.startsWith(`${item.to}/`);

      if (
        matchesRoute &&
        (!activeItem || item.to.length > activeItem.to.length)
      ) {
        activeItem = item;
      }
    }
  }

  return activeItem;
}

export function findNavigationGroup(
  item: AdminNavigationItem | undefined,
): AdminNavigationGroup | undefined {
  if (!item) {
    return undefined;
  }

  return navigationGroups.find((group) =>
    group.items.some((candidate) => candidate.to === item.to),
  );
}
