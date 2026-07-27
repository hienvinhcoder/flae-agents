import { expect, fulfillJson, ids, installAuthSession, test } from './fixtures';

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
  await page.setViewportSize({ height: 812, width: 375 });
  await page.getByRole('link', { name: 'Create agent' }).first().click();

  const createButton = page.getByRole('button', { name: 'Create agent' });
  const actionBar = createButton.locator('..');
  await expect(createButton).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cancel' })).toBeVisible();
  expect(await actionBar.evaluate((element) => getComputedStyle(element).position)).toBe('sticky');
  expect(await createButton.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
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

  await page.getByRole('combobox', { name: 'Workspace', exact: true }).selectOption(ids.secondWorkspace);

  await expect(page.getByRole('heading', { level: 2, name: 'No agents yet' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create agent' })).toHaveCount(2);
});
