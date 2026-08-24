# Readiness Checklist for Other Projects

Publication, promotion/Git provenance, Phase 6 P2 proof, all ten Meldmark readiness gates, the two
local external commits, temp-only OMP Stage D proof, and the active plan's substantive/formal scope
are complete. External pushes, committed-profile discoverability, and broader adoption remain
separate non-plan gates.

## Release readiness

- [x] Phase 4C real packaged-runtime proof is committed and green.
- [x] Fourteen-package `0.1.0-alpha.3` release graph is implemented.
- [x] All packed manifests use exact versions and no local protocols.
- [x] Exact-minimum Node proof is recorded as a current release-gate result.
- [x] Publication is explicitly authorized and completed.
- [x] Clean registry consumer installs the exact fourteen-package graph.
- [x] `@next` consumer passes through the replacement replay proof.

## Initializer readiness

In-repo Phase 4A/4C proofs are complete. These are not published-consumer proofs.

- [x] CLEAN repository initialization passes.
- [x] EXISTING repository initialization preserves user bytes.
- [x] CONFLICT preflight writes nothing.
- [x] Marker is written last.
- [x] Generated lockfile is portable to a real clone.
- [x] Exact `npm --prefix .wizloft/harness ci ...` restores a clone.
- [x] Re-init is zero-diff.
- [x] Upgrade failures preserve the old marker.
- [x] Agent bootstrap blocks remain single and bounded.

## Runtime readiness

- [x] Generated wrapper works without a package source after materialization.
- [x] Authority resolves project and Harness subjects.
- [x] Context resolves deterministic default sources.
- [x] Health validation passes.
- [x] Memory and Events use project-local ignored state.
- [x] Project-local package resolution never escapes to host/source workspaces.

## Consumer readiness

- [x] Wizloft CLI exact pins upgraded and regression tested; candidate committed locally.
- [x] Fresh-project smoke completed.
- [x] Existing-project smoke completed.
- [x] Meldmark initialized and target-validated; candidate committed locally.
- [x] OMP + Orca temp-only dogfood packet completed with independent audit.

## Documentation readiness

- [x] Project overview and architecture boundary are current.
- [x] Current status defines clean checked-out `main` as the operational baseline and requires live
  HEAD/index/worktree verification.
- [x] Roadmap separates implementation, release, and publication.
- [x] Work-packet templates are installed.
- [ ] OMP agent profiles are installed and discoverable in a committed tree; temp-only Stage D
  deliberately kept `.omp/` ignored/local-only.
- [x] Orca permission/worktree settings are documented.
- [x] A new Coordinator can continue without conversation history.

## Operational readiness

- [x] Only a Worker may write physical project artifacts.
- [x] Coordinator has no edit/write tool surface.
- [x] Auditor is independent and read-only.
- [x] Exact baseline, allowlist, lease, and stop gates exist for every write packet.
- [x] High-risk changes are audited against a frozen snapshot.
- [x] Owner decisions are requested instead of inferred.
