#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
ARGS=(
  --approval-mode always-ask
)
if [[ -r "$ROOT/.omp/prompts/coordinator.md" ]]; then
  ARGS+=(--append-system-prompt "$ROOT/.omp/prompts/coordinator.md")
fi
ARGS+=(
  --tools read,grep,glob,bash,task,hub,todo
)
if [[ -n "${WIZLOFT_OMP_COORDINATOR_MODEL:-}" ]]; then
  ARGS+=(--model "$WIZLOFT_OMP_COORDINATOR_MODEL")
fi
exec omp "${ARGS[@]}" "$@"
