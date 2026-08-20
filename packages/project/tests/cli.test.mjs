import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseProjectCliArgv, runProjectCli } from '../dist/cli.js';
import * as projectApi from '../dist/index.js';
import { cleanup, gitInit, snapshot, tempRepo } from './helpers.mjs';

test('root package export surface is the Phase 1 planner only', () => {
  assert.deepEqual(Object.keys(projectApi).sort(), [
    'HarnessProjectError',
    'planProjectInitialization',
  ]);
});

test('CLI usage errors use exit 2 and invalid projectId is not coerced', async () => {
  const missingRoot = await runProjectCli(['init', '--project-id', 'example', '--dry-run']);
  assert.equal(missingRoot.exitCode, 2);
  assert.match(missingRoot.stderr, /INVALID_ARGV/);

  const badId = await runProjectCli([
    'init',
    '--root',
    '/tmp',
    '--project-id',
    'Nope',
    '--dry-run',
  ]);
  assert.equal(badId.exitCode, 2);
  assert.match(badId.stderr, /INVALID_PROJECT_ID/);

  assert.throws(() => parseProjectCliArgv(['init', '--root', 'repo']), /--project-id is required/);
});

test('non-dry-run is rejected without mutating and without pretending apply exists', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const before = await snapshot(root);
  const result = await runProjectCli(['init', '--root', root, '--project-id', 'example'], {
    cwd: root,
  });
  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /APPLY_UNAVAILABLE/);
  assert.equal(await snapshot(root), before);
});

test('dry-run JSON is deterministic, writes nothing, and does not install', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const before = await snapshot(root);
  const first = await runProjectCli(
    ['init', '--root', root, '--project-id', 'example', '--dry-run', '--json'],
    { cwd: root },
  );
  const second = await runProjectCli(
    ['init', '--root', root, '--project-id', 'example', '--dry-run', '--json'],
    { cwd: root },
  );
  assert.equal(first.exitCode, 0);
  assert.equal(first.stdout, second.stdout);
  const envelope = JSON.parse(first.stdout);
  assert.equal(envelope.ok, true);
  assert.equal(envelope.mode, 'dry-run');
  assert.equal(envelope.state, 'clean');
  assert.equal(envelope.projectId, 'example');
  assert.deepEqual(envelope.command, { argv: ['node', '.wizloft/harness/run.mjs'] });
  assert.equal(envelope.operations.at(-1).path, '.wizloft/harness/project.json');
  assert.equal(await snapshot(root), before);
});

test('human dry-run lists mutating operations only', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const result = await runProjectCli(
    ['init', '--root', root, '--project-id', 'example', '--dry-run'],
    {
      cwd: root,
    },
  );
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /operations:/);
  assert.match(result.stdout, /create\s+\.wizloft\/harness\/project\.json/);
  assert.match(result.stdout, /install\s+\.wizloft\/harness/);
});

test('unknown operational failures are exit 1, not INVALID_ARGV', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const result = await runProjectCli(
    ['init', '--root', root, '--project-id', 'example', '--dry-run'],
    {
      cwd: root,
      planner: async () => {
        throw new Error('disk exploded');
      },
    },
  );
  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /INTERNAL_ERROR: disk exploded/);
  assert.doesNotMatch(result.stderr, /INVALID_ARGV/);
});

test('library source does not call process.exit or spawn npm', async () => {
  const srcRoot = fileURLToPath(new URL('../src/', import.meta.url));
  const files = [
    'index.ts',
    'apply.ts',
    'plan.ts',
    'cli.ts',
    'inspect.ts',
    'managed-blocks.ts',
    'options.ts',
    'paths.ts',
    'render.ts',
    'marker.ts',
    'templates.ts',
    'node-version.ts',
    'project-id.ts',
    'errors.ts',
  ];
  for (const file of files) {
    const source = await readFile(path.join(srcRoot, file), 'utf8');
    assert.equal(source.includes('process.exit('), false, file);
    assert.equal(source.includes('child_process'), false, file);
    assert.equal(source.includes('execFile'), false, file);
  }
});
