# Execution Plan — External Package Release Readiness

Status: Complete (2026-08-18 `0.1.0-alpha.2` published)

## Outcome

Make the existing Harness package set installable and verifiable through packed npm artifacts from
a fresh external consumer before any registry publication is authorized.

This gate changes package/release tooling only. It does not add Harness behavior, modify
`wizloft-cli`, authenticate to npm, publish packages, change access/dist-tags, or otherwise mutate
registry state.

## Accepted external-consumer evidence

- raw npm tarballs preserve `workspace:*` dependency specifications;
- `pnpm pack` rewrites workspace dependencies to current workspace package versions;
- all current publishable package versions are placeholder `0.0.0`;
- current publishable manifests omit the supported Node engine;
- therefore no coherent installable public release set exists yet.

## Approved release contract

- registry: public npm under `@wizloft`;
- license: MIT;
- first lockstep version: `0.1.0-alpha.1` (historical and no longer reusable);
- current recovery identity: `0.1.0-alpha.2`;
- prerelease consumer contract: exact `0.1.0-alpha.2` pins;
- final public prerelease dist-tag: `next`;
- intended future annotated Git tag: `harness-v0.1.0-alpha.2`;
- public release allowlist: the thirteen packages below;
- registry mutation remains separately human-authorized;
- npm scope ownership/authentication remains a human prerequisite.

The private root `package.json` version is the one machine-readable lockstep release identity.
Release tooling must derive or update all public manifest versions and the eight public runtime
plugin inspection versions from that source. It must reject any mismatch or public `0.0.0`
identity. Manual independent version edits are not an accepted release mechanism.

Source `workspace:*` dependencies remain. `pnpm pack` must rewrite every packed internal dependency
to exact `0.1.0-alpha.2`; the packed-artifact checker rejects any remaining workspace protocol,
range, or mismatched internal version.

The source release graph models runtime `dependencies` and non-runtime test/development
`devDependencies` separately. Internal `optionalDependencies` and `peerDependencies` are forbidden
unless a future accepted release-graph change models them explicitly. This prevents unapproved
sections from silently changing the release closure or dependency-first publication order.

## Release set

Public lockstep packages:

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

Private/non-published workspaces:

- root `wizloft-harness-workspace`;
- `@wizloft/harness-profile-self-host`, which remains Gate B test/profile infrastructure.

The release checker must use the explicit thirteen-package allowlist. Every present or future
workspace outside it must declare `private: true` until separately approved for publication.

## Publishable metadata contract

Every public manifest must contain:

```json
{
  "version": "0.1.0-alpha.2",
  "license": "MIT",
  "engines": { "node": ">=22.13.0" },
  "files": ["dist", "README.md", "LICENSE"],
  "types": "./dist/index.d.ts",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/nic269/wizloft-harness.git",
    "directory": "<package workspace path>"
  },
  "homepage": "https://github.com/nic269/wizloft-harness#readme",
  "bugs": { "url": "https://github.com/nic269/wizloft-harness/issues" },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

Each manifest must also expose `exports["."].types` and `exports["."].import`, with both targets
present in the packed tarball. `publishConfig.tag` is forbidden; release commands own the temporary
candidate tag and final `next` promotion.

The root MIT `LICENSE` is the authority. Each public package receives a package-local `LICENSE`
copy, checked byte-identical to the root. This is the smallest deterministic way to guarantee that
each nested package tarball contains its license without relying on monorepo-root inheritance or an
unproven pack-staging mechanism.

Every public packed tarball must contain:

- `package/LICENSE`;
- `package/README.md` or another `package/README*` file;
- `package/package.json`;
- its declared JavaScript export target;
- its declared declaration target.

## Runtime plugin inspection versions

The Authority, Context, Evidence, Validation, file-events, file-memory, memory-context, and
repository-files runtime plugins must report the root lockstep version through one
release-tool-owned update/derivation mechanism. A deterministic checker compares the built public
plugin inspection values with the owning package manifest and root release identity.

The private Self-host validation plugin is not a public release identity and is excluded from this
eight-plugin contract.

## Implementation phases

### Phase 1 — Release identity, metadata, and deterministic checks

Status: Complete

- set private root `version` to `0.1.0-alpha.1` as the single release source;
- derive/update all thirteen public manifest versions and eight public runtime plugin versions;
- add approved metadata and package-local byte-identical MIT licenses;
- mark the Self-host profile private;
- update the lockfile;
- add the explicit public allowlist and dependency graph;
- reject release identity drift, public `0.0.0`, non-private non-allowlisted workspaces, metadata
  omissions, runtime-plugin version drift, and license-copy drift;
- retain source `workspace:*` dependencies.

### Phase 2 — Packed external-consumer gate

Status: Complete

- run the normal complete workspace verification/build;
- create a temporary proof root outside the repository;
- `pnpm pack` every allowlisted package into its tarball directory;
- inspect all packed manifests and tarball contents before installation;
- prove every internal dependency is exact `0.1.0-alpha.1` and no workspace protocol remains;
- create one fresh npm consumer with all thirteen tarballs declared as direct relative `file:`
  dependencies;
- run one `npm install --ignore-scripts --offline` operation with no workspace, symlink, absolute
  dependency, copied source, or registry fallback;
- run `npm ls --all` and reject missing, invalid, or extraneous Harness packages;
- import all thirteen packages by public package name;
- compose Authority, Context, Evidence, Validation, file Events, file Memory, Memory-to-Context,
  and repository-files with a consumer-owned validator plugin;
- exercise `createHarness()` -> `createCommandExecutor()` -> `createHarnessCliAdapter()`;
- prove repository Authority, trust-role Context, Memory remember/activate/recall/stale/supersede
  behavior and restart persistence, validator selection/execution, Evidence creation, persisted
  Event reading, runtime/plugin/capability inspection, shutdown, and disposed-runtime failure;
- make the validator prove observable pass and fail cases against the temporary repository fixture;
- clean the consumer, state, npm cache, and tarballs even on failure.

Run the gate on the normal current proof runtime and exact Node.js 22.13.0. Record exact Node.js,
npm, pnpm, and OS versions from both observed runs. No tarball or generated review/proof artifact is
committed.

### Phase 3 — Release-ready checkpoint

Status: Complete

- rerun the complete workspace and packed external-consumer gates from a clean checkout;
- inspect the complete diff and packed manifests;
- record only observed package/test/toolchain counts;
- commit the clean release-ready state;
- stop before registry mutation and request explicit human publication authorization.

The completed alpha.1 readiness phase did not create its tag. A later publication attempt created
the local annotated `harness-v0.1.0-alpha.1` tag, but it was never pushed and is not part of the
alpha.2 checkpoint. Do not create `harness-v0.1.0-alpha.2` until a separately authorized
publication turn.

## Future authorized publication sequence

Derive dependency-first order from the release graph. The current graph produces these publish
layers:

1. kernel;
2. Authority, Context, Evidence, Memory, and file-events;
3. Validation, file-memory, memory-context, and repository-files;
4. Harness facade;
5. commands;
6. CLI adapter.

When separately authorized:

```text
clean release-ready commit and annotated harness-v0.1.0-alpha.2 tag
-> build once
-> pnpm pack all thirteen packages into one temporary release-artifact directory
-> inspect those exact manifests, files, and dependency versions
-> run the external packed-consumer proof against those exact tarballs
-> record SHA-256 for all thirteen tarballs
-> publish those same tarballs dependency-first with a temporary candidate dist-tag
-> verify all thirteen exact package versions are available
-> fresh registry consumer installs only the representative product/profile's direct public
   dependencies and lets npm resolve exact transitive dependencies from the registry
-> prove no file, tarball, or workspace dependency is involved and rerun public imports plus the
   facade -> commands -> CLI adapter scenario
-> promote next for all thirteen packages
-> record observed release evidence
-> delete temporary artifacts after their hashes and proof are recorded
```

Publication must not repack from an uninspected source-package state or use a packaging path that
differs from the packed gate. The current offline proof intentionally keeps all thirteen tarballs as
direct relative dependencies with registry fallback disabled; the later registry consumer is a
separate transitive-resolution proof and does not replace that pre-publication gate.

Do not move `next` package-by-package, do not intentionally publish with `latest`, and do not use
`--no-git-checks` as the default release contract. Exact versions are authoritative and `next` is
the supported moving prerelease channel. Observed first-publication `latest` mappings are recorded
but are not normalized or used as prerelease proof.

## Partial publication recovery

The following was the accepted recovery rule for the alpha.1 publication attempt. The alpha.2
checkpoint below supersedes any path that would reuse alpha.1.

- if publication stops only because of network/authentication and artifacts are byte-unchanged,
  query the registry read-only, publish only missing `0.1.0-alpha.1` packages, then rerun the full
  exact-version registry consumer proof before promoting `next`;
- if any artifact changes, never reuse `0.1.0-alpha.1`; bump the root identity and all thirteen
  packages to `0.1.0-alpha.2`, deprecate incomplete alpha.1 artifacts as appropriate, and rerun the
  complete packed and registry gates;
- never overwrite or reuse any published version;
- intentional management of `latest` remains outside this prerelease gate and belongs to the first
  separately approved stable release.

## Alpha.2 recovery checkpoint

The authorized alpha.1 publication attempt was subsequently removed from npm. Regardless of its
current registry visibility, `0.1.0-alpha.1` is burned and must never be reused. The local annotated
`harness-v0.1.0-alpha.1` tag remains unpushed historical evidence and is not deleted or moved by
this recovery checkpoint.

The recovery changes only the lockstep release identity to `0.1.0-alpha.2` across the private root,
all thirteen public manifests, and the eight runtime plugin inspection versions. Release contract
tests and current documentation follow the new identity; Harness runtime behavior remains
unchanged.

The recovery-preparation checkpoint performs no npm publication, dist-tag/access mutation,
registry write, or Git tag creation/deletion/push. Publication remains a separate operation over a
clean committed source checkpoint.

## Alpha.2 publication authorization

On 2026-08-18 the human owner explicitly authorized the same bounded publication sequence used for
alpha.1, adapted only to `0.1.0-alpha.2`: push the approved source commit, create the local annotated
`harness-v0.1.0-alpha.2` tag after artifact proof, publish the exact proven thirteen tarballs under
the temporary `candidate` tag, run complete registry proofs, promote the coherent graph to `next`,
push the release tag, and commit/push observed release evidence.

This authorization does not include intentionally targeting, removing, or normalizing `latest`; a
stable release; another version; package deletion or unpublish; organization/access changes;
force-pushes; unrelated source behavior; or changes in the `wizloft-cli` repository.

## Expected implementation file scope

- root `package.json`, `pnpm-lock.yaml`, and `LICENSE`;
- all thirteen public package/plugin `package.json` files;
- package-local `LICENSE` files in all thirteen public package/plugin directories;
- `profiles/self-host/package.json`;
- the eight public runtime-plugin source files currently exposing `version: '0.0.0'`;
- release identity/update, release contract inspection, and packed-consumer proof scripts under
  `scripts/`;
- focused bootstrap/release regressions under `tests/`;
- root script documentation and this plan's observed proof section.

No `wizloft-cli` file, Self-host profile behavior, Harness command/capability/provider semantics,
registry state, Git tag, or committed tarball may change during readiness implementation.

## Implemented

- private root `package.json.version` is the `0.1.0-alpha.2` lockstep source;
- `release:sync` deterministically aligns thirteen public manifests, eight runtime plugin versions,
  package-local MIT licenses, and the private Self-host marker;
- `release:check` enforces the allowlist, metadata, source dependency, license, version, runtime
  inspection, and private-by-default contracts and is part of normal `pnpm verify`;
- the source dependency checker models runtime and development edges independently and rejects
  unapproved internal peer or optional edges;
- all public manifests retain source `workspace:*` dependencies while packed manifests contain
  exact `0.1.0-alpha.2` internal versions;
- `release:prove:packed` creates and deletes thirteen tarballs outside the repository, validates
  their files/manifests, installs all thirteen as direct relative dependencies into one fresh npm
  project with scripts and registry fallback disabled, and runs `npm ls --all`;
- the external consumer imports all public names, composes every required provider plus a real
  consumer validator, and proves pass/fail Validation, Evidence, persisted Events, Authority,
  Context, Memory lifecycle/restart, inspection, shutdown, and disposed-runtime behavior;
- `release:verify` combines the complete workspace proof with the packed-consumer scenario;
- release synchronization is idempotent and no tarball, npm cache, consumer project, or review
  snapshot remains in the repository.

## Observed proof

### Alpha.1 release-readiness proof (historical)

- normal `pnpm release:verify` passes on Node.js 22.13.1, npm 11.7.0, pnpm 11.10.0, Darwin 25.3.0
  arm64;
- a fresh temporary repository copy passes `pnpm install --frozen-lockfile --offline` and
  `pnpm release:verify` on exact Node.js 22.13.0, npm 10.9.2, pnpm 11.10.0, Darwin 25.3.0 arm64;
- the fresh install reuses five cached toolchain packages, downloads zero packages, and does not
  rely on repository `node_modules` or `dist` output;
- fourteen workspace packages/plugins/profiles typecheck, test, and build;
- total automated tests pass: 122 passed, 0 failed;
- focused release-graph regressions prove modeled internal development dependencies remain valid,
  while unapproved internal peer/optional edges fail and every packed dependency section requires
  exact internal versions without workspace protocol;
- thirteen packed manifests contain exact internal versions and no workspace protocol;
- all thirteen tarballs contain their manifest, README, byte-identical MIT license, JavaScript
  export, and declaration target;
- the offline external npm install, `npm ls --all`, public-name imports, and full consumer scenario
  pass on both proof runtimes;
- no npm publication, access/dist-tag mutation, registry write, or Git tag occurred.

### Alpha.2 recovery proof

- two consecutive `pnpm release:sync` runs are idempotent and report thirteen public packages plus
  eight runtime plugins at `0.1.0-alpha.2`;
- `pnpm release:check`, `pnpm verify`, and `pnpm release:verify` pass on Node.js 26.7.0, npm 11.19.0,
  pnpm 11.10.0, Darwin 25.3.0 arm64;
- a fresh temporary repository copy containing no inherited `node_modules` or `dist` directories
  passes `pnpm install --frozen-lockfile --offline` and `pnpm release:verify` on exact Node.js
  22.13.0, npm 10.9.2, pnpm 11.10.0, Darwin 25.3.0 arm64;
- the fresh install reuses five cached toolchain packages and downloads zero packages;
- fourteen workspace packages/plugins/profiles typecheck, test, and build;
- total automated tests pass: 122 passed, 0 failed;
- thirteen packed manifests and tarballs pass exact-version, content, import, install, and full
  external-consumer scenario checks on both proof runtimes;
- read-only npm preflight authenticates `npm whoami` as `anhn`, while `npm org ls wizloft --json`
  returns `E403`; alpha.2 publication therefore remains unattempted pending a successful permission
  preflight and new explicit authorization;
- before publication authorization, no alpha.2 publication, access/dist-tag mutation, registry
  write, Git tag creation/deletion/push, or generated review snapshot occurred.

### Alpha.2 npm publication evidence

- release source commit: `74fcc16391fd0d56228b11c1b69ad7dbc645cb0c`;
- annotated tag `harness-v0.1.0-alpha.2` points to the release source commit and is pushed without
  force; the later evidence commit does not move it;
- npm identity is `anhn`; publication uses npm registry `https://registry.npmjs.org/`, Node.js
  26.7.0, and npm 11.19.0;
- actual dependency-first publication order is kernel; Authority; Context; Evidence; Memory;
  file-events; Validation; file-memory; memory-context; repository-files; Harness facade; commands;
  CLI adapter;
- Kernel and Authority were reconciled from the paused partial publication by querying registry
  truth and were not republished. The remaining eleven packages were published once from the
  original proven tarballs with explicit `--tag candidate --access public`;
- first-publication packuments took roughly two to four minutes to become publicly queryable. The
  process waited for exact version and `candidate` visibility after each publish rather than
  republishing during propagation;
- npmjs.org was observed assigning `latest -> 0.1.0-alpha.2` on all thirteen first publications
  even though commands explicitly used `--tag candidate`. Attempts to remove the Kernel mapping
  were rejected by npmjs.org; no `latest` mapping was successfully or intentionally modified;
- all thirteen packages now expose `candidate -> 0.1.0-alpha.2` and
  `next -> 0.1.0-alpha.2`. Observed `latest -> 0.1.0-alpha.2` is recorded but is not a prerelease
  acceptance requirement or supported consumer proof channel;
- a clean exact-version registry consumer installs all thirteen packages directly at
  `0.1.0-alpha.2`, imports every public package name, and verifies thirteen registry-only lockfile
  entries with no file, workspace, tarball, link, symlink, or local package dependency;
- a second clean consumer declares twelve representative direct dependencies at `next`; npm resolves
  `@wizloft/harness-memory@0.1.0-alpha.2` transitively and produces the complete thirteen-package
  registry graph;
- both post-promotion consumers pass the full facade -> commands -> CLI adapter scenario with
  meaningful Validation pass/fail, Authority/Context, Memory persistence/restart and lifecycle,
  Evidence/Events, inspection, shutdown, and disposed-runtime behavior;
- no package was unpublished, no alpha.1 version was reused, no artifact was rebuilt or repacked,
  and no unqualified/`latest` install was used as prerelease proof.

Exact proven artifacts:

| Package | Published at (UTC) | SHA-256 |
| --- | --- | --- |
| `@wizloft/harness-kernel` | `2026-08-17T17:43:52.677Z` | `bcde657453243a68b780489bd0bdb34f66dbd875b363aa260b1c76c6f3b82417` |
| `@wizloft/harness-authority` | `2026-08-17T17:44:13.037Z` | `29cb1685ab2381de4e15713863194b75b55174b8e7fb3e16ca19447f8268e2ae` |
| `@wizloft/harness-context` | `2026-08-17T18:40:25.564Z` | `377676313e4bfecf6253f03891fdabcc48a75686c01f576cfdf43c3861086e8f` |
| `@wizloft/harness-evidence` | `2026-08-17T18:44:51.245Z` | `425d367c3702e89ac4e5acd0195590be29f97e8249ce215a622c1c8184278ab9` |
| `@wizloft/harness-memory` | `2026-08-17T18:49:58.289Z` | `a2de8abca8a2d00ed28574a412076b121fe30b94b85f6330d0c7ee3e36890467` |
| `@wizloft/harness-plugin-file-events` | `2026-08-17T18:55:00.391Z` | `a2df9f345c5a882285ba6f96ad66d4958abf59aa65e48400afc923d01339b148` |
| `@wizloft/harness-validation` | `2026-08-17T19:00:03.212Z` | `59406fdee58a54e1daf0e8bf55dab47139d9461e39542a1555dd9df1aa1c0d58` |
| `@wizloft/harness-plugin-file-memory` | `2026-08-17T19:05:05.672Z` | `bb0e0fcdca367b69e3ebf55da0f680b25274029194b1a5e0ed851bb00b3fcf2d` |
| `@wizloft/harness-plugin-memory-context` | `2026-08-17T19:10:08.366Z` | `191d707b4860bfec9fef22289ea972fb4eb17aa3ab26f2a943e0c9cbdf27ea54` |
| `@wizloft/harness-plugin-repository-files` | `2026-08-17T19:15:10.023Z` | `d456874ae7a080cf7e0f4172b82518f191ccf4bb8be552a0b6dcd55004f30da6` |
| `@wizloft/harness` | `2026-08-17T19:20:17.263Z` | `48e590eb9384bc84efd1260ab01b5bc3b999346d77793cff987a6177f70782db` |
| `@wizloft/harness-commands` | `2026-08-17T19:25:24.793Z` | `826503315505effe97dc804e3d17871a78104b3af71ca037a20a6e647e7a3168` |
| `@wizloft/harness-cli-adapter` | `2026-08-17T19:30:26.470Z` | `ddb8b0a54755ef89428b3bb49e12f9e623bb3983acf4afb06222aa081cc00386` |

## Success criteria

- exactly thirteen packages are publishable and every other workspace is private;
- one root release identity deterministically controls public manifests and runtime plugin versions;
- all packed manifests contain exact installable internal versions and no workspace protocol;
- every tarball contains its manifest, README, byte-identical license, JS export, and declarations;
- a fresh offline npm consumer proves the entire public boundary and meaningful Validation behavior;
- normal and exact-minimum-Node proofs pass with recorded Node/npm/pnpm/OS versions;
- publication and registry mutation remain separately authorized.

## Publication preflight (historical)

Before publication, the human owner explicitly authorized the bounded alpha.2 turn. Read-only
preflight authenticated npm as `anhn`, listed `@wizloft` package access without an authorization
error, and confirmed that all thirteen `0.1.0-alpha.2` versions were absent. Registry mutation then
remained limited to the authorized exact-version `candidate` publication and coherent `next`
promotion described above.
