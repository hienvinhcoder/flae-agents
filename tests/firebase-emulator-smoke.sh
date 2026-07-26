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

for attempt in {1..90}; do
  if curl --fail --silent http://127.0.0.1:8000/docs >/dev/null; then
    break
  fi
  sleep 1
done

curl --fail --silent http://127.0.0.1:8000/docs >/dev/null

(cd frontend && npx playwright test --config playwright.firebase.config.ts)
