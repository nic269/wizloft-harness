# Stable 0.2.0 Release

Status: Complete; stable graph published and promoted, consumers adopted, and legacy names retired.

## Outcome

Publish the first consolidated stable Harness graph as four exact `0.2.0` artifacts, make `latest`
resolve coherently only after registry proof, and retire the eleven replaced package names without
unpublishing history.

## Stable graph

1. `@wizloft/harness-kernel`
2. `@wizloft/harness`
3. `@wizloft/harness-file-providers`
4. `@wizloft/harness-project`

Dependency order is kernel → harness → file-providers → project. All internal dependencies are exact
`0.2.0` in packed manifests.

## Non-negotiable boundaries

- Keep `.github/workflows/publish.yml`, `npm-recovery`, and
  `scripts/publish-release-candidate.mjs` frozen to recovery `0.1.2-alpha.3`.
- Use a new workflow and a new GitHub environment for stable releases.
- Do not create `harness-v0.2.0` until the workflow, environment restriction, three existing npm
  trusted publishers, and authoritative Linux packet proof are ready. The protected tag cannot be
  updated or deleted.
- Do not use a bypass-2FA token, repository secret, dummy package version, or placeholder package.
  The sole provenance exception is the owner-authorized first publication of the exact frozen
  `@wizloft/harness-file-providers@0.2.0` tarball through a short-lived interactive 2FA session.
- Do not publish, unpublish, deprecate, or change dist-tags before the corresponding preflight.
- Publish only tarballs frozen by the credential-free verification job. Never regenerate a packet
  after the first registry mutation.

## Gate S1 — Stable source

- [x] Set the root release identity to `0.2.0` and synchronize the four public manifests plus eight
  runtime plugin versions.
- [x] Update ADR 0014, current status, migration documentation, and release tests.
- [x] Run `pnpm release:verify` from the reviewed release source.
- [x] Merge the release source through PR #15 as commit
  `fd50dba17e7ebff7b666b41d5fe51cdbdf13157f`.

## Gate S2 — Separate publication boundary

- [x] Add `.github/workflows/publish-stable.yml`, pinned to `0.2.0`, Node 24.20.0, npm
  11.19.0, pnpm 11.10.0, and pinned GitHub actions.
- [x] Add a stable-only publisher that requires GitHub Actions OIDC, rejects npm/repository tokens,
  verifies the annotated execution tag and exact authoritative artifact identities, publishes
  dependency-first to a temporary `candidate` tag, and cryptographically verifies registry bytes
  and provenance.
- [x] Keep verification/freeze and registry-consumer jobs credential-free; grant `id-token: write`
  only to the minimal publish job.
- [x] Create GitHub environment `npm-stable`, initially restricted to exact tag `harness-v0.2.0`.
- [x] Configure all four packages to trust repository `nic269/wizloft-harness`, workflow
  `publish-stable.yml`, environment `npm-stable`.

## Gate S3 — New package trust bootstrap

`@wizloft/harness-file-providers` did not exist, and npm required a package to exist before Trusted
Publishing could be configured. The owner authorized one bounded bootstrap: publish only that
package from the authoritative Linux packet through a short-lived interactive 2FA session, then
attach the same trusted publisher used by the other three packages.

- [x] Record the owner authorization for the exact-byte interactive first publication.
- [x] Create protected annotated tag `harness-v0.2.0` after the three existing trusted publishers and
  authoritative Linux packet were verified.
- [x] Publish only `@wizloft/harness-file-providers@0.2.0` from that packet to `candidate`.
- [x] Verify its registry tarball byte-for-byte and verify the npm registry signature.
- [x] Configure its trusted publisher to repository `nic269/wizloft-harness`, workflow
  `publish-stable.yml`, environment `npm-stable`.
- [ ] Confirm package access requires two-factor authentication and disallows bypass-2FA tokens.

The bootstrap artifact cannot carry GitHub Actions provenance. The workflow requires exact bytes,
registry signature, and `candidate` for that one existing artifact; every other artifact requires
provenance from `publish-stable.yml` and the protected execution tag.

## Gate S4 — Immutable packet and tag

- [x] Freeze the four canonical tarballs twice in the pinned Linux workflow-equivalent container and
  require byte-identical output.
- [x] Scan every shipped executable and JavaScript file using the retained incident IOC checks.
- [x] Record authoritative Linux source commit/tree, per-artifact SHA-1/SHA-256/SHA-512, sizes, and
  manifest SHA-256.
- [x] Reconfirm `0.2.0` was absent for all four package names immediately before tagging.
- [x] Restrict `npm-stable` to exact tag `harness-v0.2.0`.
- [x] Create and push protected annotated tag `harness-v0.2.0`.

Authoritative Linux packet A and B are byte-identical. Source commit
`489413f02f6dac5b7371faf54d23346837e954dd`, tree
`7c64eb95dbc7c4e32f2f29e46bf7b769c741836f`, manifest SHA-256
`a399e035c3c12ca8e8b79d53e11345a464ca4bc75fdce8e7d53e12369f099b17`. Protected annotated tag
object `c8c4b2bffe3a052d95e88a3fe25ba029daaeaa7f` peels to that commit.

### Superseded local packet evidence

The two Darwin packets recorded previously proved repeatability but are not publication inputs.
Stable publication must use the separately frozen Linux packet because the workflow runs on Linux.

- Source commit: `fd50dba17e7ebff7b666b41d5fe51cdbdf13157f`
- Source tree: `d9ed45f07efd7c9fb2e4fe2f1e04d5de674da4a3`
- Local manifest SHA-256:
  `19f441cc1af17d4b9f2f44c2e7c479fba3b011a943aa22a84dad075caacd17b5`

## Gate S5 — Publish and prove

Magnitude of registry mutation: four new immutable versions and no legacy-package mutation.

The first dispatch, run `34019988098` from `harness-v0.2.0`, stopped before its publish job. Its
signature audit installed the existing file-provider package normally, which attempted to resolve
the three intentionally unpublished exact `0.2.0` dependencies and ended with `ETARGET`. Registry
bytes were not mismatched and no additional package was published. The immutable stable tag remains
unchanged. Recovery uses protected annotated tag `harness-v0.2.0-resume.1`: the repaired verifier
extracts the already byte-verified bootstrap tarball into an isolated audit tree, pins all four
authoritative artifact identities, and still requires SLSA provenance for each OIDC publication.

- [x] Dispatch `publish-stable.yml` from `harness-v0.2.0`; run `34019988098` stopped safely before
  publication.
- [x] Review and merge the bounded resume repair as PR #18, restrict `npm-stable` to
  `harness-v0.2.0-resume.1`, create that protected annotated tag, and dispatch it.
- [x] Verify the existing file-provider bootstrap artifact, then publish the other three packages
  dependency-first from an exact reproduction of the authoritative packet to temporary `candidate`.
- [x] Verify each registry tarball byte-for-byte against the authoritative artifact identities.
- [x] Verify npm signatures for all four packages and SLSA provenance for the three OIDC-published
  packages resolves to `publish-stable.yml`, `refs/tags/harness-v0.2.0-resume.1`, and resume commit
  `bb4c763d987e4050c5194dd807246cb694e3ac76`.
- [x] Install `@wizloft/harness-project@0.2.0` in a credential-free repository and run inspect plus
  Validation.
- [x] Import every Harness and file-provider public subpath from the registry-installed graph.

Run `34020713589` passed freeze, exact bootstrap preflight, dependency-ordered OIDC publication,
credential-free registry consumer proof, and final cryptographic verification. Its retained manifest
SHA-256 is `c351ccd700c6908396f1368c496d2bb952ac2c4b8f93701c657d32436382e38f`.

## Gate S6 — Stable promotion

- [x] Complete the npm step-up challenges through the isolated short-lived interactive web-login
  session; no credential was stored in repository or CI configuration.
- [x] Re-verify all four exact versions and current tags before mutation.
- [x] Move `latest` and `next` for all four retained names to `0.2.0`.
- [x] Normalize the npm-created file-provider `latest` tag to the coherent final state.
- [x] Re-verify the coherent graph, log out, delete the isolated userconfig, and revoke the session
  credential.
- [x] Retain `candidate` on all four names as explicit stable publication evidence.

All four retained names now map `latest`, `next`, and `candidate` to exact `0.2.0`.

## Gate S7 — Consumer adoption and retirement

- [x] Update and verify first-party consumers using exact `0.2.0` before unqualified installs.
- [x] Execute `docs/plans/active/0006-legacy-package-retirement.md` only after adoption succeeds.
- [x] Record final tag, packet, provenance, consumer, and retirement evidence in current status.

## Stop conditions

Stop before registry mutation if any `0.2.0` exists with bytes different from the authoritative Linux
packet, any trusted publisher or GitHub environment identity differs, the frozen packet is not
repeatable, the bootstrap target is not exactly `@wizloft/harness-file-providers@0.2.0`, provenance
cannot be verified for an OIDC-published package, or a protected tag would need correction.
