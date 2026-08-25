# Current Handoff — Alpha.4 Durable Proof; Push and Profile Boundaries Open

## Operational identity

- Classification: operational handoff with completed alpha.4 recovery proof and remaining
  push/profile/docs-closure boundaries
- Repository: `wizloft-harness`
- Operational baseline: clean checked-out `main` with HEAD, index, and worktree resolved live
- Live preflight: record `git rev-parse HEAD`, then require an empty index and worktree before
  routing any new packet; do not compare against a documentation-embedded expected HEAD
- Owning plan: `docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`
- Owning release ADR: `docs/decisions/0012-public-package-release-contract.md`

## Durable facts

- Phase 4C remains valid historical local proof of fourteen packed artifacts.
- Phase 5 remains valid local implementation evidence for a release-ready fourteen-package
  `0.1.0-alpha.3` candidate. That graph was never a coherent public alpha.3 release.
- Alpha.3 public history is immutable and is not repaired: `@wizloft/harness-project@0.1.0-alpha.3`
  remains `latest` for the project package; the other thirteen packages remain `latest`
  `0.1.0-alpha.2`.
- Alpha.4 source commit `R` is `f662a454216d90c61c443c55a83165618d5e9843` (tree
  `68d5bb37d506b49301e2d3c433979b0c7fa64f2f`).
- Frozen artifact-manifest SHA-256 is
  `553c0e4ee510b3087360b0e2e7910aa07adf6c8140b4fbff798049e703a482bd`.
- Annotated tag `harness-v0.1.0-alpha.4` object `7c70e518458eb4923d42353dcba7d2069adb7b04` is
  remote-pushed and peels to `R`.
- All fourteen packages are `0.1.0-alpha.4` on both `candidate` and `next`.
- Ordered downstream proofs A4-10 through A4-14 are independently accepted:
  - A4-10 exact-registry consumer; evidence seal SHA-256
    `4a4ebcfa8178c7b2775c7fcfcaefd24cd701ac0102f7eafffa1e77c076ce11ee`
  - A4-11 Wizloft CLI exact-pin regression; local commit
    `c5e011383fd6b056d271517580b8cfd7d59bb7c3` on `rewrite/typescript` (parent
    `b2b2af52df2bd337a341888c2512e74ac2b64c0c`); not pushed
  - A4-12 released CLEAN/EXISTING smokes; evidence seal SHA-256
    `f992c5ebd45f52caee460583e0a48d3e24df1827389e37c1ecaffdb955f744c6`
  - A4-13 Meldmark released init/target validation; local commit
    `3f4ab1a6b29b90e82112ffbf64a853183cb0de30` on `main` (parent
    `a35cf34a2e2418eaacda6cef39218235d50566b8`); no remote, not pushed
  - A4-14 OMP Stage D temp-only no-remote fixture passed; lineage
    `f662a454216d90c61c443c55a83165618d5e9843` → `431efa300230663a565fd23cc897a39e01a2a29b` →
    `21ca6a67e8c73546eef5f8f91c4a7380a8066ef8`; `.omp/` ignored/local-only
- Plan section 30 steps 1–14 are complete. This docs reconciliation is a candidate. Independent
  audit is required for commit eligibility; the candidate itself authorizes no commit or push.
  Push remains separately authorized.

## Authority boundary

1. Independent audit is required for this docs-only candidate's commit eligibility (historical
   preservation, exact identities, non-overclaiming, and allowlist scope). The candidate itself
   authorizes no commit or push.
2. Harness docs commit requires a later exact Owner packet; push remains separately authorized.
3. Do not push Wizloft CLI or Meldmark, configure a Meldmark remote, or commit/install OMP profiles
   without separate repository-specific authority.
4. Do not publish, retag, unpublish, or mutate alpha.3 or the frozen alpha.4 graph.

## Forbidden without separate authority

- further npm publication, access mutation, dist-tag mutation, unpublish, or deprecate
- retagging or rewriting pushed Harness provenance
- Wizloft CLI or Meldmark push, and any Meldmark remote configuration
- OMP profile commit/install or broader readiness closeout
- Harness docs commit or push of this reconciliation

## Stop gates

Stop immediately on baseline or allowlist drift, any attempt to infer external remote adoption,
any product/architecture/release decision, or any attempt to turn temp-only Stage D evidence into
authority for source, registry, committed-profile, or broader-readiness action.

## Expected working state

Start from clean checked-out `main`, resolving HEAD and status live. Any future candidate requires
its own exact packet, frozen diff, and independent Auditor review.
