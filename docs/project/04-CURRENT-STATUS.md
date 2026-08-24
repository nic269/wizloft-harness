# Current Status

Snapshot date: **2026-08-25**

## Repository and release state

| Field | Current value |
|---|---|
| Harness baseline | clean checked-out `main`; resolve HEAD and status live before each packet |
| Local alpha.3 candidate | fourteen packages implemented at lockstep `0.1.0-alpha.3`; release-ready but unpublished as a coherent graph |
| Historical local proof | Phase 4C packed proof and Phase 5 release-readiness review complete |
| Public registry | incomplete: only `@wizloft/harness-project@0.1.0-alpha.3` is published; the other Harness packages remain at `0.1.0-alpha.2` |
| Candidate / dist-tags | no coherent fourteen-package alpha.3 `candidate` or `next` graph is proved |
| Git provenance | no completed Git-to-binary proof for a coherent alpha.3 release |
| Phase 6 P2 | open; prior results premised on coherent alpha.3 publication are not closure proof |
| Meldmark readiness | release-dependent gates open |
| OMP Stage D | open; prior temp-only attempt does not close the release-dependent gate |
| Active plan | open for publication, registry proof, Git provenance, Phase 6, and Stage D |

## Current operating objective

Use clean checked-out `main` as the operational baseline. Before routing a packet, record the live
`git rev-parse HEAD` result and verify the index and worktree are clean. A documentation-embedded
SHA must not be treated as the expected current HEAD.

The active alpha.3 plan remains open. A later separately authorized release must first prove the
already-published project artifact is byte/provenance-identical to the frozen candidate. A mismatch
stops for an Owner decision and new coherent version. If it matches, publish the remaining thirteen
exact artifacts and independently prove all fourteen in the registry plus matching Git provenance.
Only then may Phase 6 external consumers, the release-dependent Meldmark gates, and OMP Stage D run
toward closure.
This alpha.3 recovery instruction is retained as history and superseded by the selected alpha.4
sequence below.

The earlier temp-only OMP exercise used source provenance `bfbad5c`, a no-remote fixture, and an
ignored/local-only `.omp/` overlay. It made no Harness source or registry change. Preserve those
facts as historical scope boundaries, but do not treat the exercise as Stage D completion.

Authority remains `docs/decisions/0012-public-package-release-contract.md` and the open contract
record in `docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`.

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
- start Phase 6 external-consumer work before coherent registry and Git-provenance proof;
- push an external commit without repository-specific authority and live ref preflight;
- commit/install OMP profiles or run Stage D without its separate exact authority.

## Selected alpha.4 recovery authority

The selected coherent fourteen-package recovery target is `0.1.0-alpha.4`, pending local
implementation and proof. Alpha.4 is not implemented, packed, published, promoted, tagged, pushed,
or externally validated.

The partial alpha.3 public state above remains authoritative history. The published alpha.3 project
artifact never becomes alpha.4 recovery evidence and must not be repaired, moved, deleted,
unpublished, or retagged. Packed-proof retention and SHA-256 tooling correction precedes alpha.4
identity implementation in a separate packet. The corrected proof must use one build and one pack,
retain an external artifact directory, and write its SHA-256 completion manifest last. Independent
audit then freezes the candidate; later comparison, publication, and registry proof must use those
exact fourteen artifacts without rebuilding or repacking. Publication uses the seven
release-contract dependency-derived layers.

Separate exact packets are required for the authority addendum/audit; packed-proof correction;
alpha.4 identity implementation and audit/commit `R`; artifact freeze/audit; local annotated-tag
policy; candidate publication; exact registry proof; fourteen-package `next` promotion and proof;
Git push/Git-to-binary audit; Phase 6 exact-registry consumer, CLI, CLEAN/EXISTING, and Meldmark
proofs; OMP Stage D; and final documentation reconciliation and push. Registry, Git,
external-repository, and OMP actions require later exact Owner authorization; this status record
authorizes none.
