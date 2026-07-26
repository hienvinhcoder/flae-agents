# FLAE Agents Frontend

The frontend is a React application built with Vite and TypeScript. The local development server runs at `http://localhost:4200`.

## Local development

Use Node.js 20.19.0 or a compatible version declared in `package.json`, then install dependencies and create the local environment file:

```bash
npm ci
cp .env.example .env
npm run dev
```

Update `.env` with the backend, WebSocket, and Firebase values for your environment. The Vite development server listens on all interfaces and uses port 4200.

## Application architecture

- React Router owns application routing and lazy-loads feature pages.
- TanStack Query owns server state, Zustand is reserved for shared client state, and component-local state stays in React.
- Feature API modules provide typed request/response boundaries; UI components do not call network transports directly.
- Timers, subscriptions, streams, sockets, listeners, and cancellable requests created by effects must be cleaned up when their owner unmounts.

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
