# Readiness Checklist for Other Projects

Completed Phase 4C/5 proof work is checked. Publication, registry proof, CLI regression,
fresh/existing consumer init, Meldmark, and OMP dogfood remain unchecked.

## Release readiness

- [x] Phase 4C real packaged-runtime proof is committed and green.
- [x] Fourteen-package `0.1.0-alpha.3` release graph is implemented.
- [x] All packed manifests use exact versions and no local protocols.
- [ ] Exact-minimum Node proof is recorded as a current release-gate result.
- [ ] Publication is explicitly authorized and completed.
- [ ] Clean registry consumer installs the exact fourteen-package graph.
- [ ] `@next` consumer passes.

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

- [ ] Wizloft CLI exact pins upgraded and regression tested.
- [ ] Fresh-project smoke completed.
- [ ] Existing-project smoke completed.
- [ ] Meldmark initialized from the released package.
- [ ] OMP + Orca dogfood packet completed.

## Documentation readiness

- [x] Project overview and architecture boundary are current.
- [x] Current status names the authoritative HEAD and active work.
- [x] Roadmap separates implementation, release, and publication.
- [x] Work-packet templates are installed.
- [ ] OMP agent profiles are installed and discoverable in a committed tree.
- [x] Orca permission/worktree settings are documented.
- [x] A new Coordinator can continue without conversation history.

## Operational readiness

- [x] Only a Worker may write physical project artifacts.
- [x] Coordinator has no edit/write tool surface.
- [x] Auditor is independent and read-only.
- [x] Exact baseline, allowlist, lease, and stop gates exist for every write packet.
- [x] High-risk changes are audited against a frozen snapshot.
- [x] Owner decisions are requested instead of inferred.
