import { expect, expectNoA11yViolations, fulfillJson, ids, installAuthSession, test } from './fixtures';

const agentsPath = `http://127.0.0.1:8000/api/v1/workspaces/${ids.workspace}/agents`;

test.beforeEach(async ({ page }) => {
  await installAuthSession(page);
  await page.goto('/dashboard/agents');
  await expect(page.getByRole('heading', { name: 'AI agents' })).toBeVisible();
  await expect(page.getByText('Build focused assistants that answer with workspace knowledge and operating context.')).toBeVisible();
  await expect(page.getByText('Ready on gemini-2.5-flash')).toBeVisible();
});

test('creates and edits an agent through the production forms', async ({ page }) => {
  await page.getByRole('link', { name: 'Create agent' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Create AI agent' })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 2, name: 'Identity' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Instructions' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Model and response' })).toBeVisible();
  await expectNoA11yViolations(page);
  await expect(page.getByLabel('AI model')).toHaveAccessibleDescription(
    "Choose the model that best matches the agent's latency and reasoning needs.",
  );
  await page.getByLabel('Avatar color', { exact: true }).selectOption('bg-emerald-500');
  await page.getByLabel('Avatar icon', { exact: true }).selectOption('database');
  const appearance = page.getByRole('group', { name: 'Avatar color: Emerald; Avatar icon: Database' });
  await expect(appearance.getByText('Emerald')).toBeVisible();
  await expect(appearance.getByText('Database')).toBeVisible();
  await page.getByLabel('Agent name').fill('Release assistant');
  await page.getByLabel('System prompt').fill('Answer release questions with cited workspace evidence.');
  await page.getByRole('button', { name: 'Create agent' }).click();
  await expect(page.getByRole('heading', { name: 'Release assistant' })).toBeVisible();

  await page.getByRole('link', { name: 'Edit Release assistant' }).click();
  await page.getByLabel('Agent name').fill('Launch assistant');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Launch assistant' })).toBeVisible();
});

test('keeps configuration actions sticky and contained on mobile', async ({ page }) => {
  const viewport = { height: 812, width: 375 };
  await page.setViewportSize(viewport);
  await page.getByRole('link', { name: 'Create agent' }).first().click();

  const createButton = page.getByRole('button', { name: 'Create agent' });
  const actionBar = createButton.locator('..');
  await expect(createButton).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cancel' })).toBeVisible();
  await page.getByLabel('System prompt').evaluate((element) => element.setAttribute('rows', '50'));
  const naturalActionTop = await actionBar.evaluate((element) => {
    const actionElement = element as HTMLElement;
    const inlinePosition = actionElement.style.position;
    actionElement.style.position = 'static';
    const top = actionElement.getBoundingClientRect().top + window.scrollY;
    actionElement.style.position = inlinePosition;
    return top;
  });
  const intermediateScrollTop = naturalActionTop - viewport.height - 120;
  expect(intermediateScrollTop).toBeGreaterThan(0);
  await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), intermediateScrollTop);
  const scrollTop = await page.evaluate(() => window.scrollY);
  expect(naturalActionTop - scrollTop).toBeGreaterThan(viewport.height);

  const actionBounds = await actionBar.boundingBox();
  expect(actionBounds).not.toBeNull();
  expect(actionBounds?.y ?? -1).toBeGreaterThanOrEqual(0);
  const actionBottom = (actionBounds?.y ?? 0) + (actionBounds?.height ?? 0);
  expect(actionBottom).toBeGreaterThanOrEqual(viewport.height - 16);
  expect(actionBottom).toBeLessThanOrEqual(viewport.height);
  expect(await actionBar.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');
  expect(await createButton.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
});

test('localizes appearance options and preview in Vietnamese', async ({ page }) => {
  await page.getByRole('link', { name: 'Create agent' }).first().click();
  await expect(page.getByRole('heading', { name: 'Create AI agent' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Language' }).selectOption('vi');
  await expect(page.getByRole('heading', { name: 'Tạo trợ lý AI' })).toBeVisible();

  await expect(page.getByRole('option', { name: 'Lục bảo' })).toBeAttached();
  await expect(page.getByRole('option', { name: 'Cơ sở dữ liệu' })).toBeAttached();
  await page.getByLabel('Màu đại diện', { exact: true }).selectOption('bg-emerald-500');
  await page.getByLabel('Biểu tượng đại diện', { exact: true }).selectOption('database');
  const preview = page.getByRole('group', {
    name: 'Màu đại diện: Lục bảo; Biểu tượng đại diện: Cơ sở dữ liệu',
  });
  await expect(preview.getByText('Lục bảo')).toBeVisible();
  await expect(preview.getByText('Cơ sở dữ liệu')).toBeVisible();
  await expectNoA11yViolations(page);
});

test('opens an agent conversation in the chat workbench', async ({ page }) => {
  await page.getByRole('link', { name: /Start conversation.*Chat with Research assistant/ }).click();

  await expect(page.getByRole('region', { name: 'Message Research assistant' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Conversation history' })).toBeVisible();
  await expect(page.getByTestId('message-viewport')).toHaveAccessibleName('Conversation messages');
  await expect(page.getByRole('link', { name: 'Back to AI agents' })).toHaveAttribute('href', '/dashboard/agents');
});

test('keeps management actions permission-scoped', async ({ api, page }) => {
  const currentMember = api.members.find((member) => member.user_uid === ids.user);
  if (!currentMember) throw new Error('E2E current workspace member fixture is missing.');
  currentMember.role = 'member';
  await page.reload();

  await expect(page.getByRole('link', { name: 'Create agent' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Edit Research assistant' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete Research assistant' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Start conversation.*Chat with Research assistant/ })).toBeVisible();
});

test('deletes an agent and shows the manager empty state', async ({ api, page }) => {
  await page.route(`${agentsPath}/${ids.agent}`, async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback();
      return;
    }
    api.agents = api.agents.filter((agent) => agent.id !== ids.agent);
    await fulfillJson(route, true);
  });
  page.once('dialog', (dialog) => dialog.accept());

  await page.getByRole('button', { name: 'Delete Research assistant' }).click();

  await expect(page.getByRole('heading', { level: 2, name: 'No agents yet' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create agent' })).toHaveCount(2);
});

test('shows one retry surface and recovers from an agent query failure', async ({ page }) => {
  let failuresRemaining = 3;
  await page.route(agentsPath, async (route) => {
    if (route.request().method() === 'GET' && failuresRemaining > 0) {
      failuresRemaining -= 1;
      await fulfillJson(route, null, 503);
      return;
    }
    await route.fallback();
  });
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Unable to load agents' })).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Research assistant' })).toBeVisible();
});

test('reloads the explorer for a newly selected workspace', async ({ api, page }) => {
  const secondWorkspaceAgentsPath = `http://127.0.0.1:8000/api/v1/workspaces/${ids.secondWorkspace}/agents`;
  const secondWorkspaceMembersPath = `http://127.0.0.1:8000/api/v1/workspaces/${ids.secondWorkspace}/members`;
  await page.route(secondWorkspaceAgentsPath, (route) => fulfillJson(route, []));
  await page.route(secondWorkspaceMembersPath, (route) => fulfillJson(
    route,
    api.members.map((member) => ({ ...member, workspace_id: ids.secondWorkspace })),
  ));

  await page.getByRole('button', { name: 'ET' }).click();
  await page.getByRole('combobox', { name: 'Workspace', exact: true }).selectOption(ids.secondWorkspace);

  await expect(page.getByRole('heading', { level: 2, name: 'No agents yet' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create agent' })).toHaveCount(2);
});
