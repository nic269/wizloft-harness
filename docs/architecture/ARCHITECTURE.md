# Architecture v0

## System model

```text
                    HUMAN / AGENT / CI
                           |
                           v
                    COMMAND / SDK SEAM
                           |
                           v
                    WIZLOFT HARNESS
                           |
               +-----------+-----------+
               |                       |
            KERNEL               CAPABILITIES
               |                       |
 plugin host / registry       Context / Authority
 config / lifecycle           Memory / Validation
 events / diagnostics         Evidence
               |                       |
               +-----------+-----------+
                           |
                         PLUGINS
                           |
        +------------------+------------------+
        |                  |                  |
     Providers          Policies          Integrations
        |                  |                  |
 file stores          authority gates    stack/domain
 repo context         validation rules   agent adapters
```

## Kernel responsibilities

The kernel owns only composition mechanics/invariants:

- plugin registration and lifecycle;
- capability registry and compatibility metadata;
- dependency graph resolution;
- deterministic ordering;
- configuration/profile composition primitives;
- event dispatch infrastructure;
- diagnostics and structured errors.

The kernel must not understand TypeScript, Next.js, Prisma, Shopify, Meldmark, Wizloft CLI, Codex, Claude Code, or DeepSeek semantics.

Kernel registries and capability services are scoped to one resolved Harness runtime instance. There are no process-global capability service singletons in v0.

## First-party capability contracts

- **Context** — contributors resolve the smallest useful context for work.
- **Authority** — resolves authoritative sources, precedence, ambiguity, conflict, and provenance.
- **Memory** — remembers learned knowledge with scope/provenance/lifecycle; never silently becomes authority.
- **Validation** — discovers and executes proof appropriate to work/change context.
- **Evidence** — normalizes proof/outcomes for humans, agents, and future automation.

They are first-party ecosystem modules, not kernel internals. Their public entrypoints live under
`@wizloft/harness` subpaths.

## Target package topology

The target public workspace topology is:

```text
packages/
  kernel/              @wizloft/harness-kernel
  harness/             @wizloft/harness
    authority.ts       @wizloft/harness/authority
    context.ts         @wizloft/harness/context
    evidence.ts        @wizloft/harness/evidence
    memory.ts          @wizloft/harness/memory
    validation.ts      @wizloft/harness/validation
    commands.ts        @wizloft/harness/commands
    cli.ts             @wizloft/harness/cli
  file-providers/      @wizloft/harness-file-providers
    events.ts          @wizloft/harness-file-providers/events
    memory.ts          @wizloft/harness-file-providers/memory
    memory-context.ts  @wizloft/harness-file-providers/memory-context
    repository.ts      @wizloft/harness-file-providers/repository
  project/             @wizloft/harness-project
profiles/
  self-host/           @wizloft/harness-profile-self-host (private)
  base/                deferred until real shared responsibility exists
```

`@wizloft/harness` is the public consumer-facing SDK facade and owns logically separate capability,
command, and IO-free CLI-adapter subpaths. `@wizloft/harness-file-providers` groups first-party
file-backed integrations while keeping their runtime plugin ids distinct. `@wizloft/harness-project`
is the public project-tooling package for pre-runtime repository initialization and the generated
project-local runner. Package boundaries exist only where dependencies, ownership, or lifecycle
justify their release and security cost.

## Durability planes

```text
Repository authority  -> accepted truth
Memory                -> learned/supporting knowledge
Events/evidence        -> execution history and proof
```

Deleting the memory index/store must not delete project truth. Deleting an event index must not alter accepted repository behavior.

## Profiles

Profiles are a kernel composition primitive. They compose plugins and declarative,
JSON-compatible plugin configuration deterministically:

```text
base
  -> stack profile
    -> domain profile/plugin
      -> project-local config/overrides
```

Each named layer is applied in declaration order. The kernel first adds that layer's
plugins, then applies that layer's per-plugin config overrides. An override may target a
plugin added in the same layer or an earlier layer; targeting a plugin that does not yet
exist is a structured composition error. Adding the same plugin name more than once is
also an error. v0 has no plugin replace/remove semantics.

Configuration accepts JSON-compatible primitives, arrays, plain objects, and `null`.
Plain objects merge recursively; arrays, primitives, and `null` replace the prior value;
and an `undefined` override means inherit/no override. The resolved config for each plugin
is cloned and deeply frozen before only that plugin receives it through its public
`PluginContext`.

`profiles/base` remains a target location and is created only when a real base profile has
plugins or configuration to compose.

`profiles/self-host` is the repository-specific Gate B composition. It uses existing first-party
providers plus project-owned validators to operate on Wizloft Harness itself; it is not a generic
profile framework or implicit default.

## Events

Typed event contracts use stable string-identified tokens such as
`createEventType<TPayload>('wizloft.validation.finished')`. Independent plugins keep their own
payload types without contributing to a closed global event map.

Every immutable event envelope contains:

- a runtime id;
- the stable event type string;
- a runtime-local monotonic sequence;
- an ISO-8601 UTC occurrence timestamp;
- an immutable JSON-compatible payload snapshot.

Runtime id generation and the clock have defaults and are injectable for deterministic
tests. `runtimeId + sequence` is the stable runtime-scoped event identity.

Publish calls are serialized and receive sequence numbers in accepted enqueue order.
Delivery uses deterministic subscription registration order. A publish snapshots its
active listener set before delivery, so subscription changes affect only later events.
Listener failures do not stop remaining listeners: the kernel collects structured
diagnostics and rejects the publish after the whole snapshot completes, without rolling
back successful listener effects.

Event publication is non-reentrant in v0. A listener attempting to publish another event
during delivery receives a structured failure instead of entering a nested scheduler or
queue deadlock. Plugins may subscribe during setup, but publication begins only after the
runtime becomes active. Subscriptions are plugin-owned effects and participate in normal
rollback and shutdown cleanup.

`plugins/file-events` is an ordinary event subscriber. It appends immutable envelopes as
JSONL and reads persisted events in append order. Persistence failures follow ordinary
listener failure semantics. v0 makes no transactional, write-ahead, or crash-durability
claim for this provider.

Runtime identifiers follow a lightweight namespacing convention before ecosystem growth:

- first-party plugin ids: `@wizloft/<name>`;
- project/domain plugin ids: `@<project>/<name>`;
- first-party event ids: `wizloft.<domain>.<event>`;
- project/domain event ids: `<project>.<domain>.<event>`.

The file-events package therefore registers the runtime plugin id `@wizloft/file-events`.
These are documentation conventions in v0; the kernel does not add namespace registries or
ownership enforcement.

## Agent/runtime relationship

Harness does not own a coding-agent runtime in v0:

```text
Codex --------+
Claude -------+--> adapter/command/SDK seam --> Wizloft Harness --> repository
DSH ----------+
Human CLI ----+
CI -----------+
```

## CLI ownership boundary

```text
wizloft-harness
  owns: command semantics, structured inputs/results, CLI adapter library,
        reusable project onboarding/runner semantics
  does not own: global `wizloft` or `wizharness` executable names

wizloft-cli
  owns: `wizloft`, `wizanh`, `wizshopify`, future `wizharness`
  delegates Harness behavior to the Harness adapter/command API
```

This prevents duplicate command logic while keeping Harness embeddable by agents, CI, future UIs, and DeepSeek integration.

## Project onboarding boundary

Project initialization is pre-runtime scaffolding, not a kernel capability and not a live-runtime
command.

```text
@wizloft/harness-project
    ->
pre-runtime repository initialization
    ->
generated project-local runner/profile
    ->
ordinary public Harness runtime
```

A repository is Harness-initialized when `.wizloft/harness/project.json` is a valid supported
marker and the required tracked artifacts are present. That marker names the last release whose
project contract successfully completed materialization when it was written. The marker is written
last.

A checkout is runnable only when that initialized contract can also resolve the exact
`@wizloft/harness-project` from ignored `.wizloft/harness/node_modules`. A fresh clone with a valid
marker is initialized and needs local `npm ci`; it is not a first-init failure or upgrade.

Generic tooling lives under `.wizloft/harness/`; `.wizloft/` remains an organization namespace.
Host application root manifests are not mutated merely to use Harness.

The generated `run.mjs` is the guaranteed repository-local portable path. It is a tiny wrapper into
the exact isolated Harness runtime, not a second Harness CLI. Host integration is optional
convenience. Both paths converge on the same project-local `runProjectHarness(...)` semantics:

```text
                           project-local exact
                           runProjectHarness()
                              ^          ^
                              |          |
                 portable     |          | optional host
                 wrapper      |          | convenience
                              |          |
                  run.mjs ----+          +---- host adapter
                                               |
                                      future wizharness /
                                      wizloft harness
```

`node .wizloft/harness/run.mjs <Harness module argv>` remains independently runnable by agents,
CI, humans, and clean checkouts. Using Harness does not require Wizloft CLI to be installed.

A host adapter may load the exact project-local
`.wizloft/harness/node_modules/@wizloft/harness-project` and invoke `runProjectHarness(...)`
directly. It must respect the repository marker and runtime identity. Ordinary project commands
use the repository-pinned runtime, not a host-bundled Harness version. The host must not
duplicate Harness command implementation.

Initialization remains a different seam from ordinary execution. A future host may use a
compatible initializer to materialize the repository-local runtime; after that, ordinary project
commands delegate to the project-local package. `init` is not a live Harness command.

The tracked runner stays tiny, enforces Node `>=22.13.0` before importing
`@wizloft/harness-project`, and delegates reusable runtime semantics to `runProjectHarness(...)`.

## Public SDK, commands, and CLI adapter

`@wizloft/harness` is a curated facade over exactly one owned Harness runtime. Consumers must pass
an explicit `HarnessProfile` to `createHarness()`; v0 has no implicit/default/global profile or
process-global runtime. The facade re-exports the stable profile contracts/helpers needed to define
and compose profiles, while provider plugins remain explicit application-bootstrap imports.

The facade delegates grouped Context, Authority, Memory, Validation, and Evidence operations to the
corresponding active capability service without exposing raw services or duplicating their business
logic. It also exposes immutable runtime inspection, optional event-history reading through a
construction-time snapshotted structural reader, and idempotent runtime shutdown. Facade lifecycle
and availability failures use structured `HarnessError` codes for unavailable capabilities, missing
event-history configuration, and a runtime that is no longer active; capability-specific errors
retain their existing public types.

Kernel inspection is read-only and deterministic: runtime id/state, resolved plugin order and
snapshotted plugin identity/requirements/provisions, active capability-to-provider identities, and
diagnostics in recorded order. It never exposes service instances, plugin config, mutable
collections, listeners, disposers, or registry internals. Inspection remains available during
shutdown and after disposal; disposed snapshots retain resolved plugin metadata but have no active
capabilities.

`@wizloft/harness/commands` is a bounded SDK command executor over the public facade, not a kernel
capability or command registry. It owns the stable v0 command ids `harness.inspect`,
`context.resolve`, `authority.resolve`, `memory.remember`, `memory.recall`, `memory.transition`,
`validation.select`, `validation.run`, `evidence.list`, and `events.read`. Unknown/untyped requests
are validated at runtime. Expected operational/domain failures become deeply immutable,
JSON-compatible command-error envelopes; completed negative domain results such as Authority
ambiguity/conflict or a Validation report with `ok: false` remain normal result envelopes.

`@wizloft/harness/cli` parses only Harness-module argv, invokes the command executor, and
returns rendered `{ exitCode, stdout, stderr }` data. It owns module-local `--json`, `--help`, and
Harness subcommand help, but never performs process IO, exits a process, runs shell commands, loads a
profile, or owns executable branding/version/root options. JSON mode emits exactly one envelope on
stdout and no structured-error stderr; human mode sends results to stdout and structured errors to
stderr. Exit codes are `0` for completed positive/inspection results, `1` for operational errors or
negative validation proof, and `2` for invalid argv/usage/unknown CLI commands.

The dependency direction is:

```text
@wizloft/harness-kernel
        -> @wizloft/harness
        -> @wizloft/harness-file-providers
        -> @wizloft/harness-project
```

`@wizloft/harness-project` depends directly on the facade, file providers, and kernel contracts its
generated profile and runner import. Publish layer remains DAG-derived, not a fixed special case.

Event history/replay is not a kernel capability. Commands use only the facade's optional reader;
the events provider may be adapted structurally by the embedding application without depending on
the facade root entrypoint.

## DeepSeek interoperability seam

Do not depend on DeepSeek Harness in v0. Keep contracts modular enough for either future direction:

1. a Wizloft adapter/provider backed by DSH; or
2. a DSH plugin consuming Wizloft services.
