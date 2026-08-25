# Wizloft Harness Handoff Summary

## Product

Wizloft Harness is an agent-agnostic repository control plane. OMP/Codex/Grok perform reasoning and
execution; Orca owns outer worktrees and review UX; Harness owns project identity, Authority,
Context, Memory, Validation, Evidence/Events, and onboarding.

## Current state

- Operational baseline: clean checked-out `main`; resolve HEAD, index, and worktree live before new
  work
- Alpha.4 source `R` / frozen provenance: `f662a454216d90c61c443c55a83165618d5e9843` (tree
  `68d5bb37d506b49301e2d3c433979b0c7fa64f2f`)
- Frozen artifact manifest SHA-256:
  `553c0e4ee510b3087360b0e2e7910aa07adf6c8140b4fbff798049e703a482bd`
- Git tag: annotated `harness-v0.1.0-alpha.4` object `7c70e518458eb4923d42353dcba7d2069adb7b04`,
  peeled to `R`, remote-pushed
- Public prerelease graph: fourteen packages at `0.1.0-alpha.4` on `candidate` and `next`
- `latest`: thirteen packages remain `0.1.0-alpha.2`; `@wizloft/harness-project@0.1.0-alpha.3`
- Alpha.3 partial publication is immutable history and must not be repaired
- Phase 6 P2: A4-10 through A4-13 independently accepted. CLI commit
  `c5e011383fd6b056d271517580b8cfd7d59bb7c3` on `rewrite/typescript` is local and unpushed.
  Meldmark commit `3f4ab1a6b29b90e82112ffbf64a853183cb0de30` on `main` is local with no remote
- OMP Stage D: A4-14 temp-only no-remote fixture passed; `.omp/` ignored/local-only;
  committed-profile discoverability remains open
- Active plan: section 30 steps 1–14 complete; this docs reconciliation is a candidate.
  Independent audit is required for commit eligibility; the candidate itself authorizes no
  commit or push. Push remains separately authorized. External pushes and broader readiness
  remain separate

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
- Phase 5 local fourteen-package `0.1.0-alpha.3` release-ready candidate;
- immutable alpha.3 partial-publication history preserved;
- alpha.4 lockstep identity, freeze, `candidate`/`next` publication, and Git-to-binary provenance;
- ordered downstream proofs A4-10 through A4-14.

Local CLI/Meldmark commits and the temp-only Stage D fixture are durable proof, not remote
adoption or committed-profile discoverability.

## Next sequence

1. Independent audit is required before this docs-only candidate is commit-eligible. The
   candidate itself authorizes no commit or push.
2. Harness docs commit requires a later exact Owner packet; push remains separately authorized.
3. Wizloft CLI push of `c5e011383fd6b056d271517580b8cfd7d59bb7c3` and any Meldmark remote/push of
   `3f4ab1a6b29b90e82112ffbf64a853183cb0de30` each require their own repository-specific authority.
4. Committed OMP-profile discoverability and broader readiness remain separate Owner decisions.
5. Do not publish, retag, unpublish, or otherwise mutate alpha.3 or the frozen alpha.4 graph.

## Team roles

- Coordinator: read-only routing and decisions.
- Worker: sole physical writer with exact lease/allowlist.
- Auditor: independent read-only review of frozen snapshots.

Use the detailed docs and templates in this package as the operating contract.
