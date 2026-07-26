# Firebase Emulator Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make local email/password login and file storage use Firebase Authentication and Storage emulators end to end, while preserving explicit production Firebase behavior.

**Architecture:** Docker Compose owns an Auth-and-Storage-only Firebase Emulator service using project `flae-agents`. A typed frontend flag controls Firebase Web SDK emulator connectors, while Docker environment variables route Firebase Admin token verification and the Python Storage client to the same emulator service.

**Tech Stack:** Docker Compose, Firebase Emulator Suite, Firebase Web SDK, Firebase Admin Python SDK, Google Cloud Storage Python client, React/Vite, Vitest, Playwright, Bash

---

### Task 1: Add The Typed Frontend Emulator Flag

**Files:**
- Modify: `frontend/src/core/config/env-schema.ts`
- Modify: `frontend/src/core/config/env.test.ts`
- Modify: `frontend/vite.config.test.ts`
- Modify: `frontend/playwright.config.ts`
- Modify: `.github/workflows/test.yml`

- [ ] **Step 1: Write failing environment-schema tests**

Add `VITE_USE_FIREBASE_EMULATORS: 'false'` to each valid raw environment fixture. Update the existing complete-environment assertion to compare against an expected object containing `VITE_USE_FIREBASE_EMULATORS: false`, then assert the parsed value is boolean and invalid values are rejected:

```ts
it('parses the Firebase emulator flag as a boolean', async () => {
  const { parseEnv } = await loadEnvironmentModule();

  expect(parseEnv({
    ...validEnvironment,
    VITE_USE_FIREBASE_EMULATORS: 'true',
  }).VITE_USE_FIREBASE_EMULATORS).toBe(true);
  expect(parseEnv(validEnvironment).VITE_USE_FIREBASE_EMULATORS).toBe(false);
});

it('rejects an invalid Firebase emulator flag', async () => {
  const { parseEnv } = await loadEnvironmentModule();

  expect(() => parseEnv({
    ...validEnvironment,
    VITE_USE_FIREBASE_EMULATORS: 'sometimes',
  })).toThrow(/VITE_USE_FIREBASE_EMULATORS/);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `cd frontend && npm run test -- src/core/config/env.test.ts vite.config.test.ts`

Expected: FAIL because `VITE_USE_FIREBASE_EMULATORS` is not part of the environment schema and the parsed value is not boolean.

- [ ] **Step 3: Implement the minimal schema transformation**

Add this field to `environmentSchema`:

```ts
VITE_USE_FIREBASE_EMULATORS: z
  .enum(['true', 'false'])
  .transform((value) => value === 'true'),
```

Set `VITE_USE_FIREBASE_EMULATORS=false` in the normal Playwright server environment and GitHub build environment so existing production-path tests remain explicit.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `cd frontend && npm run test -- src/core/config/env.test.ts vite.config.test.ts`

Expected: PASS with all environment and Vite validation tests green.

- [ ] **Step 5: Commit the typed flag**

```bash
git add frontend/src/core/config/env-schema.ts frontend/src/core/config/env.test.ts frontend/vite.config.test.ts frontend/playwright.config.ts .github/workflows/test.yml
git commit -m "feat: add Firebase emulator environment flag"
```

### Task 2: Connect The Frontend Firebase SDKs Idempotently

**Files:**
- Create: `frontend/src/core/auth/firebase-emulators.ts`
- Create: `frontend/src/core/auth/firebase-emulators.test.ts`
- Modify: `frontend/src/core/auth/firebase.ts`
- Modify: `frontend/src/core/auth/firebase.test.ts`

- [ ] **Step 1: Write failing connector tests**

Mock `connectAuthEmulator` and `connectStorageEmulator`, then specify disabled, enabled, and repeat-call behavior:

```ts
it('does not connect SDKs when emulators are disabled', () => {
  configureFirebaseEmulators({ enabled: false, auth, storage });

  expect(connectAuthEmulator).not.toHaveBeenCalled();
  expect(connectStorageEmulator).not.toHaveBeenCalled();
});

it('connects each SDK once when emulators are enabled', () => {
  configureFirebaseEmulators({ enabled: true, auth, storage });
  configureFirebaseEmulators({ enabled: true, auth, storage });

  expect(connectAuthEmulator).toHaveBeenCalledOnce();
  expect(connectAuthEmulator).toHaveBeenCalledWith(auth, 'http://127.0.0.1:9099');
  expect(connectStorageEmulator).toHaveBeenCalledOnce();
  expect(connectStorageEmulator).toHaveBeenCalledWith(storage, '127.0.0.1', 9199);
});
```

- [ ] **Step 2: Run the connector test and verify RED**

Run: `cd frontend && npm run test -- src/core/auth/firebase-emulators.test.ts`

Expected: FAIL because `firebase-emulators.ts` and `configureFirebaseEmulators` do not exist.

- [ ] **Step 3: Implement the idempotent connector**

Create a global registry that survives Vite module reloads and connect each SDK object once:

```ts
import { connectAuthEmulator, type Auth } from 'firebase/auth';
import { connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

interface EmulatorRegistry {
  auth: WeakSet<object>;
  storage: WeakSet<object>;
}

const registryKey = '__flaeFirebaseEmulatorRegistry__';

function registry(): EmulatorRegistry {
  const scope = globalThis as typeof globalThis & {
    [registryKey]?: EmulatorRegistry;
  };
  scope[registryKey] ??= { auth: new WeakSet(), storage: new WeakSet() };
  return scope[registryKey];
}

export function configureFirebaseEmulators({
  enabled,
  auth,
  storage,
}: {
  enabled: boolean;
  auth: Auth;
  storage: FirebaseStorage;
}) {
  if (!enabled) return;
  const connected = registry();
  if (!connected.auth.has(auth)) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    connected.auth.add(auth);
  }
  if (!connected.storage.has(storage)) {
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    connected.storage.add(storage);
  }
}
```

Update `firebase.ts` to create/export `firebaseStorage = getStorage(firebaseApp)` and call the connector immediately after Auth and Storage initialization. Extend its existing mocks with `firebase/storage` and the boolean environment field.

- [ ] **Step 4: Run Firebase adapter tests and verify GREEN**

Run: `cd frontend && npm run test -- src/core/auth/firebase-emulators.test.ts src/core/auth/firebase.test.ts`

Expected: PASS; existing sign-in behavior remains green and connectors are idempotent.

- [ ] **Step 5: Commit the frontend routing**

```bash
git add frontend/src/core/auth/firebase-emulators.ts frontend/src/core/auth/firebase-emulators.test.ts frontend/src/core/auth/firebase.ts frontend/src/core/auth/firebase.test.ts
git commit -m "feat: route Firebase SDKs to local emulators"
```

### Task 3: Define And Test The Emulator Container Contract

**Files:**
- Create: `tests/firebase-emulator-config.test.sh`
- Modify: `firebase/firebase.json`
- Modify: `firebase/Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `backend/.env.example`

- [ ] **Step 1: Write a failing configuration contract test**

Create a shell test that renders Compose JSON and verifies service, ports, project, health check, and backend/worker routing:

```bash
compose_json="$(docker compose config --format json)"

jq -e '.services["firebase-emulator"]' <<<"$compose_json" >/dev/null
jq -e '.services["firebase-emulator"].ports | map(.published | tonumber) | sort == [4000, 9099, 9199]' <<<"$compose_json" >/dev/null
jq -e '.services.backend.environment.FIREBASE_AUTH_EMULATOR_HOST == "firebase-emulator:9099"' <<<"$compose_json" >/dev/null
jq -e '.services.backend.environment.STORAGE_EMULATOR_HOST == "http://firebase-emulator:9199"' <<<"$compose_json" >/dev/null
jq -e '.services.backend.environment.GCS_BUCKET_NAME == "flae-agents.appspot.com"' <<<"$compose_json" >/dev/null
jq -e '.services["flae-worker"].environment.FIREBASE_AUTH_EMULATOR_HOST == "firebase-emulator:9099"' <<<"$compose_json" >/dev/null
jq -e '.services["flae-worker"].environment.STORAGE_EMULATOR_HOST == "http://firebase-emulator:9199"' <<<"$compose_json" >/dev/null
jq -e '.services["flae-worker"].environment.GCS_BUCKET_NAME == "flae-agents.appspot.com"' <<<"$compose_json" >/dev/null

grep -Fq '"host": "0.0.0.0"' firebase/firebase.json
grep -Fq '"--only", "auth,storage"' firebase/Dockerfile
```

- [ ] **Step 2: Run the configuration test and verify RED**

Run: `bash tests/firebase-emulator-config.test.sh`

Expected: FAIL because Compose has no `firebase-emulator` service and the emulator hosts are not configured.

- [ ] **Step 3: Bind Auth and Storage for container access**

Set both emulator hosts in `firebase/firebase.json`:

```json
"auth": { "host": "0.0.0.0", "port": 9099 },
"storage": { "host": "0.0.0.0", "port": 9199 }
```

Change the Docker command to use project `flae-agents` and start only the requested services:

```dockerfile
RUN firebase setup:emulators:storage

CMD ["firebase", "emulators:start", "--project", "flae-agents", "--only", "auth,storage", "--import=/firebase/data", "--export-on-exit=/firebase/data"]
```

- [ ] **Step 4: Add the Compose service and backend routing**

Add `firebase-emulator` with build context `./firebase`, ports `4000:4000`, `9099:9099`, `9199:9199`, bind-mounted `./firebase/data:/firebase/data`, and this health check:

```yaml
healthcheck:
  test:
    - CMD
    - node
    - -e
    - fetch('http://127.0.0.1:9099/emulator/v1/projects/flae-agents/config').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))
  interval: 3s
  timeout: 3s
  retries: 40
```

Set `GOOGLE_CLOUD_PROJECT=flae-agents`, `FIREBASE_AUTH_EMULATOR_HOST=firebase-emulator:9099`, `STORAGE_EMULATOR_HOST=http://firebase-emulator:9199`, and `GCS_BUCKET_NAME=flae-agents.appspot.com` for both backend and worker. Add a healthy dependency on `firebase-emulator`.

Correct the documented Storage variable from `FIREBASE_STORAGE_EMULATOR_HOST` to `STORAGE_EMULATOR_HOST` in both environment examples.

- [ ] **Step 5: Run the configuration test and verify GREEN**

Run: `bash tests/firebase-emulator-config.test.sh`

Expected: PASS with the complete local emulator contract.

- [ ] **Step 6: Commit the container contract**

```bash
git add tests/firebase-emulator-config.test.sh firebase/firebase.json firebase/Dockerfile docker-compose.yml .env.example backend/.env.example
git commit -m "feat: run Firebase emulators in Docker Compose"
```

### Task 4: Make Local Frontend Startup Emulator-Ready

**Files:**
- Modify: `tests/start-sh.test.sh`
- Modify: `frontend/.env.example`
- Modify: `frontend/.env` (ignored local runtime file; do not commit)
- Modify: `start.sh`
- Modify: `README.md`
- Modify: `frontend/README.md`

- [ ] **Step 1: Extend the startup regression test**

Require the generated `.env` to enable emulators and require startup output/commands to include Firebase logs:

```bash
grep -Fqx 'VITE_USE_FIREBASE_EMULATORS=true' "$missing_env_fixture/frontend/.env" || \
  fail "generated frontend/.env does not enable Firebase emulators"
grep -Fqx "compose logs --follow --tail=100 firebase-emulator backend flae-worker" "$missing_env_fixture/commands.log" || \
  fail "start.sh does not follow Firebase emulator logs"
```

- [ ] **Step 2: Run the startup test and verify RED**

Run: `bash tests/start-sh.test.sh`

Expected: FAIL because the example has no emulator flag and the Firebase service is absent from followed logs.

- [ ] **Step 3: Add deterministic local Firebase values**

Use emulator-safe public values in `frontend/.env.example` and the ignored `frontend/.env`:

```dotenv
VITE_USE_FIREBASE_EMULATORS=true
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=flae-agents.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=flae-agents
VITE_FIREBASE_STORAGE_BUCKET=flae-agents.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:local-emulator
```

Update `start.sh` to follow `firebase-emulator backend flae-worker` logs and print URLs for the application and Emulator UI. Preserve an existing local `.env` exactly as the current regression test requires.

- [ ] **Step 4: Document local and production modes**

In both READMEs, document `./start.sh`, ports `4000/9099/9199`, the emulator flag, the ignored local environment file, and that production must set `VITE_USE_FIREBASE_EMULATORS=false` with real Firebase Web SDK values.

- [ ] **Step 5: Run the startup test and verify GREEN**

Run: `bash tests/start-sh.test.sh`

Expected: PASS; local config is bootstrapped, existing overrides are preserved, and Firebase logs are followed.

- [ ] **Step 6: Commit startup and documentation changes**

```bash
git add tests/start-sh.test.sh frontend/.env.example start.sh README.md frontend/README.md
git commit -m "docs: make local startup use Firebase emulators"
```

### Task 5: Add An End-To-End Emulator Login Smoke Test

**Files:**
- Create: `frontend/playwright.firebase.config.ts`
- Create: `frontend/tests/firebase/firebase-emulator-auth.spec.ts`
- Create: `tests/firebase-emulator-smoke.sh`

- [ ] **Step 1: Write the failing browser smoke test**

Create a Playwright config without `VITE_E2E_MODE`, with `VITE_USE_FIREBASE_EMULATORS=true`, project `flae-agents`, and Vite on port `4200`. The test creates a unique Auth Emulator user, signs in through the visible form, and records Firebase requests:

```ts
test('signs in through Auth Emulator and synchronizes with the backend', async ({ page, request }) => {
  const email = `browser-${Date.now()}@example.invalid`;
  const password = 'emulator-password-123';
  await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key',
    { data: { email, password, returnSecureToken: true } },
  );

  const firebaseRequests: URL[] = [];
  page.on('request', (outgoing) => {
    if (/identitytoolkit|9099/.test(outgoing.url())) firebaseRequests.push(new URL(outgoing.url()));
  });

  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page).toHaveURL(/\/dashboard\/briefing$/);
  expect(firebaseRequests.some((url) => url.host === '127.0.0.1:9099')).toBe(true);
  expect(firebaseRequests.some((url) => url.host === 'identitytoolkit.googleapis.com')).toBe(false);
});
```

- [ ] **Step 2: Write the orchestration smoke script**

Start the required services, wait for Auth and Storage, validate their REST endpoints, then run Playwright:

```bash
docker compose up -d --build firebase-emulator postgres redis temporal backend
for attempt in {1..90}; do
  curl --fail --silent http://127.0.0.1:9099/emulator/v1/projects/flae-agents/config >/dev/null && break
  sleep 1
done
curl --fail --silent http://127.0.0.1:9099/emulator/v1/projects/flae-agents/config >/dev/null
curl --fail --silent http://127.0.0.1:9199/v0/b/flae-agents.appspot.com/o >/dev/null
(cd frontend && npx playwright test --config playwright.firebase.config.ts)
```

- [ ] **Step 3: Run the smoke test with emulator routing disabled and verify RED**

Make `playwright.firebase.config.ts` read `process.env.VITE_USE_FIREBASE_EMULATORS ?? 'true'`, then run:

`VITE_USE_FIREBASE_EMULATORS=false bash tests/firebase-emulator-smoke.sh`

Expected: FAIL because browser authentication does not target `127.0.0.1:9099`. This proves the integration test detects the original routing defect even after the lower-level implementation is present.

- [ ] **Step 4: Make only test-harness corrections required by real output**

Adjust readiness polling and response assertions without weakening the required conditions: Auth and Storage must answer locally, browser auth must hit `9099`, backend sync must succeed, and navigation must complete.

- [ ] **Step 5: Run the smoke test and verify GREEN**

Run: `bash tests/firebase-emulator-smoke.sh`

Expected: PASS with a real emulator user, a backend-synchronized database user, and authenticated browser navigation.

- [ ] **Step 6: Commit the smoke coverage**

```bash
git add frontend/playwright.firebase.config.ts frontend/tests/firebase/firebase-emulator-auth.spec.ts tests/firebase-emulator-smoke.sh
git commit -m "test: cover Firebase emulator login end to end"
```

### Task 6: Run Full Verification

**Files:**
- Verify only; modify scoped files only if a failure exposes a defect in this implementation.

- [ ] **Step 1: Run shell configuration tests**

Run: `bash tests/firebase-emulator-config.test.sh && bash tests/start-sh.test.sh`

Expected: both scripts print PASS and exit 0.

- [ ] **Step 2: Run frontend quality gates**

Run: `cd frontend && npm run typecheck && npm run lint && npm run test && npm run build`

Expected: all commands exit 0. The ignored `frontend/.env` supplies local build values.

- [ ] **Step 3: Run backend auth tests**

Run: `cd backend && uv run pytest tests/api/test_auth.py -q`

Expected: all auth API tests pass.

- [ ] **Step 4: Run real emulator smoke verification**

Run: `bash tests/firebase-emulator-smoke.sh`

Expected: Auth, Storage, backend token verification, user synchronization, and browser login all pass.

- [ ] **Step 5: Inspect final state**

Run: `git diff --check && git status --short && docker compose ps`

Expected: no whitespace errors; only intended scoped changes and pre-existing user changes remain; `firebase-emulator`, `backend`, and required dependencies are healthy/running.
