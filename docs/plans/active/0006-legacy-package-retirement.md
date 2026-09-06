# Legacy Package Retirement

Status: Planned; registry mutation is blocked until the consolidated release is published and consumer-proven.

## Outcome

Retire the eleven npm package names replaced by the four-package topology without deleting immutable
artifacts, breaking historical evidence, or overwriting the security deprecation on malicious
`0.1.1-alpha.3` versions.

## Scope

| Former package | Replacement import |
|---|---|
| `@wizloft/harness-authority` | `@wizloft/harness/authority` |
| `@wizloft/harness-context` | `@wizloft/harness/context` |
| `@wizloft/harness-evidence` | `@wizloft/harness/evidence` |
| `@wizloft/harness-memory` | `@wizloft/harness/memory` |
| `@wizloft/harness-validation` | `@wizloft/harness/validation` |
| `@wizloft/harness-commands` | `@wizloft/harness/commands` |
| `@wizloft/harness-cli-adapter` | `@wizloft/harness/cli` |
| `@wizloft/harness-plugin-file-events` | `@wizloft/harness-file-providers/events` |
| `@wizloft/harness-plugin-file-memory` | `@wizloft/harness-file-providers/memory` |
| `@wizloft/harness-plugin-memory-context` | `@wizloft/harness-file-providers/memory-context` |
| `@wizloft/harness-plugin-repository-files` | `@wizloft/harness-file-providers/repository` |

The retained package names `@wizloft/harness-kernel`, `@wizloft/harness`, and
`@wizloft/harness-project` are not retirement targets. `@wizloft/harness-file-providers` is new.

## Preconditions

- [ ] Publish all four `0.2.0-alpha.1` artifacts from one reviewed source identity.
- [ ] Verify exact registry bytes, npm signatures, SLSA provenance, and the annotated source tag.
- [ ] Prove an exact-version external consumer and generated project from the registry.
- [ ] Move only the approved consolidated prerelease tags and verify the four-package graph again.
- [ ] Migrate and verify every known first-party consumer before changing legacy package metadata.
- [ ] Obtain separate owner authorization for the exact deprecation messages and dist-tag removals.

No legacy registry mutation may begin while any precondition is incomplete.

## Registry inventory baseline — 2026-09-06

All eleven retirement targets publish `0.1.0-alpha.2`, `0.1.0-alpha.3`, `0.1.0-alpha.4`,
`0.1.2-alpha.1`, and `0.1.2-alpha.3`. Three targets also contain malicious
`0.1.1-alpha.3`: `@wizloft/harness-context`, `@wizloft/harness-validation`, and
`@wizloft/harness-plugin-repository-files`.

Every target currently maps `latest` to `0.1.0-alpha.2`, and `candidate` plus `next` to
`0.1.2-alpha.3`. Context, Validation, and Repository Files also map `beta` to
`0.1.0-alpha.4`. This is an observed baseline, not authorization to mutate tags.

## Deprecation sequence

### Freeze and preview

- [ ] Re-fetch versions, dist-tags, existing deprecation messages, access policy, and trusted
  publisher configuration for all eleven packages.
- [ ] Fail closed if inventory differs from the recorded baseline or any tag targets a malicious
  version.
- [ ] Generate a machine-readable operation list containing package, exact version, old message,
  proposed message, and proposed tag removal; review it before authentication.
- [ ] Confirm no proposed operation touches a retained package or creates a new package version.

### Apply migration guidance

- [ ] Deprecate each non-malicious legacy version with its exact replacement import, for example:
  `Package consolidated; migrate to @wizloft/harness/authority. See the 0.2 migration guide.`
- [ ] Preserve the existing OSV-specific security message on every malicious `0.1.1-alpha.3`
  artifact byte-for-byte. A wildcard deprecation is forbidden because it could overwrite that
  stronger warning.
- [ ] Never unpublish, delete, republish, or replace historical tarballs.

### Retire moving prerelease channels

- [ ] Remove `candidate`, `next`, `alpha`, and `beta` tags from legacy package names where present,
  after exact-version deprecation succeeds.
- [ ] Do not attempt to retarget a legacy package tag to a differently named consolidated package.
- [ ] Keep the unavoidable npm-created `latest` mapping if npm refuses its removal; its target must
  be deprecated with migration guidance.

### Harden dormant packages

- [ ] Keep package-level two-factor enforcement and disallow bypass-2FA tokens.
- [ ] Retain trusted-publisher settings until retirement verification closes; removing them is a
  separate defense-in-depth decision, not required for deprecation.
- [ ] Confirm package maintainers and organization access did not expand during the operation.

## Verification

- [ ] Read every version's deprecation message back from the registry.
- [ ] Confirm the three malicious versions retain their exact security warnings.
- [ ] Confirm no retirement target exposes `candidate`, `next`, `alpha`, or `beta` unless npm made a
  specific removal impossible and that exception is recorded.
- [ ] Confirm no dist-tag across retained or retired names resolves to malicious `0.1.1-alpha.3`.
- [ ] Install each retained consolidated package at the supported exact version in a credential-free
  consumer and rerun project initialization plus Validation.
- [ ] Record final registry evidence in the current-status document; never revise historical release
  hashes or incident records.

## Rollback boundary

npm deprecation messages and dist-tags can be changed again, but published bytes and versions are
immutable. Stop immediately on an unexpected registry response. Re-read the affected package state
before any retry; never compensate by publishing compatibility packages or new versions under a
retired name.
