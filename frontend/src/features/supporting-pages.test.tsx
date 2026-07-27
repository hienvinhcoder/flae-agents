import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";

import { TestI18nProvider } from "../../tests/TestI18nProvider";
import { BriefingPage } from "./briefing/pages/BriefingPage";
import { InboxPage } from "./inbox/pages/InboxPage";
import { ReportsPage } from "./reports/pages/ReportsPage";

function renderPage(Page: ComponentType) {
  return render(
    <TestI18nProvider>
      <Page />
    </TestI18nProvider>,
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
    "renders %s from the real English locale as an honest overview preview",
    (title, description, Page) => {
      renderPage(Page);

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

  it.each([
    ["Morning briefing", BriefingPage],
    ["Omnichannel inbox", InboxPage],
    ["Analyst reports", ReportsPage],
  ] as const)("uses a semantic section wrapper for %s", (_title, Page) => {
    const { container } = renderPage(Page);

    expect(container.firstElementChild?.tagName).toBe("SECTION");
  });
});
