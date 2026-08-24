# Start Here

## Current mission

The Wizloft Harness alpha.3 onboarding implementation is complete through Phase 5. The
fourteen-package `0.1.0-alpha.3` graph is published to npmjs.org under `candidate`.

The immediate work is **not** a redesign, **not** a Phase 4C rerun, and **not** a new
publication. Next promotion, Git tag/push, and Phase 6 remain unauthorized. Phase 6 has not
started.

## Current checkpoint

- Branch: `main`
- Authoritative HEAD: `4b3d5b9d2aa7adb5274b644ce022ad5bbfaf9fa7`
- Commit: `docs: reconcile alpha.3 release status`
- Expected index: empty
- Expected committed worktree: clean. This publication-status packet may leave only the allowed
  status/handoff docs unstaged.
- Public release graph: 14 packages at `0.1.0-alpha.3`
- `@wizloft/harness-project`: public at `0.1.0-alpha.3`
- Phase 4C: closed at `aa6234f832dc2fb0b04bf5039ee2cf81b5772630`
- Phase 5: implemented and independently audited as an unpublished release-ready candidate
- Candidate publication: all 14 frozen artifacts published once under `candidate`
- Dist-tags: 13 packages retain `latest=next=0.1.0-alpha.2`; `@wizloft/harness-project` has
  accepted automatic `latest=0.1.0-alpha.3` and no `next`
- Phase 6: not started
- Publication: candidate publication complete; no explicit latest/next mutation

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

If HEAD matches `4b3d5b9d2aa7adb5274b644ce022ad5bbfaf9fa7` and the index is empty, do **not**
prepare a Phase 4C proof packet. Do **not** publish again, retag, push, or start Phase 6
without a new Owner packet that names exact allowed paths.

## Definition of a successful handoff

A new Coordinator should be able to answer all of these before routing a Worker:

- What is the authoritative baseline SHA?
- Which plan and ADRs own the work?
- Which files are allowed to change?
- Is the packet proof-only, implementation, correction, release, or publication?
- What condition forces an immediate stop?
- Who holds the write lease?
- Is an independent Auditor required?
