# Plugin and Capability Model

## Principle

**A small kernel owns invariants. Everything project-specific composes.**

This borrows the plugin-first composability lesson from DeepSeek Harness without reproducing its full agent runtime.

## Conceptual plugin contract

```ts
type CapabilityId = `${string}@${number}`;
type Disposer = () => void | Promise<void>;
type MaybePromise<T> = T | Promise<T>;

interface CapabilityToken<T> {
  readonly id: CapabilityId;
}

interface CapabilityRequirement<T = unknown> {
  readonly token: CapabilityToken<T>;
}

interface CapabilityDeclaration<T = unknown> {
  readonly token: CapabilityToken<T>;
}

interface WizloftPlugin<TConfig = unknown> {
  readonly name: string;
  readonly version: string;
  readonly requires?: readonly CapabilityRequirement[];
  readonly provides?: readonly CapabilityDeclaration[];
  setup(ctx: PluginContext<TConfig>): MaybePromise<void | Disposer>;
}

interface PluginContext<TConfig = unknown> {
  readonly config: Readonly<TConfig>;
  readonly capabilities: {
    get<T>(token: CapabilityToken<T>): T;
    provide<T>(token: CapabilityToken<T>, service: T): Disposer;
  };
  readonly events: EventBus;
  readonly diagnostics: DiagnosticSink;
}
```

The exact API may evolve while v0 tests reveal a simpler contract, but accepted semantics must remain. This is the target v0 context shape: Slice 1 implements only the capability/lifecycle/diagnostic surface it needs, while typed profile config and the event bus become available in Slice 2.

## Runtime identity and service cardinality

- capability tokens expose a stable serializable exact-major id such as `context@1`;
- registry identity is based on that id, not JavaScript object identity;
- v0 does not solve semver capability ranges;
- one active capability service exists per capability token in a resolved Harness runtime;
- capability services are runtime-scoped, never process-global singletons;
- plugin names are unique within one resolved runtime/profile;
- multiple plugin instances or instance ids are deferred until a real use case requires them.

Capability-specific multiplicity stays inside the owning service. For example, `ContextService.registerContributor()` and `ValidationService.registerValidator()` may host many registrations. The kernel does not implement generic multibinding.

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
- a plugin may access only capabilities declared in `requires`;
- a plugin may register only capability services declared in `provides`;
- duplicate plugin names or active services for the same capability token are startup errors;
- deterministic tie-breaking among independent DAG nodes exists only for reproducibility;
- plugins must declare real semantic dependencies through capability requirements rather than relying on sibling declaration order;
- add `before`/`after` only if capability dependencies cannot express a real requirement.

## Lifecycle

Setup may return a disposer. Registrations and other kernel-scoped effects created during setup are tracked immediately. If setup throws, the kernel first rolls back that plugin's partial effects in reverse creation order, then disposes previously initialized plugins in reverse setup order. Shutdown uses the same reverse-order cleanup. Cleanup continues after a disposer failure and emits useful diagnostics for every failure. Hot reload is not required in v0, but clean teardown and reversible registration should remain possible.

## Safety boundary

Plugins receive public capability APIs, not kernel private state. v0 does not execute arbitrary remote plugin code and makes no security-isolation claim.

## Generic seam rule

When deciding placement:

```text
required for composition invariant? -> kernel
reusable across projects?           -> capability/provider/plugin
specific to one project/domain?      -> project/domain plugin
```
