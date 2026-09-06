# Public Package Topology Consolidation

Status: Complete

## Outcome

Reduce the pre-1.0 public npm graph from fourteen lockstep packages to four packages at
`0.2.0-alpha.1` without weakening the kernel/plugin architecture:

- `@wizloft/harness-kernel` — lightweight runtime and plugin contract;
- `@wizloft/harness` — facade plus capability, command, and CLI-adapter subpaths;
- `@wizloft/harness-file-providers` — first-party file-backed providers exposed as subpaths;
- `@wizloft/harness-project` — project initialization and generated runtime tooling.

Logical responsibilities remain separate source modules. npm package boundaries exist only where a
consumer, dependency, or lifecycle boundary justifies their operational cost.

## Constraints

- Repository authority remains separate from runtime memory and evidence.
- The kernel remains project-agnostic and receives no file-backed or project-specific knowledge.
- Third-party plugins can depend on `@wizloft/harness-kernel` without installing the facade or
  first-party providers.
- Existing public package versions are immutable history. This slice does not publish, unpublish,
  deprecate, retag, or move npm dist-tags.
- The cutover is clean inside the repository: no legacy package workspaces, aliases, re-exports, or
  compatibility shims remain.
- The root manifest is the only manually edited lockstep version source; `pnpm release:sync` owns
  synchronization to public manifests and runtime plugin inspection literals.
- Historical release and incident records keep their historical package identities.

## Non-goals

- Independent package versioning.
- A new plugin registry, loader, runtime, sandbox, or command architecture.
- Changes to capability ids, runtime plugin ids, command ids, event formats, or project marker
  schema.
- npm publication or migration deprecation messages; those require a later exact release packet and
  separate owner authorization.

## Public exports

`@wizloft/harness` keeps its root facade and adds:

- `./authority`
- `./context`
- `./evidence`
- `./memory`
- `./validation`
- `./commands`
- `./cli`

`@wizloft/harness-file-providers` exposes:

- `./events`
- `./memory`
- `./memory-context`
- `./repository`

The provider package has no required root export; consumers select explicit provider subpaths.

## Phases

### Contract and inventory

- [x] Accept the four-package target and `0.2.0-alpha.1` identity.
- [x] Record the superseding package-boundary decision.
- [x] Map source, tests, generated templates, release scripts, and documentation callsites.

### Core consolidation

- [x] Move Authority, Context, Evidence, Memory, and Validation into facade-owned source modules.
- [x] Move command execution and the IO-free CLI adapter into facade subpaths.
- [x] Preserve the facade root API and lightweight kernel dependency boundary.
- [x] Move package tests into the owning consolidated package.
- [x] Delete obsolete capability, command, and CLI-adapter workspaces.

### Provider consolidation

- [x] Create `@wizloft/harness-file-providers` with four explicit subpath exports.
- [x] Move provider implementations and tests without changing runtime plugin ids.
- [x] Delete obsolete first-party provider workspaces.

### Project and self-host migration

- [x] Migrate project runtime, generated templates, health checks, and overlays to subpath imports.
- [x] Reduce `@wizloft/harness-project` to three internal runtime dependencies.
- [x] Migrate the private self-host profile and repository-level smoke scenarios.

### Release contract

- [x] Change only root `package.json` to `0.2.0-alpha.1`, then run `pnpm release:sync`.
- [x] Replace the fourteen-package release allowlist with the four-package DAG.
- [x] Update artifact inspection, packed consumer proof, and release tests to derive cardinality from
  the public graph rather than hard-coding fourteen.
- [x] Keep the completed alpha.3 recovery publisher restricted to its immutable recovery version;
  do not authorize or add a `0.2.0-alpha.1` publication path in this slice.

### Documentation and migration

- [x] Update current architecture and package documentation to the four-package topology.
- [x] Preserve completed plans, incident reports, and frozen release hashes as historical evidence.
- [x] Document old-to-new import mappings and the later npm deprecation sequence.

### Verification

- [x] All workspace typechecks, tests, builds, lint checks, and release-contract checks pass.
- [x] Packed tarballs contain exactly the four-package graph with exact internal versions and no
  workspace/file/link specifiers.
- [x] A fresh packed consumer imports every new subpath and runs the real facade → commands → CLI,
  provider composition, validation, memory durability, event history, and project generation paths.
- [x] `@wizloft/harness-project` installs from its tarball with only the consolidated dependency
  closure and generated-project initialization remains zero-diff on repeat.
- [x] No current source, test, package manifest, generated template, or current architecture document
  imports an obsolete public package name.

## Release boundary

Completion of this implementation proves a release candidate only. Publishing `0.2.0-alpha.1`,
moving `candidate` or `next`, and deprecating the old package names remain separate owner-authorized
registry operations.

## Completion evidence

- `pnpm release:verify` passed on 2026-09-06.
- The release contract accepted exactly four public packages at `0.2.0-alpha.1`.
- Workspace checks, formatting, typechecks, all builds, and 275 tests passed: 263 workspace-package
  tests plus nine contract/bootstrap tests and three repository-level composition tests.
- The external packed-consumer and generated-project offline scenarios passed with four tarballs on
  Node 24.20.0, npm 11.19.0, pnpm 11.10.0, Darwin arm64.
- No npm publication, deprecation, dist-tag mutation, Git tag, or push occurred.
