import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEvidenceService,
  EVIDENCE_RECORDED_EVENT_ID,
  EvidenceError,
} from '../dist/evidence.js';

function eventPublisher(events, publish = async () => undefined) {
  return {
    async publish(type, payload) {
      events.push({ type: type.id, payload });
      await publish(type, payload);
      return {
        occurredAt: '2026-08-16T00:00:00.000Z',
        payload,
        runtimeId: 'test-runtime',
        sequence: events.length,
        type: type.id,
      };
    },
  };
}

test('evidence snapshots immutable records in acceptance order with injected ids and clock', async () => {
  const events = [];
  const ids = ['evidence-1', 'evidence-2'];
  const payload = { nested: ['before'] };
  const service = createEvidenceService({
    clock: () => new Date('2026-08-16T01:02:03.004Z'),
    events: eventPublisher(events),
    idFactory: () => ids.shift(),
  });

  const first = await service.record({
    correlationId: 'work-1',
    kind: 'test.proof',
    payload,
  });
  await service.record({ correlationId: 'work-1', kind: 'test.proof', payload: null });
  payload.nested[0] = 'after';

  assert.deepEqual(service.list(), [
    {
      id: 'evidence-1',
      correlationId: 'work-1',
      kind: 'test.proof',
      recordedAt: '2026-08-16T01:02:03.004Z',
      payload: { nested: ['before'] },
    },
    {
      id: 'evidence-2',
      correlationId: 'work-1',
      kind: 'test.proof',
      recordedAt: '2026-08-16T01:02:03.004Z',
      payload: null,
    },
  ]);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.payload));
  assert.ok(Object.isFrozen(first.payload.nested));
  assert.ok(Object.isFrozen(service.list()));
});

test('evidence publishes the full accepted record', async () => {
  const events = [];
  const service = createEvidenceService({
    clock: () => new Date('2026-08-16T01:02:03.004Z'),
    events: eventPublisher(events),
    idFactory: () => 'evidence-event',
  });

  const record = await service.record({ correlationId: 'work-2', kind: 'test.event', payload: 42 });

  assert.equal(events.length, 1);
  assert.equal(events[0].type, EVIDENCE_RECORDED_EVENT_ID);
  assert.strictEqual(events[0].payload, record);
  assert.deepEqual(events[0].payload, record);
});

test('evidence snapshots the validated event publisher callback at construction', async () => {
  const events = {
    published: [],
    async publish(type, payload) {
      this.published.push({ type: type.id, payload });
      return {
        occurredAt: '2026-08-16T00:00:00.000Z',
        payload,
        runtimeId: 'test-runtime',
        sequence: this.published.length,
        type: type.id,
      };
    },
  };
  const service = createEvidenceService({
    events,
    idFactory: () => 'stable-publisher',
  });
  events.publish = async () => {
    throw new Error('replacement publisher must not run');
  };

  const record = await service.record({
    correlationId: 'work-stable-publisher',
    kind: 'test.publisher-stability',
    payload: null,
  });

  assert.equal(events.published.length, 1);
  assert.strictEqual(events.published[0].payload, record);
});

test('evidence rejects malformed input and non-finite JSON data', async () => {
  const service = createEvidenceService({
    events: eventPublisher([]),
    idFactory: () => 'unused',
  });

  await assert.rejects(
    service.record({ correlationId: '', kind: 'test.invalid', payload: null }),
    (error) => error instanceof EvidenceError && error.code === 'INVALID_EVIDENCE_INPUT',
  );
  await assert.rejects(
    service.record({
      correlationId: 'work',
      kind: 'test.invalid',
      payload: Number.POSITIVE_INFINITY,
    }),
    (error) => error instanceof EvidenceError && error.code === 'INVALID_EVIDENCE_INPUT',
  );
});

test('evidence rejects empty and duplicate generated ids', async () => {
  const emptyIdService = createEvidenceService({
    events: eventPublisher([]),
    idFactory: () => ' ',
  });
  await assert.rejects(
    emptyIdService.record({ correlationId: 'work', kind: 'test.id', payload: null }),
    (error) => error instanceof EvidenceError && error.code === 'INVALID_EVIDENCE_ID',
  );

  const duplicateService = createEvidenceService({
    events: eventPublisher([]),
    idFactory: () => 'duplicate',
  });
  await duplicateService.record({ correlationId: 'work', kind: 'test.id', payload: null });
  await assert.rejects(
    duplicateService.record({ correlationId: 'work', kind: 'test.id', payload: null }),
    (error) => error instanceof EvidenceError && error.code === 'DUPLICATE_EVIDENCE_ID',
  );
});

test('event failure retains accepted evidence and exposes its record', async () => {
  const service = createEvidenceService({
    clock: () => new Date('2026-08-16T01:02:03.004Z'),
    events: eventPublisher([], async () => {
      throw new Error('persistence unavailable');
    }),
    idFactory: () => 'accepted-before-event-failure',
  });

  await assert.rejects(
    service.record({ correlationId: 'work', kind: 'test.failure', payload: { ok: false } }),
    (error) => {
      assert.ok(error instanceof EvidenceError);
      assert.equal(error.code, 'EVIDENCE_EVENT_PUBLISH_FAILED');
      assert.equal(error.record?.id, 'accepted-before-event-failure');
      return true;
    },
  );
  assert.equal(service.list().length, 1);
  assert.equal(service.list()[0].id, 'accepted-before-event-failure');
});
