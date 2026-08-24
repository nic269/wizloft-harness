# Wizloft Harness Handoff Summary

## Product

Wizloft Harness is an agent-agnostic repository control plane. OMP/Codex/Grok perform reasoning and
execution; Orca owns outer worktrees and review UX; Harness owns project identity, Authority,
Context, Memory, Validation, Evidence/Events, and onboarding.

## Current state

- HEAD: `4b3d5b9d2aa7adb5274b644ce022ad5bbfaf9fa7`
- Public graph: 14 packages at `0.1.0-alpha.3`, all published under `candidate`
- Existing 13 packages: `latest=next=0.1.0-alpha.2`
- `@wizloft/harness-project`: accepted automatic `latest=0.1.0-alpha.3`; no `next`
- Immediate goal: do not start next promotion, Git tag/push, or Phase 6 without a new Owner packet
- Phase 4C: closed
- Phase 5: implemented
- Phase 6: not started

## Completed milestones

- alpha.2 coherent public release;
- Wizloft CLI TypeScript dogfood;
- safe planner and filesystem writer;
- generated project runtime and health validation;
- full initializer with marker-last and clone recovery;
- repository acceptance matrix;
- packed fourteen-artifact closure;
- ESM-resolution correction;
- portable npm lockfile correction;
- Phase 4C packaged-runtime proof;
- Phase 5 fourteen-package `0.1.0-alpha.3` release graph;
- candidate publication of all fourteen frozen alpha.3 artifacts.

## Next sequence

1. Separately authorize next promotion, Git tag/push, or Phase 6. None of these is authorized now.
2. Prove remaining external consumers only after Phase 6 authorization.
3. Upgrade Wizloft CLI pins.
4. Smoke fresh/existing repositories.
5. Initialize Meldmark.
6. Dogfood OMP + Orca team workflow.
7. Begin scope-integrity only after that evidence.

## Team roles

- Coordinator: read-only routing and decisions.
- Worker: sole physical writer with exact lease/allowlist.
- Auditor: independent read-only review of frozen snapshots.

Use the detailed docs and templates in this package as the operating contract.
