# @wizloft/harness-kernel

Composition-only kernel for Wizloft Harness runtimes.

The public consumer-facing `@wizloft/harness` facade is still deferred. Slice 1 exposes only the
kernel package because no later-slice SDK responsibility is implemented yet.

## Slice 1 contract

- capability identity uses stable exact-major ids such as `context@1`;
- one active service may exist for each capability id in one runtime;
- plugins may access only `requires` capabilities and provide only `provides` services;
- capability requirements form a deterministic dependency graph;
- plugin names are unique within one resolved runtime;
- setup failure and shutdown clean up in reverse order and report every disposer failure;
- diagnostics accept capability-specific codes without adding them to the kernel.

```ts
import {
  createCapabilityToken,
  createHarnessRuntime,
  declareCapability,
} from '@wizloft/harness-kernel';

const greeting = createCapabilityToken<{ message: string }>('greeting@1');

const runtime = await createHarnessRuntime({
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
});

runtime.getCapability(greeting);
await runtime.shutdown();
```

Configuration, profiles, and events are intentionally deferred to Slice 2. Capability-specific
multi-contributor behavior belongs inside capability services, not in generic kernel multibinding.
