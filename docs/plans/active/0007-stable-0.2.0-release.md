# Stable 0.2.0 Release

Status: Active; source and publication boundary preparation only.

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
- Do not create `harness-v0.2.0` until the workflow, environment restriction, all four npm trusted
  publishers, and exact-packet proof are ready. The protected tag cannot be updated or deleted.
- Do not use a bypass-2FA token, repository secret, dummy package version, placeholder package, or
  provenance-free stable artifact.
- Do not publish, unpublish, deprecate, or change dist-tags before the corresponding preflight.
- Publish only tarballs frozen by the credential-free verification job. Never regenerate a packet
  after the first registry mutation.

## Gate S1 — Stable source

- [ ] Set the root release identity to `0.2.0` and synchronize the four public manifests plus eight
  runtime plugin versions.
- [ ] Update ADR 0014, current status, migration documentation, and release tests.
- [ ] Run `pnpm release:verify` from the reviewed release source.
- [ ] Merge the release source through a pull request with a clean linear-history result.

## Gate S2 — Separate publication boundary

- [ ] Add `.github/workflows/publish-stable.yml`, pinned to `0.2.0`, exact tag
  `harness-v0.2.0`, Node 24.20.0, npm 11.19.0, pnpm 11.10.0, and pinned GitHub actions.
- [ ] Add a stable-only publisher that requires GitHub Actions OIDC, rejects npm/repository tokens,
  verifies the annotated tag and original artifact manifest, publishes dependency-first to a
  temporary `candidate` tag, and cryptographically verifies registry bytes and provenance.
- [ ] Keep verification/freeze and registry-consumer jobs credential-free; grant `id-token: write`
  only to the minimal publish job.
- [ ] Create GitHub environment `npm-stable` restricted to exact tag `harness-v0.2.0`.
- [ ] Configure the three existing packages to trust repository `nic269/wizloft-harness`, workflow
  `publish-stable.yml`, environment `npm-stable`.

## Gate S3 — New package trust bootstrap

`@wizloft/harness-file-providers` does not yet exist. npm currently requires a package to exist before
Trusted Publishing can be configured. The clean stable release therefore requires npm to
pre-provision the package name or otherwise enable its trusted publisher before first publication.

- [ ] Request or confirm npm-supported pre-provisioning for `@wizloft/harness-file-providers` under
  the `wizloft` scope without publishing a package version.
- [ ] Configure its trusted publisher to the same repository, workflow, and environment.
- [ ] Confirm package access requires two-factor authentication and disallows bypass-2FA tokens.

If npm cannot provide a supported pre-provisioning path, stop for an owner decision. Do not silently
replace this gate with a dummy version, temporary token, local publish, or provenance exception.

## Gate S4 — Immutable packet and tag

- [ ] Freeze the four canonical tarballs twice and require byte-identical output.
- [ ] Scan every shipped executable and JavaScript file using the retained incident IOC checks.
- [ ] Record source commit/tree, per-artifact SHA-1/SHA-256/SHA-512, sizes, and manifest SHA-256.
- [ ] Reconfirm `0.2.0` is absent for all four package names immediately before tagging.
- [ ] Restrict `npm-stable` to exact tag `harness-v0.2.0`.
- [ ] Create and push protected annotated tag `harness-v0.2.0` only after every preceding item is
  complete.

## Gate S5 — Publish and prove

Magnitude of registry mutation: four new immutable versions and no legacy-package mutation.

- [ ] Dispatch `publish-stable.yml` from `harness-v0.2.0` with the exact confirmation input.
- [ ] Publish dependency-first from the one frozen packet to temporary `candidate`.
- [ ] Verify each registry tarball byte-for-byte against that packet.
- [ ] Verify npm signatures and SLSA provenance resolve to `publish-stable.yml`,
  `refs/tags/harness-v0.2.0`, and the exact source commit.
- [ ] Install `@wizloft/harness-project@0.2.0` in a credential-free repository and run inspect plus
  Validation.
- [ ] Import every Harness and file-provider public subpath from the registry-installed graph.

## Gate S6 — Stable promotion

- [ ] Use an isolated short-lived interactive npm web-login session; never store it in repository or
  CI configuration.
- [ ] Re-verify all four exact versions and current tags before mutation.
- [ ] Move `latest` and `next` for all four retained names to `0.2.0` as one reviewed operation.
- [ ] For the new package, normalize any npm-created first-publication tag to the same final state.
- [ ] Re-verify the coherent graph, then log out, delete the isolated userconfig, and revoke the
  session credential.
- [ ] Keep `candidate` only if retained as explicit release evidence; otherwise remove it in the same
  reviewed session.

## Gate S7 — Consumer adoption and retirement

- [ ] Update and verify first-party consumers using exact `0.2.0` before unqualified installs.
- [ ] Execute `docs/plans/active/0006-legacy-package-retirement.md` only after adoption succeeds.
- [ ] Record final tag, packet, provenance, consumer, and retirement evidence in current status.

## Stop conditions

Stop before registry mutation if npm cannot establish trusted publishing for the new package without
a prior version, any `0.2.0` already exists with different bytes, any trusted publisher or GitHub
environment identity differs, the frozen packet is not repeatable, provenance cannot be verified, or
a protected tag would need correction.
