import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createHarnessCliAdapter } from '../packages/cli-adapter/dist/index.js';
import { createCommandExecutor } from '../packages/commands/dist/index.js';
import { createHarness, defineProfile } from '../packages/harness/dist/index.js';
import {
  createCapabilityToken,
  declareCapability,
  HarnessKernelError,
  requireCapability,
} from '../packages/kernel/dist/index.js';
import { readFileEvents } from '../plugins/file-events/dist/index.js';
import { memoryContextPlugin } from '../plugins/memory-context/dist/index.js';
import {
  createSelfHostProfile,
  SELF_HOST_AUTHORITY_SOURCES,
  SELF_HOST_AUTHORITY_SUBJECTS,
  SELF_HOST_AUTHORITY_VALIDATOR_ID,
  SELF_HOST_CONTEXT_SUBJECT,
  SELF_HOST_MEMORY_SCOPE,
  SELF_HOST_ROOT_VALIDATOR_ID,
  SELF_HOST_VALIDATION_PLUGIN_NAME,
} from '../profiles/self-host/dist/index.js';

const repositoryRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));

function resultValue(envelope) {
  assert.equal(envelope.kind, 'result', JSON.stringify(envelope));
  return envelope.value;
}

function cliJson(execution) {
  assert.equal(execution.stderr, '');
  return JSON.parse(execution.stdout);
}

test('Gate B self-hosts the Harness repository through facade, commands, and CLI', async (context) => {
  const stateRoot = await mkdtemp(path.join(tmpdir(), 'wizloft-harness-self-host-'));
  context.after(() => rm(stateRoot, { force: true, recursive: true }));
  const eventsPath = path.join(stateRoot, 'events.jsonl');
  const memoryPath = path.join(stateRoot, 'memory.jsonl');
  const profile = createSelfHostProfile({ repositoryRoot, eventsPath, memoryPath });

  const firstHarness = await createHarness({
    profile,
    runtimeIdGenerator: () => 'self-host-runtime-1',
    clock: () => new Date('2026-08-17T10:00:00.000Z'),
    eventHistoryReader: { read: () => readFileEvents(eventsPath) },
  });
  const firstCommands = createCommandExecutor(firstHarness);
  const firstCli = createHarnessCliAdapter(firstCommands);

  for (const { subject } of SELF_HOST_AUTHORITY_SOURCES) {
    const resolution = resultValue(
      await firstCommands.execute({ commandId: 'authority.resolve', input: { subject } }),
    );
    assert.equal(resolution.status, 'resolved');
    assert.equal(resolution.contenders.length, 1);
    assert.equal(resolution.contenders[0].provenance.sourceType, 'repository-file');
    assert.equal(resolution.shadowed.length, 0);
  }

  const staleCandidate = resultValue(
    await firstCommands.execute({
      commandId: 'memory.remember',
      input: {
        kind: 'semantic',
        scope: SELF_HOST_MEMORY_SCOPE,
        content: 'The @wizloft/harness public facade is deferred.',
        provenance: {
          sourceType: 'self-host-evaluation',
          sourceId: 'gate-b-stale-facade-note',
          sourceRevision: '0f698af',
          path: 'docs/plans/active/0001-build-muh.md',
        },
        tags: ['Self-Host', 'Architecture'],
      },
    }),
  );
  assert.equal(staleCandidate.state, 'candidate');
  const activated = resultValue(
    await firstCommands.execute({
      commandId: 'memory.transition',
      input: { id: staleCandidate.id, state: 'active' },
    }),
  );
  assert.equal(activated.state, 'active');
  const stale = resultValue(
    await firstCommands.execute({
      commandId: 'memory.transition',
      input: { id: staleCandidate.id, state: 'stale' },
    }),
  );
  assert.equal(stale.state, 'stale');

  const bypassMemory = resultValue(
    await firstCommands.execute({
      commandId: 'memory.remember',
      input: {
        kind: 'episodic',
        scope: SELF_HOST_MEMORY_SCOPE,
        state: 'active',
        content: 'Self-host operation should bypass the facade and call the kernel directly.',
        provenance: {
          sourceType: 'self-host-evaluation',
          sourceId: 'gate-b-obsolete-operation-note',
          path: 'tests/self-host.test.mjs',
        },
      },
    }),
  );
  const facadeMemory = resultValue(
    await firstCommands.execute({
      commandId: 'memory.remember',
      input: {
        kind: 'semantic',
        scope: SELF_HOST_MEMORY_SCOPE,
        state: 'active',
        content:
          'Self-host operation uses the public facade, structured commands, and CLI adapter.',
        provenance: {
          sourceType: 'self-host-evaluation',
          sourceId: 'gate-b-current-operation-note',
          path: 'tests/self-host.test.mjs',
        },
      },
    }),
  );
  const superseded = resultValue(
    await firstCommands.execute({
      commandId: 'memory.transition',
      input: { id: bypassMemory.id, state: 'superseded', supersededBy: facadeMemory.id },
    }),
  );
  assert.equal(superseded.state, 'superseded');
  assert.equal(superseded.supersededBy, facadeMemory.id);

  const contextResolution = resultValue(
    await firstCommands.execute({
      commandId: 'context.resolve',
      input: { subject: SELF_HOST_CONTEXT_SUBJECT },
    }),
  );
  assert.equal(contextResolution.authority.length, 6);
  assert.equal(
    contextResolution.authority.every(
      ({ provenance }) => provenance.sourceType === 'repository-file',
    ),
    true,
  );
  const memoryItems = contextResolution.supporting.filter(
    ({ provenance }) => provenance.sourceType === 'memory',
  );
  assert.equal(memoryItems.length, 3);
  assert.equal(
    memoryItems.some(({ content }) => content.includes('facade is deferred')),
    true,
  );
  assert.equal(
    memoryItems.some(({ content }) => content.includes('bypass the facade')),
    true,
  );

  const architectureAfterMemory = resultValue(
    await firstCommands.execute({
      commandId: 'authority.resolve',
      input: { subject: SELF_HOST_AUTHORITY_SUBJECTS.architecture },
    }),
  );
  assert.equal(architectureAfterMemory.status, 'resolved');
  assert.equal(architectureAfterMemory.contenders[0].provenance.sourceType, 'repository-file');

  const validationInput = JSON.stringify({
    correlationId: 'gate-b-self-host-maintenance',
    changedPaths: [
      'docs/milestones/SELF-HOST.md',
      'profiles/self-host/src/index.ts',
      'tests/self-host.test.mjs',
    ],
    sourceRevision: '0f698af',
    metadata: { gate: 'self-host' },
  });
  const selectionExecution = await firstCli.execute([
    '--json',
    'validation',
    'select',
    '--input',
    validationInput,
  ]);
  assert.equal(selectionExecution.exitCode, 0);
  const selection = resultValue(cliJson(selectionExecution));
  assert.deepEqual(
    selection.entries.map(({ validatorId, status }) => ({ validatorId, status })),
    [
      { validatorId: SELF_HOST_ROOT_VALIDATOR_ID, status: 'selected' },
      { validatorId: SELF_HOST_AUTHORITY_VALIDATOR_ID, status: 'selected' },
    ],
  );

  const validationExecution = await firstCli.execute([
    '--json',
    'validation',
    'run',
    '--input',
    validationInput,
  ]);
  assert.equal(validationExecution.exitCode, 0);
  const validation = resultValue(cliJson(validationExecution));
  assert.equal(validation.ok, true);
  assert.equal(validation.outcomes.length, 2);
  assert.equal(
    validation.outcomes.every(({ status }) => status === 'passed'),
    true,
  );

  const evidence = resultValue(await firstCommands.execute({ commandId: 'evidence.list' }));
  assert.equal(evidence.length, 2);
  assert.equal(
    evidence.every(({ kind }) => kind === 'wizloft.validation.outcome'),
    true,
  );

  const eventsExecution = await firstCli.execute(['--json', 'events', 'read']);
  assert.equal(eventsExecution.exitCode, 0);
  const events = resultValue(cliJson(eventsExecution));
  assert.equal(events.length, 2);
  assert.equal(
    events.every(({ type }) => type === 'wizloft.evidence.recorded'),
    true,
  );
  assert.deepEqual(
    events.map(({ runtimeId, sequence }) => ({ runtimeId, sequence })),
    [
      { runtimeId: 'self-host-runtime-1', sequence: 1 },
      { runtimeId: 'self-host-runtime-1', sequence: 2 },
    ],
  );

  const inspectionExecution = await firstCli.execute(['--json', 'inspect']);
  assert.equal(inspectionExecution.exitCode, 0);
  const inspection = resultValue(cliJson(inspectionExecution));
  assert.equal(inspection.runtimeId, 'self-host-runtime-1');
  assert.equal(inspection.state, 'active');
  assert.equal(inspection.capabilities.length, 5);
  assert.equal(
    inspection.plugins.some(({ name }) => name === SELF_HOST_VALIDATION_PLUGIN_NAME),
    true,
  );

  await firstHarness.shutdown();
  assert.equal(firstHarness.inspect().state, 'disposed');
  const disposedCommand = await firstCommands.execute({
    commandId: 'memory.recall',
    input: { scope: SELF_HOST_MEMORY_SCOPE },
  });
  assert.equal(disposedCommand.kind, 'error');
  assert.equal(disposedCommand.error.code, 'HARNESS_NOT_ACTIVE');

  const secondHarness = await createHarness({
    profile,
    runtimeIdGenerator: () => 'self-host-runtime-2',
    clock: () => new Date('2026-08-17T10:05:00.000Z'),
    eventHistoryReader: { read: () => readFileEvents(eventsPath) },
  });
  const secondCommands = createCommandExecutor(secondHarness);
  const recalled = resultValue(
    await secondCommands.execute({
      commandId: 'memory.recall',
      input: {
        scope: SELF_HOST_MEMORY_SCOPE,
        states: ['active', 'stale', 'superseded'],
      },
    }),
  );
  assert.equal(recalled.length, 3);
  assert.deepEqual(
    recalled.map(({ id, state }) => ({ id, state })),
    [
      { id: staleCandidate.id, state: 'stale' },
      { id: bypassMemory.id, state: 'superseded' },
      { id: facadeMemory.id, state: 'active' },
    ],
  );

  const restartedContext = resultValue(
    await secondCommands.execute({
      commandId: 'context.resolve',
      input: { subject: SELF_HOST_CONTEXT_SUBJECT },
    }),
  );
  assert.equal(
    restartedContext.supporting.filter(({ provenance }) => provenance.sourceType === 'memory')
      .length,
    3,
  );
  const persistedEvents = resultValue(await secondCommands.execute({ commandId: 'events.read' }));
  assert.equal(persistedEvents.length, 2);
  assert.equal(
    persistedEvents.every(({ runtimeId }) => runtimeId === 'self-host-runtime-1'),
    true,
  );
  assert.equal(
    resultValue(
      await secondCommands.execute({
        commandId: 'authority.resolve',
        input: { subject: SELF_HOST_AUTHORITY_SUBJECTS.architecture },
      }),
    ).status,
    'resolved',
  );
  await secondHarness.shutdown();
  assert.equal(secondHarness.inspect().state, 'disposed');
});

test('Gate B surfaces understandable missing-capability and cycle diagnostics via createHarness', async () => {
  await assert.rejects(
    createHarness({
      profile: defineProfile({
        layers: [
          {
            name: 'self-host-missing-capability-fixture',
            plugins: [memoryContextPlugin],
          },
        ],
      }),
    }),
    (error) => {
      assert.equal(error instanceof HarnessKernelError, true);
      const missing = error.diagnostics.find(({ code }) => code === 'MISSING_CAPABILITY');
      assert.ok(missing);
      assert.equal(missing.pluginName, '@wizloft/memory-context');
      assert.match(missing.message, /memory@1|context@1/u);
      return true;
    },
  );

  const capabilityA = createCapabilityToken('self-host-a@1');
  const capabilityB = createCapabilityToken('self-host-b@1');
  await assert.rejects(
    createHarness({
      profile: defineProfile({
        layers: [
          {
            name: 'self-host-cycle-fixture',
            plugins: [
              {
                name: '@wizloft/self-host-cycle-a',
                version: '0.0.0',
                requires: [requireCapability(capabilityB)],
                provides: [declareCapability(capabilityA)],
                setup() {},
              },
              {
                name: '@wizloft/self-host-cycle-b',
                version: '0.0.0',
                requires: [requireCapability(capabilityA)],
                provides: [declareCapability(capabilityB)],
                setup() {},
              },
            ],
          },
        ],
      }),
    }),
    (error) => {
      assert.equal(error instanceof HarnessKernelError, true);
      const cycle = error.diagnostics.find(({ code }) => code === 'CAPABILITY_CYCLE');
      assert.ok(cycle);
      assert.match(cycle.message, /self-host-cycle-a.*self-host-b@1.*self-host-cycle-b/u);
      assert.match(cycle.message, /self-host-cycle-b.*self-host-a@1.*self-host-cycle-a/u);
      return true;
    },
  );
});
