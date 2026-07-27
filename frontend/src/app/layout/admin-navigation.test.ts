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
import { describe, expect, it } from "vitest";

import {
  findActiveNavigationItem,
  findNavigationGroup,
  navigationGroups,
} from "./admin-navigation";
import type {
  AdminNavigationGroup,
  NavigationGroupId,
} from "./admin-navigation";

describe("admin navigation", () => {
  it("defines the exact grouped routes used by the admin shell", () => {
    const groups: readonly AdminNavigationGroup[] = navigationGroups;
    const groupIds: NavigationGroupId[] = groups.map((group) => group.id);

    expect(groupIds).toEqual(["focus", "intelligence", "workspace"]);
    expect(groups).toEqual([
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
    ]);
  });

  it.each([
    ["/dashboard/briefing", "NAV.BRIEFING"],
    ["/dashboard/chat?conversation=conversation-1#latest", "NAV.CHAT"],
    ["/dashboard/agents/agent-1", "NAV.AGENTS"],
    ["/dashboard/knowledge", "NAV.KNOWLEDGE"],
    ["/dashboard/knowledge/graph", "SHELL.KNOWLEDGE_GRAPH"],
    [
      "/dashboard/knowledge/graph/entities/entity-1?panel=details",
      "SHELL.KNOWLEDGE_GRAPH",
    ],
    ["/dashboard/topics/topic-1#activity", "NAV.TOPICS"],
  ])("finds the most-specific item for %s", (pathname, labelKey) => {
    expect(findActiveNavigationItem(pathname)?.labelKey).toBe(labelKey);
  });

  it.each(["/", "/login", "/dashboard", "/dashboarding/chat"])(
    "returns no active item outside known dashboard routes for %s",
    (pathname) => {
      expect(findActiveNavigationItem(pathname)).toBeUndefined();
    },
  );

  it("finds the owning group for every navigation item", () => {
    for (const group of navigationGroups) {
      for (const item of group.items) {
        expect(findNavigationGroup(item)).toBe(group);
      }
    }

    expect(findNavigationGroup(undefined)).toBeUndefined();
  });
});
