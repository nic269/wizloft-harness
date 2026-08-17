# Execution Plan — External Package Release Readiness

Status: Approved (2026-08-17)

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
- first lockstep version: `0.1.0-alpha.1`;
- prerelease consumer contract: exact `0.1.0-alpha.1` pins;
- final public prerelease dist-tag: `next`;
- intended annotated Git tag: `harness-v0.1.0-alpha.1`;
- public release allowlist: the thirteen packages below;
- registry mutation remains separately human-authorized;
- npm scope ownership/authentication remains a human prerequisite.

The private root `package.json` version is the one machine-readable lockstep release identity.
Release tooling must derive or update all public manifest versions and the eight public runtime
plugin inspection versions from that source. It must reject any mismatch or public `0.0.0`
identity. Manual independent version edits are not an accepted release mechanism.

Source `workspace:*` dependencies remain. `pnpm pack` must rewrite every packed internal dependency
to exact `0.1.0-alpha.1`; the packed-artifact checker rejects any remaining workspace protocol,
range, or mismatched internal version.

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
  "version": "0.1.0-alpha.1",
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

- rerun the complete workspace and packed external-consumer gates from a clean checkout;
- inspect the complete diff and packed manifests;
- record only observed package/test/toolchain counts;
- commit the clean release-ready state;
- stop before registry mutation and request explicit human publication authorization.

Do not create `harness-v0.1.0-alpha.1` during readiness implementation. The annotated tag belongs
only to the later explicitly authorized publication turn.

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
clean release-ready commit
-> annotated harness-v0.1.0-alpha.1 tag
-> publish dependency-first with a temporary candidate dist-tag
-> fresh registry consumer installs all exact 0.1.0-alpha.1 packages
-> full registry consumer proof
-> promote next for all thirteen packages
-> record observed release evidence
```

Do not move `next` package-by-package, do not publish with `latest`, and do not use
`--no-git-checks` as the default release contract.

## Partial publication recovery

- if publication stops only because of network/authentication and artifacts are byte-unchanged,
  query the registry read-only, publish only missing `0.1.0-alpha.1` packages, then rerun the full
  exact-version registry consumer proof before promoting `next`;
- if any artifact changes, never reuse `0.1.0-alpha.1`; bump the root identity and all thirteen
  packages to `0.1.0-alpha.2`, deprecate incomplete alpha.1 artifacts as appropriate, and rerun the
  complete packed and registry gates;
- never overwrite or reuse any published version;
- stable `latest` publication remains outside this gate.

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

## Success criteria

- exactly thirteen packages are publishable and every other workspace is private;
- one root release identity deterministically controls public manifests and runtime plugin versions;
- all packed manifests contain exact installable internal versions and no workspace protocol;
- every tarball contains its manifest, README, byte-identical license, JS export, and declarations;
- a fresh offline npm consumer proves the entire public boundary and meaningful Validation behavior;
- normal and exact-minimum-Node proofs pass with recorded Node/npm/pnpm/OS versions;
- publication and registry mutation remain separately authorized.

## Remaining prerequisite

The human owner must confirm npm `@wizloft` scope ownership and the authentication identity/policy
before any registry mutation. No login, scope creation, access change, publish, dist-tag change, or
registry write is authorized by this plan.
