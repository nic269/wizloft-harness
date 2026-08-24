# Wizloft Harness Handoff Summary

## Product

Wizloft Harness is an agent-agnostic repository control plane. OMP/Codex/Grok perform reasoning and
execution; Orca owns outer worktrees and review UX; Harness owns project identity, Authority,
Context, Memory, Validation, Evidence/Events, and onboarding.

## Current state

- Operational baseline: clean checked-out `main`; resolve HEAD and status live before new work
- Local candidate: fourteen packages implemented at lockstep `0.1.0-alpha.3`; Phase 4C packed proof
  and Phase 5 release-readiness review remain valid local evidence
- Public graph: incomplete; only `@wizloft/harness-project@0.1.0-alpha.3` is published, while the
  other Harness packages remain published at `0.1.0-alpha.2`
- Publication/promotion/G2B: no coherent fourteen-package alpha.3 public graph and no completed
  registry-promotion or Git-provenance proof
- Phase 6 P2 and OMP Stage D: open; prior work premised on a coherent alpha.3 release is not
  completion evidence
- Active alpha.3 plan: reopened for coherent publication, registry proof, Git provenance, Phase 6
  external consumers, and Stage D

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
- Phase 5 local fourteen-package `0.1.0-alpha.3` release-ready candidate.

The partial public release, prior external-consumer attempts, and temp-only OMP exercise do not
close publication, promotion, G2B, Phase 6, Meldmark readiness, Stage D, or the active plan.

## Next sequence

1. Preserve the completed Phase 4C packed-runtime proof and Phase 5 local release-ready candidate
   as local evidence only.
2. Obtain a new Owner decision and exact release packet before any publication, dist-tag, Git tag,
   push, or provenance action.
3. Under that later authority, prove the already-published project artifact is byte/provenance-
   identical to the frozen candidate. Stop for an Owner decision and new coherent version on any
   mismatch; otherwise publish the remaining thirteen exact artifacts and independently prove all
   fourteen in the registry plus matching Git provenance.
4. Only then run and audit Phase 6 external consumers and Stage D; keep external pushes and local
   OMP changes separately authorized.

## Team roles

- Coordinator: read-only routing and decisions.
- Worker: sole physical writer with exact lease/allowlist.
- Auditor: independent read-only review of frozen snapshots.

Use the detailed docs and templates in this package as the operating contract.
