#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="$ROOT/.references"
OUT="$ROOT/docs/references/UPSTREAM-BASELINES.md"

sha() {
  git -C "$1" rev-parse HEAD
}

for d in deepseek-harness repository-harness-current repository-harness-v1; do
  if [[ ! -d "$REF/$d/.git" ]]; then
    echo "Missing $REF/$d. Run scripts/setup-references.sh first." >&2
    exit 1
  fi
done

cat > "$OUT" <<EOT
# Upstream Reference Baselines

Recorded: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

\`\`\`text
deepseek-harness:              $(sha "$REF/deepseek-harness")
repository-harness-current:    $(sha "$REF/repository-harness-current")
repository-harness-v1:         $(sha "$REF/repository-harness-v1") (tag: harness-cli-v0.1.22)
\`\`\`

These repositories are architecture references, not Wizloft authority.
EOT

echo "Updated $OUT"
