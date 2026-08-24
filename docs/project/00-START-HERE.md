# Start Here

## Current mission

The Wizloft Harness alpha.3 onboarding implementation is complete through Phase 5. The
fourteen-package `0.1.0-alpha.3` graph is release-ready and unpublished.

The immediate work is **not** a redesign and **not** a Phase 4C rerun. The next Owner/Coordinator
action is a separately authorized release/publication decision. Phase 6 has not started.

## Current checkpoint

- Branch: `main`
- Authoritative HEAD: `f13d4d56e720336083764609f62fdd0a3341fa8b`
- Commit: `release: prepare alpha.3 package graph`
- Expected index: empty
- Expected committed worktree: clean. This status-reconciliation packet may leave only the allowed
  status/handoff docs unstaged.
- Public release graph: 14 packages at `0.1.0-alpha.3`
- `@wizloft/harness-project`: public at `0.1.0-alpha.3`
- Phase 4C: closed at `aa6234f832dc2fb0b04bf5039ee2cf81b5772630`
- Phase 5: implemented and independently audited; unpublished
- Phase 6: not started
- Publication: not authorized

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

If HEAD matches `f13d4d56e720336083764609f62fdd0a3341fa8b` and the index is empty, do **not**
prepare a Phase 4C proof packet. Ask the Owner for an explicit release/publication decision before
any registry mutation, tag, push, or Phase 6 consumer work.

## Definition of a successful handoff

A new Coordinator should be able to answer all of these before routing a Worker:

- What is the authoritative baseline SHA?
- Which plan and ADRs own the work?
- Which files are allowed to change?
- Is the packet proof-only, implementation, correction, release, or publication?
- What condition forces an immediate stop?
- Who holds the write lease?
- Is an independent Auditor required?
