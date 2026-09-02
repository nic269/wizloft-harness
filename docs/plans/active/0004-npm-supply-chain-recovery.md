# npm Supply-Chain Recovery

Status: Active; registry containment complete; no recovery publication authorized.

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

1. add a reviewed, manual release workflow under `.github/workflows/`;
2. restrict its permissions to `contents: read` and `id-token: write`;
3. use a GitHub-hosted runner, exact Node/pnpm versions, no dependency cache, and frozen lockfiles;
4. build and freeze all fourteen tarballs before any registry write;
5. publish dependency-first from the frozen artifact set;
6. protect `main` and `harness-v*` release tags before enabling the workflow;
7. register that exact workflow as trusted publisher for each public package;
8. disallow traditional publish tokens after a successful dry consumer proof.

The repository is private. npm OIDC trusted publishing can still remove long-lived publish tokens,
but npm's automatic public provenance attestation is unavailable for public packages built from a
private source repository. Making the repository public is a separate Owner decision and is not part
of this plan.

## Gate R3 — Recovery release decision

Do not reuse or repair `0.1.1-alpha.3`. Select one coherent fourteen-package version that sorts above
the malicious version. `0.1.2-alpha.1` is the recommended recovery identity because it avoids
legitimizing the attacker-created `0.1.1-alpha.3` sequence while restoring SemVer precedence.

The version remains a decision gate. Selecting it requires an exact Owner-approved release packet;
this plan does not authorize version edits, tags, publication, or promotion.

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

## Stop conditions

Stop without publishing if interactive account closure is incomplete, branch/tag protection is not
active, a package lacks the exact trusted publisher, rebuilt content differs materially from the
frozen artifact, or any registry state changes after preflight.
