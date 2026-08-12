# FLAE Agents Frontend

The frontend is a React application built with Vite and TypeScript. The local development server runs at `http://localhost:4200`.

## Local development

Use Node.js 20.19.0 or a compatible version declared in `package.json`, then install dependencies and create the local environment file:

```bash
npm ci
cp .env.example .env
npm run dev
```

The example environment enables Firebase Authentication and Storage emulators for project `flae-agents`. The Vite development server listens on all interfaces and uses port 4200.

When starting from the repository root with `./start.sh`, the script creates `frontend/.env` from `.env.example` if needed and follows the Docker Compose `firebase-emulator`, `backend`, `application-worker`, and `knowledge-worker` logs. Emulator UI is available at `http://localhost:4000`, Auth at port `9099`, and Storage at port `9199`.

For production, set `VITE_USE_FIREBASE_EMULATORS=false` and provide the real Firebase Web SDK values. Do not expose emulator host variables to production Backend or Worker services.

## Application architecture

- React Router owns application routing and lazy-loads feature pages.
- TanStack Query owns server state, Zustand is reserved for shared client state, and component-local state stays in React.
- Feature API modules provide typed request/response boundaries; UI components do not call network transports directly.
- Timers, subscriptions, streams, sockets, listeners, and cancellable requests created by effects must be cleaned up when their owner unmounts.

## Tailwind theme

The frontend uses Tailwind CSS v4 with the `@tailwindcss/vite` integration registered in `vite.config.ts`. The application entry point imports `src/styles.css`, which loads Tailwind and defines the project-wide design tokens through CSS-first `:root` values and semantic `@theme inline` mappings.

Do not add a Tailwind v3-style `tailwind.config.js`. Prefer semantic utilities such as `bg-ui-canvas`, `text-ui-ink`, `border-ui-line`, and `rounded-ui-panel` so components consume the shared theme instead of hard-coded design values.

## Quality checks

Run the checks independently as needed:

```bash
npm run test
npm run typecheck
npm run lint
npm run test:coverage
npm run check:file-size
npm run test:e2e
```

Vitest and React Testing Library cover unit/integration behavior. Playwright covers critical browser flows and accessibility. Coverage thresholds require at least 75% statements and branches, and source files are limited to 450 lines.

Playwright E2E tests require Chromium. Install it once with:

```bash
npx playwright install chromium
```

## Production build

Set the required `VITE_*` environment variables, then create an optimized build:

```bash
npm run build
```

The build output is written to `dist/`. Deploy that directory to a static web host or CDN. Configure the host to serve `index.html` as the fallback for routes that do not match a static file so client-side navigation works correctly.
