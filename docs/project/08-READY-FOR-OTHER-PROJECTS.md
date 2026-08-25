# Readiness Checklist for Other Projects

The coherent alpha.4 `candidate`/`next` graph, Git provenance, Phase 6 P2 proofs, local
CLI/Meldmark commits, and temp-only Stage D proof are complete. External CLI/Meldmark pushes,
committed-profile discoverability, and broader adoption remain open. The candidate itself
authorizes neither docs commit nor push; docs push remains separately authorized.
Alpha.3 partial publication remains immutable history.

## Release readiness

- [x] Phase 4C real packaged-runtime proof is committed and green.
- [x] Fourteen-package `0.1.0-alpha.3` release graph was implemented locally. That version remains
  immutable partial public history and was not repaired.
- [x] All packed manifests use exact versions and no local protocols.
- [x] Exact-minimum Node proof is recorded as a current release-gate result.
- [x] All fourteen exact `0.1.0-alpha.4` artifacts are published as one coherent `candidate`/`next`
  graph. `latest` remains thirteen packages at `0.1.0-alpha.2` and
  `@wizloft/harness-project@0.1.0-alpha.3`.
- [x] Alpha.4 `candidate`/`next` dist-tags and Git-to-binary provenance are independently proved.
- [x] A clean registry consumer installs the exact fourteen-package alpha.4 graph.

## Initializer readiness

In-repo Phase 4A/4C proofs are complete. Released-consumer CLEAN/EXISTING smokes are also complete
under A4-12.

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

These are proof-complete. Local durable commits are not remote adoption.

- [x] Wizloft CLI exact pins are regression-tested against the coherent public alpha.4 graph and
  committed locally at `c5e011383fd6b056d271517580b8cfd7d59bb7c3` on `rewrite/typescript` (parent
  `b2b2af52df2bd337a341888c2512e74ac2b64c0c`); the commit is not pushed.
- [x] Fresh-project released CLEAN smoke is complete against alpha.4.
- [x] Existing-project released EXISTING smoke is complete against alpha.4.
- [x] Meldmark is initialized and target-validated against the coherent public alpha.4 graph and
  committed locally at `3f4ab1a6b29b90e82112ffbf64a853183cb0de30` on `main` (parent
  `a35cf34a2e2418eaacda6cef39218235d50566b8`); no remote, not pushed.
- [x] OMP Stage D passed as a temp-only no-remote fixture under independent audit. `.omp/` remained
  ignored/local-only.

## Documentation readiness

- [x] Project overview and architecture boundary are current.
- [x] Current status defines clean checked-out `main` as the operational baseline and requires live
  HEAD/index/worktree verification.
- [x] Roadmap separates implementation, release, and publication.
- [x] Work-packet templates are installed.
- [ ] OMP agent profiles are installed and discoverable in a committed tree; Stage D deliberately
  kept `.omp/` ignored/local-only.
- [x] Orca permission/worktree settings are documented.
- [x] A new Coordinator can continue without conversation history.

## Operational readiness

- [x] Only a Worker may write physical project artifacts.
- [x] Coordinator has no edit/write tool surface.
- [x] Auditor is independent and read-only.
- [x] Exact baseline, allowlist, lease, and stop gates exist for every write packet.
- [x] High-risk changes are audited against a frozen snapshot.
- [x] Owner decisions are requested instead of inferred.
