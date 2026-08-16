import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createEventType, createHarnessRuntime, HarnessKernelError } from '@wizloft/harness-kernel';

import { FILE_EVENTS_PLUGIN_NAME, fileEventsPlugin, readFileEvents } from '../dist/index.js';

function plugin(definition) {
  return { version: '1.0.0', ...definition };
}

function hasDiagnostic(error, code) {
  return (
    error instanceof HarnessKernelError &&
    error.diagnostics.some((diagnostic) => diagnostic.code === code)
  );
}

async function temporaryDirectory(context) {
  const directory = await mkdtemp(join(tmpdir(), 'wizloft-file-events-'));
  context.after(() => rm(directory, { force: true, recursive: true }));
  return directory;
}

function profile(path, additionalPlugins = []) {
  return {
    layers: [
      {
        name: 'events',
        plugins: [fileEventsPlugin, ...additionalPlugins],
        config: { [FILE_EVENTS_PLUGIN_NAME]: { path } },
      },
    ],
  };
}

const validEnvelope = {
  runtimeId: 'runtime-history',
  type: 'wizloft.test.recorded',
  sequence: 1,
  occurredAt: '2026-08-16T02:00:00.000Z',
  payload: { value: true },
};

async function assertCorruptedHistory(context, envelope) {
  const directory = await temporaryDirectory(context);
  const path = join(directory, 'corrupted.jsonl');
  const line = typeof envelope === 'string' ? envelope : JSON.stringify(envelope);
  await writeFile(path, `${line}\n`, 'utf8');
  await assert.rejects(readFileEvents(path), /Invalid file-events envelope at line 1/u);
}

test('file-events appends immutable envelopes and reads them in publication order', async (context) => {
  const directory = await temporaryDirectory(context);
  const path = join(directory, 'events.jsonl');
  const firstType = createEventType('wizloft.validation.finished');
  const secondType = createEventType('wizloft.evidence.recorded');
  let tick = 0;
  const runtime = await createHarnessRuntime({
    profile: profile(path),
    runtimeIdGenerator: () => 'runtime-file-events',
    clock: () => new Date(Date.UTC(2026, 7, 16, 2, 0, tick++)),
  });

  await runtime.events.publish(firstType, { result: 'passed' });
  await runtime.events.publish(secondType, { proof: ['typecheck', 'test'] });
  await runtime.shutdown();

  const events = await readFileEvents(path);
  assert.deepEqual(events, [
    {
      runtimeId: 'runtime-file-events',
      type: 'wizloft.validation.finished',
      sequence: 1,
      occurredAt: '2026-08-16T02:00:00.000Z',
      payload: { result: 'passed' },
    },
    {
      runtimeId: 'runtime-file-events',
      type: 'wizloft.evidence.recorded',
      sequence: 2,
      occurredAt: '2026-08-16T02:00:01.000Z',
      payload: { proof: ['typecheck', 'test'] },
    },
  ]);
  assert.equal(Object.isFrozen(events), true);
  assert.equal(Object.isFrozen(events[1].payload.proof), true);
  assert.throws(() => {
    events[0].payload.result = 'mutated';
  }, TypeError);
});

test('file-events preserves append order across runtime restarts', async (context) => {
  const directory = await temporaryDirectory(context);
  const path = join(directory, 'events.jsonl');
  const type = createEventType('test.restart');

  const firstRuntime = await createHarnessRuntime({
    profile: profile(path),
    runtimeIdGenerator: () => 'runtime-one',
  });
  await firstRuntime.events.publish(type, { run: 1 });
  await firstRuntime.shutdown();

  const secondRuntime = await createHarnessRuntime({
    profile: profile(path),
    runtimeIdGenerator: () => 'runtime-two',
  });
  await secondRuntime.events.publish(type, { run: 2 });
  await secondRuntime.shutdown();

  const events = await readFileEvents(path);
  assert.deepEqual(
    events.map((event) => [event.runtimeId, event.sequence, event.payload.run]),
    [
      ['runtime-one', 1, 1],
      ['runtime-two', 1, 2],
    ],
  );
});

test('file-events append failures follow listener failure semantics without stopping peers', async (context) => {
  const directory = await temporaryDirectory(context);
  const type = createEventType('test.persistence-failure');
  const calls = [];
  const runtime = await createHarnessRuntime({
    profile: profile(directory, [
      plugin({
        name: 'z-observer',
        setup(ctx) {
          ctx.events.subscribe(type, () => {
            calls.push('observer-delivered');
          });
        },
      }),
    ]),
  });
  context.after(() => runtime.shutdown());

  await assert.rejects(runtime.events.publish(type, { value: true }), (error) => {
    assert.equal(hasDiagnostic(error, 'EVENT_LISTENER_FAILED'), true);
    assert.equal(error.diagnostics[0].pluginName, FILE_EVENTS_PLUGIN_NAME);
    return true;
  });
  assert.deepEqual(calls, ['observer-delivered']);
});

test('file-events returns an empty immutable history when the file does not exist', async (context) => {
  const directory = await temporaryDirectory(context);
  const events = await readFileEvents(join(directory, 'missing.jsonl'));

  assert.deepEqual(events, []);
  assert.equal(Object.isFrozen(events), true);
});

test('file-events rejects persisted envelopes with an empty runtime id', async (context) => {
  await assertCorruptedHistory(context, { ...validEnvelope, runtimeId: '   ' });
});

test('file-events rejects persisted envelopes with an invalid event type id', async (context) => {
  await assertCorruptedHistory(context, { ...validEnvelope, type: 'invalid event' });
});

test('file-events rejects persisted envelopes with a non-positive sequence', async (context) => {
  await assertCorruptedHistory(context, { ...validEnvelope, sequence: 0 });
});

test('file-events rejects persisted envelopes with a non-ISO UTC timestamp', async (context) => {
  await assertCorruptedHistory(context, {
    ...validEnvelope,
    occurredAt: '2026-08-16 02:00:00Z',
  });
});

test('file-events rejects non-finite numbers parsed from corrupted JSON history', async (context) => {
  await assertCorruptedHistory(
    context,
    '{"runtimeId":"runtime-history","type":"wizloft.test.recorded","sequence":1,"occurredAt":"2026-08-16T02:00:00.000Z","payload":{"nested":[1e400]}}',
  );
});
