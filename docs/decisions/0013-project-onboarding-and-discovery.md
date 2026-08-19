# 0013 Project Onboarding And Discovery

Status: Accepted

## Context

Wizloft CLI dogfood proved that Harness can run as an embedded product module, but it did not
create a released meaning of “this repository uses Harness.” Gate H0 was a consumer-owned layout:
hand-authored runner/profile files, root or sibling package resolution, and duplicated agent
prose. That layout is not a generic onboarding contract.

Meldmark and later repositories need a released initializer that makes a clean or existing
repository discoverable, runnable, and re-init-safe without copying CLI files and without
mutating a host application’s root package manifest.

## Decision

### Onboarding ownership

Project initialization is pre-runtime scaffolding owned by the public project-tooling package
`@wizloft/harness-project`.

It is not a kernel capability, not a live Harness command that requires an existing runtime, not
host-CLI-specific semantics, and not an agent-runtime feature.

Reusable onboarding and generated-runner semantics belong to Harness. Host products still own
their product executable names and outer UX. `@wizloft/harness-project` must not claim `wizloft`,
`wizharness`, `wizanh`, or `wizshopify`.

### Initialized-repository identity

Tracked initialization and checkout-local materialization are distinct.

A repository has an accepted Harness project contract when `.wizloft/harness/project.json` is a
valid supported marker and the required tracked Harness project artifacts are present. That marker
names the last release whose project contract successfully completed materialization when it was
generated or upgraded.

A checkout is runnable / locally materialized only when that initialized contract is present and
the exact `@wizloft/harness-project` matching `runtime.release` is resolvable from
`.wizloft/harness/node_modules`.

A tracked marker does not guarantee ignored `node_modules/` exists in every clone. A fresh clone
with a valid marker and tracked isolated manifest/lock is initialized and not a first-init
failure, upgrade, or conflict. It needs local materialization:

```text
npm --prefix .wizloft/harness ci --ignore-scripts --no-audit --no-fund
```

Successful clone recovery does not rewrite `project.json` when the release identity is unchanged.

The marker is written or replaced last. Marker-last is a successful-materialization sentinel. It
is not a transactional rollback of already-updated Harness-owned non-marker files.

On first-init or upgrade failure, partial non-marker scaffolding may remain. Retry / re-init is
the recovery contract for those cases. A previously valid marker continues to name the last
successfully materialized release until a newer isolated runtime is proven.

### Namespace

`.wizloft/` is an organization namespace and is not Harness-owned as a whole.

Harness machinery lives under `.wizloft/harness/`. Project-owned current truth lives at
`.wizloft/PROJECT.md`.

### Canonical instructions and agent discovery

Canonical Harness instructions live at `.wizloft/harness/INSTRUCTIONS.md`.

Agent-specific files may contain only a bounded managed bootstrap that points at those
instructions and the required execution command. They must not become a second copy of the
Harness contract.

The first concrete adapters are `AGENTS.md` and `CLAUDE.md`. Additional agent files remain a later
adapter decision, not an implied promise of this ADR.

### Required execution boundary

The generic project execution command is:

```text
node .wizloft/harness/run.mjs <Harness module argv>
```

The tracked runner is intentionally tiny. It owns process argv, the known repository-relative
root, process streams/env, Node-floor preflight, local-package resolution recovery, the final
exit code, and rendering of thrown bootstrap errors.

It must enforce Node `>=22.13.0` from `process.versions.node` before importing
`@wizloft/harness-project`. Only after that preflight may it dynamically import the local
package. If the package cannot be resolved because checkout materialization is absent, it writes
one actionable error containing the exact `npm ci` recovery command and sets exit code `1`.

Reusable runtime semantics belong to `runProjectHarness(...)` after the package has loaded.

The runner is not a Harness command parser, package installer, repository writer, parent-directory
discovery mechanism, or `process.exit()` owner. It must not auto-install, spawn npm, or use npx.

After a checkout is locally materialized, later Harness commands use that local runner. They do
not use per-command npx and do not require network.

### Portable wrapper versus host convenience

The generated runner is not a second Harness CLI implementation. It is a repository-local portable
wrapper, analogous to a project wrapper executable. It owns only the process boundary into the
exact isolated Harness runtime. It does not duplicate Harness command or project semantics.

Its purpose is to make a Harness-enabled repository independently operable by agents, CI, humans,
and clean machines or checkouts without requiring Wizloft CLI or another global Harness
executable.

Host integrations are optional convenience adapters. A host such as Wizloft CLI may expose UX
such as `wizloft harness ...` or `wizharness ...`, but a Harness-initialized project must not
depend on that host being installed. The portable repository contract remains independently
runnable.

A host integration does not have to spawn `node .wizloft/harness/run.mjs`. It may detect the
repository Harness contract, resolve the exact project-local
`.wizloft/harness/node_modules/@wizloft/harness-project`, load that local package, and invoke
`runProjectHarness(...)`. That avoids an unnecessary child process and duplicated lifecycle,
stream, or error ownership.

The project-local version wins. If a host CLI module carries Harness-project version X but the
repository marker / isolated runtime pins version Y, ordinary project Harness commands use Y.
The host’s own dependency must not silently replace the repository-pinned runtime.

Initialization and ordinary execution are different seams. A future host integration may use its
compatible bundled or released `@wizloft/harness-project` initializer for `wizharness init` or
`wizloft harness init` because init is pre-runtime scaffolding. After initialization, ordinary
project Harness commands must delegate to the repository’s exact local runtime:

```text
INIT
  host integration
    ->
  compatible initializer
    ->
  materialize repository-local runtime

NORMAL PROJECT COMMAND
  host integration
    ->
  repository marker
    ->
  project-local exact harness-project
    ->
  runProjectHarness
```

`init` is not a live Harness command.

This ADR still does not grant Harness ownership of `wizloft` or `wizharness`. Those remain
host-product executable UX if and when Wizloft CLI supplies them.

### Isolated runtime

Generic initialization must not create or mutate the host application’s root package manifest
merely so the repository can use Harness.

Harness tooling dependencies live in the isolated `.wizloft/harness/package.json` and
`.wizloft/harness/package-lock.json`. Isolated `node_modules/` is ignored checkout-local
materialization, not part of the tracked initialized contract.

The isolated manifest depends directly on exact `@wizloft/harness-project` only. That package owns
its own coherent public runtime dependency closure. `@wizloft/harness-memory` remains transitive
unless a later accepted decision makes it a direct import.

### Project identity

Initialization requires an explicit project ID. Generic init does not derive identity from a
directory name, README, or `package.json`.

Init creates durable `<projectId>:project`, `<projectId>:harness`, and Memory scope
`project:<projectId>`. It does not create a permanent task or migration subject.

Renaming or migrating project identity is outside this decision.

### Default current truth

Default project Authority and Context come only from the explicit generated paths
`.wizloft/PROJECT.md` and `.wizloft/harness/INSTRUCTIONS.md`.

Init does not auto-discover README, docs, package manifests, or other repository files.

Repository Context is current-tree truth. Git history, completed plans, Events, Evidence
provenance, and Memory lifecycle own history. History is not default Context.

### Local extension seam

Optional `.wizloft/harness/profile.local.mjs` may add bounded explicit repository Authority and
Context source mappings only.

It is not a generic plugin, profile-layer, capability, durability, or runtime-lifecycle override
API. Arbitrary plugin extension requires a later separate architecture decision.

A Context item with role `authority` is valid only when its path is also an Authority source in
the generated defaults or the same validated overlay. The Context subject need not equal the
Authority subject; the path must be backed by Authority. Supporting and historical Context paths
do not require an Authority mapping.

Missing overlay is a no-op. A present malformed overlay is a bootstrap failure:
`runProjectHarness` throws and the tiny runner renders once. The project health validator runs
only after a valid profile and runtime can be constructed.

### File ownership

Harness-owned non-marker generated files may be replaced during re-init or upgrade. `project.json`
is the only completion sentinel and is replaced last after the target release is successfully
materialized and proven. Failed upgrades may therefore leave new non-marker generated bytes while
the previous marker continues to describe the last successful release. This is intentionally not
whole-project transactional rollback. Retry is the recovery contract.

Harness-owned managed blocks: selected agent adapters and `.gitignore`. `--adapters` is desired
state. Selected adapters receive exactly one managed block. Previously installed but now
deselected adapters lose only the Harness-owned block; surrounding user bytes and the file itself
are preserved. Bytes outside managed blocks are preserved.

Project-owned create-once: `.wizloft/PROJECT.md`. Re-init never overwrites an existing file.

Project-owned optional and never created by init: `profile.local.mjs`.

Runtime and ignored: isolated `node_modules/` and local Memory/Event state.

### Filesystem safety

The initializer is a bounded repository writer.

Lasting guarantees:

- the repository root is explicit;
- there is no parent-directory search;
- managed paths must stay inside that root;
- managed symlink traversal is rejected;
- wrong file/directory types are rejected;
- preflight completes before writes;
- dry-run uses the same planning path and writes nothing;
- managed-block interiors may be updated or removed while surrounding user bytes are preserved;
- the initializer does not run Git index or worktree mutation commands;
- one exact npm install spawn during scaffolding is not a general process-execution capability.

### Node floor

Both the initializer and the generated project runner require Node `>=22.13.0` and must fail with
an actionable error on an unsupported runtime. Initializer enforcement is preflight and happens
before any repository mutation. Generated-runner enforcement happens before importing
`@wizloft/harness-project`.

### Non-goals

This decision does not add:

- Git scope-integrity or a Git observer;
- an Evidence closeout envelope;
- Context snapshots or versioned trees;
- agent or subagent orchestration;
- a sandbox;
- a workflow or job engine;
- a generic Git writer;
- arbitrary profile or plugin overlays;
- extra agent adapters;
- kernel changes.

## Consequences

- “This repository uses Harness” becomes a released, re-init-safe repository contract rather than a
  consumer-copied layout.
- Host application package graphs stay independent of generic Harness tooling.
- Agent discovery has one canonical instruction file and thin adapters.
- Failed initialization and failed upgrades remain recoverable by retry without promising
  transactional rollback of generated non-marker files.
- A fresh clone with a valid tracked marker is still Harness-initialized. Local `npm ci` restores
  the ignored runtime without rewriting the sentinel.
- Meldmark and later consumers wait for the released `@wizloft/harness-project` initializer instead
  of copying Wizloft CLI Gate H0.
- `run.mjs` is the guaranteed portable path into the exact project-local runtime. A host CLI is
  optional convenience and must not become a second Harness implementation or silently replace the
  repository-pinned version.
- Concrete artifact maps, marker fields, overlay export shape, and apply sequencing remain in the
  owning plan and implementation until they prove durable enough to promote further.

## Alternatives considered

- Mutating the host root `package.json` was rejected because empty, non-Node, and existing-app
  repositories cannot share that rule.
- Per-command npx after init was rejected because it requires network and is not a durable local
  runtime.
- An init-only package or an init command on the facade/commands packages was rejected because
  initialization is pre-runtime scaffolding and the generated runner must remain resolvable after
  npx exits.
- Host-CLI-owned generic init was rejected because Meldmark would not receive a released
  initializer.
- Treating a written marker as initialized before isolated runtime proof was rejected because a
  valid marker must mean the described contract has already been materialized.
- A generic `profile.local.mjs` plugin overlay was rejected as a second public composition API
  without a concrete pre-Meldmark consumer requirement.
