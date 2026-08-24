# Start Here

## Current mission

The local fourteen-package alpha.3 implementation and packed proof are complete, but the public
release is incomplete. Only `@wizloft/harness-project@0.1.0-alpha.3` is published; the other
Harness packages remain published at alpha.2. The active plan is open for coherent publication,
registry and Git-provenance proof, Phase 6 external consumers, and OMP Stage D.

## Current checkpoint

- Operational baseline: clean checked-out `main`
- Baseline verification: capture `git rev-parse HEAD` and verify index/worktree status live; do not
  use a documentation-embedded SHA as the expected current HEAD
- Local candidate: fourteen packages implemented at lockstep `0.1.0-alpha.3`; Phase 4C packed proof
  and Phase 5 release-readiness evidence remain valid
- Public graph: incomplete; only `@wizloft/harness-project@0.1.0-alpha.3` is published, while the
  other Harness packages remain published at `0.1.0-alpha.2`
- Publication/promotion/G2B: no coherent alpha.3 graph or completed registry/Git-provenance proof
- Phase 6 P2 and release-dependent Meldmark readiness gates: open
- OMP Stage D: open; a prior temp-only no-remote exercise made no source or registry change and
  cannot close the gate under the invalid publication premise
- Boundary: no publish, tag, push, Phase 6, external-consumer, or local OMP action without a new
  exact Owner packet

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

Once live preflight confirms clean checked-out `main`, preserve the local implementation evidence
without treating it as public-release proof. Do not publish, promote, tag, push, run Phase 6, or
change local OMP state without a separate exact Owner packet. A later coherent release and
independent registry/Git-provenance proof must precede Phase 6 external consumers and Stage D.

## Definition of a successful handoff

A new Coordinator should be able to answer all of these before routing a Worker:

- What live HEAD did preflight resolve for the clean checked-out `main` baseline?
- Which plan and ADRs own the work?
- Which files are allowed to change?
- Is the packet proof-only, implementation, correction, release, or publication?
- What condition forces an immediate stop?
- Who holds the write lease?
- Is an independent Auditor required?
