import {
  BookOpen,
  Bot,
  MessageSquare,
  Settings,
  Tags,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavigationGroupId = "focus" | "intelligence" | "workspace";

export interface AdminNavigationItem {
  readonly exact?: boolean;
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
        key: "NAV.CHAT",
        to: "/dashboard/chat",
        icon: MessageSquare,
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
        key: "NAV.TOPICS",
        to: "/dashboard/topics",
        icon: Tags,
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
      const matchesRoute = item.exact
        ? cleanPathname === item.to
        : cleanPathname === item.to || cleanPathname.startsWith(`${item.to}/`);

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
