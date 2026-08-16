# Plugin and Capability Model

## Principle

**A small kernel owns invariants. Everything project-specific composes.**

This borrows the plugin-first composability lesson from DeepSeek Harness without reproducing its full agent runtime.

## Conceptual plugin contract

```ts
interface WizloftPlugin {
  name: string;
  version: string;
  requires?: CapabilityRequirement[];
  provides?: CapabilityDeclaration[];
  setup(ctx: PluginContext): void | Disposer | Promise<void | Disposer>;
}
```

The exact API may evolve while v0 tests reveal a simpler contract, but accepted semantics must remain.

## Plugin categories

Organizational conventions, not different kernel mechanisms:

- **providers** — capability backends (file memory, event store, repo context);
- **policies** — guards/decision rules around capabilities;
- **stack plugins** — TypeScript, Node, Next.js, Prisma, Shopify, etc.;
- **domain plugins** — Meldmark or another Wizloft domain;
- **workflow plugins** — later, only if repeated work shapes justify them;
- **agent/runtime adapters** — Codex, Claude Code, DeepSeek Harness, etc.

## Capability identifiers

Leave room for versioned contracts:

```text
context@1
authority@1
memory@1
validation@1
evidence@1
```

## Dependencies and ordering

- required capabilities form the primary dependency DAG;
- composition order is deterministic;
- missing/incompatible requirements fail with actionable diagnostics;
- cycles are startup errors;
- add `before`/`after` only if capability dependencies cannot express a real requirement.

## Lifecycle

Setup may return a disposer. Hot reload is not required in v0, but clean teardown and reversible registration should remain possible.

## Safety boundary

Plugins receive public capability APIs, not kernel private state. v0 does not execute arbitrary remote plugin code and makes no security-isolation claim.

## Generic seam rule

When deciding placement:

```text
required for composition invariant? -> kernel
reusable across projects?           -> capability/provider/plugin
specific to one project/domain?      -> project/domain plugin
```
