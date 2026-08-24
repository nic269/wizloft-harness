# What We Have Done

This is a condensed implementation history. Git and the active plan remain authoritative.

## Foundations and release baseline

- Built the small plugin kernel and first-party Authority, Context, Memory, Validation, Evidence,
  Events, and repository/file providers.
- Established a self-hosting profile and dogfooded Harness through the Wizloft CLI rewrite.
- Published the coherent thirteen-package `0.1.0-alpha.2` graph.
- Rewrote Wizloft CLI to TypeScript and integrated Harness only through released public packages.

## Alpha.3 onboarding cycle

### Phase 0 — durable decisions

- Added ADR 0013 for project onboarding and discovery.
- Amended the release contract for the planned fourteenth package.
- Clarified portable wrapper versus native host integration.

### Phase 1 — planner and safety

Commit: `fac903208236d59353a98e52158fe85b770fb8c2`

- Added private `@wizloft/harness-project` package boundary.
- Implemented project ID validation, Node floor, repository inspection, state classification,
  managed-block planning, dry-run, marker schema validation, and adapter desired state.

### AgentKit / Wizloft agent foundation

Commit: `fe7b93886b5a4f966a60c5f825852b1e92675d15`

- Added repository-level agent tooling foundation while preserving the Harness namespace boundary.

### Phase 2 — filesystem writer

Commit: `feb372e62c295c43fe234282b9371e4e5e6af985`

- Implemented bounded owned-path writes, stale-plan checks, no-clobber CREATE, atomic REPLACE,
  user-byte-preserving managed blocks, partial-failure accounting, and create-once PROJECT.md.

### Phase 3A — runtime composition

Commit: `29dd040293419eba5bbc72195ac2eeec62b2a92c`

- Added project-local profile composition, source-only overlay, health validator,
  `runProjectHarness()`, stream/error ownership, and local runtime identity proof.

### Phase 3B — complete initialization

Commit: `a23f34ff885e88c9686a0523a7492b8da87fcd67`

- Added real apply orchestration, bounded npm materialization, fresh post-install certification,
  marker-last publication, successful non-dry-run CLI, and state/failure/recovery behavior.

### Phase 4A — repository acceptance matrix

Commit: `4612359ba5d6204af140b6a4eb4cbf795d406ce4`

- Proved CLEAN, EXISTING, CONFLICT, failure/retry, upgrade, fresh clone, adapter matrix,
  Authority/Context/Memory/overlay, runner behavior, and zero-diff re-init.

### Phase 4B — packed closure

Commit: `a116899ebcd20c5ee111f828f32cb412e5cd0af3`

- Packed fourteen real artifacts locally.
- Proved exact versions/dependencies, no local protocols, closed acyclic graph,
  transitive Memory, dependency-derived layer 7, and packed entry surfaces.

### Phase 4C findings and corrections

ESM correction: `cabe413e29adb30d56400cf8f6ed76b1ee476cf2`

- Real packed execution exposed CommonJS resolution against an import-only package.
- Kept ESM package contract and moved runtime identity/runner to ESM-compatible resolution.

Portable-lock correction: `19946c7a2f07844bc15aab2380837f8f57be8e92`

- Real fresh-clone `npm ci` exposed checkout-bound lockfile keys.
- Moved internal npm execution to the isolated npm project cwd.
- Added portable lockfile certification before marker publication.

### Phase 4C closeout

Commit: `aa6234f832dc2fb0b04bf5039ee2cf81b5772630`

- Committed the real packaged-runtime proof after the ESM and portable-lock corrections.
- Proved fourteen packed artifacts, loopback-only npm, packed bootstrap, portable lockfile,
  dependency-context-aware ESM resolution, clone `npm ci` recovery, and current re-init with no
  npm.
- Independent Auditor review passed. Phase 4C is closed. That commit did not change release
  identity, package privacy, or start Phase 5.

### Local OMP portability

Commits: `49978971e8fdb34bfc07adb48817310218e163db`,
`5c966c40c8f766260a958e9de3f35f6c85e73566`

- Stopped tracking repository `.omp/` and treat it as an optional ignored overlay.
- Made the OMP launcher scripts and setup docs work with user, bundled, or local configuration.
- This is local tooling portability only. It is not OMP dogfood and not Phase 6.

### Phase 5 — unpublished alpha.3 release graph

Commit: `f13d4d56e720336083764609f62fdd0a3341fa8b`

- Transitioned the implemented public graph to fourteen packages at lockstep `0.1.0-alpha.3`.
- Made `@wizloft/harness-project` public and release-allowlisted.
- Updated release-contract, packed-consumer, and identity surfaces for the unpublished
  release-ready candidate.
- Independent Auditor review passed. No npm publication, dist-tag, Git tag, push, or Phase 6
  consumer work was authorized or performed.

## What the proof strategy accomplished

The staged proof model worked as intended:

```text
unit/behavior fixtures
    -> repository acceptance
    -> packed manifest closure
    -> real packaged runtime
```

The two production defects appeared only in real packaged execution, before release-graph
transition. Phase 4C then closed, and Phase 5 implemented the unpublished fourteen-package
`0.1.0-alpha.3` candidate.
