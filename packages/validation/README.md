# @wizloft/harness-validation

Runtime-scoped `validation@1` capability for deterministic proof selection and execution.

- `select()` exposes focused/root-required proof without running it;
- `run()` uses the same selection semantics and executes sequentially in registration order;
- failed proof and applicability/execution errors continue through a completed report;
- every outcome is linked to a generic Evidence record;
- the validated Evidence-record callback is snapshotted when the service is created;
- Evidence infrastructure failure rejects only after remaining validation work completes and retains
  the completed report plus original programmatic causes.

Validation does not execute commands or define shell/stdout/stderr contracts. The default runtime
plugin id is `@wizloft/validation` and it requires `evidence@1`.
