# npm Supply-Chain Recovery

Status: Active; `0.1.2-alpha.2` is authorized and source preparation is active.

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

- [x] Sign in to npm interactively with 2FA.
- [x] Revoke the broad `wizloft-release` granular token.
- [x] Confirm the token list is empty or contains only separately justified read-only credentials.
- [x] Confirm account 2FA and recovery methods from the npm account UI.
- [x] Keep publication frozen until Gate R2 is implemented and reviewed.

The existing bypass-2FA token cannot perform its own account-governance deletion under npm's
August 2026 policy. Do not create another bypass token as a workaround.

## Gate R2 — Token-free publication boundary

Before configuring npm Trusted Publishing:

- [x] Merge the reviewed manual `.github/workflows/publish.yml` workflow.
- [x] Keep dependency installation, verification, packed imports, and registry-consumer proof in
  jobs without `id-token: write`.
- [x] Limit the publication job to `contents: read`, `actions: read`, and `id-token: write`.
- [x] Pin the GitHub actions, Node `24.20.0`, npm `11.19.0`, pnpm `11.10.0`, and the release
  container image digest; disable dependency caching and lifecycle scripts.
- [x] Build, inspect, and freeze all fourteen tarballs before any registry write.
- [x] Configure dependency-first publication only from the downloaded and re-hashed frozen artifact
  set.
- [x] Protect `main` against direct/force/deletion changes and protect `harness-v*` tags against
  update/deletion.
- [x] Register `nic269/wizloft-harness`, workflow `publish.yml`, environment `npm-recovery`, and
  direct `npm publish` permission as trusted publisher for each public package.
- [ ] Disallow traditional publish tokens after a successful dry consumer proof.

The Owner made the repository public on 2026-09-06. The recovery release is therefore eligible for
npm provenance after the exact trusted publishers and token-free workflow are active.

## Gate R3 — Recovery release decision

- [x] Owner selected `0.1.2-alpha.1` on 2026-09-06; exact-byte and source-provenance closure later
  failed.
- [x] Owner selected coherent replacement version `0.1.2-alpha.2` on 2026-09-06.
- [x] The replacement sorts above malicious `0.1.1-alpha.3` and invalid `0.1.2-alpha.1`.
- [x] Synchronize the complete lockstep graph at the replacement identity.

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

The replacement packet uses immutable release tag `harness-v0.1.2-alpha.2`, workflow `publish.yml`,
and the tag-restricted `npm-recovery` GitHub environment. Dispatch is CLI-only because the GitHub UI
exposes a branch selector:

```sh
gh workflow run publish.yml --ref harness-v0.1.2-alpha.2 \
  -f version=0.1.2-alpha.2 -f confirmation='publish recovery release'
```

The initial workflow had a three-job credential boundary: credential-free isolated
verification/freeze, minimal OIDC candidate publication, then credential-free exact-version
registry consumer and all-dist-tag proof. The frozen artifact inspector rejects the five published
malicious tarball SHA-1/SHA-512 indicators, the five malicious executable SHA-256 indicators,
recorded loader strings, remote dynamic imports, dynamic execution sinks, and obfuscated long lines
across every shipped JavaScript and declared bin before any packed import executes. It re-inspects
the packet after packed execution; the proof container mounts reviewed source read-only, and later
verification cannot access the packet.

### Failed alpha.1 frozen pre-publication checkpoint — 2026-09-06

This evidence checkpoint is intentionally post-tag documentation on `main`; it does not move the
protected release tag.

- Annotated tag object: `5487574ad9d08d2f2655b192635b5d34f13f6e9c`.
- Tag target/source commit: `f2f19dbe26ce7975059d692012beea829ac5ec64`.
- Source tree: `570639882e2e1ca66b44518321ffb03f26e82af1`.
- Release-manifest SHA-256:
  `2d392e9af14eef40651e7ff0dbe617044487ca03750451753756b79925ef0978`.
- Exact Linux amd64 toolchain: Node `24.20.0`, npm `11.19.0`, pnpm `11.10.0`.
- Credential-free, network-off `pnpm verify`, packed external-consumer proof, generated-project
  inspect, and the final repeated artifact inspection passed.
- `scripts/inspect-release-artifacts.mjs` owns the exact malicious SHA-1, SHA-512, executable
  SHA-256, loader-text, remote-import, execution-sink, and obfuscated-line indicators recovered
  from the preserved OSV and npm registry incident evidence. It rejects non-regular package
  members and scans every shipped `.js`, `.mjs`, `.cjs`, and declared bin, not only entrypoints.
- The read-only registry preflight confirmed that none of the fourteen `0.1.2-alpha.1` identities
  existed before run `34006358270`.
- The Owner completed broad-token revocation, restored account 2FA with saved recovery codes, and
  reported all fourteen trusted-publisher registrations configured before dispatch.
- Run `34006358270` then published and byte-verified the first six dependency packages through OIDC.
  `@wizloft/harness` rejected the same workflow identity with `ENEEDAUTH`; the final eight packages
  were not attempted and registry-consumer proof did not run.
- Live resume preflight subsequently proved the six existing registry tarballs and their
  `candidate` tags against the frozen packet and classified the exact remaining eight as missing.
- Do not rerun the immutable release-tag workflow: its fail-closed fresh-publication path correctly
  rejects any existing version. Resume requires reviewed automation from a separate protected
  annotated automation tag; it must rebuild the immutable release source, prove every existing
  package's bytes and `candidate` tag before mutation, and publish only missing artifacts.

### Post-publication exact-byte failure — 2026-09-06

- Resume run `34007261290` published the remaining eight packages and passed its regenerated-packet
  registry/consumer proof. That proof was insufficient: it compared registry bytes to a new packet
  produced during the resume run rather than to the authoritative frozen packet above.
- An independent audit against `release-artifacts.json` found twelve exact matches and two failures:
  - `@wizloft/harness`: frozen SHA-256
    `0a939c4417fa531b22a7ed4b4fa3e09c5221013ed412f5716c53cdbf3a9500d2`; registry SHA-256
    `e9013f75880045f4ae24d619ad1e933d69d526c771fcaf946a1bac3535ba727e`.
  - `@wizloft/harness-project`: frozen SHA-256
    `c8b80f3c25fb22b718b85c30a2734db50ab9ef24d8526a3ca0a37d19bd83ef39`; registry SHA-256
    `0bbeeddb71f8f1fc60c2980a36f7563f1a54deb5448f187608f164db3b21bf32`.
- Provenance was also split across all fourteen packages. The first six attest
  `refs/tags/harness-v0.1.2-alpha.1` at source commit
  `f2f19dbe26ce7975059d692012beea829ac5ec64`; the remaining eight attest
  `refs/tags/harness-v0.1.2-alpha.1-resume.2` at
  `dd28fd46a95e41464bb9772640a9fd36bba3fd19`. Replacing frozen hashes could not repair the
  resulting split release provenance.
- Member-level comparison found no executable or runtime-file drift. In both mismatches only packed
  `package/package.json` differed, and only dependency-key order changed.
- Repeated `pnpm pack` calls from the same source, dependency state, and pinned toolchain reproduced
  different dependency-key orders and tarball digests for both packages. The `pnpm pack`
  workspace-protocol rewrite is therefore not byte-deterministic for this graph.
- Exact-byte closure failed even though the dependency mappings are semantically equal. Do not
  promote `next`, do not accept `0.1.2-alpha.1` as the recovery release, and do not revise the
  authoritative frozen manifest after publication.
- Live npm metadata already exposes alpha.1 through each package's `candidate` tag. The blocked
  promotion concerns `next` and any other supported moving tag; it does not erase that existing
  candidate exposure.
- Boilerplate was returned to verified `0.1.0-alpha.4` with a zero-operation re-init and clean Git
  worktree. The invalid alpha.1 validation event and Memory record created during the aborted
  adoption were removed.
- The packing proof now canonicalizes dependency-map order, repacks with pinned npm, and requires
  two consecutive canonical packs to be byte-identical. A new coherent version and packet remain
  required.

### Replacement alpha.2 packet

- Alpha.2 must publish all fourteen packages from the single annotated
  `harness-v0.1.2-alpha.2` tag. No automation/resume tag may contribute provenance.
- The workflow must freeze once, publish those exact files, and compare the registry to that
  original packet after publication.
- The protected alpha.2 tag was created before review found that its baked workflow still used the
  fail-closed fresh `publish` mode. It remains unpublished and must not be dispatched. Resolve it
  either by an explicit protected-tag delete/recreate after merging convergence or by retiring
  alpha.2 and selecting a later identity.
- Convergent publication must classify all fourteen packages before each mutation, verify existing
  bytes and `candidate`, cryptographically verify registry signatures and SLSA bundles with pinned
  npm, assert the signed workflow ref/source commit against the same release tag, and publish only
  missing frozen artifacts.
- Dist-tag promotion remains separate from OIDC publication. `npm dist-tag` requires an isolated
  short-lived interactive web-login userconfig, pre-verification, idempotent fourteen-package
  updates, post-verification, logout, deletion, and session-credential revocation.

| Package | Tarball | SHA-256 | SHA-512 |
|---|---|---|---|
| `@wizloft/harness-kernel` | `wizloft-harness-kernel-0.1.2-alpha.1.tgz` | `7e46d2755ef82e46a722d53e770d17e4673337bacfc0a18da200ab3ad424790e` | `sha512-HoLESGnzO77+doEoYP8mLoliWIF3lN3fSKjrfBiBrH1bcNtMkVz84TwpKS0oWWktd1b5nI5kKwNp7+z/lntjig==` |
| `@wizloft/harness-authority` | `wizloft-harness-authority-0.1.2-alpha.1.tgz` | `34d59b1be9ff0196ba35b338dc422c7bed8251bda1f80bee2b0292c955d6b1ac` | `sha512-m22uNwvM3D7QKaMgFUTnMbG/zcb4MehTBRhuIWS9oBMoMiH/UjvxNl7YLNhnhAvIXXiovVWuNc1ynLyy6fytvg==` |
| `@wizloft/harness-context` | `wizloft-harness-context-0.1.2-alpha.1.tgz` | `91a05a4cc7b1c904440bf63c8c02e7ae38faee78f9fb059b3c6c41ac847b2bff` | `sha512-mX3AV9HBcQi2h+o7oDJauvw2v0fgsWtVAvvNIv3e17ZDanRGhZgsfaV1/Us0TXS+8hkLRElywmJpKtjrYZ/ZcA==` |
| `@wizloft/harness-evidence` | `wizloft-harness-evidence-0.1.2-alpha.1.tgz` | `8f844d10d71227d1aae0fc6fa9379e9c3b218322dd19087eab71f4c9921ad9a7` | `sha512-kMqHo2TCIEg4edzRD7T2AcwHXWSgtep1StjNRllNK40JGK172AWQ55SbmP+z1ooCPfCHoYNT9cPPGQyolIHhfw==` |
| `@wizloft/harness-memory` | `wizloft-harness-memory-0.1.2-alpha.1.tgz` | `5845468f225827722740ec5c00400ca3e98386cafa7985a5f73301456bdc9509` | `sha512-lGCIYotkmBcIWLJOkx02NCSjT6z7Vi/6hux61lFWMiHPvkMVnbJIkGpAlNoqZrNH6NktioDpfwBF+FWYS/meaw==` |
| `@wizloft/harness-validation` | `wizloft-harness-validation-0.1.2-alpha.1.tgz` | `4aa9399fd90790a7de817dd8c7c0f9eb4eaf103bc968a95b014383a01aa6458d` | `sha512-D/JbmM8lEL+LdvtdZU3bEQ1uARQ8rAn6yIWuT4WBQVhaUIrkvHiKQWm6mffAouLiSnjXZn/gTHl7+23zKM4uSA==` |
| `@wizloft/harness` | `wizloft-harness-0.1.2-alpha.1.tgz` | `0a939c4417fa531b22a7ed4b4fa3e09c5221013ed412f5716c53cdbf3a9500d2` | `sha512-uKBU8YSjrw2FBvDKuLQBB5oW6cpuUGvrcQ05veUOUTg8xN8L65uU7BkJG/X/BhbnxArHmwUu73BFV/VelA9ovA==` |
| `@wizloft/harness-commands` | `wizloft-harness-commands-0.1.2-alpha.1.tgz` | `cdcc398b857d64801220e1a78d814ac19a6b3a1e0df607a89142395e0b3adf4f` | `sha512-u0SqncxxOVDG3oYgDoJ/WW9xViZpIrN4sgx7Giwbjo2eeYkhRyBuKzepSuUf13p83WQoEMjT+SfI6GoAx9zgNA==` |
| `@wizloft/harness-cli-adapter` | `wizloft-harness-cli-adapter-0.1.2-alpha.1.tgz` | `e15a320ffad2143e2c6f6502a482cd21c8edaa7aa3f50a17b6deb8afcc331158` | `sha512-pGGG+O95Cxs9cKBuQmbEraPe6yVsXW/mlN+qOiQcAXvNADQtmdTACNe17F/ZtQvZsahneuCEMBj6s1L0SRCXsQ==` |
| `@wizloft/harness-plugin-file-events` | `wizloft-harness-plugin-file-events-0.1.2-alpha.1.tgz` | `68d2137e8cc426bc3e2f006a143f0bff1c98aade42da1fa77186b2fc69898d8b` | `sha512-YYqKG4vcGwpmfVYM+TSVh+HMFH3fMOdNjiXoEUo/zs+K/k/IJsHSfSS6e3rCGVqlWHIpAixH+ctzTynlohw/KQ==` |
| `@wizloft/harness-plugin-file-memory` | `wizloft-harness-plugin-file-memory-0.1.2-alpha.1.tgz` | `6985cf8977eab4bc9282e007bbce143e17c60fc1ba72ad9cd93e6eda950dab17` | `sha512-vzzu2KdNFGiwBqIeVUJlRVOphro1EEJn2cxpfctgvKf05LEHFqm3W0xNZP3ouPwAx5CnhNdmCBl5frjmKmYwXw==` |
| `@wizloft/harness-plugin-memory-context` | `wizloft-harness-plugin-memory-context-0.1.2-alpha.1.tgz` | `467db17fd2f3de2060d1bdb1bdb16791fa87f79e0dd695777cfc359da4155bfa` | `sha512-ebH2LjafRLGaXNd6lfHJ5qnX5xCZCXHdA/CS/rzohg2RpAAWy5oZHpuEcCb/N5SXH53MkTwb2l9VFgc/wVnw5w==` |
| `@wizloft/harness-plugin-repository-files` | `wizloft-harness-plugin-repository-files-0.1.2-alpha.1.tgz` | `8f51bdafe3ce79ea92ade6fa8bee718208210f7bc9b709af5f3a5685f8e79e8f` | `sha512-Ru3xO04m4savzlkhxZTHI/xtfCz4HcgQvbqiGtz/vYk1psv9hHwoJgeF16fceMgrKOkN0yohXzVGenmhmpil6g==` |
| `@wizloft/harness-project` | `wizloft-harness-project-0.1.2-alpha.1.tgz` | `c8b80f3c25fb22b718b85c30a2734db50ab9ef24d8526a3ca0a37d19bd83ef39` | `sha512-46Ec/kzXD7Guve5jmwVqK6NjqMcy9LEpDKJFGQerT1I7Ooavq/r9tV11K8zX09kCBYc+6V6cAmeMC7GlvIfA8A==` |

## Stop conditions

Stop without publishing if interactive account closure is incomplete, branch/tag protection is not
active, a package lacks the exact trusted publisher, rebuilt content differs from the frozen
artifact, or registry state changes after preflight. A partial-publication resume may skip an
existing immutable package only after comparing it to the original authoritative frozen manifest,
never to a regenerated packet. Any exact-byte mismatch invalidates the release identity; do not
revise frozen evidence to match registry state.
