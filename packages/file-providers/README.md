# `@wizloft/harness-file-providers`

First-party file-backed providers for Wizloft Harness.

Import providers through explicit subpaths:

- `@wizloft/harness-file-providers/events` — append-only JSONL event history;
- `@wizloft/harness-file-providers/memory` — append-only JSONL Memory snapshots;
- `@wizloft/harness-file-providers/memory-context` — Memory-backed Context contributions;
- `@wizloft/harness-file-providers/repository` — repository-file Authority and Context sources.

The npm package boundary groups providers that share the Harness release cadence. Runtime plugin ids
remain `@wizloft/file-events`, `@wizloft/file-memory`, `@wizloft/memory-context`, and
`@wizloft/repository-files`.
