# @wizloft/harness-project

Pre-runtime project onboarding and the generated project-local runner for Wizloft Harness.

This workspace copy is private and outside the implemented `0.1.0-alpha.2` public allowlist until
the alpha.3 release graph includes it.

The public programmatic surface is `planProjectInitialization`, `createGeneratedProjectProfile`,
and `runProjectHarness`, plus the public plan, profile, runner, state, operation, and error types.
An internal filesystem writer can apply non-marker file operations. Isolated install and
marker-last `project.json` are not available yet.

The `wizloft-harness-project` bin is a scaffolding executable. `init --dry-run` plans
initialization. Non-dry-run CLI apply remains rejected until install and marker-last exist.
