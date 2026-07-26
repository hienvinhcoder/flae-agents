import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BriefingPage } from "./briefing/pages/BriefingPage";
import { InboxPage } from "./inbox/pages/InboxPage";
import { ReportsPage } from "./reports/pages/ReportsPage";

describe("supporting feature placeholders", () => {
  it.each([
    ["Morning briefing", BriefingPage],
    ["Omnichannel inbox", InboxPage],
    ["Analyst reports", ReportsPage],
  ])("renders %s as an explicit under-development state", (title, Page) => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByText(/under development/i)).toBeInTheDocument();
  });
});
