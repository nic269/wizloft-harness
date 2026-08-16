#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <name> <repository-path>" >&2
  exit 2
fi

NAME="$1"
TARGET="$(cd "$2" && pwd)"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST_DIR="$ROOT/.references/consumers"
DEST="$DEST_DIR/$NAME"

if [[ ! -d "$TARGET/.git" ]]; then
  echo "Target is not a Git repository: $TARGET" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
rm -f "$DEST"
ln -s "$TARGET" "$DEST"

echo "Linked read-only reference: $DEST -> $TARGET"
echo "Do not edit the consumer through this symlink during Harness implementation."
