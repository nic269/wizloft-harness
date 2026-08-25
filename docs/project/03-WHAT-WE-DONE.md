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

### Partial alpha.3 publication attempt

- The local fourteen-package `0.1.0-alpha.3` implementation remained the release-ready candidate.
- Only `@wizloft/harness-project@0.1.0-alpha.3` was actually published.
- The other Harness packages remained published at `0.1.0-alpha.2` as `latest`.
- Records claiming all fourteen alpha.3 publications, coherent alpha.3 `candidate`/`next`
  promotion, sealed alpha.3 registry proof, or alpha.3 Git-to-binary closure are not completion
  evidence. That partial public history is immutable and was not repaired.

### Phase 6 P2 — external consumers

- Work was attempted on registry consumption, the Wizloft CLI, released initializer smokes, and
  Meldmark under the invalid coherent alpha.3-publication premise.
- Because the coherent fourteen-package alpha.3 public graph did not exist, that work could not
  close Phase 6 or the release-dependent Meldmark gates.
- Any retained local external-repository commits from that attempt are not proof of a coherent
  public alpha.3 release or remote adoption.

### OMP Stage D — temp-only interoperability attempt

- A temp-only no-remote exercise ran from Harness source
  `bfbad5cde7979d28b80ef98d10fc29949bec0a3b`, with generated bootstrap `222d7501` and Worker
  candidate `70bb4342`.
- It kept `.omp/` ignored and local-only and performed no Harness source, registry, publication, or
  push action.
- Because it relied on the invalid coherent-publication premise, it does not close Stage D,
  committed-profile discoverability, or broader readiness.

### Active-plan status correction

- Reopened immutable-partial-publication recovery, proof of all fourteen exact artifacts, registry
  proof, Git provenance, Phase 6 external consumers, the release-dependent Meldmark gates, and OMP
  Stage D.
- Preserved Phase 4C and Phase 5 as local packed-proof and release-readiness evidence only.
- Required a later packet to compare the already-published project artifact byte/provenance against
  the frozen candidate, stop for an Owner decision/new coherent version on mismatch, or publish the
  remaining thirteen and prove all fourteen on match.
- The later Owner decision selected `0.1.0-alpha.4` rather than repairing alpha.3.

## Alpha.4 coherent recovery

### Source, freeze, registry, and Git provenance

- Commit `R`: `f662a454216d90c61c443c55a83165618d5e9843` (tree
  `68d5bb37d506b49301e2d3c433979b0c7fa64f2f`).
- Frozen artifact-manifest SHA-256:
  `553c0e4ee510b3087360b0e2e7910aa07adf6c8140b4fbff798049e703a482bd`.
- Annotated tag `harness-v0.1.0-alpha.4` object `7c70e518458eb4923d42353dcba7d2069adb7b04` is
  remote-pushed and peels to `R`.
- All fourteen packages are published at `0.1.0-alpha.4` on `candidate` and `next`.
- `latest` is unchanged: thirteen packages at `0.1.0-alpha.2` and
  `@wizloft/harness-project@0.1.0-alpha.3`.

### Phase 6 P2 — alpha.4 downstream proof

- A4-10 exact-registry consumer independently accepted; evidence seal SHA-256
  `4a4ebcfa8178c7b2775c7fcfcaefd24cd701ac0102f7eafffa1e77c076ce11ee`.
- A4-11 Wizloft CLI exact-pin regression independently accepted, then committed locally as
  `c5e011383fd6b056d271517580b8cfd7d59bb7c3` on `rewrite/typescript` (parent
  `b2b2af52df2bd337a341888c2512e74ac2b64c0c`). Not pushed.
- A4-12 released CLEAN/EXISTING smokes independently accepted; evidence seal SHA-256
  `f992c5ebd45f52caee460583e0a48d3e24df1827389e37c1ecaffdb955f744c6`.
- A4-13 Meldmark released initialization and target validation independently accepted, then
  committed locally as `3f4ab1a6b29b90e82112ffbf64a853183cb0de30` on `main` (parent
  `a35cf34a2e2418eaacda6cef39218235d50566b8`). No remote, not pushed.

### OMP Stage D — alpha.4 temp-only pass

- A4-14 independently accepted on a no-remote fixture.
- Fixture lineage: `f662a454216d90c61c443c55a83165618d5e9843` →
  `431efa300230663a565fd23cc897a39e01a2a29b` → `21ca6a67e8c73546eef5f8f91c4a7380a8066ef8`.
- `.omp/` remained ignored/local-only. This does not close committed-profile discoverability or
  broader readiness.

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
