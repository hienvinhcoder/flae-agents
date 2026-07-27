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
  readonly labelKey: string;
  readonly to: string;
  readonly icon: LucideIcon;
}

export interface AdminNavigationGroup {
  readonly id: NavigationGroupId;
  readonly labelKey: string;
  readonly items: readonly AdminNavigationItem[];
}

export const navigationGroups: readonly AdminNavigationGroup[] = [
  {
    id: "focus",
    labelKey: "SHELL.NAV_GROUP_FOCUS",
    items: [
      {
        labelKey: "NAV.BRIEFING",
        to: "/dashboard/briefing",
        icon: Sparkles,
      },
      {
        labelKey: "NAV.CHAT",
        to: "/dashboard/chat",
        icon: MessageSquare,
      },
      {
        labelKey: "NAV.INBOX",
        to: "/dashboard/inbox",
        icon: Inbox,
      },
    ],
  },
  {
    id: "intelligence",
    labelKey: "SHELL.NAV_GROUP_INTELLIGENCE",
    items: [
      {
        labelKey: "NAV.AGENTS",
        to: "/dashboard/agents",
        icon: Bot,
      },
      {
        labelKey: "NAV.KNOWLEDGE",
        to: "/dashboard/knowledge",
        icon: BookOpen,
      },
      {
        labelKey: "SHELL.KNOWLEDGE_GRAPH",
        to: "/dashboard/knowledge/graph",
        icon: Network,
      },
      {
        labelKey: "NAV.TOPICS",
        to: "/dashboard/topics",
        icon: Tags,
      },
      {
        labelKey: "NAV.REPORTS",
        to: "/dashboard/reports",
        icon: FileText,
      },
    ],
  },
  {
    id: "workspace",
    labelKey: "SHELL.NAV_GROUP_WORKSPACE",
    items: [
      {
        labelKey: "NAV.SETTINGS",
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

  return navigationGroups.find((group) => group.items.includes(item));
}
