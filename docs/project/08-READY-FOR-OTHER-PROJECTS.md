# Readiness Checklist for Other Projects

## Release readiness

- [ ] Phase 4C real packaged-runtime proof is committed and green.
- [ ] Fourteen-package `0.1.0-alpha.3` release graph is implemented.
- [ ] All packed manifests use exact versions and no local protocols.
- [ ] Exact-minimum Node proof passes.
- [ ] Publication is explicitly authorized and completed.
- [ ] Clean registry consumer installs the exact fourteen-package graph.
- [ ] `@next` consumer passes.

## Initializer readiness

- [ ] CLEAN repository initialization passes.
- [ ] EXISTING repository initialization preserves user bytes.
- [ ] CONFLICT preflight writes nothing.
- [ ] Marker is written last.
- [ ] Generated lockfile is portable to a real clone.
- [ ] Exact `npm --prefix .wizloft/harness ci ...` restores a clone.
- [ ] Re-init is zero-diff.
- [ ] Upgrade failures preserve the old marker.
- [ ] Agent bootstrap blocks remain single and bounded.

## Runtime readiness

- [ ] Generated wrapper works without a package source after materialization.
- [ ] Authority resolves project and Harness subjects.
- [ ] Context resolves deterministic default sources.
- [ ] Health validation passes.
- [ ] Memory and Events use project-local ignored state.
- [ ] Project-local package resolution never escapes to host/source workspaces.

## Consumer readiness

- [ ] Wizloft CLI exact pins upgraded and regression tested.
- [ ] Fresh-project smoke completed.
- [ ] Existing-project smoke completed.
- [ ] Meldmark initialized from the released package.
- [ ] OMP + Orca dogfood packet completed.

## Documentation readiness

- [ ] Project overview and architecture boundary are current.
- [ ] Current status names the authoritative HEAD and active work.
- [ ] Roadmap separates implementation, release, and publication.
- [ ] Work-packet templates are installed.
- [ ] OMP agent profiles are installed and discoverable.
- [ ] Orca permission/worktree settings are documented.
- [ ] A new Coordinator can continue without conversation history.

## Operational readiness

- [ ] Only a Worker may write physical project artifacts.
- [ ] Coordinator has no edit/write tool surface.
- [ ] Auditor is independent and read-only.
- [ ] Exact baseline, allowlist, lease, and stop gates exist for every write packet.
- [ ] High-risk changes are audited against a frozen snapshot.
- [ ] Owner decisions are requested instead of inferred.
