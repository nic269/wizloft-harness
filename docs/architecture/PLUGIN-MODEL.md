# Plugin and Capability Model

## Principle

**A small kernel owns invariants. Everything project-specific composes.**

This borrows the plugin-first composability lesson from DeepSeek Harness without reproducing its full agent runtime.

## Conceptual plugin contract

```ts
type CapabilityId = `${string}@${number}`;
type JsonPrimitive = string | number | boolean | null;
type JsonObject = { readonly [key: string]: JsonValue };
type JsonValue = JsonPrimitive | readonly JsonValue[] | JsonObject;
type DeepReadonly<T> = T extends JsonPrimitive
  ? T
  : T extends readonly (infer TItem)[]
    ? readonly DeepReadonly<TItem>[]
    : T extends object
      ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
      : never;
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

interface EventType<TPayload extends JsonValue> {
  readonly id: string;
}

interface EventEnvelope<TPayload extends JsonValue> {
  readonly runtimeId: string;
  readonly type: string;
  readonly sequence: number;
  readonly occurredAt: string;
  readonly payload: DeepReadonly<TPayload>;
}

interface WizloftPlugin<TConfig extends JsonValue = JsonObject> {
  readonly name: string;
  readonly version: string;
  readonly requires?: readonly CapabilityRequirement[];
  readonly provides?: readonly CapabilityDeclaration[];
  setup(ctx: PluginContext<TConfig>): MaybePromise<void | Disposer>;
}

interface PluginContext<TConfig extends JsonValue = JsonObject> {
  readonly config: DeepReadonly<TConfig>;
  readonly capabilities: {
    get<T>(token: CapabilityToken<T>): T;
    provide<T>(token: CapabilityToken<T>, service: T): Disposer;
  };
  readonly events: {
    publish<TPayload extends JsonValue>(
      type: EventType<TPayload>,
      payload: TPayload,
    ): Promise<EventEnvelope<TPayload>>;
    subscribe<TPayload extends JsonValue>(
      type: EventType<TPayload>,
      listener: (event: EventEnvelope<TPayload>) => MaybePromise<void>,
    ): Disposer;
    subscribeAll(
      listener: (event: EventEnvelope<JsonValue>) => MaybePromise<void>,
    ): Disposer;
  };
  readonly diagnostics: DiagnosticSink;
}
```

The exact API may evolve while v0 tests reveal a simpler contract, but accepted semantics must remain. This is the target v0 context shape: Slice 1 implements only the capability/lifecycle/diagnostic surface it needs, while typed profile config and the event bus become available in Slice 2.

## Profile configuration

- configuration is data-only: JSON-compatible primitives, arrays, plain objects, and `null`;
- plugins are added and then config overrides are applied for each named layer in declaration order;
- overrides may target plugins added in the current or an earlier layer;
- an override for an unknown-at-that-point plugin is a structured composition error;
- duplicate plugin additions are errors; v0 has no plugin replace/remove semantics;
- plain objects merge recursively;
- arrays, primitives, and `null` replace prior values;
- `undefined` in an override means inherit/no override;
- each resolved per-plugin config is cloned and deeply frozen before setup;
- a plugin receives only its own resolved config through `PluginContext<TConfig>.config`.

`TConfig` describes the resolved config shape a plugin expects. The v0 `ProfileLayer.config`
map is keyed by runtime plugin name and is not compile-time schema-correlated with each
plugin's `TConfig`. A plugin that requires a particular structure must therefore validate
its config at the setup/runtime boundary. `@wizloft/file-events` validates its required
`path` this way. Slice 2 does not add a schema library or typed profile-builder framework.

## Event contracts and delivery

- event tokens expose stable string identity and preserve independent plugin payload typing;
- v0 does not use module augmentation or a central closed event map;
- envelopes contain `runtimeId`, stable `type`, runtime-local monotonic `sequence`, ISO-8601 UTC `occurredAt`, and an immutable JSON-compatible payload snapshot;
- runtime id generation and the clock are injectable for deterministic tests;
- serialized publish calls assign sequence in accepted enqueue order;
- listeners run in subscription registration order, which is already reproducible because setup order is deterministic;
- plugin identity is retained on listener registrations for diagnostics, ownership, and cleanup, not publish-time sorting;
- each publish snapshots active listeners before delivery;
- listener failures are diagnosed and collected while remaining listeners continue, then publish rejects after snapshot delivery completes;
- successful listener side effects are not rolled back;
- event publication is non-reentrant in v0 and nested publication attempts fail with a structured diagnostic;
- setup may subscribe, but publication is rejected until the runtime is active;
- subscriptions are tracked as plugin-owned lifecycle effects and clean up during rollback/shutdown.

## Runtime identity and service cardinality

- capability tokens expose a stable serializable exact-major id such as `context@1`;
- registry identity is based on that id, not JavaScript object identity;
- v0 does not solve semver capability ranges;
- one active capability service exists per capability token in a resolved Harness runtime;
- capability services are runtime-scoped, never process-global singletons;
- plugin names are unique within one resolved runtime/profile;
- multiple plugin instances or instance ids are deferred until a real use case requires them.

Capability-specific multiplicity stays inside the owning service. For example, `ContextService.registerContributor()` and `ValidationService.registerValidator()` may host many registrations. The kernel does not implement generic multibinding.

## Identifier naming convention

- first-party runtime plugin ids use `@wizloft/<name>`;
- project/domain runtime plugin ids use `@<project>/<name>`;
- first-party event ids use `wizloft.<domain>.<event>`;
- project/domain event ids use `<project>.<domain>.<event>`.

Package names and runtime plugin ids serve different purposes. For example,
`@wizloft/harness-file-providers/events` registers runtime plugin id `@wizloft/file-events`. v0
documents this convention without adding kernel namespace registries or namespace-ownership
enforcement.

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
