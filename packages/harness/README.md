# @wizloft/harness

Consumer-facing SDK facade and logically separated Harness modules.

The root export owns `createHarness`, profile helpers, and facade types. Explicit subpaths expose:

- `./authority`, `./context`, `./evidence`, `./memory`, and `./validation`;
- `./commands` for the bounded structured command executor;
- `./cli` for IO-free argv parsing and deterministic rendering.

The package depends only on `@wizloft/harness-kernel`. It owns no provider plugins, profile loader,
process-global runtime, or executable binary.
