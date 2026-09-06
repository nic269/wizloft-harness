import assert from 'node:assert/strict';
import test from 'node:test';

import { createHarnessCliAdapter, HARNESS_CLI_HELP, parseHarnessArgv } from '../dist/cli.js';

function executor(run) {
  return { execute: run };
}

test('parser maps bounded Harness grammar to typed command requests', () => {
  assert.deepEqual(parseHarnessArgv(['inspect']), {
    kind: 'command',
    json: false,
    request: { commandId: 'harness.inspect' },
  });
  assert.deepEqual(
    parseHarnessArgv([
      'memory',
      'transition',
      '--json',
      '--input',
      '{"id":"memory-1","state":"active"}',
    ]),
    {
      kind: 'command',
      json: true,
      request: {
        commandId: 'memory.transition',
        input: { id: 'memory-1', state: 'active' },
      },
    },
  );
});

test('adapter renders human results and keeps process IO outside the library', async () => {
  const requests = [];
  const adapter = createHarnessCliAdapter(
    executor(async (request) => {
      requests.push(request);
      return Object.freeze({
        kind: 'result',
        commandId: request.commandId,
        value: Object.freeze({ status: 'resolved' }),
      });
    }),
  );

  const output = await adapter.execute([
    'authority',
    'resolve',
    '--input',
    '{"subject":"architecture"}',
  ]);
  assert.deepEqual(requests, [
    { commandId: 'authority.resolve', input: { subject: 'architecture' } },
  ]);
  assert.deepEqual(output, {
    exitCode: 0,
    stdout: '{\n  "status": "resolved"\n}\n',
    stderr: '',
  });
  assert.equal(Object.isFrozen(output), true);
  assert.equal('process' in adapter, false);
});

test('JSON mode emits exactly one parseable envelope and keeps structured errors off stderr', async () => {
  const adapter = createHarnessCliAdapter(
    executor(async (request) =>
      Object.freeze({
        kind: 'error',
        commandId: request.commandId,
        error: Object.freeze({
          code: 'CAPABILITY_UNAVAILABLE',
          message: 'Capability context@1 was not composed',
        }),
      }),
    ),
  );
  const output = await adapter.execute([
    '--json',
    'context',
    'resolve',
    '--input',
    '{"subject":"x"}',
  ]);

  assert.equal(output.exitCode, 1);
  assert.equal(output.stderr, '');
  assert.equal(output.stdout.endsWith('\n'), true);
  assert.equal(output.stdout.split('\n').length, 2);
  assert.deepEqual(JSON.parse(output.stdout), {
    kind: 'error',
    commandId: 'context.resolve',
    error: {
      code: 'CAPABILITY_UNAVAILABLE',
      message: 'Capability context@1 was not composed',
    },
  });
});

test('adapter applies the bounded validation and usage exit policy', async () => {
  const adapter = createHarnessCliAdapter(
    executor(async (request) => {
      if (request.commandId === 'validation.run') {
        return { kind: 'result', commandId: request.commandId, value: { ok: false } };
      }
      if (request.commandId === 'validation.select') {
        return {
          kind: 'result',
          commandId: request.commandId,
          value: { entries: [{ status: 'not-applicable' }] },
        };
      }
      return { kind: 'result', commandId: request.commandId, value: {} };
    }),
  );

  assert.equal(
    (
      await adapter.execute([
        'validation',
        'run',
        '--input',
        '{"correlationId":"run","changedPaths":[]}',
      ])
    ).exitCode,
    1,
  );
  assert.equal(
    (
      await adapter.execute([
        'validation',
        'select',
        '--input',
        '{"correlationId":"select","changedPaths":[]}',
      ])
    ).exitCode,
    0,
  );
  assert.equal((await adapter.execute(['unknown'])).exitCode, 2);
  assert.equal((await adapter.execute(['context', 'resolve'])).exitCode, 2);
  assert.equal((await adapter.execute(['inspect', '--input', '{}'])).exitCode, 2);
});

test('help is module-local and unexpected executor throws become deterministic internal errors', async () => {
  const dependency = executor(async () => {
    throw new Error('secret internal detail');
  });
  const adapter = createHarnessCliAdapter(dependency);
  dependency.execute = async () => ({ kind: 'result', commandId: 'events.read', value: [] });

  const help = await adapter.execute(['--help']);
  assert.deepEqual(help, { exitCode: 0, stdout: HARNESS_CLI_HELP, stderr: '' });
  assert.match(HARNESS_CLI_HELP, /\n {2}inspect\n/u);
  assert.equal(HARNESS_CLI_HELP.includes('\n  harness '), false);
  assert.equal(HARNESS_CLI_HELP.includes('--profile'), false);
  assert.equal(HARNESS_CLI_HELP.includes('--version'), false);

  const internal = await adapter.execute(['--json', 'events', 'read']);
  assert.equal(internal.exitCode, 1);
  assert.equal(internal.stderr, '');
  assert.deepEqual(JSON.parse(internal.stdout), {
    kind: 'error',
    commandId: 'events.read',
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Unexpected Harness command executor failure',
    },
  });
  assert.equal(internal.stdout.includes('secret internal detail'), false);
});
