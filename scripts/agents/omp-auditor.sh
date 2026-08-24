#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
ARGS=(
  --approval-mode always-ask
)
if [[ -r "$ROOT/.omp/prompts/auditor.md" ]]; then
  ARGS+=(--append-system-prompt "$ROOT/.omp/prompts/auditor.md")
fi
ARGS+=(
  --tools read,grep,glob,bash,lsp
)
if [[ -n "${WIZLOFT_OMP_AUDITOR_MODEL:-}" ]]; then
  ARGS+=(--model "$WIZLOFT_OMP_AUDITOR_MODEL")
fi
exec omp "${ARGS[@]}" "$@"
