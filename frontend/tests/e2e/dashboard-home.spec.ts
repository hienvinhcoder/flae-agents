import {
  expect,
  expectNoA11yViolations,
  installAuthSession,
  test,
} from "./fixtures";

const viewports = [
  { height: 812, width: 375 },
  { height: 1024, width: 768 },
  { height: 768, width: 1024 },
  { height: 900, width: 1440 },
] as const;

for (const viewport of viewports) {
  test(`renders Dashboard Home without horizontal overflow at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthSession(page);
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Welcome back, Amelia" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Connected sources" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
}

test("exposes real routes, inert demo controls, and an accessible page", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await installAuthSession(page);
  await page.goto("/dashboard");

  await expect(page.getByRole("link", { name: "Explore" })).toHaveAttribute(
    "href",
    "/dashboard/knowledge/graph",
  );
  await expect(page.getByRole("link", { name: "View all" })).toHaveAttribute(
    "href",
    "/dashboard/knowledge",
  );
  await expect(page.getByRole("button", { name: "Add source" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Manage connectors" }),
  ).toBeDisabled();
  await expectNoA11yViolations(page);
});
