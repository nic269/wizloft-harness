#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
ARGS=(
  --approval-mode write
  --append-system-prompt "$ROOT/.omp/prompts/worker.md"
  --tools read,grep,glob,edit,write,ast_edit,bash,lsp
)
if [[ -n "${WIZLOFT_OMP_WORKER_MODEL:-}" ]]; then
  ARGS+=(--model "$WIZLOFT_OMP_WORKER_MODEL")
fi
exec omp "${ARGS[@]}" "$@"
