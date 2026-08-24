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

### Candidate publication, promotion, and G2B

- Published all fourteen frozen `0.1.0-alpha.3` artifacts under `candidate`.
- Immediately after candidate publication, `@wizloft/harness-project` had accepted automatic
  `latest=0.1.0-alpha.3` and had no `next`.
- A later authorized N1 promotion set `next=0.1.0-alpha.3` on all fourteen packages.
- The thirteen previously published packages retain `latest=0.1.0-alpha.2`.
- Replacement `next` replay and registry tree were independently sealed.
- Fast-forwarded Harness local/remote `main` through
  `16fe83ca9c7eee9060487869966c1802677de9ed`.
- Created and pushed annotated `harness-v0.1.0-alpha.3`, which peels to publication baseline
  `4b3d5b9d2aa7adb5274b644ce022ad5bbfaf9fa7`.

### Phase 6 P2 — external consumers

- Closed the clean exact-version fourteen-package public-registry consumer.
- Closed the Wizloft CLI exact-pin upgrade and regression, then committed the audited candidate
  locally at `b2b2af52df2bd337a341888c2512e74ac2b64c0c`.
- Closed distinct fresh/CLEAN and existing-project released initializer smokes.
- Closed Meldmark released initialization and target validation, then committed the audited
  candidate locally at `a35cf34a2e2418eaacda6cef39218235d50566b8`.
- Neither external commit is pushed.

### OMP Stage D — temp-only interoperability proof

- Ran Owner → Coordinator → Worker → independent Auditor through Orca from clean Harness source
  `bfbad5cde7979d28b80ef98d10fc29949bec0a3b`.
- In the no-remote fixture, generated bootstrap `222d7501` was discovered and invoked the
  project-local runner; Worker candidate `70bb4342` correlated Validation/Evidence events and
  passed independent audit.
- Kept `.omp/` ignored and local-only. The packet performed no Harness source, registry,
  publication, or push action and did not close committed-profile or broader readiness.

### Active-plan formal closure

- Reconciled the plan's ten completed Meldmark readiness gates to the audited Phase 4C, registry,
  CLI regression, released initializer, and Meldmark evidence.
- Replaced self-stale current-HEAD and pending-candidate directions with a clean checked-out `main`
  operational baseline that must be verified from live Git state.
- Closed the active alpha.3 plan's substantive and formal scope without treating either external
  push, committed-profile discoverability, or broader readiness as plan gates.

## What the proof strategy accomplished

The staged proof model worked as intended:

```text
unit/behavior fixtures
    -> repository acceptance
    -> packed manifest closure
    -> real packaged runtime
```

The two production defects appeared only in real packaged execution, before release-graph
transition. Later gates kept immutable publication, promotion/Git provenance, exact-version
consumer proof, external repository commits, external pushes, and OMP dogfood independently
reviewable.
