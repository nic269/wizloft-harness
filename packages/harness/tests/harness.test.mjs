import assert from 'node:assert/strict';
import test from 'node:test';

import { AUTHORITY_CAPABILITY } from '@wizloft/harness-authority';
import { CONTEXT_CAPABILITY } from '@wizloft/harness-context';
import { EVIDENCE_CAPABILITY } from '@wizloft/harness-evidence';
import { declareCapability } from '@wizloft/harness-kernel';
import { MEMORY_CAPABILITY } from '@wizloft/harness-memory';
import { VALIDATION_CAPABILITY } from '@wizloft/harness-validation';

import { createHarness, defineProfile, HarnessError } from '../dist/index.js';

function profileWithServices(calls) {
  return defineProfile({
    layers: [
      {
        name: 'test-services',
        plugins: [
          {
            name: '@test/services',
            version: '1.0.0',
            provides: [
              declareCapability(CONTEXT_CAPABILITY),
              declareCapability(AUTHORITY_CAPABILITY),
              declareCapability(MEMORY_CAPABILITY),
              declareCapability(EVIDENCE_CAPABILITY),
              declareCapability(VALIDATION_CAPABILITY),
            ],
            setup(context) {
              context.capabilities.provide(CONTEXT_CAPABILITY, {
                registerContributor() {},
                async resolve(request) {
                  calls.push(['context.resolve', request]);
                  return Object.freeze({
                    subject: request.subject,
                    authority: Object.freeze([]),
                    supporting: Object.freeze([]),
                    historical: Object.freeze([]),
                  });
                },
              });
              context.capabilities.provide(AUTHORITY_CAPABILITY, {
                registerContributor() {},
                async resolve(request) {
                  calls.push(['authority.resolve', request]);
                  return Object.freeze({
                    status: 'missing',
                    subject: request.subject,
                    contenders: Object.freeze([]),
                    shadowed: Object.freeze([]),
                  });
                },
              });
              context.capabilities.provide(MEMORY_CAPABILITY, {
                recall(query) {
                  calls.push(['memory.recall', query]);
                  return Object.freeze([]);
                },
                async remember(input) {
                  calls.push(['memory.remember', input]);
                  return Object.freeze({ id: 'memory-1', state: 'candidate' });
                },
                async transition(input) {
                  calls.push(['memory.transition', input]);
                  return Object.freeze({ id: input.id, state: input.state });
                },
              });
              context.capabilities.provide(EVIDENCE_CAPABILITY, {
                async record() {
                  throw new Error('not used');
                },
                list() {
                  calls.push(['evidence.list']);
                  return Object.freeze([]);
                },
              });
              context.capabilities.provide(VALIDATION_CAPABILITY, {
                registerValidator() {},
                async select(request) {
                  calls.push(['validation.select', request]);
                  return Object.freeze({ request, entries: Object.freeze([]) });
                },
                async run(request) {
                  calls.push(['validation.run', request]);
                  return Object.freeze({
                    ok: true,
                    request,
                    selection: Object.freeze({ request, entries: Object.freeze([]) }),
                    outcomes: Object.freeze([]),
                  });
                },
              });
            },
          },
        ],
      },
    ],
  });
}

test('facade delegates grouped operations without exposing capability services', async () => {
  const calls = [];
  const harness = await createHarness({
    profile: profileWithServices(calls),
    runtimeIdGenerator: () => 'facade-runtime',
  });

  await harness.context.resolve({ subject: 'context' });
  await harness.authority.resolve({ subject: 'authority' });
  await harness.memory.remember({ marker: 'remember' });
  harness.memory.recall({ marker: 'recall' });
  await harness.memory.transition({ id: 'memory-1', state: 'active' });
  await harness.validation.select({ correlationId: 'select', changedPaths: [] });
  await harness.validation.run({ correlationId: 'run', changedPaths: [] });
  harness.evidence.list();

  assert.equal(harness.runtimeId, 'facade-runtime');
  assert.equal('getCapability' in harness, false);
  assert.deepEqual(
    calls.map(([operation]) => operation),
    [
      'context.resolve',
      'authority.resolve',
      'memory.remember',
      'memory.recall',
      'memory.transition',
      'validation.select',
      'validation.run',
      'evidence.list',
    ],
  );

  await harness.shutdown();
});

test('facade distinguishes missing capabilities from a non-active runtime', async () => {
  const harness = await createHarness({
    profile: defineProfile({ layers: [] }),
    runtimeIdGenerator: () => 'empty-runtime',
  });

  assert.throws(
    () => harness.context.resolve({ subject: 'missing' }),
    (error) => {
      assert.equal(error instanceof HarnessError, true);
      assert.equal(error.code, 'CAPABILITY_UNAVAILABLE');
      assert.equal(error.capabilityId, 'context@1');
      assert.equal(error.state, 'active');
      return true;
    },
  );

  const firstShutdown = harness.shutdown();
  const secondShutdown = harness.shutdown();
  assert.equal(firstShutdown, secondShutdown);
  await firstShutdown;

  assert.equal(harness.inspect().state, 'disposed');
  assert.throws(
    () => harness.context.resolve({ subject: 'disposed' }),
    (error) => {
      assert.equal(error.code, 'HARNESS_NOT_ACTIVE');
      assert.equal(error.state, 'disposed');
      return true;
    },
  );
});

test('event history is optional and its validated callback is stable after construction', async () => {
  const envelope = Object.freeze({
    runtimeId: 'history-runtime',
    type: 'wizloft.test.recorded',
    sequence: 1,
    occurredAt: '2026-08-17T00:00:00.000Z',
    payload: Object.freeze({ ok: true }),
  });
  let originalCalls = 0;
  const reader = {
    read() {
      originalCalls += 1;
      return [envelope];
    },
  };
  const harness = await createHarness({
    profile: defineProfile({ layers: [] }),
    eventHistoryReader: reader,
  });
  reader.read = () => [];

  const events = await harness.events.read();
  assert.deepEqual(events, [envelope]);
  assert.equal(Object.isFrozen(events), true);
  assert.equal(originalCalls, 1);
  await harness.shutdown();

  const withoutHistory = await createHarness({ profile: defineProfile({ layers: [] }) });
  await assert.rejects(withoutHistory.events.read(), (error) => {
    assert.equal(error.code, 'EVENT_HISTORY_UNAVAILABLE');
    return true;
  });
  await withoutHistory.shutdown();

  const historyCause = new Error('corrupt history');
  const failingHistory = await createHarness({
    profile: defineProfile({ layers: [] }),
    eventHistoryReader: {
      read() {
        throw historyCause;
      },
    },
  });
  await assert.rejects(failingHistory.events.read(), (error) => {
    assert.equal(error.code, 'EVENT_HISTORY_READ_FAILED');
    assert.equal(error.cause, historyCause);
    return true;
  });
  await failingHistory.shutdown();
});

test('event history snapshots and deeply freezes caller-owned envelopes', async () => {
  const payload = { nested: { values: [1, 2] } };
  const envelope = {
    runtimeId: 'history-runtime',
    type: 'wizloft.test.recorded',
    sequence: 1,
    occurredAt: '2026-08-17T00:00:00.000Z',
    payload,
  };
  const harness = await createHarness({
    profile: defineProfile({ layers: [] }),
    eventHistoryReader: { read: () => [envelope] },
  });

  const history = await harness.events.read();
  envelope.runtimeId = 'mutated-runtime';
  payload.nested.values.push(3);

  assert.equal(history[0].runtimeId, 'history-runtime');
  assert.deepEqual(history[0].payload, { nested: { values: [1, 2] } });
  assert.equal(Object.isFrozen(history), true);
  assert.equal(Object.isFrozen(history[0]), true);
  assert.equal(Object.isFrozen(history[0].payload), true);
  assert.equal(Object.isFrozen(history[0].payload.nested), true);
  assert.equal(Object.isFrozen(history[0].payload.nested.values), true);
  await harness.shutdown();
});

test('malformed event-history entries fail at the reader boundary', async () => {
  const valid = {
    runtimeId: 'history-runtime',
    type: 'wizloft.test.recorded',
    sequence: 1,
    occurredAt: '2026-08-17T00:00:00.000Z',
    payload: { ok: true },
  };
  const malformedEntries = [
    { ...valid, runtimeId: '   ' },
    { ...valid, type: 'invalid event type' },
    { ...valid, sequence: Number.MAX_SAFE_INTEGER + 1 },
    { ...valid, occurredAt: '2026-08-17T00:00:00Z' },
    { ...valid, payload: { value: Number.POSITIVE_INFINITY } },
  ];

  for (const entry of malformedEntries) {
    const harness = await createHarness({
      profile: defineProfile({ layers: [] }),
      eventHistoryReader: { read: () => [entry] },
    });
    await assert.rejects(harness.events.read(), (error) => {
      assert.equal(error instanceof HarnessError, true);
      assert.equal(error.code, 'INVALID_EVENT_HISTORY_READER');
      return true;
    });
    await harness.shutdown();
  }
});
