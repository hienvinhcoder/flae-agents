import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";

import { createI18n } from "../shared/i18n";
import { BriefingPage } from "./briefing/pages/BriefingPage";
import { InboxPage } from "./inbox/pages/InboxPage";
import { ReportsPage } from "./reports/pages/ReportsPage";

const resources = {
  en: {
    translation: {
      NAV: {
        BRIEFING: "Morning briefing",
        INBOX: "Omnichannel inbox",
        REPORTS: "Analyst reports",
      },
      OVERVIEW: {
        BRIEFING_DESCRIPTION:
          "A concise view of decisions, risks, and updates across your company memory.",
        BRIEFING_PREVIEW_DESCRIPTION:
          "Daily company signals are not available yet.",
        COMING_SOON: "Coming soon",
        FOCUS_EYEBROW: "Focus",
        INBOX_DESCRIPTION:
          "Review conversations that need context, ownership, or follow-up.",
        INBOX_PREVIEW_DESCRIPTION:
          "Unified conversation management is not available yet.",
        REPORTS_DESCRIPTION:
          "Turn connected company knowledge into repeatable analyst outputs.",
        REPORTS_PREVIEW_DESCRIPTION:
          "Generated analyst reports are not available yet.",
      },
    },
  },
};

async function renderPage(Page: ComponentType) {
  const i18n = await createI18n(resources, "en");
  render(
    <I18nextProvider i18n={i18n}>
      <Page />
    </I18nextProvider>,
  );
}

describe("supporting overview pages", () => {
  it.each([
    [
      "Morning briefing",
      "Daily company signals are not available yet.",
      BriefingPage,
    ],
    [
      "Omnichannel inbox",
      "Unified conversation management is not available yet.",
      InboxPage,
    ],
    [
      "Analyst reports",
      "Generated analyst reports are not available yet.",
      ReportsPage,
    ],
  ] as const)(
    "renders %s as an honest overview preview",
    async (title, description, Page) => {
      await renderPage(Page);

      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(
        screen.getByRole("heading", { level: 1, name: title }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 2, name: "Coming soon" }),
      ).toBeInTheDocument();
      expect(screen.getByText(description)).toBeInTheDocument();
    },
  );
});
