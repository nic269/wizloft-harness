# 0012 Public Package Release Contract

Status: Accepted for releases through `0.1.2-alpha.3`; package topology superseded by [0014](0014-consolidated-public-package-topology.md)

## Context

Wizloft CLI exposed that the Harness monorepo works through workspace resolution but does not yet
form an installable external package set. Raw npm tarballs preserve `workspace:*`; `pnpm pack`
rewrites workspace dependencies, but the current placeholder versions and incomplete manifests do
not provide a coherent public release identity.

Harness needs a durable release boundary without introducing independent package versioning or
authorizing registry mutation as part of ordinary implementation.

## Decision

- Reusable Harness packages publish publicly under the npm `@wizloft` scope.
- Public Harness packages use the MIT license.
- The public release allowlist contains exactly:
  - `@wizloft/harness-kernel`;
  - `@wizloft/harness-authority`;
  - `@wizloft/harness-context`;
  - `@wizloft/harness-evidence`;
  - `@wizloft/harness-memory`;
  - `@wizloft/harness-validation`;
  - `@wizloft/harness`;
  - `@wizloft/harness-commands`;
  - `@wizloft/harness-cli-adapter`;
  - `@wizloft/harness-plugin-file-events`;
  - `@wizloft/harness-plugin-file-memory`;
  - `@wizloft/harness-plugin-memory-context`;
  - `@wizloft/harness-plugin-repository-files`.
- Pre-1.0 public releases use one lockstep version sourced from the private root package manifest.
- Published internal Harness dependencies use the exact lockstep version. Source `workspace:*`
  references may remain when the packed artifact proves exact installable semver rewriting.
- Public runtime plugin inspection versions equal their owning package version.
- Public packages support Node.js `>=22.13.0`.
- The root workspace and `@wizloft/harness-profile-self-host` remain private. Any workspace outside
  the allowlist is private by default until a later accepted decision adds it.
- The accepted next public allowlist addition is `@wizloft/harness-project` at `packages/project`.
  That package is not part of the implemented `0.1.0-alpha.2` graph. Release-contract scripts,
  packed-consumer proof, and lockstep identity `0.1.0-alpha.3` transition atomically when the
  package exists. Until then the implemented public set remains the thirteen packages above.
- When `@wizloft/harness-project` exists, the public set is fourteen packages. Its exact direct
  runtime dependencies are `@wizloft/harness`, `@wizloft/harness-authority`,
  `@wizloft/harness-cli-adapter`, `@wizloft/harness-commands`, `@wizloft/harness-context`,
  `@wizloft/harness-evidence`, `@wizloft/harness-kernel`, `@wizloft/harness-plugin-file-events`,
  `@wizloft/harness-plugin-file-memory`, `@wizloft/harness-plugin-memory-context`,
  `@wizloft/harness-plugin-repository-files`, and `@wizloft/harness-validation`.
  `@wizloft/harness-memory` remains transitive, not direct. The package must not introduce peer or
  optional internal dependencies, and packed artifacts must not retain workspace, file, or link
  specifiers.
- Publish order remains dependency-first. A package’s layer is `1 + max(layer of its modeled
  runtime dependencies)`, or `1` when it has none. Independent packages share a layer. The current
  deepest direct dependency of `@wizloft/harness-project` is `@wizloft/harness-cli-adapter` (layer
  6), so the observed DAG places the project package in layer 7. That number is derived, not a
  special case; if future dependencies change, the layer is recomputed.
- Once `@wizloft/harness-project` exists, release readiness includes the same lockstep identity,
  Node `>=22.13.0`, exports/types/build-artifact, pack, registry, and coherent candidate/next graph
  proofs as the other public packages, plus a generated-project packed-consumer proof.
- Every release candidate must pass deterministic packed-manifest/tarball inspection and a fresh
  external npm consumer proof through public package imports, the Harness facade, command executor,
  CLI adapter, real providers, meaningful Validation, durability, inspection, and lifecycle.
- Exact versions are the authoritative prerelease consumer contract. `candidate` is a temporary
  publication/proof channel and `next` is the supported moving prerelease channel.
- `latest` is intentionally managed only when a stable release is approved; its absence is not a
  prerelease invariant and prerelease proof must not rely on an unqualified install.
- Registry ownership/authentication confirmation and every registry mutation require separate
  explicit human authorization.

Specific prerelease numbers, dist-tags, Git tags, observed tool versions, and execution evidence
belong in the active release plan rather than this durable policy.

## Consequences

- The public package graph advances together before 1.0, favoring reproducible consumer installs
  over independent package release cadence.
- Packed artifacts, not workspace success or raw npm packing, are the release proof boundary.
- Only the exact tarballs that passed packed inspection and external-consumer proof are eligible for
  later authorized publication; their SHA-256 hashes must be recorded before registry mutation.
- Package metadata, licenses, exports, exact internal versions, and runtime inspection identity must
  remain synchronized by tooling.
- The Self-host profile can continue testing the repository without becoming a supported public
  package accidentally.
- The accepted fourteenth package does not change the implemented `0.1.0-alpha.2` release checker.
  The current graph remains thirteen packages until `@wizloft/harness-project` is created and the
  release implementation is updated with it.
- A release-ready commit or successful packed proof does not authorize npm publication, access
  changes, or dist-tag promotion.
- During the `0.1.0-alpha.2` release, npmjs.org was observed creating `latest` on first publication
  even though the publish command explicitly supplied `--tag candidate`, and observed attempts to
  remove that mapping were rejected. This is recorded as observed service behavior, not a universal
  npm API guarantee. Prerelease acceptance therefore records `latest` without normalizing it and
  proves exact versions plus `next` instead.

## Alternatives considered

- Independent package versioning was rejected as unnecessary complexity for the first pre-1.0
  release set.
- Publishing the Self-host profile was rejected because it is repository-specific Gate B
  infrastructure rather than a reusable consumer contract.
- Replacing source `workspace:*` references was rejected because `pnpm pack` can produce exact
  installable dependencies and the packed gate verifies the result.
- Relying on monorepo-root license inheritance was rejected because each nested tarball must prove
  its own license artifact.
- Publishing directly to `next` package-by-package was rejected because consumers could observe an
  incomplete graph before registry proof completes.
