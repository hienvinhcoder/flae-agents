#!/usr/bin/env bash

set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPOSITORY_ROOT"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

compose_json="$(docker compose config --format json)"

jq -e '.services["firebase-emulator"]' <<<"$compose_json" >/dev/null || \
  fail "docker-compose.yml has no firebase-emulator service"
jq -e '.services["firebase-emulator"].ports | map(.published | tonumber) | sort == [4000, 9099, 9199]' <<<"$compose_json" >/dev/null || \
  fail "firebase-emulator does not expose UI, Auth, and Storage ports"
jq -e '.services["firebase-emulator"].healthcheck.test | length > 0' <<<"$compose_json" >/dev/null || \
  fail "firebase-emulator has no health check"

for service in backend flae-worker; do
  jq -e --arg service "$service" '.services[$service].environment.GOOGLE_CLOUD_PROJECT == "flae-agents"' <<<"$compose_json" >/dev/null || \
    fail "$service does not use the local Firebase project"
  jq -e --arg service "$service" '.services[$service].environment.FIREBASE_AUTH_EMULATOR_HOST == "firebase-emulator:9099"' <<<"$compose_json" >/dev/null || \
    fail "$service does not route Firebase Auth to the emulator"
  jq -e --arg service "$service" '.services[$service].environment.STORAGE_EMULATOR_HOST == "http://firebase-emulator:9199"' <<<"$compose_json" >/dev/null || \
    fail "$service does not route GCS to the Storage emulator"
  jq -e --arg service "$service" '.services[$service].environment.GCS_BUCKET_NAME == "flae-agents.appspot.com"' <<<"$compose_json" >/dev/null || \
    fail "$service does not use the shared emulated bucket"
  jq -e --arg service "$service" '.services[$service].depends_on["firebase-emulator"].condition == "service_healthy"' <<<"$compose_json" >/dev/null || \
    fail "$service does not wait for a healthy Firebase emulator"
done

jq -e '.emulators.auth.host == "0.0.0.0" and .emulators.auth.port == 9099' firebase/firebase.json >/dev/null || \
  fail "Auth emulator is not reachable outside its container"
jq -e '.emulators.storage.host == "0.0.0.0" and .emulators.storage.port == 9199' firebase/firebase.json >/dev/null || \
  fail "Storage emulator is not reachable outside its container"
jq -e '.storage.rules == "storage.rules"' firebase/firebase.json >/dev/null || \
  fail "Storage emulator has no rules file configured"
[[ -f firebase/storage.rules ]] || fail "configured Storage rules file does not exist"

grep -Fq 'firebase setup:emulators:storage' firebase/Dockerfile || \
  fail "Firebase image does not preload the Storage emulator runtime"
grep -Fq 'COPY storage.rules .' firebase/Dockerfile || \
  fail "Firebase image does not include Storage rules"
grep -Fq '"--project", "flae-agents"' firebase/Dockerfile || \
  fail "Firebase image does not use the shared project ID"
grep -Fq '"--only", "auth,storage"' firebase/Dockerfile || \
  fail "Firebase image starts services outside Auth and Storage"

for example_file in .env.example backend/.env.example; do
  grep -Fq 'STORAGE_EMULATOR_HOST=' "$example_file" || \
    fail "$example_file does not document STORAGE_EMULATOR_HOST"
  if grep -Fq 'FIREBASE_STORAGE_EMULATOR_HOST=' "$example_file"; then
    fail "$example_file documents the unsupported Storage variable"
  fi
done

echo "PASS: Firebase Auth and Storage emulator configuration is consistent"
