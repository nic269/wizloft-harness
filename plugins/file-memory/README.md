# @wizloft/harness-plugin-file-memory

First-party file-backed Memory provider with runtime plugin id `@wizloft/file-memory`.

- appends complete immutable Memory snapshots as JSONL;
- reconstructs current state and first-seen order through `@wizloft/harness-memory`;
- treats a missing file as empty and rejects malformed or logically impossible history at setup;
- provides `memory@1` without requiring Context or Authority.

Generic Memory-to-Context mappings live in `@wizloft/harness-plugin-memory-context`.

JSONL is append-oriented v0 durability, not a transactional, WAL, fsync, or crash-durability claim.
