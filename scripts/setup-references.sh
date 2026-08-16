#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="$ROOT/.references"
mkdir -p "$REF"

clone_if_missing() {
  local name="$1"
  local url="$2"
  local ref="${3:-}"
  local dir="$REF/$name"
  if [[ -d "$dir/.git" ]]; then
    echo "[exists] $name"
    return
  fi
  if [[ -n "$ref" ]]; then
    git clone --branch "$ref" --single-branch "$url" "$dir"
  else
    git clone "$url" "$dir"
  fi
}

clone_if_missing "deepseek-harness" "https://github.com/deepseek-ai/deepseek-harness.git" "master"
clone_if_missing "repository-harness-current" "https://github.com/hoangnb24/repository-harness.git" "main"
clone_if_missing "repository-harness-v1" "https://github.com/hoangnb24/repository-harness.git" "harness-cli-v0.1.22"

mkdir -p "$REF/consumers"
echo "References ready under $REF"
echo "Next: ./scripts/record-reference-baselines.sh"
