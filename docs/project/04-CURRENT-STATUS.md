# Current Status

Snapshot date: **2026-08-25**

## Repository and release state

| Field | Current value |
|---|---|
| Harness baseline | clean checked-out `main`; resolve HEAD, index, and worktree live before each packet |
| Alpha.4 source `R` / frozen provenance | `f662a454216d90c61c443c55a83165618d5e9843` / tree `68d5bb37d506b49301e2d3c433979b0c7fa64f2f` |
| Frozen artifact manifest | SHA-256 `553c0e4ee510b3087360b0e2e7910aa07adf6c8140b4fbff798049e703a482bd` |
| Git tag | annotated `harness-v0.1.0-alpha.4` object `7c70e518458eb4923d42353dcba7d2069adb7b04`, peeled to `R`, remote-pushed |
| Public prerelease graph | fourteen packages at lockstep `0.1.0-alpha.4` on `candidate` and `next` |
| `latest` | thirteen packages remain `0.1.0-alpha.2`; `@wizloft/harness-project@0.1.0-alpha.3` |
| Alpha.3 history | immutable partial publication; do not repair, move, delete, unpublish, or retag |
| Phase 6 P2 | A4-10 through A4-13 independently accepted. CLI `c5e011383fd6b056d271517580b8cfd7d59bb7c3` is local/unpushed; Meldmark `3f4ab1a6b29b90e82112ffbf64a853183cb0de30` is local with no remote |
| OMP Stage D | A4-14 temp-only no-remote fixture passed; `.omp/` ignored/local-only; committed-profile discoverability open |
| Active plan | section 30 steps 1–14 complete; this docs reconciliation is a candidate. Independent audit is required for commit eligibility; the candidate itself authorizes no commit or push. Push remains separately authorized. External pushes and broader readiness remain separate |

## Current operating objective

Use clean checked-out `main` as the operational baseline. Before routing a packet, record the live
`git rev-parse HEAD` result and verify the index and worktree are clean. A documentation-embedded
SHA must not be treated as the expected current HEAD.

Preserve alpha.3 as immutable partial history. Do not treat the proven alpha.4 `candidate`/`next`
graph, local CLI/Meldmark commits, or temp-only Stage D as authorization to push externals, commit
OMP profiles, or close broader readiness. This status record authorizes none of those actions.

Authority remains `docs/decisions/0012-public-package-release-contract.md` and the contract record
in `docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`.

## Historical correction checkpoint

The Phase 4C correction checkpoint below is historical. It is not the current baseline.

- HEAD then: `19946c7a2f07844bc15aab2380837f8f57be8e92`
- Public graph then: 13 packages at `0.1.0-alpha.2`
- Project package then: private `0.1.0-alpha.2`
- Recorded verification then: project tests 153/153; Phase 4A 11/11; Phase 4B packed closure green;
  `pnpm verify` green; `pnpm release:check` 13 packages at `0.1.0-alpha.2`

## Stop condition

Stop and request an owner decision if the next requested packet would:

- publish, promote, tag, push, or mutate the registry without a new exact release packet;
- retag, unpublish, or otherwise mutate alpha.3 or the frozen alpha.4 graph;
- push Wizloft CLI or Meldmark, or configure a Meldmark remote, without repository-specific
  authority and live ref preflight;
- commit/install OMP profiles or treat temp-only Stage D as committed-profile discoverability;
- commit or push this documentation reconciliation without a later exact packet.

## Alpha.4 durable recovery facts

The selected coherent fourteen-package recovery target `0.1.0-alpha.4` is implemented, frozen,
published on `candidate` and `next`, Git-proven, and independently proved through A4-10 through
A4-14. It is not a `latest` promotion.

The partial alpha.3 public state remains authoritative history. The published alpha.3 project
artifact never became alpha.4 recovery evidence and must not be repaired, moved, deleted,
unpublished, or retagged.

Frozen identities:

- source `R` / tree: `f662a454216d90c61c443c55a83165618d5e9843` /
  `68d5bb37d506b49301e2d3c433979b0c7fa64f2f`
- artifact-manifest SHA-256:
  `553c0e4ee510b3087360b0e2e7910aa07adf6c8140b4fbff798049e703a482bd`
- tag object: `7c70e518458eb4923d42353dcba7d2069adb7b04`

Downstream proof is complete as proof, with these durability boundaries:

- A4-11 CLI commit `c5e011383fd6b056d271517580b8cfd7d59bb7c3` is not pushed;
- A4-13 Meldmark commit `3f4ab1a6b29b90e82112ffbf64a853183cb0de30` has no remote and is not pushed;
- A4-14 kept `.omp/` ignored/local-only.

Registry, Git, external-repository, and OMP actions require later exact Owner authorization; this
status record authorizes none.
