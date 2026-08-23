# Start Here

## Current mission

Finish the Wizloft Harness alpha.3 onboarding cycle, prove the packaged runtime end to end,
release the coherent fourteen-package graph, and dogfood the released initializer in real projects.

The immediate work is **not** a redesign. The next task is a clean rerun and closeout of the
existing Phase 4C packaged-runtime proof from the frozen correction checkpoint.

## Current checkpoint

- Branch: `main`
- Authoritative HEAD: `19946c7a2f07844bc15aab2380837f8f57be8e92`
- Commit: `fix: make isolated npm lockfile portable`
- Expected worktree item:
  - `?? packages/project/tests/project-packed-runtime.test.mjs`
- Public release graph: 13 packages at `0.1.0-alpha.2`
- `@wizloft/harness-project`: still private at `0.1.0-alpha.2`
- Phase 4C: not closed
- Phase 5: not started

## Reading order for a new Coordinator

1. Root `AGENTS.md` and repository workflow rules.
2. `docs/decisions/0012-public-package-release-contract.md`.
3. `docs/decisions/0013-project-onboarding-and-discovery.md`.
4. `docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`.
5. This package's `docs/handoff/CURRENT-HANDOFF.md`.
6. The exact candidate file `packages/project/tests/project-packed-runtime.test.mjs`.
7. Git status, HEAD, diff, and test baseline.

## First OMP Coordinator actions

```bash
git status --short --branch
git rev-parse HEAD
git diff --cached --name-status
pnpm --filter @wizloft/harness-project build
```

Then run the focused Phase 4C proof. Do not modify production code if the proof exposes a real
runtime or packaging defect. Stop and open an owner decision or a bounded correction packet.

## Definition of a successful handoff

A new Coordinator should be able to answer all of these before routing a Worker:

- What is the authoritative baseline SHA?
- Which plan and ADRs own the work?
- Which files are allowed to change?
- Is the packet proof-only, implementation, correction, release, or publication?
- What condition forces an immediate stop?
- Who holds the write lease?
- Is an independent Auditor required?
