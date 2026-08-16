# @wizloft/harness-kernel

Composition-only kernel for Wizloft Harness runtimes.

The public consumer-facing facade now exists in `@wizloft/harness`. This kernel package remains
composition-only and exposes runtime mechanics/invariants rather than consumer capability wrappers.

## Current contract

- capability identity uses stable exact-major ids such as `context@1`;
- one active service may exist for each capability id in one runtime;
- plugins may access only `requires` capabilities and provide only `provides` services;
- capability requirements form a deterministic dependency graph;
- plugin names are unique within one resolved runtime;
- setup failure and shutdown clean up in reverse order and report every disposer failure;
- diagnostics accept capability-specific codes without adding them to the kernel.
- named profile layers add plugins and then apply deterministic per-plugin config overrides;
- plugin config is JSON-compatible, cloned, deeply frozen, and visible only to its plugin;
- typed event tokens use stable string identity without a global event map;
- event publication is serialized, immutable, listener-snapshotted, and non-reentrant;
- listener subscriptions are plugin-owned lifecycle effects.

```ts
import {
  createCapabilityToken,
  createEventType,
  createHarnessRuntime,
  declareCapability,
} from '@wizloft/harness-kernel';

const greeting = createCapabilityToken<{ message: string }>('greeting@1');
const completed = createEventType<{ result: string }>('wizloft.example.completed');

const runtime = await createHarnessRuntime({
  profile: {
    layers: [
      {
        name: 'example',
        plugins: [
          {
            name: 'greeting-provider',
            version: '1.0.0',
            provides: [declareCapability(greeting)],
            setup(context) {
              context.capabilities.provide(greeting, { message: 'hello' });
            },
          },
        ],
        config: { 'greeting-provider': { enabled: true } },
      },
    ],
  },
});

runtime.getCapability(greeting);
await runtime.events.publish(completed, { result: 'ok' });
await runtime.shutdown();
```

Capability-specific multi-contributor behavior belongs inside capability services, not in generic
kernel multibinding. Replay, projections, workflows, capability packages, commands, and the public
SDK facade remain outside the kernel package.
