# @wizloft/harness-plugin-memory-context

Generic Memory-to-Context integration with runtime plugin id `@wizloft/memory-context`.

- requires `memory@1` and `context@1`;
- maps exact-subject Memory recall queries into `supporting` or `historical` Context items;
- defaults each mapping to Memory's active-only recall semantics unless states are explicit;
- owns contributor registration and shutdown cleanup;
- contains no file/JSONL behavior and never registers with Authority.
