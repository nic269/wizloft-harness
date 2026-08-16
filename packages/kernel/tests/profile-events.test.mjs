import assert from 'node:assert/strict';
import test from 'node:test';

import {
  composeProfile,
  createEventType,
  createHarnessRuntime,
  defineProfile,
  HarnessKernelError,
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

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

test('profile layers merge plugin config deterministically and expose only frozen snapshots', async (context) => {
  const baseConfig = {
    list: [1, 2],
    mode: 'base',
    nested: { inherited: 'keep', replace: 'old' },
    nullable: 'value',
  };
  let receivedConfig;
  let otherConfig;
  const configured = plugin({
    name: 'configured',
    setup(ctx) {
      receivedConfig = ctx.config;
    },
  });
  const other = plugin({
    name: 'other',
    setup(ctx) {
      otherConfig = ctx.config;
    },
  });
  const profile = defineProfile({
    layers: [
      {
        name: 'base',
        plugins: [configured, other],
        config: { configured: baseConfig },
      },
      {
        name: 'project',
        config: {
          configured: {
            list: [3],
            mode: false,
            nested: { inherited: undefined, replace: 'new' },
            nullable: null,
          },
        },
      },
    ],
  });

  const resolved = composeProfile(profile);
  assert.deepEqual(
    resolved.plugins.map(({ name }) => name),
    ['configured', 'other'],
  );
  assert.deepEqual(resolved.plugins[0].config, {
    list: [3],
    mode: false,
    nested: { inherited: 'keep', replace: 'new' },
    nullable: null,
  });

  const runtime = await createHarnessRuntime({ profile });
  context.after(() => runtime.shutdown());

  baseConfig.nested.inherited = 'mutated-after-start';
  baseConfig.list.push(4);

  assert.deepEqual(receivedConfig, resolved.plugins[0].config);
  assert.deepEqual(otherConfig, {});
  assert.notEqual(receivedConfig, baseConfig);
  assert.equal(Object.isFrozen(receivedConfig), true);
  assert.equal(Object.isFrozen(receivedConfig.nested), true);
  assert.equal(Object.isFrozen(receivedConfig.list), true);
  assert.throws(() => {
    receivedConfig.nested.replace = 'mutated';
  }, TypeError);
});

test('profile composition rejects unknown-at-that-point overrides and duplicate plugin additions', () => {
  const target = plugin({ name: 'target', setup() {} });

  assert.throws(
    () =>
      composeProfile({
        layers: [
          { name: 'early', config: { target: { value: true } } },
          { name: 'late', plugins: [target] },
        ],
      }),
    (error) => hasDiagnostic(error, 'UNKNOWN_PLUGIN_CONFIG'),
  );

  assert.throws(
    () =>
      composeProfile({
        layers: [
          { name: 'first', plugins: [target] },
          { name: 'second', plugins: [target] },
        ],
      }),
    (error) => hasDiagnostic(error, 'DUPLICATE_PLUGIN_NAME'),
  );
});

test('profile composition rejects non-JSON-compatible config with structured diagnostics', () => {
  assert.throws(
    () =>
      composeProfile({
        layers: [
          {
            name: 'invalid',
            plugins: [plugin({ name: 'target', setup() {} })],
            config: { target: { createdAt: new Date() } },
          },
        ],
      }),
    (error) => hasDiagnostic(error, 'INVALID_CONFIG'),
  );
});

test('event tokens use stable string identity and envelopes contain immutable runtime evidence', async (context) => {
  const subscribedType = createEventType('wizloft.validation.finished');
  const publishedType = createEventType('wizloft.validation.finished');
  const observed = [];
  let clockTick = 0;
  const runtime = await createHarnessRuntime({
    clock: () => new Date(Date.UTC(2026, 7, 16, 1, 2, clockTick++)),
    runtimeIdGenerator: () => 'runtime-test',
    plugins: [
      plugin({
        name: 'listener',
        setup(ctx) {
          ctx.events.subscribe(subscribedType, (event) => {
            observed.push(event);
            assert.throws(() => {
              event.payload.result.status = 'mutated';
            }, TypeError);
          });
        },
      }),
    ],
  });
  context.after(() => runtime.shutdown());

  const payload = { result: { status: 'passed' } };
  const envelope = await runtime.events.publish(publishedType, payload);
  payload.result.status = 'changed-after-publish';

  assert.equal(runtime.runtimeId, 'runtime-test');
  assert.deepEqual(envelope, {
    runtimeId: 'runtime-test',
    type: 'wizloft.validation.finished',
    sequence: 1,
    occurredAt: '2026-08-16T01:02:00.000Z',
    payload: { result: { status: 'passed' } },
  });
  assert.equal(observed[0], envelope);
  assert.equal(Object.isFrozen(envelope), true);
  assert.equal(Object.isFrozen(envelope.payload.result), true);
});

test('serialized publishes snapshot payloads at enqueue time and preserve accepted order', async (context) => {
  const type = createEventType('test.serialized');
  const firstStarted = deferred();
  const releaseFirst = deferred();
  const calls = [];
  const runtime = await createHarnessRuntime({
    runtimeIdGenerator: () => 'serialized-runtime',
    plugins: [
      plugin({
        name: 'listener',
        setup(ctx) {
          ctx.events.subscribe(type, async (event) => {
            calls.push(`start:${event.sequence}:${event.payload.value}`);
            if (event.sequence === 1) {
              firstStarted.resolve();
              await releaseFirst.promise;
            }
            calls.push(`end:${event.sequence}:${event.payload.value}`);
          });
        },
      }),
    ],
  });
  context.after(() => runtime.shutdown());

  const first = runtime.events.publish(type, { value: 'first' });
  await firstStarted.promise;
  const secondPayload = { value: 'second' };
  const second = runtime.events.publish(type, secondPayload);
  const third = runtime.events.publish(type, { value: 'third' });
  secondPayload.value = 'mutated';
  releaseFirst.resolve();

  const envelopes = await Promise.all([first, second, third]);
  assert.deepEqual(
    envelopes.map(({ sequence }) => sequence),
    [1, 2, 3],
  );
  assert.deepEqual(calls, [
    'start:1:first',
    'end:1:first',
    'start:2:second',
    'end:2:second',
    'start:3:third',
    'end:3:third',
  ]);
});

test('listener snapshots preserve registration order across subscription changes', async (context) => {
  const type = createEventType('test.snapshot');
  const calls = [];
  const runtime = await createHarnessRuntime({
    plugins: [
      plugin({
        name: 'listener',
        setup(ctx) {
          let disposeSecond = () => {};
          ctx.events.subscribe(type, (event) => {
            calls.push(`first:${event.sequence}`);
            if (event.sequence === 1) {
              disposeSecond();
              ctx.events.subscribe(type, (laterEvent) => {
                calls.push(`third:${laterEvent.sequence}`);
              });
            }
          });
          disposeSecond = ctx.events.subscribe(type, (event) => {
            calls.push(`second:${event.sequence}`);
          });
        },
      }),
    ],
  });
  context.after(() => runtime.shutdown());

  await runtime.events.publish(type, { value: 1 });
  await runtime.events.publish(type, { value: 2 });

  assert.deepEqual(calls, ['first:1', 'second:1', 'first:2', 'third:2']);
});

test('listener failures continue delivery and reject publish after the snapshot completes', async (context) => {
  const type = createEventType('test.listener-failure');
  const calls = [];
  const runtime = await createHarnessRuntime({
    plugins: [
      plugin({
        name: 'listener',
        setup(ctx) {
          ctx.events.subscribe(type, () => {
            calls.push('failing');
            throw new Error('listener exploded');
          });
          ctx.events.subscribe(type, () => {
            calls.push('continued');
          });
        },
      }),
    ],
  });
  context.after(() => runtime.shutdown());

  await assert.rejects(runtime.events.publish(type, { value: true }), (error) =>
    hasDiagnostic(error, 'EVENT_LISTENER_FAILED'),
  );
  assert.deepEqual(calls, ['failing', 'continued']);
  assert.equal(
    runtime.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === 'EVENT_LISTENER_FAILED' &&
        diagnostic.eventType === 'test.listener-failure' &&
        diagnostic.eventSequence === 1,
    ),
    true,
  );
});

test('nested publication is rejected only while its listener delivery remains active', async (context) => {
  const outerType = createEventType('test.outer');
  const innerType = createEventType('test.inner');
  const detachedType = createEventType('test.detached');
  const detachedPublication = deferred();
  const detachedObserved = [];
  let nestedError;
  const runtime = await createHarnessRuntime({
    plugins: [
      plugin({
        name: 'listener',
        setup(ctx) {
          ctx.events.subscribe(outerType, async () => {
            setTimeout(() => {
              ctx.events
                .publish(detachedType, { detached: true })
                .then(detachedPublication.resolve, detachedPublication.reject);
            }, 0);
            try {
              await ctx.events.publish(innerType, { nested: true });
            } catch (error) {
              nestedError = error;
              throw error;
            }
          });
          ctx.events.subscribe(detachedType, (event) => {
            detachedObserved.push(event);
          });
        },
      }),
    ],
  });
  context.after(() => runtime.shutdown());

  await assert.rejects(
    Promise.race([
      runtime.events.publish(outerType, { outer: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('publish deadlocked')), 1_000)),
    ]),
    (error) => hasDiagnostic(error, 'EVENT_LISTENER_FAILED'),
  );
  assert.equal(hasDiagnostic(nestedError, 'EVENT_PUBLISH_REENTRANT'), true);

  const detachedEnvelope = await Promise.race([
    detachedPublication.promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('detached publish was not delivered')), 1_000),
    ),
  ]);
  assert.equal(detachedEnvelope.sequence, 2);
  assert.deepEqual(detachedEnvelope.payload, { detached: true });
  assert.deepEqual(detachedObserved, [detachedEnvelope]);
});

test('event publication is unavailable during setup and after shutdown', async () => {
  const type = createEventType('test.lifecycle');

  await assert.rejects(
    createHarnessRuntime({
      plugins: [
        plugin({
          name: 'publisher',
          async setup(ctx) {
            await ctx.events.publish(type, { phase: 'setup' });
          },
        }),
      ],
    }),
    (error) =>
      hasDiagnostic(error, 'EVENT_PUBLISH_NOT_ACTIVE') &&
      hasDiagnostic(error, 'PLUGIN_SETUP_FAILED'),
  );

  const runtime = await createHarnessRuntime({ plugins: [] });
  await runtime.shutdown();
  await assert.rejects(runtime.events.publish(type, { phase: 'disposed' }), (error) =>
    hasDiagnostic(error, 'RUNTIME_DISPOSED'),
  );
});

test('shutdown waits for accepted event delivery before plugin cleanup', async () => {
  const type = createEventType('test.shutdown-drain');
  const listenerStarted = deferred();
  const releaseListener = deferred();
  const calls = [];
  const runtime = await createHarnessRuntime({
    plugins: [
      plugin({
        name: 'listener',
        setup(ctx) {
          ctx.events.subscribe(type, async () => {
            calls.push('listener:start');
            listenerStarted.resolve();
            await releaseListener.promise;
            calls.push('listener:end');
          });
          return () => {
            calls.push('plugin:dispose');
          };
        },
      }),
    ],
  });

  const publication = runtime.events.publish(type, { value: true });
  await listenerStarted.promise;
  const shutdown = runtime.shutdown();
  releaseListener.resolve();
  await publication;
  await shutdown;

  assert.deepEqual(calls, ['listener:start', 'listener:end', 'plugin:dispose']);
});

test('invalid event types and payloads produce structured diagnostics', async (context) => {
  assert.throws(
    () => createEventType('invalid event'),
    (error) => hasDiagnostic(error, 'INVALID_EVENT_TYPE'),
  );

  const type = createEventType('test.invalid-payload');
  const runtime = await createHarnessRuntime({ plugins: [] });
  context.after(() => runtime.shutdown());

  await assert.rejects(runtime.events.publish(type, { value: Number.NaN }), (error) =>
    hasDiagnostic(error, 'INVALID_EVENT_PAYLOAD'),
  );

  const invalidClockRuntime = await createHarnessRuntime({
    clock() {
      throw new Error('clock unavailable');
    },
    plugins: [],
  });
  context.after(() => invalidClockRuntime.shutdown());
  await assert.rejects(invalidClockRuntime.events.publish(type, { value: true }), (error) =>
    hasDiagnostic(error, 'INVALID_CLOCK'),
  );
});
