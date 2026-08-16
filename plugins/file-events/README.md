# `@wizloft/harness-plugin-file-events`

Slice 2 file-backed event subscriber for Wizloft Harness.

Package name: `@wizloft/harness-plugin-file-events`  
Runtime plugin id: `@wizloft/file-events`

- receives its JSONL path through the plugin's resolved profile config;
- subscribes to all runtime events through the ordinary plugin event API;
- appends immutable envelopes as one JSON object per line;
- reads persisted envelopes in append order;
- rejects corrupted envelopes that violate runtime id, event type, sequence, UTC timestamp, or JSON payload invariants;
- surfaces append failures through normal event-listener failure semantics.

This provider is append-only at the application level. It does not claim transactional,
write-ahead, fsync, or crash durability in v0.
