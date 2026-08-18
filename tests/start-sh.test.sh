#!/usr/bin/env bash

set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/flae-start-test.XXXXXX")"

cleanup() {
  rm -rf "$TEST_TMP_DIR"
}
trap cleanup EXIT

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

prepare_fixture() {
  local fixture_dir="$1"

  mkdir -p "$fixture_dir/bin" "$fixture_dir/frontend/node_modules"
  cp "$REPOSITORY_ROOT/start.sh" "$fixture_dir/start.sh"
  cp "$REPOSITORY_ROOT/frontend/.env.example" "$fixture_dir/frontend/.env.example"
  chmod +x "$fixture_dir/start.sh"

  cat > "$fixture_dir/bin/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$START_TEST_COMMAND_LOG"
EOF

  cat > "$fixture_dir/bin/npm" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

if [[ "$*" == "ls --depth=0" ]]; then
  exit 0
fi

if [[ "$*" == "run dev" ]]; then
  [[ -f .env ]] || { echo "frontend/.env was not created before Vite startup" >&2; exit 91; }

  for _ in {1..100}; do
    if grep -Fqx "compose logs --follow --tail=100 firebase-emulator backend application-worker knowledge-worker" "$START_TEST_COMMAND_LOG"; then
      printf '%s\n' "$*" >> "$START_TEST_COMMAND_LOG"
      exit 0
    fi
    sleep 0.01
  done

  echo "backend and worker log following did not start before Vite" >&2
  exit 92
fi

echo "unexpected npm command: $*" >&2
exit 93
EOF

  chmod +x "$fixture_dir/bin/docker" "$fixture_dir/bin/npm"
}

run_start_script() {
  local fixture_dir="$1"
  local command_log="$fixture_dir/commands.log"

  : > "$command_log"
  PATH="$fixture_dir/bin:$PATH" START_TEST_COMMAND_LOG="$command_log" "$fixture_dir/start.sh"
}

missing_env_fixture="$TEST_TMP_DIR/missing-env"
prepare_fixture "$missing_env_fixture"
run_start_script "$missing_env_fixture"

cmp -s "$missing_env_fixture/frontend/.env.example" "$missing_env_fixture/frontend/.env" || \
  fail "start.sh did not bootstrap frontend/.env from the example"
grep -Fqx 'VITE_USE_FIREBASE_EMULATORS=true' "$missing_env_fixture/frontend/.env" || \
  fail "generated frontend/.env does not enable Firebase emulators"
grep -Fqx "compose up -d" "$missing_env_fixture/commands.log" || \
  fail "start.sh did not start Docker Compose"
grep -Fqx "compose logs --follow --tail=100 firebase-emulator backend application-worker knowledge-worker" "$missing_env_fixture/commands.log" || \
  fail "start.sh did not follow Firebase emulator, backend, and worker logs"

existing_env_fixture="$TEST_TMP_DIR/existing-env"
prepare_fixture "$existing_env_fixture"
printf '%s\n' "VITE_API_URL=https://custom.example.test" > "$existing_env_fixture/frontend/.env"
run_start_script "$existing_env_fixture"

[[ "$(< "$existing_env_fixture/frontend/.env")" == "VITE_API_URL=https://custom.example.test" ]] || \
  fail "start.sh overwrote an existing frontend/.env"

grep -Fq 'href="/favicon.svg"' "$REPOSITORY_ROOT/frontend/index.html" || \
  fail "frontend/index.html does not reference the favicon"
[[ -f "$REPOSITORY_ROOT/frontend/public/favicon.svg" ]] || \
  fail "frontend/public/favicon.svg does not exist"

echo "PASS: start.sh bootstraps emulator config, preserves overrides, follows service logs, and serves a favicon"
