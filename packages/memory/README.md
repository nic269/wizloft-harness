# @wizloft/harness-memory

First-party `memory@1` capability contracts and generic runtime-scoped service.

- immutable episodic/semantic records with exact scopes and explicit provenance;
- candidate/active/stale/superseded/archived lifecycle;
- deterministic active-only recall by default;
- serialized persist-before-commit mutations through one `MemoryStore` seam;
- no persistence provider plugin, semantic ranking, autonomous extraction, or Authority integration.

The first-party JSONL provider lives in `@wizloft/harness-plugin-file-memory`.
