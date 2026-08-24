# Start Here

## Current mission

Alpha.3 publication, `next` promotion, Harness Git provenance, Phase 6 P2 stages 1–5, all ten
Meldmark readiness gates, the temp-only OMP Stage D interoperability proof, and the active plan's
substantive and formal scope are closed. Preserve the separation between those durable facts,
unpushed external commits, committed-profile discoverability, and broader readiness.

## Current checkpoint

- Operational baseline: clean checked-out `main`
- Baseline verification: capture `git rev-parse HEAD` and verify index/worktree status live; do not
  use a documentation-embedded SHA as the expected current HEAD
- Public graph: all 14 packages have `candidate=next=0.1.0-alpha.3`
- Dist-tags: the 13 previously published packages retain `latest=0.1.0-alpha.2`;
  `@wizloft/harness-project` accepted automatic `latest=0.1.0-alpha.3`
- G2B: Harness local/remote `main @ 16fe83c`; annotated `harness-v0.1.0-alpha.3` peels to
  `4b3d5b9d2aa7adb5274b644ce022ad5bbfaf9fa7`
- Phase 6 P2 stages 1–5: proof-closed
- Wizloft CLI: local unpushed `rewrite/typescript @ b2b2af52df2bd337a341888c2512e74ac2b64c0c`
- Meldmark: local unpushed `main @ a35cf34a2e2418eaacda6cef39218235d50566b8`
- OMP Stage D: independent-audit PASS from clean source `bfbad5c`; no-remote fixture bootstrap
  `222d7501`, Worker candidate `70bb4342`; Owner → Coordinator → Worker → Auditor through Orca
- Stage D boundaries: `.omp/` remains ignored/local-only; no source or registry action occurred
- Later non-plan gates: both external pushes, committed OMP-profile discoverability, and broader
  readiness

## Reading order for a new Coordinator

1. Root `AGENTS.md` and repository workflow rules.
2. `docs/decisions/0012-public-package-release-contract.md`.
3. `docs/decisions/0013-project-onboarding-and-discovery.md`.
4. `docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`.
5. This repository's `docs/handoff/CURRENT-HANDOFF.md`.
6. Live Git status, HEAD, and index. Confirm checked-out `main` is clean before routing work.

Do not treat `packages/project/tests/project-packed-runtime.test.mjs` as a live WIP candidate. That
proof is committed.

## First OMP Coordinator actions

```bash
git status --short --branch
git rev-parse HEAD
git diff --cached --name-status
```

Once live preflight confirms clean checked-out `main`, do not repeat publication, promotion, G2B,
P2, Meldmark readiness proof, or Stage D. Do not push either external commit, commit/install an OMP
profile, or claim broader readiness without a separate exact Owner packet. `bfbad5c` remains only
the qualified source provenance for the completed Stage D fixture.

## Definition of a successful handoff

A new Coordinator should be able to answer all of these before routing a Worker:

- What live HEAD did preflight resolve for the clean checked-out `main` baseline?
- Which plan and ADRs own the work?
- Which files are allowed to change?
- Is the packet proof-only, implementation, correction, release, or publication?
- What condition forces an immediate stop?
- Who holds the write lease?
- Is an independent Auditor required?
