#!/usr/bin/env bash

set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPOSITORY_ROOT"

docker compose up -d --build firebase-emulator postgres redis temporal backend

for attempt in {1..90}; do
  if curl --fail --silent \
    http://127.0.0.1:9099/emulator/v1/projects/flae-agents/config >/dev/null; then
    break
  fi
  sleep 1
done

curl --fail --silent \
  http://127.0.0.1:9099/emulator/v1/projects/flae-agents/config >/dev/null
curl --fail --silent \
  -H 'Authorization: Bearer owner' \
  http://127.0.0.1:9199/storage/v1/b/flae-agents.appspot.com/o >/dev/null

docker compose exec -T backend uv run python -c \
  'import asyncio, uuid; from app.services.storage.gcs import GCSStorageService; exec("async def smoke():\n    path = await GCSStorageService.upload_file(uuid.UUID(\"00000000-0000-4000-8000-000000000001\"), uuid.uuid4(), \"smoke.txt\", b\"firebase-emulator-smoke\", \"text/plain\")\n    assert GCSStorageService.download_file_sync(path) == b\"firebase-emulator-smoke\"\n    await GCSStorageService.delete_file(path)\nasyncio.run(smoke())")'

for attempt in {1..90}; do
  if curl --fail --silent http://127.0.0.1:8000/docs >/dev/null; then
    break
  fi
  sleep 1
done

curl --fail --silent http://127.0.0.1:8000/docs >/dev/null

(cd frontend && npx playwright test --config playwright.firebase.config.ts)
