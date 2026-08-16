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

They are first-party ecosystem packages, not kernel internals.

## Target package topology

The target workspace topology is:

```text
packages/
  kernel/              @wizloft/harness-kernel
  context/             @wizloft/harness-context
  authority/           @wizloft/harness-authority
  memory/              @wizloft/harness-memory
  validation/          @wizloft/harness-validation
  evidence/            @wizloft/harness-evidence
  commands/            @wizloft/harness-commands
  cli-adapter/         @wizloft/harness-cli-adapter
  harness/             @wizloft/harness
plugins/
  repository-files/
  file-events/
  file-memory/
profiles/
  base/
```

`@wizloft/harness` is the public consumer-facing SDK facade. This topology is a target architecture, not a requirement to scaffold empty packages. Each package should be created only when its implementation slice gives it a real responsibility.

## Durability planes

```text
Repository authority  -> accepted truth
Memory                -> learned/supporting knowledge
Events/evidence        -> execution history and proof
```

Deleting the memory index/store must not delete project truth. Deleting an event index must not alter accepted repository behavior.

## Profiles

Profiles compose plugins/configuration deterministically:

```text
base
  -> stack profile
    -> domain profile/plugin
      -> project-local config/overrides
```

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
  owns: command semantics, structured inputs/results, CLI adapter library
  does not own: global `wizloft` or `wizharness` executable names

wizloft-cli
  owns: `wizloft`, `wizanh`, `wizshopify`, future `wizharness`
  delegates Harness behavior to the Harness adapter/command API
```

This prevents duplicate command logic while keeping Harness embeddable by agents, CI, future UIs, and DeepSeek integration.

## DeepSeek interoperability seam

Do not depend on DeepSeek Harness in v0. Keep contracts modular enough for either future direction:

1. a Wizloft adapter/provider backed by DSH; or
2. a DSH plugin consuming Wizloft services.
