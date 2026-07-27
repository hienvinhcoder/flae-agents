import { expect, expectNoA11yViolations, fulfillJson, ids, installAuthSession, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await installAuthSession(page);
});

test('filters and pages through topic results with backend query parameters', async ({ page }) => {
  const topics = Array.from({ length: 25 }, (_, index) => {
    const number = index + 1;
    const paddedNumber = String(number).padStart(2, '0');
    return {
      confidence: 0.8, created_at: '2026-07-24T00:00:00Z', evidence_count: number,
      name: `Topic ${paddedNumber}`, parent_topic_id: null, slug: `topic-${paddedNumber}`,
      status: number % 2 === 0 ? 'needs_review' : 'active', summary: `Summary ${paddedNumber}`,
      topic_id: `topic-e2e-${paddedNumber}`, type: 'topic', updated_at: '2026-07-24T00:00:00Z',
      workspace_id: ids.workspace,
    };
  });
  await page.route(`**/workspaces/${ids.workspace}/topics**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== 'GET' || !url.pathname.endsWith(`/workspaces/${ids.workspace}/topics`)) {
      await route.fallback();
      return;
    }
    const query = url.searchParams.get('query')?.toLowerCase() ?? '';
    const status = url.searchParams.get('status');
    const limit = Number(url.searchParams.get('limit') ?? 12);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const filtered = topics.filter((topic) => (
      (!query || topic.name.toLowerCase().includes(query))
      && (!status || topic.status === status)
    ));
    await fulfillJson(route, filtered.slice(offset, offset + limit));
  });

  await page.goto('/dashboard/topics');
  await expect(page.getByRole('heading', { name: 'Knowledge Topics' })).toBeVisible();
  const filters = page.getByRole('toolbar', { name: 'Topic filters' });
  await expect(filters.getByRole('searchbox', { name: 'Search topics' })).toBeVisible();
  await expect(filters.getByRole('combobox', { name: 'Topic status' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Topic 01/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Topic 13/ })).toBeHidden();

  const nextRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith(`/workspaces/${ids.workspace}/topics`)
      && url.searchParams.get('limit') === '12'
      && url.searchParams.get('offset') === '12';
  });
  await page.getByRole('button', { name: 'Next page' }).click();
  await nextRequest;
  await expect(page.getByRole('link', { name: /Topic 13/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Topic 01/ })).toBeHidden();

  const previousRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith(`/workspaces/${ids.workspace}/topics`)
      && url.searchParams.get('offset') === '0';
  });
  await page.getByRole('button', { name: 'Previous page' }).click();
  await previousRequest;
  await expect(page.getByRole('link', { name: /Topic 01/ })).toBeVisible();

  const searchRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith(`/workspaces/${ids.workspace}/topics`)
      && url.searchParams.get('query') === 'Topic'
      && url.searchParams.get('offset') === '0';
  });
  await filters.getByRole('searchbox', { name: 'Search topics' }).fill('Topic');
  await searchRequest;
  await expect(page.getByRole('link', { name: /Topic 01/ })).toBeVisible();

  const statusRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith(`/workspaces/${ids.workspace}/topics`)
      && url.searchParams.get('query') === 'Topic'
      && url.searchParams.get('status') === 'needs_review'
      && url.searchParams.get('offset') === '0';
  });
  await filters.getByRole('combobox', { name: 'Topic status' }).selectOption('needs_review');
  await statusRequest;
  await expect(page.getByRole('link', { name: /Topic 02/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Topic 01/ })).toBeHidden();
});

test('merges a duplicate topic and archives the retained topic', async ({ page }) => {
  await page.goto('/dashboard/topics');
  await expect(page.getByRole('heading', { name: 'Knowledge Topics' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Product strategy/ })).toContainText('12 evidence');
  await expect(page.getByRole('link', { name: /Product strategy/ })).toContainText('86% confidence');
  await page.getByRole('button', { name: 'Merge topics' }).click();
  await page.getByLabel('Target topic').selectOption(ids.topic);
  await page.getByRole('checkbox', { name: 'Market research' }).check();
  await page.getByRole('button', { name: 'Merge', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Merge duplicate topics' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Market research' })).toBeHidden();

  await page.getByRole('heading', { name: 'Product strategy' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Product strategy' })).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Back to list' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit topic' }).click();
  await page.getByLabel('Topic status').selectOption('archived');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByLabel('Topic metadata')).toContainText('Archived');
});

test('keeps the topic detail workbench contained and accessible on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/dashboard/topics/${ids.topic}`);

  await expect(page.getByRole('heading', { level: 1, name: 'Product strategy' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Edit topic' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Re-summarize' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Topic evidence' })).toBeVisible();
  await expect(page.getByLabel('Topic metadata')).toBeVisible();
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
  await expectNoA11yViolations(page);
});
