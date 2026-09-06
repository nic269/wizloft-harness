import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createHarness,
  defineProfile,
  HarnessError,
  MemoryError,
  ValidationInfrastructureError,
} from '@wizloft/harness';

import { COMMAND_IDS, createCommandExecutor } from '../dist/commands.js';

function harness(overrides = {}) {
  return {
    inspect: () => ({
      runtimeId: 'runtime',
      state: 'active',
      plugins: [],
      capabilities: [],
      diagnostics: [],
    }),
    context: {
      resolve: async (input) => ({
        subject: input.subject,
        authority: [],
        supporting: [],
        historical: [],
      }),
    },
    authority: {
      resolve: async (input) => ({
        status: 'ambiguous',
        subject: input.subject,
        contenders: [],
        shadowed: [],
      }),
    },
    memory: {
      remember: async (input) => ({ id: 'memory-1', input }),
      recall: (input) => [{ id: 'memory-1', input }],
      transition: async (input) => ({ id: input.id, state: input.state }),
    },
    validation: {
      select: async (request) => ({ request, entries: [] }),
      run: async (request) => ({
        ok: false,
        request,
        selection: { request, entries: [] },
        outcomes: [],
      }),
    },
    evidence: { list: () => [] },
    events: { read: async () => [] },
    shutdown: async () => {},
    runtimeId: 'runtime',
    ...overrides,
  };
}

test('command executor covers the fixed command surface through the facade', async () => {
  const executor = createCommandExecutor(harness());
  const requests = [
    { commandId: 'harness.inspect' },
    { commandId: 'context.resolve', input: { subject: 'context' } },
    { commandId: 'authority.resolve', input: { subject: 'authority' } },
    {
      commandId: 'memory.remember',
      input: {
        content: 'learned',
        kind: 'semantic',
        scope: 'project:test',
        provenance: { sourceType: 'test', sourceId: 'source' },
      },
    },
    { commandId: 'memory.recall', input: { scope: 'project:test' } },
    { commandId: 'memory.transition', input: { id: 'memory-1', state: 'active' } },
    { commandId: 'validation.select', input: { correlationId: 'select', changedPaths: [] } },
    { commandId: 'validation.run', input: { correlationId: 'run', changedPaths: [] } },
    { commandId: 'evidence.list' },
    { commandId: 'events.read' },
  ];

  assert.deepEqual(
    requests.map(({ commandId }) => commandId),
    COMMAND_IDS,
  );
  for (const request of requests) {
    const envelope = await executor.execute(request);
    assert.equal(envelope.kind, 'result', request.commandId);
    assert.equal(envelope.commandId, request.commandId);
    assert.equal(Object.isFrozen(envelope), true);
    assert.equal(Object.isFrozen(envelope.value), true);
  }

  const authority = await executor.execute(requests[2]);
  assert.equal(authority.kind, 'result');
  assert.equal(authority.value.status, 'ambiguous');
  const validation = await executor.execute(requests[7]);
  assert.equal(validation.kind, 'result');
  assert.equal(validation.value.ok, false);
});

test('unknown and malformed command requests return immutable structured errors', async () => {
  const executor = createCommandExecutor(harness());
  const malformed = await executor.execute({ commandId: 'context.resolve', input: {} });
  assert.deepEqual(malformed, {
    kind: 'error',
    commandId: 'context.resolve',
    error: {
      code: 'INVALID_COMMAND_INPUT',
      message: 'context.resolve requires a non-empty input.subject',
    },
  });
  assert.equal(Object.isFrozen(malformed), true);
  assert.equal(Object.isFrozen(malformed.error), true);

  const unknown = await executor.execute({ commandId: 'project.deploy' });
  assert.equal(unknown.kind, 'error');
  assert.equal(unknown.error.code, 'UNKNOWN_COMMAND');

  const nonObject = await executor.execute(null);
  assert.equal(nonObject.commandId, '<unknown>');
  assert.equal(nonObject.error.code, 'INVALID_COMMAND_INPUT');

  const nonJson = await executor.execute({
    commandId: 'memory.recall',
    input: { scope: 'project:test', invalid: Number.POSITIVE_INFINITY },
  });
  assert.equal(nonJson.error.code, 'INVALID_COMMAND_INPUT');
});

test('expected facade and domain failures normalize into JSON-compatible command errors', async () => {
  const report = Object.freeze({
    ok: false,
    request: Object.freeze({ correlationId: 'run', changedPaths: Object.freeze([]) }),
    selection: Object.freeze({
      request: Object.freeze({ correlationId: 'run', changedPaths: Object.freeze([]) }),
      entries: Object.freeze([]),
    }),
    outcomes: Object.freeze([]),
  });
  const infrastructureCause = new Error('disk unavailable');
  const executor = createCommandExecutor(
    harness({
      context: {
        resolve() {
          throw new HarnessError('CAPABILITY_UNAVAILABLE', 'Context is absent', {
            capabilityId: 'context@1',
            state: 'active',
          });
        },
      },
      memory: {
        remember() {
          throw new MemoryError('INVALID_MEMORY_INPUT', 'Invalid memory');
        },
        recall: () => [],
        transition: async () => ({}),
      },
      validation: {
        select: async (request) => ({ request, entries: [] }),
        run() {
          throw new ValidationInfrastructureError(report, [
            {
              validatorId: 'validator',
              code: 'EVIDENCE_EVENT_PUBLISH_FAILED',
              message: 'event failed',
              evidenceId: 'evidence-1',
              cause: infrastructureCause,
            },
          ]);
        },
      },
    }),
  );

  const unavailable = await executor.execute({
    commandId: 'context.resolve',
    input: { subject: 'subject' },
  });
  assert.deepEqual(unavailable.error.details, {
    capabilityId: 'context@1',
    state: 'active',
  });

  const memory = await executor.execute({
    commandId: 'memory.remember',
    input: {
      content: 'x',
      kind: 'semantic',
      scope: 'project:test',
      provenance: { sourceType: 'test', sourceId: 'source' },
    },
  });
  assert.equal(memory.error.code, 'INVALID_MEMORY_INPUT');

  const validation = await executor.execute({
    commandId: 'validation.run',
    input: { correlationId: 'run', changedPaths: [] },
  });
  assert.equal(validation.kind, 'error');
  assert.equal(validation.error.code, 'VALIDATION_INFRASTRUCTURE_FAILED');
  assert.deepEqual(validation.error.details.report, report);
  assert.deepEqual(validation.error.details.failures, [
    {
      validatorId: 'validator',
      code: 'EVIDENCE_EVENT_PUBLISH_FAILED',
      message: 'event failed',
      evidenceId: 'evidence-1',
    },
  ]);
  assert.equal(JSON.stringify(validation).includes('disk unavailable'), false);
});

test('unexpected executor bugs remain rejected for the CLI boundary to contain', async () => {
  const executor = createCommandExecutor(
    harness({
      events: {
        read() {
          throw new Error('unexpected bug');
        },
      },
    }),
  );

  await assert.rejects(executor.execute({ commandId: 'events.read' }), /unexpected bug/u);
});

test('provider-specific structured errors normalize without provider package coupling', async () => {
  class ProviderError extends Error {
    constructor() {
      super('Repository source could not be read');
      this.code = 'REPOSITORY_SOURCE_READ_FAILED';
      this.sourcePath = 'docs/missing.md';
    }
  }
  const executor = createCommandExecutor(
    harness({
      authority: {
        resolve() {
          throw new ProviderError();
        },
      },
    }),
  );

  const envelope = await executor.execute({
    commandId: 'authority.resolve',
    input: { subject: 'architecture' },
  });
  assert.deepEqual(envelope, {
    kind: 'error',
    commandId: 'authority.resolve',
    error: {
      code: 'REPOSITORY_SOURCE_READ_FAILED',
      message: 'Repository source could not be read',
      details: { sourcePath: 'docs/missing.md' },
    },
  });
});

test('malformed event history becomes a structured reader error before serialization', async () => {
  const runtime = await createHarness({
    profile: defineProfile({ layers: [] }),
    eventHistoryReader: {
      read: () => [
        {
          runtimeId: 'runtime',
          type: 'wizloft.test.recorded',
          sequence: 1,
          occurredAt: '2026-08-17T00:00:00.000Z',
          payload: { invalid: Number.POSITIVE_INFINITY },
        },
      ],
    },
  });
  const executor = createCommandExecutor(runtime);

  const envelope = await executor.execute({ commandId: 'events.read' });
  assert.equal(envelope.kind, 'error');
  assert.equal(envelope.error.code, 'INVALID_EVENT_HISTORY_READER');
  assert.equal(JSON.stringify(envelope).includes('INTERNAL_ERROR'), false);
  await runtime.shutdown();
});
