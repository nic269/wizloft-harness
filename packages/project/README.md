# @wizloft/harness-project

Pre-runtime project onboarding and the generated project-local runner for Wizloft Harness.

This workspace copy is a Phase 1 planner/preflight implementation. It is private and outside the
implemented `0.1.0-alpha.2` public allowlist until the alpha.3 release graph includes it.

The Phase 1 public programmatic surface is `planProjectInitialization` plus its options, plan,
state, operation, and error types. Apply, isolated install, and `runProjectHarness` are not
available in this phase.

The `wizloft-harness-project` bin is a scaffolding executable. `init --dry-run` plans
initialization. Non-dry-run apply is rejected until a later phase.
