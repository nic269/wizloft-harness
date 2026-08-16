import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCapabilityToken,
  createHarnessRuntime,
  declareCapability,
  HarnessKernelError,
  requireCapability,
} from '../dist/index.js';

function plugin(definition) {
  return { version: '1.0.0', ...definition };
}

function hasDiagnostic(error, code) {
  return (
    error instanceof HarnessKernelError &&
    error.diagnostics.some((diagnostic) => diagnostic.code === code)
  );
}

test('capability tokens use stable exact-major ids instead of object identity', async (context) => {
  const providerToken = createCapabilityToken('context@1');
  const consumerToken = createCapabilityToken('context@1');
  const setupOrder = [];
  let consumedService;

  const runtime = await createHarnessRuntime({
    plugins: [
      plugin({
        name: 'zeta',
        setup() {
          setupOrder.push('zeta');
        },
      }),
      plugin({
        name: 'consumer',
        requires: [requireCapability(consumerToken)],
        setup(ctx) {
          setupOrder.push('consumer');
          consumedService = ctx.capabilities.get(consumerToken);
        },
      }),
      plugin({
        name: 'provider',
        provides: [declareCapability(providerToken)],
        setup(ctx) {
          setupOrder.push('provider');
          ctx.capabilities.provide(providerToken, { source: 'repository' });
        },
      }),
      plugin({
        name: 'alpha',
        setup() {
          setupOrder.push('alpha');
        },
      }),
    ],
  });
  context.after(() => runtime.shutdown());

  assert.deepEqual(runtime.pluginOrder, ['alpha', 'provider', 'consumer', 'zeta']);
  assert.deepEqual(setupOrder, runtime.pluginOrder);
  assert.deepEqual(consumedService, { source: 'repository' });
  assert.equal(runtime.getCapability(consumerToken), consumedService);
  assert.throws(
    () => createCapabilityToken('context@^1'),
    (error) => hasDiagnostic(error, 'INVALID_CAPABILITY_ID'),
  );
});

test('composition rejects duplicate plugin names before setup', async () => {
  let setupCount = 0;

  await assert.rejects(
    createHarnessRuntime({
      plugins: [
        plugin({
          name: 'duplicate',
          setup() {
            setupCount += 1;
          },
        }),
        plugin({
          name: 'duplicate',
          setup() {
            setupCount += 1;
          },
        }),
      ],
    }),
    (error) => hasDiagnostic(error, 'DUPLICATE_PLUGIN_NAME'),
  );

  assert.equal(setupCount, 0);
});

test('composition converts malformed runtime inputs into structured diagnostics', async () => {
  const malformedInputs = [
    {
      input: null,
      code: 'INVALID_PLUGIN',
    },
    {
      input: { plugins: [null] },
      code: 'INVALID_PLUGIN',
    },
    {
      input: {
        plugins: [
          plugin({
            name: 'malformed-requirement',
            requires: [null],
            setup() {},
          }),
        ],
      },
      code: 'INVALID_CAPABILITY_ID',
    },
  ];

  for (const { input, code } of malformedInputs) {
    await assert.rejects(createHarnessRuntime(input), (error) => hasDiagnostic(error, code));
  }
});

test('validated plugin identity remains stable when plugin objects mutate during setup', async (context) => {
  const mutablePlugin = plugin({
    name: 'alpha',
    setup() {
      mutablePlugin.name = 'zeta';
    },
  });
  const runtime = await createHarnessRuntime({
    plugins: [plugin({ name: 'beta', setup() {} }), mutablePlugin],
  });
  context.after(() => runtime.shutdown());

  assert.deepEqual(runtime.pluginOrder, ['alpha', 'beta']);
});

test('composition reports missing capability requirements before setup', async () => {
  const missingToken = createCapabilityToken('missing@1');
  let setupCalled = false;

  await assert.rejects(
    createHarnessRuntime({
      plugins: [
        plugin({
          name: 'consumer',
          requires: [requireCapability(missingToken)],
          setup() {
            setupCalled = true;
          },
        }),
      ],
    }),
    (error) => {
      assert.equal(hasDiagnostic(error, 'MISSING_CAPABILITY'), true);
      assert.match(error.diagnostics[0].message, /consumer.*missing@1/u);
      return true;
    },
  );

  assert.equal(setupCalled, false);
});

test('composition rejects multiple declared services for one capability id', async () => {
  const firstToken = createCapabilityToken('validation@1');
  const secondToken = createCapabilityToken('validation@1');

  await assert.rejects(
    createHarnessRuntime({
      plugins: [
        plugin({
          name: 'first-provider',
          provides: [declareCapability(firstToken)],
          setup() {},
        }),
        plugin({
          name: 'second-provider',
          provides: [declareCapability(secondToken)],
          setup() {},
        }),
      ],
    }),
    (error) => hasDiagnostic(error, 'DUPLICATE_CAPABILITY_SERVICE'),
  );
});

test('composition reports capability cycles with plugin and capability edges', async () => {
  const capabilityA = createCapabilityToken('a@1');
  const capabilityB = createCapabilityToken('b@1');

  await assert.rejects(
    createHarnessRuntime({
      plugins: [
        plugin({
          name: 'plugin-a',
          provides: [declareCapability(capabilityA)],
          requires: [requireCapability(capabilityB)],
          setup() {},
        }),
        plugin({
          name: 'plugin-b',
          provides: [declareCapability(capabilityB)],
          requires: [requireCapability(capabilityA)],
          setup() {},
        }),
      ],
    }),
    (error) => {
      assert.equal(hasDiagnostic(error, 'CAPABILITY_CYCLE'), true);
      assert.match(error.diagnostics[0].message, /plugin-a.*b@1.*plugin-b/u);
      assert.match(error.diagnostics[0].message, /plugin-b.*a@1.*plugin-a/u);
      return true;
    },
  );
});

test('runtime inspection is deterministic, immutable, and retained after disposal', async () => {
  const alpha = createCapabilityToken('alpha@1');
  const zeta = createCapabilityToken('zeta@1');
  const runtime = await createHarnessRuntime({
    runtimeIdGenerator: () => 'inspection-runtime',
    plugins: [
      plugin({
        name: 'provider',
        version: '1.2.3',
        provides: [declareCapability(zeta), declareCapability(alpha)],
        setup(context) {
          context.capabilities.provide(zeta, { id: 'zeta' });
          context.capabilities.provide(alpha, { id: 'alpha' });
          context.diagnostics.report({
            code: 'INSPECTION_NOTE',
            severity: 'info',
            message: 'recorded in order',
          });
        },
      }),
    ],
  });

  const active = runtime.inspect();
  assert.equal(Object.isFrozen(active), true);
  assert.equal(Object.isFrozen(active.plugins), true);
  assert.equal(Object.isFrozen(active.plugins[0].provides), true);
  assert.equal(Object.isFrozen(active.capabilities[0].provider), true);
  assert.deepEqual(active, {
    runtimeId: 'inspection-runtime',
    state: 'active',
    plugins: [
      {
        name: 'provider',
        version: '1.2.3',
        requires: [],
        provides: ['alpha@1', 'zeta@1'],
      },
    ],
    capabilities: [
      { id: 'alpha@1', provider: { name: 'provider', version: '1.2.3' } },
      { id: 'zeta@1', provider: { name: 'provider', version: '1.2.3' } },
    ],
    diagnostics: [
      {
        code: 'INSPECTION_NOTE',
        severity: 'info',
        message: 'recorded in order',
        pluginName: 'provider',
      },
    ],
  });

  const shutdown = runtime.shutdown();
  assert.equal(runtime.inspect().state, 'shutting-down');
  await shutdown;

  const disposed = runtime.inspect();
  assert.equal(disposed.state, 'disposed');
  assert.deepEqual(disposed.capabilities, []);
  assert.deepEqual(disposed.plugins, active.plugins);
});

test('plugins can access only required capabilities', async () => {
  const token = createCapabilityToken('context@1');

  await assert.rejects(
    createHarnessRuntime({
      plugins: [
        plugin({
          name: 'undeclared-consumer',
          setup(ctx) {
            ctx.capabilities.get(token);
          },
        }),
      ],
    }),
    (error) => hasDiagnostic(error, 'UNDECLARED_CAPABILITY_ACCESS'),
  );
});

test('plugins can provide only declared capability services', async () => {
  const token = createCapabilityToken('context@1');

  await assert.rejects(
    createHarnessRuntime({
      plugins: [
        plugin({
          name: 'undeclared-provider',
          setup(ctx) {
            ctx.capabilities.provide(token, {});
          },
        }),
      ],
    }),
    (error) => hasDiagnostic(error, 'UNDECLARED_CAPABILITY_PROVISION'),
  );
});

test('declared providers must activate their capability service during setup', async () => {
  const token = createCapabilityToken('context@1');

  await assert.rejects(
    createHarnessRuntime({
      plugins: [
        plugin({
          name: 'empty-provider',
          provides: [declareCapability(token)],
          setup() {},
        }),
      ],
    }),
    (error) => hasDiagnostic(error, 'MISSING_CAPABILITY_SERVICE'),
  );
});

test('capability services are scoped to each Harness runtime', async (context) => {
  const token = createCapabilityToken('memory@1');
  const provider = (value) =>
    plugin({
      name: 'memory-provider',
      provides: [declareCapability(token)],
      setup(ctx) {
        ctx.capabilities.provide(token, value);
      },
    });

  const first = await createHarnessRuntime({ plugins: [provider({ runtime: 'first' })] });
  const second = await createHarnessRuntime({ plugins: [provider({ runtime: 'second' })] });
  context.after(async () => {
    await second.shutdown();
    await first.shutdown();
  });

  assert.deepEqual(first.getCapability(token), { runtime: 'first' });
  assert.deepEqual(second.getCapability(token), { runtime: 'second' });
});

test('plugins can emit capability-specific diagnostics without extending kernel codes', async (context) => {
  const runtime = await createHarnessRuntime({
    plugins: [
      plugin({
        name: 'context-plugin',
        setup(ctx) {
          ctx.diagnostics.report({
            code: 'CONTEXT_CONTRIBUTOR_SKIPPED',
            severity: 'warning',
            message: 'Contributor did not apply to this repository',
          });
        },
      }),
    ],
  });
  context.after(() => runtime.shutdown());

  assert.deepEqual(runtime.diagnostics, [
    {
      code: 'CONTEXT_CONTRIBUTOR_SKIPPED',
      severity: 'warning',
      message: 'Contributor did not apply to this repository',
      pluginName: 'context-plugin',
    },
  ]);
});

test('external diagnostic sink failures do not block runtime creation or local diagnostics', async (context) => {
  let reports = 0;

  const runtime = await createHarnessRuntime({
    diagnostics: {
      report() {
        reports += 1;
        throw new Error('sink exploded');
      },
    },
    plugins: [
      plugin({
        name: 'context-plugin',
        setup(ctx) {
          ctx.diagnostics.report({
            code: 'CONTEXT_CONTRIBUTOR_SKIPPED',
            severity: 'warning',
            message: 'Contributor did not apply to this repository',
          });
        },
      }),
    ],
  });
  context.after(() => runtime.shutdown());

  assert.equal(reports, 1);
  assert.deepEqual(runtime.diagnostics, [
    {
      code: 'CONTEXT_CONTRIBUTOR_SKIPPED',
      severity: 'warning',
      message: 'Contributor did not apply to this repository',
      pluginName: 'context-plugin',
    },
  ]);
});

test('external diagnostic sinks cannot mutate kernel error evidence', async () => {
  const missingToken = createCapabilityToken('missing@1');

  await assert.rejects(
    createHarnessRuntime({
      diagnostics: {
        report(diagnostic) {
          diagnostic.message = 'tampered';
        },
      },
      plugins: [
        plugin({
          name: 'consumer',
          requires: [requireCapability(missingToken)],
          setup() {},
        }),
      ],
    }),
    (error) => {
      assert.equal(hasDiagnostic(error, 'MISSING_CAPABILITY'), true);
      assert.match(error.diagnostics[0].message, /consumer.*missing@1/u);
      assert.equal(Object.isFrozen(error.diagnostics[0]), true);
      return true;
    },
  );
});

test('setup failure rolls back initialized plugins in reverse order and continues after cleanup errors', async () => {
  const cleanupOrder = [];
  const reported = [];

  await assert.rejects(
    createHarnessRuntime({
      diagnostics: { report: (diagnostic) => reported.push(diagnostic) },
      plugins: [
        plugin({
          name: 'a-first',
          setup() {
            return () => {
              cleanupOrder.push('a-first');
            };
          },
        }),
        plugin({
          name: 'b-cleanup-fails',
          setup() {
            return () => {
              cleanupOrder.push('b-cleanup-fails');
              throw new Error('cleanup exploded');
            };
          },
        }),
        plugin({
          name: 'c-setup-fails',
          setup() {
            throw new Error('setup exploded');
          },
        }),
      ],
    }),
    (error) => {
      assert.equal(hasDiagnostic(error, 'PLUGIN_SETUP_FAILED'), true);
      assert.equal(hasDiagnostic(error, 'DISPOSER_FAILED'), true);
      return true;
    },
  );

  assert.deepEqual(cleanupOrder, ['b-cleanup-fails', 'a-first']);
  assert.deepEqual(
    reported.map((diagnostic) => diagnostic.code),
    ['PLUGIN_SETUP_FAILED', 'DISPOSER_FAILED'],
  );
});

test('shutdown follows reverse dependency order and completes all cleanup before rejecting', async () => {
  const token = createCapabilityToken('authority@1');
  const cleanupOrder = [];
  let consumerContext;

  const runtime = await createHarnessRuntime({
    plugins: [
      plugin({
        name: 'consumer',
        requires: [requireCapability(token)],
        setup(ctx) {
          consumerContext = ctx;
          return () => {
            assert.deepEqual(ctx.capabilities.get(token), { source: 'repository' });
            cleanupOrder.push('consumer');
            throw new Error('consumer cleanup failed');
          };
        },
      }),
      plugin({
        name: 'provider',
        provides: [declareCapability(token)],
        setup(ctx) {
          ctx.capabilities.provide(token, { source: 'repository' });
          return () => {
            cleanupOrder.push('provider');
          };
        },
      }),
    ],
  });

  await assert.rejects(runtime.shutdown(), (error) => {
    assert.equal(hasDiagnostic(error, 'DISPOSER_FAILED'), true);
    assert.match(error.diagnostics[0].cause, /consumer cleanup failed/u);
    return true;
  });

  assert.deepEqual(cleanupOrder, ['consumer', 'provider']);
  assert.ok(consumerContext);
  assert.throws(
    () => runtime.getCapability(token),
    (error) => hasDiagnostic(error, 'RUNTIME_DISPOSED'),
  );
});

test('retained plugin contexts lose capability access only after shutdown completes', async () => {
  const token = createCapabilityToken('context@1');
  let retainedContext;
  let serviceDuringShutdown;

  const runtime = await createHarnessRuntime({
    plugins: [
      plugin({
        name: 'consumer',
        requires: [requireCapability(token)],
        setup(ctx) {
          retainedContext = ctx;
          return () => {
            serviceDuringShutdown = ctx.capabilities.get(token);
          };
        },
      }),
      plugin({
        name: 'provider',
        provides: [declareCapability(token)],
        setup(ctx) {
          ctx.capabilities.provide(token, { source: 'repository' });
        },
      }),
    ],
  });

  await runtime.shutdown();

  assert.deepEqual(serviceDuringShutdown, { source: 'repository' });
  assert.ok(retainedContext);
  assert.throws(
    () => retainedContext.capabilities.get(token),
    (error) => hasDiagnostic(error, 'RUNTIME_DISPOSED'),
  );
});

test('successful shutdown is idempotent', async () => {
  let cleanupCount = 0;
  const runtime = await createHarnessRuntime({
    plugins: [
      plugin({
        name: 'plugin',
        setup() {
          return () => {
            cleanupCount += 1;
          };
        },
      }),
    ],
  });

  const firstShutdown = runtime.shutdown();
  const secondShutdown = runtime.shutdown();

  assert.equal(secondShutdown, firstShutdown);
  await firstShutdown;
  await secondShutdown;

  assert.equal(cleanupCount, 1);
});

test('failing shutdown reuses the same promise and does not rerun cleanup', async () => {
  let cleanupCount = 0;
  const runtime = await createHarnessRuntime({
    plugins: [
      plugin({
        name: 'plugin',
        setup() {
          return () => {
            cleanupCount += 1;
            throw new Error('cleanup exploded');
          };
        },
      }),
    ],
  });

  const firstShutdown = runtime.shutdown();
  const secondShutdown = runtime.shutdown();

  assert.equal(secondShutdown, firstShutdown);
  await assert.rejects(firstShutdown, (error) => hasDiagnostic(error, 'DISPOSER_FAILED'));
  await assert.rejects(secondShutdown, (error) => hasDiagnostic(error, 'DISPOSER_FAILED'));

  const thirdShutdown = runtime.shutdown();

  assert.equal(thirdShutdown, firstShutdown);
  await assert.rejects(thirdShutdown, (error) => hasDiagnostic(error, 'DISPOSER_FAILED'));
  assert.equal(cleanupCount, 1);
});
