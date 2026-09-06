# 0014 Consolidated Public Package Topology

Status: Accepted

## Context

The fourteen-package pre-1.0 graph proved that Harness modules can be packed, installed, published,
and verified independently. It also exposed a mismatch between logical modularity and npm package
boundaries:

- all public packages advance in lockstep;
- twelve public packages contain a single TypeScript source file;
- `@wizloft/harness-project` carries twelve direct internal dependencies;
- the publication DAG reaches seven layers;
- every release, provenance audit, dist-tag change, trusted-publisher registration, and package
  access change repeats across fourteen registry objects.

Capability and plugin responsibilities remain useful boundaries. The registry boundary does not need
to mirror every source module while those modules have no independent release cadence or ownership.

## Decision

ADR 0012 remains authoritative history for releases through `0.1.2-alpha.3`. Beginning with the
stable `0.2.0` release, the public allowlist contains exactly:

- `@wizloft/harness-kernel` at `packages/kernel`;
- `@wizloft/harness` at `packages/harness`;
- `@wizloft/harness-file-providers` at `packages/file-providers`;
- `@wizloft/harness-project` at `packages/project`.

The first consolidated release identity is `0.2.0`. The owner selected a stable release instead of
another prerelease after the four-package implementation and packed-consumer proof passed.

`@wizloft/harness-kernel` remains a small public package containing composition mechanics, runtime
contracts, diagnostics, events, profiles, and shared JSON/plugin types. It must not depend on the
facade, providers, project tooling, or project knowledge.

`@wizloft/harness` keeps the consumer-facing root facade and owns these explicit subpath exports:

- `@wizloft/harness/authority`;
- `@wizloft/harness/context`;
- `@wizloft/harness/evidence`;
- `@wizloft/harness/memory`;
- `@wizloft/harness/validation`;
- `@wizloft/harness/commands`;
- `@wizloft/harness/cli`.

The subpaths preserve logical module ownership without separate registry identities. The package has
one internal runtime dependency: `@wizloft/harness-kernel`.

`@wizloft/harness-file-providers` owns first-party file-backed integrations and exposes only explicit
subpaths:

- `@wizloft/harness-file-providers/events`;
- `@wizloft/harness-file-providers/memory`;
- `@wizloft/harness-file-providers/memory-context`;
- `@wizloft/harness-file-providers/repository`.

Runtime plugin ids remain unchanged. This package depends on `@wizloft/harness-kernel` and
`@wizloft/harness`.

`@wizloft/harness-project` remains separate because repository initialization and generated runtime
tooling have a distinct lifecycle. It depends directly only on the other three public packages.

Source modules and tests remain separated by responsibility inside their owning package. New
first-party providers become separate npm packages only when they need an independent dependency,
release-cadence, or ownership boundary. Third-party providers remain independently publishable and
can depend only on the kernel when appropriate.

The repository performs a clean cutover. Removed package names are not retained as workspace
aliases, compatibility packages, or facade-root re-exports. Existing npm versions remain immutable;
a later separately authorized registry operation may deprecate them with migration guidance after
the consolidated graph is published and consumer-proven.

## Consequences

- The public release graph shrinks from fourteen packages and seven layers to four packages and three
  layers.
- Project tooling owns a three-package dependency closure instead of twelve direct internal
  dependencies.
- Capability ids, plugin ids, command ids, runtime behavior, and project schemas remain unchanged.
- Consumers using former package names must migrate to the documented subpaths.
- Release tooling, generated templates, self-hosting, packed-consumer proof, and current
  documentation must switch atomically.
- `0.2.0` implementation and packed proof do not bypass the exact-packet, trusted-publication,
  registry-consumer, or separately reviewed legacy-retirement gates.

## Alternatives considered

- Keep fourteen packages and improve automation: rejected because automation cannot remove the
  registry-wide security and governance surface.
- Publish one package only: rejected because third-party plugin authors need the lightweight kernel
  contract and project tooling has a distinct lifecycle.
- Keep commands and CLI adapter as separate packages: rejected until an independent consumer,
  release cadence, or ownership boundary demonstrates value beyond subpath exports.
- Keep four first-party providers as separate packages: rejected because they are small,
  file-backed integrations released and consumed together; explicit subpaths preserve selective
  imports without four registry identities.
