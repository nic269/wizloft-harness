# npm Supply-Chain Recovery

Status: Active; Owner selected `0.1.2-alpha.1`; publication remains gated.

## Objective

Restore a trustworthy, token-minimized publication path after the malicious
`0.1.1-alpha.3` artifacts recorded in
`docs/security/2026-09-02-npm-supply-chain-containment.md`.

## Completed containment

- [x] Preserve authoritative advisory, package-integrity, publish-time, and dist-tag evidence.
- [x] Deprecate the five malicious artifacts with their exact OSV identifiers.
- [x] Move every compromised `beta` or `alpha` tag to verified `0.1.0-alpha.4`.
- [x] Verify that zero tags in the fourteen-package graph resolve to `0.1.1-alpha.3`.
- [x] Sweep relevant local manifests, installed packages, npm cache, VS Code triggers, and common
  persistence locations with no incident hits.
- [x] Rebuild, verify, and pack alpha.4 in a credential-free, network-off OrbStack container.
- [x] Compare all fourteen rebuilt artifacts to registry alpha.4 content and npm integrity.
- [x] Add a Meldmark workspace-validation gate for coherent exact Harness versions and integrity.

## Gate R1 — Credential closure

- [ ] Sign in to npm interactively with 2FA.
- [ ] Revoke the broad `wizloft-release` granular token.
- [ ] Confirm the token list is empty or contains only separately justified read-only credentials.
- [ ] Confirm account 2FA and recovery methods from the npm account UI.
- [ ] Keep publication frozen until Gate R2 is implemented and reviewed.

The existing bypass-2FA token cannot perform its own account-governance deletion under npm's
August 2026 policy. Do not create another bypass token as a workaround.

## Gate R2 — Token-free publication boundary

Before configuring npm Trusted Publishing:

- [ ] Merge the reviewed manual `.github/workflows/publish.yml` workflow.
- [x] Keep dependency installation, verification, packed imports, and registry-consumer proof in
  jobs without `id-token: write`.
- [x] Limit the publication job to `contents: read`, `actions: read`, and `id-token: write`.
- [x] Pin the GitHub actions, Node `24.20.0`, npm `11.19.0`, pnpm `11.10.0`, and the release
  container image digest; disable dependency caching and lifecycle scripts.
- [x] Build, inspect, and freeze all fourteen tarballs before any registry write.
- [x] Publish dependency-first only from the downloaded and re-hashed frozen artifact set.
- [x] Protect `main` against direct/force/deletion changes and protect `harness-v*` tags against
  update/deletion.
- [ ] Register `nic269/wizloft-harness`, workflow `publish.yml`, environment `npm-recovery`, and
  direct `npm publish` permission as trusted publisher for each public package.
- [ ] Disallow traditional publish tokens after a successful dry consumer proof.

The Owner made the repository public on 2026-09-05. The recovery release is therefore eligible for
npm provenance after the exact trusted publishers and token-free workflow are active.

## Gate R3 — Recovery release decision

- [x] Owner selected coherent fourteen-package version `0.1.2-alpha.1` on 2026-09-05.
- [x] The identity sorts above malicious `0.1.1-alpha.3` without legitimizing that sequence.
- [x] Synchronize and verify the complete lockstep graph at the selected identity.

Version selection does not authorize publication before Gates R1, R2, and R4 are complete.

## Gate R4 — Exact release packet

The later packet must record and prove:

- clean source commit and tree;
- annotated Git tag identity;
- artifact-manifest hash and per-tarball SHA-256/SHA-512;
- static import-time side-effect and IOC scan;
- full `pnpm verify` in a credential-free container;
- packed external consumer proof;
- trusted-publisher identity for all fourteen packages;
- dependency-layer publication order;
- exact-version registry consumer proof before any moving tag;
- post-publish confirmation that no tag points to a deprecated malicious artifact.

The selected packet uses annotated tag `harness-v0.1.2-alpha.1`, workflow `publish.yml`, and the
tag-restricted `npm-recovery` GitHub environment. Dispatch is CLI-only because the GitHub UI exposes
a branch selector:

```sh
gh workflow run publish.yml --ref harness-v0.1.2-alpha.1 \
  -f version=0.1.2-alpha.1 -f confirmation='publish recovery release'
```

The workflow has a three-job credential boundary: credential-free isolated verification/freeze,
minimal OIDC candidate publication, then credential-free exact-version registry consumer and
all-dist-tag proof. The frozen artifact inspector rejects the five published malicious tarball
SHA-1/SHA-512 indicators, the five malicious executable SHA-256 indicators, recorded loader strings,
remote dynamic imports, dynamic execution sinks, and obfuscated long lines across every shipped
JavaScript and declared bin before any packed import executes. It re-inspects the packet after
packed execution; the proof container mounts reviewed source read-only, and later verification
cannot access the packet.

## Stop conditions

Stop without publishing if interactive account closure is incomplete, branch/tag protection is not
active, a package lacks the exact trusted publisher, rebuilt content differs materially from the
frozen artifact, or any registry state changes after preflight.
