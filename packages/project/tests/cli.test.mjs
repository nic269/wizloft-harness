import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseProjectCliArgv, runProjectCli } from '../dist/cli.js';
import * as projectApi from '../dist/index.js';
import {
  cleanup,
  gitInit,
  simulateIsolatedInstall,
  snapshot,
  tempRepo,
  writeIsolatedRuntimePackage,
  writeTrackedContract,
} from './helpers.mjs';

test('root package export surface includes applyProjectInitialization', () => {
  assert.deepEqual(Object.keys(projectApi).sort(), [
    'HarnessProjectError',
    'applyProjectInitialization',
    'createGeneratedProjectProfile',
    'planProjectInitialization',
    'runProjectHarness',
  ]);
});

test('public applyProjectInitialization declaration accepts exactly options', async () => {
  const declaration = await readFile(new URL('../dist/initialize.d.ts', import.meta.url), 'utf8');
  assert.match(
    declaration,
    /export declare function applyProjectInitialization\(options: PlanProjectInitializationOptions\): Promise<InitializationResult>;/,
  );
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

test('non-dry-run apply succeeds with injected installer and writes marker last', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const installer = simulateIsolatedInstall();
  const result = await runProjectCli(
    ['init', '--root', root, '--project-id', 'example', '--json'],
    {
      cwd: root,
      installRuntime: installer.installRuntime,
    },
  );
  assert.equal(result.exitCode, 0);
  const envelope = JSON.parse(result.stdout);
  assert.equal(envelope.ok, true);
  assert.equal(envelope.mode, 'apply');
  assert.equal(envelope.initialState, 'clean');
  assert.equal(envelope.finalState, 'current');
  assert.equal(envelope.applied.at(-1).path, '.wizloft/harness/project.json');
  assert.equal(installer.calls.length, 1);
  assert.equal(installer.calls[0], 'install');
  await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8');
});

test('non-dry-run human apply reports successful current state', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const installer = simulateIsolatedInstall();
  const result = await runProjectCli(['init', '--root', root, '--project-id', 'example'], {
    cwd: root,
    installRuntime: installer.installRuntime,
  });
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Wizloft Harness project init/);
  assert.match(result.stdout, /initial state: clean/);
  assert.match(result.stdout, /final state: current/);
  assert.match(result.stdout, /create\s+\.wizloft\/harness\/project\.json/);
});

test('zero-diff current apply does not install or mutate', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  await writeIsolatedRuntimePackage(root);
  const before = await snapshot(root);
  const installer = simulateIsolatedInstall();
  const result = await runProjectCli(
    ['init', '--root', root, '--project-id', 'example', '--json'],
    { cwd: root, installRuntime: installer.installRuntime },
  );
  assert.equal(result.exitCode, 0);
  assert.deepEqual(JSON.parse(result.stdout).applied, []);
  assert.equal(installer.calls.length, 0);
  assert.equal(await snapshot(root), before);
});

test('non-dry-run install failure is exit 1 INSTALL_FAILED without a marker', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const installer = simulateIsolatedInstall({ fail: true });
  const result = await runProjectCli(['init', '--root', root, '--project-id', 'example'], {
    cwd: root,
    installRuntime: installer.installRuntime,
  });
  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /INSTALL_FAILED/);
  await assert.rejects(() => readFile(path.join(root, '.wizloft/harness/project.json')), {
    code: 'ENOENT',
  });
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

test('dry-run never invokes the applier or installer seam', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  let applied = false;
  const result = await runProjectCli(
    ['init', '--root', root, '--project-id', 'example', '--dry-run'],
    {
      cwd: root,
      applier: async () => {
        applied = true;
        throw new Error('applier must not run');
      },
      installRuntime: async () => {
        throw new Error('installer must not run');
      },
    },
  );
  assert.equal(result.exitCode, 0);
  assert.equal(applied, false);
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
    'overlay.ts',
    'identity.ts',
    'health.ts',
    'profile.ts',
    'run.ts',
    'initialize.ts',
  ];
  for (const file of files) {
    const source = await readFile(path.join(srcRoot, file), 'utf8');
    assert.equal(source.includes('process.exit('), false, file);
    assert.equal(source.includes('child_process'), false, file);
    assert.equal(source.includes('execFile'), false, file);
  }
});
