# Start Here

## Current mission

The selected alpha.4 coherent fourteen-package recovery is proven. All fourteen packages are
`0.1.0-alpha.4` on `candidate` and `next`, Git provenance matches frozen artifacts, and ordered
downstream proofs A4-10 through A4-14 are independently accepted. Alpha.3 remains immutable
partial history and must not be repaired. This docs candidate requires independent audit for
commit eligibility and authorizes no commit or push; push remains separately authorized.
External CLI/Meldmark pushes, committed OMP-profile discoverability, and broader readiness
remain separately authorized.

## Current checkpoint

- Operational baseline: clean checked-out `main` with HEAD, index, and worktree resolved live
- Baseline verification: capture `git rev-parse HEAD` and verify index/worktree status live; do not
  use a documentation-embedded SHA as the expected current HEAD
- Alpha.4 source `R` / frozen provenance: `f662a454216d90c61c443c55a83165618d5e9843` (tree
  `68d5bb37d506b49301e2d3c433979b0c7fa64f2f`)
- Frozen artifact-manifest SHA-256:
  `553c0e4ee510b3087360b0e2e7910aa07adf6c8140b4fbff798049e703a482bd`
- Git tag: annotated `harness-v0.1.0-alpha.4` object `7c70e518458eb4923d42353dcba7d2069adb7b04`,
  remote-pushed, peeled to `R`
- Public prerelease graph: fourteen packages at `0.1.0-alpha.4` on `candidate` and `next`
- `latest`: thirteen packages `0.1.0-alpha.2`; `@wizloft/harness-project@0.1.0-alpha.3`
- Phase 6 P2 and Stage D: independently accepted as proof; CLI/Meldmark commits are local-only;
  Stage D was temp-only with `.omp/` ignored
- Boundary: no publish, retag, unpublish, external push, docs commit/push, or committed-profile
  action without a new exact Owner packet

## Reading order for a new Coordinator

1. Root `AGENTS.md` and repository workflow rules.
2. `docs/decisions/0012-public-package-release-contract.md`.
3. `docs/decisions/0013-project-onboarding-and-discovery.md`.
4. `docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`.
5. This repository's `docs/handoff/CURRENT-HANDOFF.md`.
6. Live Git status, HEAD, and index. Confirm checked-out `main` is clean before routing work.

Do not treat `packages/project/tests/project-packed-runtime.test.mjs` as a live WIP candidate. That
proof is committed.

## First OMP Coordinator actions

```bash
git status --short --branch
git rev-parse HEAD
git diff --cached --name-status
```

Once live preflight confirms clean checked-out `main`, preserve alpha.3 history and the proven
alpha.4 graph. Do not publish, promote, tag, push, push external consumers, or change local OMP
state without a separate exact Owner packet. Local CLI/Meldmark commits and temp-only Stage D are
not remote adoption or committed-profile discoverability.

## Definition of a successful handoff

A new Coordinator should be able to answer all of these before routing a Worker:

- What live HEAD did preflight resolve for the clean checked-out `main` baseline?
- Which plan and ADRs own the work?
- Which files are allowed to change?
- Is the packet proof-only, implementation, correction, release, or publication?
- What condition forces an immediate stop?
- Who holds the write lease?
- Is an independent Auditor required?
