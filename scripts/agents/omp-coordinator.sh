#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
ARGS=(
  --approval-mode always-ask
  --append-system-prompt "$ROOT/.omp/prompts/coordinator.md"
  --tools read,grep,glob,bash,task,hub,todo
)
if [[ -n "${WIZLOFT_OMP_COORDINATOR_MODEL:-}" ]]; then
  ARGS+=(--model "$WIZLOFT_OMP_COORDINATOR_MODEL")
fi
exec omp "${ARGS[@]}" "$@"
