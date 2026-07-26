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

## Quality checks

Run the checks independently as needed:

```bash
npm run test
npm run typecheck
npm run lint
npm run test:coverage
npm run test:e2e
```

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
