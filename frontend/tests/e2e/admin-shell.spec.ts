import {
  expect,
  expectNoA11yViolations,
  installAuthSession,
  test,
} from "./fixtures";

const sidebarLayoutKey = "flae_admin_sidebar_layout";

const responsiveViewports = [
  {
    expectedHeaderHeight: 64,
    expectedSidebarWidth: 0,
    height: 812,
    label: "mobile",
    width: 375,
  },
  {
    expectedHeaderHeight: 76,
    expectedSidebarWidth: 72,
    height: 1024,
    label: "tablet",
    width: 768,
  },
  {
    expectedHeaderHeight: 76,
    expectedSidebarWidth: 280,
    height: 768,
    label: "desktop",
    width: 1024,
  },
  {
    expectedHeaderHeight: 76,
    expectedSidebarWidth: 280,
    height: 900,
    label: "wide desktop",
    width: 1440,
  },
] as const;

for (const viewport of responsiveViewports) {
  test(`keeps the admin shell responsive at the ${viewport.label} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({
      height: viewport.height,
      width: viewport.width,
    });
    await installAuthSession(page);
    await page.goto("/dashboard/briefing");

    await expect(
      page.getByRole("heading", { name: "Morning briefing" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);

    const sidebarBox = await page.getByTestId("admin-sidebar").boundingBox();
    expect(sidebarBox?.width ?? 0).toBe(viewport.expectedSidebarWidth);

    const headerBox = await page.getByRole("banner").boundingBox();
    expect(headerBox?.height ?? 0).toBe(viewport.expectedHeaderHeight);
    if (viewport.width >= 1280) {
      await expect(page.getByLabel("ET", { exact: true })).toBeVisible();
    }
  });
}

test("persists the collapsed desktop preference across reloads", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await installAuthSession(page);
  await page.goto("/dashboard/briefing");

  const sidebar = page.getByTestId("admin-sidebar");
  await page.getByRole("button", { name: "Collapse navigation" }).click();
  await expect(sidebar).toHaveAttribute("data-desktop-layout", "collapsed");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), sidebarLayoutKey),
  ).toBe("collapsed");

  await page.reload();
  await expect(sidebar).toHaveAttribute("data-desktop-layout", "collapsed");
  await expect
    .poll(async () => (await sidebar.boundingBox())?.width ?? 0)
    .toBe(72);
});

test("keeps the expanded desktop preference while tablet uses the rail layout", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.addInitScript(
    (key) => localStorage.setItem(key, "expanded"),
    sidebarLayoutKey,
  );
  await installAuthSession(page);
  await page.goto("/dashboard/briefing");

  const sidebar = page.getByTestId("admin-sidebar");
  await expect(sidebar).toHaveAttribute("data-desktop-layout", "expanded");
  await expect
    .poll(async () => (await sidebar.boundingBox())?.width ?? 0)
    .toBe(280);

  await page.setViewportSize({ height: 1024, width: 768 });
  await expect
    .poll(async () => (await sidebar.boundingBox())?.width ?? 0)
    .toBe(72);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), sidebarLayoutKey),
  ).toBe("expanded");

  await page.setViewportSize({ height: 900, width: 1440 });
  await expect(sidebar).toHaveAttribute("data-desktop-layout", "expanded");
  await expect
    .poll(async () => (await sidebar.boundingBox())?.width ?? 0)
    .toBe(280);
});

test("supports keyboard and backdrop dismissal for the accessible mobile drawer", async ({
  page,
}) => {
  await page.setViewportSize({ height: 812, width: 375 });
  await installAuthSession(page);
  await page.goto("/dashboard/briefing");

  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Primary navigation" });
  await expect(drawer).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close navigation", exact: true }),
  ).toBeFocused();
  await expectNoA11yViolations(page);

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(drawer).toBeVisible();
  const backdrop = page.getByRole("button", {
    name: "Close navigation overlay",
  });
  const [backdropBox, drawerBox] = await Promise.all([
    backdrop.boundingBox(),
    drawer.boundingBox(),
  ]);
  expect(backdropBox).not.toBeNull();
  expect(drawerBox).not.toBeNull();
  const drawerRight = drawerBox!.x + drawerBox!.width;
  await backdrop.click({
    position: {
      x: drawerRight + (backdropBox!.width - drawerRight) / 2,
      y: backdropBox!.height / 2,
    },
  });
  await expect(drawer).toBeHidden();
});

test("collapses the sidebar without animation under reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installAuthSession(page);
  await page.goto("/dashboard/briefing");

  const sidebar = page.getByTestId("admin-sidebar");
  const transition = await sidebar.evaluate((element) => {
    const styles = getComputedStyle(element);
    const durations = styles.transitionDuration.split(",").map((duration) => {
      const value = Number.parseFloat(duration);
      return duration.trim().endsWith("ms") ? value : value * 1000;
    });

    return {
      maxDurationMs: Math.max(...durations),
      property: styles.transitionProperty,
    };
  });
  expect(transition.property).toBe("none");
  expect(transition.maxDurationMs).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Collapse navigation" }).click();

  await expect(sidebar).toHaveAttribute("data-desktop-layout", "collapsed");
  expect(
    await sidebar.evaluate((element) => element.getAnimations().length),
  ).toBe(0);
  expect((await sidebar.boundingBox())?.width).toBe(72);
});

test("keeps short rail navigation usable and invalidates portal tooltip geometry", async ({
  page,
}) => {
  await page.setViewportSize({ height: 500, width: 768 });
  await installAuthSession(page);
  await page.goto("/dashboard/briefing");

  const sidebar = page.getByTestId("admin-sidebar");
  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  const settings = navigation.getByRole("link", { name: "Settings" });
  const knowledgeGraph = navigation.getByRole("link", {
    name: "Knowledge graph",
  });
  const tooltip = page.getByTestId("admin-sidebar-tooltip");

  expect(
    await navigation.evaluate((element) => getComputedStyle(element).overflowY),
  ).toMatch(/^(auto|scroll)$/);
  await navigation.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(settings).toBeVisible();

  await knowledgeGraph.scrollIntoViewIfNeeded();
  await knowledgeGraph.hover();
  await expect(tooltip).toBeVisible();
  const [sidebarBox, tooltipBox] = await Promise.all([
    sidebar.boundingBox(),
    tooltip.boundingBox(),
  ]);
  expect(sidebarBox).not.toBeNull();
  expect(tooltipBox).not.toBeNull();
  expect(tooltipBox!.x).toBeGreaterThanOrEqual(
    sidebarBox!.x + sidebarBox!.width,
  );
  expect(tooltipBox!.x + tooltipBox!.width).toBeLessThanOrEqual(768);
  expect(tooltipBox!.y).toBeGreaterThanOrEqual(0);
  expect(tooltipBox!.y + tooltipBox!.height).toBeLessThanOrEqual(500);

  await navigation.evaluate((element) => {
    element.scrollTop += 1;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(tooltip).toHaveCount(0);

  await page.mouse.move(760, 10);
  await knowledgeGraph.scrollIntoViewIfNeeded();
  await knowledgeGraph.hover();
  await expect(tooltip).toBeVisible();
  await page.setViewportSize({ height: 520, width: 800 });
  await expect(tooltip).toHaveCount(0);
});
