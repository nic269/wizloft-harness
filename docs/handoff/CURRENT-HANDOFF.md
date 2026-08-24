# Current Handoff — Alpha.3 Public Release Incomplete

## Operational identity

- Classification: operational handoff with reopened active-plan release gates
- Repository: `wizloft-harness`
- Operational baseline: clean checked-out `main`
- Live preflight: record `git rev-parse HEAD`, then require an empty index and worktree before
  routing any new packet; do not compare against a documentation-embedded expected HEAD
- Owning plan: `docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`
- Owning release ADR: `docs/decisions/0012-public-package-release-contract.md`

## Durable facts

- Phase 4C remains valid historical local proof of fourteen packed artifacts.
- Phase 5 remains valid local implementation evidence for a release-ready fourteen-package
  `0.1.0-alpha.3` candidate.
- Public registry state is incomplete: only `@wizloft/harness-project@0.1.0-alpha.3` is published;
  the other Harness packages remain published at `0.1.0-alpha.2`.
- No coherent fourteen-package alpha.3 `candidate` or `next` graph is established.
- Prior publication/promotion and Git-to-binary records do not prove the actual current public
  graph and cannot close publication, promotion, or Git provenance.
- Phase 6 P2 external-consumer results, Meldmark readiness closure, and the temp-only OMP Stage D
  exercise cannot be treated as completion evidence because they depended on the false coherent
  alpha.3-publication premise.
- The active plan is open for immutable-partial-publication recovery, proof of all fourteen exact
  artifacts, registry proof, Git provenance, Phase 6 external consumers, and Stage D.

## Next action

1. Preserve Phase 4C packed proof and Phase 5 implementation as local evidence, not public-release
   proof.
2. Obtain a new Owner decision and exact packet before any publish, promotion, tag, push, Phase 6
   external-consumer work, or local OMP action.
3. Under later release authority, verify the already-published project artifact is byte/provenance-
   identical to the frozen candidate. Stop for an Owner decision and a new coherent version on any
   mismatch; otherwise publish the remaining thirteen exact artifacts, prove all fourteen in the
   registry plus matching Git provenance, and obtain independent audit.
4. Only after that proof may Phase 6 external consumers and Stage D run as open plan gates.

## Forbidden without separate authority

- further npm publication, access mutation, dist-tag mutation, unpublish, or deprecate
- retagging or rewriting pushed Harness provenance
- Wizloft CLI or Meldmark push
- OMP profile commit/install or broader readiness closeout

## Stop gates

Stop immediately on baseline or allowlist drift, any attempt to infer external remote adoption,
any product/architecture/release decision, or any attempt to turn temp-only Stage D evidence into
authority for source, registry, committed-profile, or broader-readiness action.

## Expected working state

Start from clean checked-out `main`, resolving HEAD and status live. Any future candidate requires
its own exact packet, frozen diff, and independent Auditor review.

## Selected alpha.4 recovery authority

The alpha.3 recovery proposal in the preceding next-action record is superseded.
`0.1.0-alpha.4` is the selected coherent fourteen-package target, pending local implementation and
proof; it is not implemented or published. Preserve the partial public truth that only
`@wizloft/harness-project@0.1.0-alpha.3` is published and the other thirteen packages remain at
alpha.2. The alpha.3 project artifact is never alpha.4 recovery evidence: do not repair, move,
delete, unpublish, or retag alpha.3, and do not rewrite its historical phases.

The next release-work packet is the packed-proof retention and SHA-256 tooling correction; local
alpha.4 identity implementation follows in its own packet. The corrected proof must use one build
and one pack, retain an external artifact directory, and write its SHA-256 completion manifest
last. A separately audited freeze makes the candidate immutable; every later comparison and
publication must use those exact fourteen artifacts without rebuilding or repacking. Publication
uses the seven release-contract dependency-derived layers.

Route separate exact packets, in order, for: this authority addendum and audit; packed-proof
tooling correction; alpha.4 identity implementation plus audit/commit `R`; one-build/one-pack
artifact freeze plus audit; local annotated-tag policy approval; exact frozen candidate
publication; exact registry bytes/behavior proof; fourteen-package `next` promotion plus
post-promotion proof; Git push/Git-to-binary audit; exact-registry consumer proof; CLI exact-pin
regression; released CLEAN/EXISTING smokes; Meldmark; OMP Stage D; and formal docs closure plus a
separately authorized docs push. Registry, Git, external repository, and OMP actions each require
later exact Owner authorization. This handoff records authority only and authorizes no external
action.
