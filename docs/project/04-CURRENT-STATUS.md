# Current Status

Snapshot date: **2026-09-06**

## Repository and release state

| Field | Current value |
|---|---|
| Harness baseline | coherent recovery release source commit `9ed8da5892878f4cff9ac5a33b98b406eda5ce2a`; resolve live refs before each new packet |
| Alpha.3 source / tree | `9ed8da5892878f4cff9ac5a33b98b406eda5ce2a` / `f9446386633e56bc5a0e2952f591305eac2c29b6` |
| Frozen artifact manifest | SHA-256 `f19e07e15cf4c0e6ed3dffd7576476aad9d02806b6a55688ededa1fd89b53f53` |
| Git tag | annotated `harness-v0.1.2-alpha.3` object `b9da397199b93d088e7c29c7a56151fb8a974fa0`, peeled to the source commit and remote-pushed |
| Public prerelease graph | fourteen packages at lockstep `0.1.2-alpha.3` on `candidate` and `next`; exact registry bytes, npm signatures, and SLSA provenance independently verified |
| Stable `0.2.0` graph | all four exact versions published; `@wizloft/harness-file-providers` was interactively bootstrapped, and the other three were OIDC-published by successful run `34020713589`; exact bytes, npm signatures, SLSA provenance where applicable, and a credential-free registry consumer were verified |
| Stable identities | source tag `harness-v0.2.0` → `489413f02f6dac5b7371faf54d23346837e954dd`; resume tag `harness-v0.2.0-resume.1` → `bb4c763d987e4050c5194dd807246cb694e3ac76`; retained workflow manifest SHA-256 `c351ccd700c6908396f1368c496d2bb952ac2c4b8f93701c657d32436382e38f` |
| `latest` / `next` | promotion is pending npm interactive step-up; three established names retain prerelease defaults, while npm assigned new file-providers `latest` to `0.2.0`; all four `candidate` tags point to `0.2.0` |
| Failed release identities | alpha.1 is immutable failed exact-byte history; protected alpha.2 remains unpublished and must never be dispatched |
| 2026-09-02 npm incident recovery | five malicious `0.1.1-alpha.3` artifacts remain deprecated; zero tags resolve to them; broad token revoked; all fourteen trusted publishers active; all fourteen package access policies disallow bypass-2FA tokens |
| Boilerplate adoption | exact `0.1.2-alpha.3` merged as `66af9e6617a44e60f511c2bf6e692057ed0ec996`; validation Evidence and verified Memory write passed; exact-version re-init is zero-operation |
| Phase 6 P2 | A4-10 through A4-13 independently accepted. CLI `c5e011383fd6b056d271517580b8cfd7d59bb7c3` is local/unpushed; Meldmark `3f4ab1a6b29b90e82112ffbf64a853183cb0de30` is local with no remote |
| OMP Stage D | A4-14 temp-only no-remote fixture passed; `.omp/` ignored/local-only; committed-profile discoverability open |
| Active plans | complete stable tag promotion and new-package access hardening in the owner's interactive npm session, adopt exact `0.2.0` in first-party consumers, then execute legacy retirement |

## Current operating objective

All four stable `0.2.0` packages are public on `candidate`. Run `34020713589` passed exact
workflow-equivalent freeze, verified the bootstrap artifact, published kernel, harness, and project
through Trusted Publishing, proved a credential-free registry consumer, and cryptographically
reverified all four packages. The four tarballs exactly match the authoritative identities frozen
before the first registry mutation. SLSA provenance for the three OIDC-published packages resolves
to `publish-stable.yml`, protected tag `harness-v0.2.0-resume.1`, and commit
`bb4c763d987e4050c5194dd807246cb694e3ac76`.

Stable promotion is the active owner-interactive gate. The isolated npm session requires a fresh
step-up authentication before moving `latest` and `next` coherently. The owner must also confirm the
new file-provider package requires two-factor authentication and disallows bypass-2FA tokens.
First-party adoption and legacy retirement remain blocked until promotion and that access check
complete.

The npm supply-chain recovery is closed. Do not republish, retag, unpublish, regenerate the frozen
packet, move `latest`, or use the retired alpha.2 tag without a new exact release packet and
separate explicit owner authorization.

Authority remains `docs/decisions/0012-public-package-release-contract.md`,
`docs/decisions/0014-consolidated-public-package-topology.md`, the recovery record in
`docs/plans/active/0004-npm-supply-chain-recovery.md`, the consolidation record in
`docs/plans/active/0005-package-topology-consolidation.md`, the stable release plan in
`docs/plans/active/0007-stable-0.2.0-release.md`, and the broader contract record in
`docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`.

## Historical correction checkpoint

The Phase 4C correction checkpoint below is historical. It is not the current baseline.

- HEAD then: `19946c7a2f07844bc15aab2380837f8f57be8e92`
- Public graph then: 13 packages at `0.1.0-alpha.2`
- Project package then: private `0.1.0-alpha.2`
- Recorded verification then: project tests 153/153; Phase 4A 11/11; Phase 4B packed closure green;
  `pnpm verify` green; `pnpm release:check` 13 packages at `0.1.0-alpha.2`

## Stop condition

Stop and request an owner decision if the next requested packet would:

- publish, promote, tag, or mutate release artifacts without a new exact release packet;
- retag, unpublish, or revise the immutable alpha.1/alpha.3 registry records or dispatch alpha.2;
- move `latest` without a separate explicit owner decision;
- push Wizloft CLI or Meldmark, or configure a Meldmark remote, without repository-specific
  authority and live ref preflight;
- commit/install OMP profiles or treat temp-only Stage D as committed-profile discoverability.

## Superseded alpha.4 recovery baseline

Before the September incident recovery release, `0.1.0-alpha.4` was the coherent fourteen-package
graph on `candidate` and `next`, Git-proven and independently exercised through A4-10 through A4-14.
It was never promoted to `latest`. The accepted `0.1.2-alpha.3` release above now supersedes it on
the supported prerelease channels.

Earlier partial alpha.3 publication references in this historical section mean package version
`0.1.0-alpha.3`, not the coherent recovery version `0.1.2-alpha.3`. Immutable historical artifacts
must not be repaired, moved, deleted, unpublished, or retagged.

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

The 2026-09-02 incident containment is recorded separately in
`docs/security/2026-09-02-npm-supply-chain-containment.md`. It authorizes no recovery publication.
