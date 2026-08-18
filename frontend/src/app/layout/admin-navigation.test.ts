import {
  BookOpen,
  Bot,
  MessageSquare,
  Network,
  Settings,
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
            key: "SHELL.KNOWLEDGE_GRAPH",
            to: "/dashboard/knowledge/graph",
            icon: Network,
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
    ]);
  });

  it.each([
    ["/dashboard/chat", "NAV.CHAT"],
    ["/dashboard/agents/agent-1", "NAV.AGENTS"],
    ["/dashboard/knowledge", "NAV.KNOWLEDGE"],
    ["/dashboard/knowledge/graph", "SHELL.KNOWLEDGE_GRAPH"],
    [
      "/dashboard/knowledge/graph/entities/entity-1?panel=details",
      "SHELL.KNOWLEDGE_GRAPH",
    ],
    ["/dashboard/topics/topic-1#activity", "NAV.TOPICS"],
  ])("finds the most-specific item for %s", (pathname, key) => {
    expect(findActiveNavigationItem(pathname)?.key).toBe(key);
  });

  it.each(["/", "/login", "/dashboarding", "/dashboarding/chat"])(
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

  it("finds an item's owning group by stable route identity", () => {
    const item = navigationGroups[1]?.items[1];
    if (!item) {
      throw new Error("Expected the Knowledge navigation item");
    }

    const copiedItem = { ...item };

    expect(copiedItem).not.toBe(item);
    expect(findNavigationGroup(copiedItem)).toBe(navigationGroups[1]);
  });
});
