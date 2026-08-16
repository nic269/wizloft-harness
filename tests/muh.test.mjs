import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { authorityPlugin } from '../packages/authority/dist/index.js';
import { createHarnessCliAdapter } from '../packages/cli-adapter/dist/index.js';
import { createCommandExecutor } from '../packages/commands/dist/index.js';
import { contextPlugin } from '../packages/context/dist/index.js';
import { evidencePlugin } from '../packages/evidence/dist/index.js';
import { createHarness, defineProfile } from '../packages/harness/dist/index.js';
import { requireCapability } from '../packages/kernel/dist/index.js';
import { VALIDATION_CAPABILITY, validationPlugin } from '../packages/validation/dist/index.js';
import { fileEventsPlugin, readFileEvents } from '../plugins/file-events/dist/index.js';
import { fileMemoryPlugin } from '../plugins/file-memory/dist/index.js';
import { memoryContextPlugin } from '../plugins/memory-context/dist/index.js';
import { repositoryFilesPlugin } from '../plugins/repository-files/dist/index.js';

test('MUH composes real providers through the facade, commands, and CLI adapter', async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), 'wizloft-harness-muh-'));
  context.after(() => rm(root, { force: true, recursive: true }));
  await mkdir(path.join(root, 'docs'));
  await writeFile(path.join(root, 'docs', 'architecture.md'), '# Accepted architecture\n');

  const eventsPath = path.join(root, '.harness', 'events.jsonl');
  const memoryPath = path.join(root, '.harness', 'memory.jsonl');
  const validatorPlugin = {
    name: '@test/root-validator',
    version: '1.0.0',
    requires: [requireCapability(VALIDATION_CAPABILITY)],
    setup(pluginContext) {
      return pluginContext.capabilities.get(VALIDATION_CAPABILITY).registerValidator({
        id: '@test/root-validator',
        kind: 'root-required',
        execute() {
          return { status: 'passed', summary: 'MUH proof passed' };
        },
      });
    },
  };

  const profile = defineProfile({
    layers: [
      {
        name: 'muh',
        plugins: [
          authorityPlugin,
          contextPlugin,
          evidencePlugin,
          validationPlugin,
          fileEventsPlugin,
          fileMemoryPlugin,
          memoryContextPlugin,
          repositoryFilesPlugin,
          validatorPlugin,
        ],
        config: {
          '@wizloft/file-events': { path: eventsPath },
          '@wizloft/file-memory': { path: memoryPath },
          '@wizloft/memory-context': {
            mappings: [
              {
                subject: 'architecture',
                role: 'supporting',
                query: { scope: 'project:muh' },
              },
            ],
          },
          '@wizloft/repository-files': {
            root,
            authority: [
              {
                subject: 'architecture',
                path: 'docs/architecture.md',
                precedence: 100,
                resolutionKey: 'accepted-architecture',
              },
            ],
            context: [
              {
                subject: 'architecture',
                path: 'docs/architecture.md',
                role: 'authority',
              },
            ],
          },
        },
      },
    ],
  });

  const harness = await createHarness({
    profile,
    runtimeIdGenerator: () => 'muh-runtime',
    clock: () => new Date('2026-08-17T00:00:00.000Z'),
    eventHistoryReader: { read: () => readFileEvents(eventsPath) },
  });
  const commands = createCommandExecutor(harness);
  const cli = createHarnessCliAdapter(commands);

  const remembered = await commands.execute({
    commandId: 'memory.remember',
    input: {
      kind: 'semantic',
      scope: 'project:muh',
      content: 'Historical implementation lesson',
      state: 'active',
      provenance: { sourceType: 'test', sourceId: 'muh' },
    },
  });
  assert.equal(remembered.kind, 'result');

  const authority = await commands.execute({
    commandId: 'authority.resolve',
    input: { subject: 'architecture' },
  });
  assert.equal(authority.kind, 'result');
  assert.equal(authority.value.status, 'resolved');
  assert.equal(authority.value.contenders.length, 1);

  const resolvedContext = await commands.execute({
    commandId: 'context.resolve',
    input: { subject: 'architecture' },
  });
  assert.equal(resolvedContext.kind, 'result');
  assert.equal(resolvedContext.value.authority.length, 1);
  assert.equal(resolvedContext.value.supporting.length, 1);

  const validation = await cli.execute([
    '--json',
    'validation',
    'run',
    '--input',
    '{"correlationId":"muh-proof","changedPaths":["docs/architecture.md"]}',
  ]);
  assert.equal(validation.exitCode, 0);
  assert.equal(validation.stderr, '');
  assert.equal(JSON.parse(validation.stdout).value.ok, true);

  const evidence = await commands.execute({ commandId: 'evidence.list' });
  assert.equal(evidence.kind, 'result');
  assert.equal(evidence.value.length, 1);
  const events = await commands.execute({ commandId: 'events.read' });
  assert.equal(events.kind, 'result');
  assert.equal(events.value.length, 1);
  assert.equal(events.value[0].type, 'wizloft.evidence.recorded');

  const inspection = harness.inspect();
  assert.equal(inspection.runtimeId, 'muh-runtime');
  assert.equal(inspection.state, 'active');
  assert.equal(inspection.capabilities.length, 5);

  await harness.shutdown();
  assert.equal(harness.inspect().state, 'disposed');
  assert.deepEqual(harness.inspect().capabilities, []);
});
