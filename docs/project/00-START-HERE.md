# Start Here

## Current mission

Alpha.3 publication, `next` promotion, Harness Git provenance, and Phase 6 P2 stages 1–5 are
proof-closed. Preserve the separation between those durable facts, unpushed external commits, and
the unstarted OMP Stage D.

## Current checkpoint

- Branch: `main`
- Authoritative Harness baseline: `16fe83ca9c7eee9060487869966c1802677de9ed`
- Expected index before this docs candidate: empty
- Public graph: all 14 packages have `candidate=next=0.1.0-alpha.3`
- Dist-tags: the 13 previously published packages retain `latest=0.1.0-alpha.2`;
  `@wizloft/harness-project` accepted automatic `latest=0.1.0-alpha.3`
- G2B: Harness local/remote `main @ 16fe83c`; annotated `harness-v0.1.0-alpha.3` peels to
  `4b3d5b9d2aa7adb5274b644ce022ad5bbfaf9fa7`
- Phase 6 P2 stages 1–5: proof-closed
- Wizloft CLI: local unpushed `rewrite/typescript @ b2b2af52df2bd337a341888c2512e74ac2b64c0c`
- Meldmark: local unpushed `main @ a35cf34a2e2418eaacda6cef39218235d50566b8`
- Open gates: both external pushes, OMP Stage D, and broader readiness

## Reading order for a new Coordinator

1. Root `AGENTS.md` and repository workflow rules.
2. `docs/decisions/0012-public-package-release-contract.md`.
3. `docs/decisions/0013-project-onboarding-and-discovery.md`.
4. `docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`.
5. This repository's `docs/handoff/CURRENT-HANDOFF.md`.
6. Git status, HEAD, and index. Confirm they match this checkpoint.

Do not treat `packages/project/tests/project-packed-runtime.test.mjs` as a live WIP candidate. That
proof is committed.

## First OMP Coordinator actions

```bash
git status --short --branch
git rev-parse HEAD
git diff --cached --name-status
```

If HEAD matches `16fe83ca9c7eee9060487869966c1802677de9ed` and only this allowed docs
candidate is dirty, do not repeat publication, promotion, G2B, or P2. Do not push either external
commit or start OMP Stage D without a separate exact Owner packet.

## Definition of a successful handoff

A new Coordinator should be able to answer all of these before routing a Worker:

- What is the authoritative baseline SHA?
- Which plan and ADRs own the work?
- Which files are allowed to change?
- Is the packet proof-only, implementation, correction, release, or publication?
- What condition forces an immediate stop?
- Who holds the write lease?
- Is an independent Auditor required?
