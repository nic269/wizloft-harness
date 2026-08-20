# @wizloft/harness-project

Pre-runtime project onboarding and the generated project-local runner for Wizloft Harness.

This workspace copy is private and outside the implemented `0.1.0-alpha.2` public allowlist until
the alpha.3 release graph includes it.

The public programmatic surface is `planProjectInitialization`,
`applyProjectInitialization(options)`,
`createGeneratedProjectProfile`, and `runProjectHarness`, plus the public plan, apply-result,
profile, runner, state, operation, and error types.

Full initializer apply is implemented: non-marker files, bounded isolated `npm` materialization,
local lockfile/runtime proof for both existing and newly installed materialization,
state-specific post-materialization certification, and `project.json` last. Installer and marker
race injection remain internal test seams. This workspace copy remains private and outside the
implemented `0.1.0-alpha.2` public allowlist until the alpha.3 release graph includes it.

The `wizloft-harness-project` bin is a scaffolding executable. `init --dry-run` plans
initialization. `init` without `--dry-run` applies that plan.
