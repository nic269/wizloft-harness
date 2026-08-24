# @wizloft/harness-project

Pre-runtime project onboarding and the generated project-local runner for Wizloft Harness.

This package is the fourteenth public package in the unpublished `0.1.0-alpha.3`
release-ready candidate graph.

The public programmatic surface is `planProjectInitialization`,
`applyProjectInitialization(options)`,
`createGeneratedProjectProfile`, and `runProjectHarness`, plus the public plan, apply-result,
profile, runner, state, operation, and error types.

Full initializer apply is implemented: non-marker files, bounded isolated `npm` materialization,
local lockfile/runtime proof for both existing and newly installed materialization,
state-specific post-materialization certification, and `project.json` last. Installer and marker
race injection remain internal test seams.

The `wizloft-harness-project` bin is a scaffolding executable. `init --dry-run` plans
initialization. `init` without `--dry-run` applies that plan.
