# Firebase Emulator Login Design

## Goal

Make local login and file storage deterministic by running Firebase Authentication and Storage emulators with the existing Docker Compose stack, while preserving an explicit path to real Firebase services outside local development.

## Scope

This change covers Firebase emulator startup, frontend SDK routing, backend token verification, backend Storage routing, project-ID consistency, health checks, and focused automated verification. It does not redesign the login UI, change user synchronization behavior, or replace the existing Google Cloud Storage service abstraction.

## Architecture

Docker Compose will own a `firebase-emulator` service built from `firebase/Dockerfile`. The service will start only Authentication and Storage, expose their ports plus Emulator UI, and use the repository's `firebase/firebase.json`. Auth and Storage will bind to `0.0.0.0` inside the container so both the host frontend and Docker-network backend can reach them. All local components will use the same project ID, `flae-agents`, so Auth tokens, Storage buckets, Firebase Admin, and frontend SDK configuration agree.

Local emulator routing will be explicit rather than inferred from `ENVIRONMENT`:

- Frontend: `VITE_USE_FIREBASE_EMULATORS=true` enables SDK emulator connectors.
- Backend Auth: `FIREBASE_AUTH_EMULATOR_HOST=firebase-emulator:9099` enables Firebase Admin emulator-token verification.
- Backend Storage: `STORAGE_EMULATOR_HOST=http://firebase-emulator:9199` routes `google-cloud-storage` to the Storage emulator.
- Shared project: `GOOGLE_CLOUD_PROJECT=flae-agents` and `VITE_FIREBASE_PROJECT_ID=flae-agents`.

Production deployments omit or disable these emulator variables and continue using the existing Firebase credentials and Google Cloud endpoints.

## Frontend Behavior

The environment schema will accept a boolean-like `VITE_USE_FIREBASE_EMULATORS` setting. Firebase initialization will remain singleton-safe and connect Auth and Storage exactly once when the setting is enabled. Auth uses `127.0.0.1:9099`; Storage uses `127.0.0.1:9199`, because Vite runs on the host rather than inside Docker.

The existing login form and authentication error mapping remain unchanged. Successful Auth Emulator login still flows through `AuthBootstrap`, obtains an emulator ID token, calls `/api/v1/auth/sync-user`, and navigates only after backend synchronization succeeds.

## Backend Behavior

Firebase Admin continues to initialize from the existing service-account configuration. When `FIREBASE_AUTH_EMULATOR_HOST` is present, the Admin SDK accepts unsigned emulator tokens and validates them against the configured project ID.

The existing `GCSStorageService` continues using `google.cloud.storage.Client()`. The Python client automatically uses anonymous credentials and the emulator endpoint when `STORAGE_EMULATOR_HOST` is present. Local Compose sets `GCS_BUCKET_NAME=flae-agents.appspot.com` so frontend and backend use the same emulated bucket; production may continue supplying its existing bucket name.

Both `backend` and `flae-worker` receive the same Auth and Storage emulator variables because API requests and Temporal ingestion activities can access Firebase-backed services.

## Startup And Health

`docker-compose.yml` will add `firebase-emulator`, expose ports `4000`, `9099`, and `9199`, persist exported emulator data in `firebase/data`, and add a health check against the Auth emulator configuration endpoint. Backend and worker services will wait for the emulator to become healthy in local Compose startup.

`start.sh` will continue starting Docker Compose before Vite. Its status output will include Firebase Emulator UI and will report that local Firebase configuration is active. It will not silently substitute placeholder production credentials.

## Error Handling

- Invalid or missing frontend environment values fail during application initialization through the existing Zod environment parser.
- Emulator connection setup is idempotent to avoid duplicate-connection errors during development reloads and tests.
- Docker health checks prevent backend startup from racing the emulator.
- Backend token failures continue returning the existing 401 response without exposing token details.
- Production mode never falls back to an emulator unless the explicit emulator variables are enabled.

## Testing

Frontend unit tests will verify environment parsing and that Auth/Storage emulator connectors are called only when enabled. Existing Firebase auth tests will be extended rather than replacing their current sign-in coverage.

Configuration tests will validate the composed service, project ID, exposed ports, and required backend environment variables. A local smoke test will:

1. Start the Firebase Auth and Storage emulators.
2. Confirm the Auth configuration endpoint and Storage object endpoint respond.
3. Create an emulator user and obtain an ID token.
4. Send the token to `/api/v1/auth/sync-user` and require a successful synchronized-user response.
5. Confirm the normal browser login reaches an authenticated route.

## Success Criteria

- `./start.sh` starts Firebase Emulator with the rest of the local stack.
- Emulator UI is available on port `4000`, Auth on `9099`, and Storage on `9199`.
- The browser sends local email/password authentication to port `9099`, not `identitytoolkit.googleapis.com`.
- Backend accepts the resulting emulator token and successfully synchronizes the user.
- Backend and worker Storage clients target port `9199` locally.
- Disabling emulator flags leaves the production Firebase path intact.
- Focused tests, frontend test suite, frontend build, and backend auth tests pass.
