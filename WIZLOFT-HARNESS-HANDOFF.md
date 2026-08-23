# Wizloft Harness Handoff Summary

## Product

Wizloft Harness is an agent-agnostic repository control plane. OMP/Codex/Grok perform reasoning and
execution; Orca owns outer worktrees and review UX; Harness owns project identity, Authority,
Context, Memory, Validation, Evidence/Events, and onboarding.

## Current state

- HEAD: `19946c7a2f07844bc15aab2380837f8f57be8e92`
- Public graph: 13 packages at `0.1.0-alpha.2`
- Project package: private alpha.2
- Current WIP: untracked `packages/project/tests/project-packed-runtime.test.mjs`
- Immediate goal: clean Phase 4C packaged-runtime rerun
- Phase 5: not started

## Completed milestones

- alpha.2 coherent public release;
- Wizloft CLI TypeScript dogfood;
- safe planner and filesystem writer;
- generated project runtime and health validation;
- full initializer with marker-last and clone recovery;
- repository acceptance matrix;
- packed fourteen-artifact closure;
- ESM-resolution correction;
- portable npm lockfile correction.

## Next sequence

1. Close Phase 4C proof.
2. Transition to fourteen-package `0.1.0-alpha.3` graph.
3. Separately authorize and perform publication.
4. Prove clean registry consumers.
5. Upgrade Wizloft CLI pins.
6. Smoke fresh/existing repositories.
7. Initialize Meldmark.
8. Dogfood OMP + Orca team workflow.
9. Begin scope-integrity only after that evidence.

## Team roles

- Coordinator: read-only routing and decisions.
- Worker: sole physical writer with exact lease/allowlist.
- Auditor: independent read-only review of frozen snapshots.

Use the detailed docs and templates in this package as the operating contract.
