import assert from 'node:assert/strict';
import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { HARNESS_CLI_HELP } from '@wizloft/harness/cli';
import { HarnessProjectError } from '../dist/errors.js';
import { PROJECT_HEALTH_VALIDATOR_ID } from '../dist/health.js';
import { runProjectHarness } from '../dist/run.js';
import {
  cleanup,
  collectStream,
  failingStream,
  gitInit,
  tempRepo,
  writeIsolatedRuntimePackage,
  writeTrackedContract,
} from './helpers.mjs';

function runtimeOptions(root, stdout, stderr) {
  return {
    repositoryRoot: root,
    env: {},
    stdin: { read() {} },
    stdout,
    stderr,
  };
}

async function preparedRepo(context) {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  await writeIsolatedRuntimePackage(root);
  return root;
}

test('runProjectHarness --help writes adapter help once and returns 0', async (context) => {
  const root = await preparedRepo(context);
  const stdout = collectStream();
  const stderr = collectStream();
  const argv = ['--help'];
  const frozen = Object.freeze([...argv]);
  const exitCode = await runProjectHarness(
    argv,
    runtimeOptions(root, stdout.stream, stderr.stream),
  );
  argv.push('mutated');
  assert.equal(exitCode, 0);
  assert.equal(stdout.text(), HARNESS_CLI_HELP);
  assert.equal(stderr.text(), '');
  assert.deepEqual(frozen, ['--help']);
});

test('runProjectHarness inspect --json writes one structured result', async (context) => {
  const root = await preparedRepo(context);
  const stdout = collectStream();
  const stderr = collectStream();
  const exitCode = await runProjectHarness(
    ['inspect', '--json'],
    runtimeOptions(root, stdout.stream, stderr.stream),
  );
  assert.equal(exitCode, 0);
  assert.equal(stderr.text(), '');
  const envelope = JSON.parse(stdout.text());
  assert.equal(envelope.kind, 'result');
  assert.equal(envelope.commandId, 'harness.inspect');
  assert.equal(typeof envelope.value.runtimeId, 'string');
  assert.equal(stdout.text().trim().split('\n').length, 1);
});

test('invalid Harness argv returns adapter usage exit 2', async (context) => {
  const root = await preparedRepo(context);
  const stdout = collectStream();
  const stderr = collectStream();
  const exitCode = await runProjectHarness(
    ['not-a-command'],
    runtimeOptions(root, stdout.stream, stderr.stream),
  );
  assert.equal(exitCode, 2);
  assert.equal(stdout.text(), '');
  assert.match(stderr.text(), /UNKNOWN_CLI_COMMAND|Unknown Harness command/);
});

test('bootstrap errors are thrown and not rendered by runProjectHarness', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await mkdir(path.join(root, '.wizloft/harness'), { recursive: true });
  const stdout = collectStream();
  const stderr = collectStream();
  await assert.rejects(
    () => runProjectHarness(['--help'], runtimeOptions(root, stdout.stream, stderr.stream)),
    (error) => error instanceof HarnessProjectError && error.code === 'MARKER_CONFLICT',
  );
  assert.equal(stdout.text(), '');
  assert.equal(stderr.text(), '');
});

test('malformed overlay fails before runtime creation', async (context) => {
  const root = await preparedRepo(context);
  await writeFile(
    path.join(root, '.wizloft/harness/profile.local.mjs'),
    `export function createProjectSourceOverlay() {
  return { plugins: [] };
}
`,
  );
  const stdout = collectStream();
  const stderr = collectStream();
  await assert.rejects(
    () => runProjectHarness(['--help'], runtimeOptions(root, stdout.stream, stderr.stream)),
    (error) => error instanceof HarnessProjectError && error.code === 'INVALID_OVERLAY',
  );
  assert.equal(stdout.text(), '');
  assert.equal(stderr.text(), '');
});

test('marker runtime mismatch fails before command execution', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root, { release: '0.0.0-mismatch' });
  await writeIsolatedRuntimePackage(root);
  const stdout = collectStream();
  const stderr = collectStream();
  await assert.rejects(
    () => runProjectHarness(['--help'], runtimeOptions(root, stdout.stream, stderr.stream)),
    (error) => error instanceof HarnessProjectError && error.code === 'LOCAL_RUNTIME_INVALID',
  );
  assert.equal(stdout.text(), '');
  assert.equal(stderr.text(), '');
});

test('argv input is not mutated', async (context) => {
  const root = await preparedRepo(context);
  const stdout = collectStream();
  const stderr = collectStream();
  const argv = ['inspect', '--json'];
  await runProjectHarness(argv, runtimeOptions(root, stdout.stream, stderr.stream));
  assert.deepEqual(argv, ['inspect', '--json']);
});

test('runtime shutdown happens if stream write fails after runtime creation', async (context) => {
  const root = await preparedRepo(context);
  const stderr = collectStream();
  await assert.rejects(
    () => runProjectHarness(['--help'], runtimeOptions(root, failingStream(), stderr.stream)),
    (error) => error instanceof Error && error.message.includes('injected stream write failure'),
  );
  const stdout = collectStream();
  const retry = await runProjectHarness(
    ['--help'],
    runtimeOptions(root, stdout.stream, collectStream().stream),
  );
  assert.equal(retry, 0);
  assert.equal(stdout.text(), HARNESS_CLI_HELP);
});

test('runProjectHarness does not set process.exitCode', async (context) => {
  const root = await preparedRepo(context);
  const before = process.exitCode;
  const stdout = collectStream();
  await runProjectHarness(['--help'], runtimeOptions(root, stdout.stream, collectStream().stream));
  assert.equal(process.exitCode, before);
});

test('health validator is selected for Validation regardless of changed path', async (context) => {
  const root = await preparedRepo(context);
  const stdout = collectStream();
  const stderr = collectStream();
  const exitCode = await runProjectHarness(
    [
      'validation',
      'select',
      '--json',
      '--input',
      JSON.stringify({ correlationId: 'health-select', changedPaths: ['README.md'] }),
    ],
    runtimeOptions(root, stdout.stream, stderr.stream),
  );
  assert.equal(exitCode, 0);
  const envelope = JSON.parse(stdout.text());
  const entry = envelope.value.entries.find(
    (candidate) => candidate.validatorId === PROJECT_HEALTH_VALIDATOR_ID,
  );
  assert.equal(entry?.kind, 'root-required');
  assert.equal(entry?.status, 'selected');
});

test('valid fixture health proof passes', async (context) => {
  const root = await preparedRepo(context);
  const stdout = collectStream();
  const stderr = collectStream();
  const exitCode = await runProjectHarness(
    [
      'validation',
      'run',
      '--json',
      '--input',
      JSON.stringify({ correlationId: 'health-run', changedPaths: ['src/unused.ts'] }),
    ],
    runtimeOptions(root, stdout.stream, stderr.stream),
  );
  assert.equal(exitCode, 0);
  const envelope = JSON.parse(stdout.text());
  assert.equal(envelope.kind, 'result');
  assert.equal(envelope.value.ok, true);
  const outcome = envelope.value.outcomes.find(
    (candidate) => candidate.validatorId === PROJECT_HEALTH_VALIDATOR_ID,
  );
  assert.equal(outcome?.kind, 'root-required');
  assert.equal(outcome?.status, 'passed');
});

test('missing required tracked file is a failed health outcome, not a bootstrap throw', async (context) => {
  const root = await preparedRepo(context);
  await rm(path.join(root, '.wizloft/harness/run.mjs'));
  const stdout = collectStream();
  const stderr = collectStream();
  const exitCode = await runProjectHarness(
    [
      'validation',
      'run',
      '--json',
      '--input',
      JSON.stringify({ correlationId: 'health-missing', changedPaths: ['AGENTS.md'] }),
    ],
    runtimeOptions(root, stdout.stream, stderr.stream),
  );
  assert.equal(exitCode, 1);
  const envelope = JSON.parse(stdout.text());
  assert.equal(envelope.value.ok, false);
  const outcome = envelope.value.outcomes.find(
    (candidate) => candidate.validatorId === PROJECT_HEALTH_VALIDATOR_ID,
  );
  assert.equal(outcome?.status, 'failed');
  assert.match(outcome.summary, /run\.mjs is missing/);
});

test('health validator is not invoked for pre-runtime overlay failure', async (context) => {
  const root = await preparedRepo(context);
  await writeFile(
    path.join(root, '.wizloft/harness/profile.local.mjs'),
    `export function createProjectSourceOverlay() {
  return { capabilities: [] };
}
`,
  );
  const stdout = collectStream();
  const stderr = collectStream();
  await assert.rejects(
    () =>
      runProjectHarness(
        [
          'validation',
          'run',
          '--json',
          '--input',
          JSON.stringify({ correlationId: 'no-health', changedPaths: ['README.md'] }),
        ],
        runtimeOptions(root, stdout.stream, stderr.stream),
      ),
    (error) => error instanceof HarnessProjectError && error.code === 'INVALID_OVERLAY',
  );
  assert.equal(stdout.text(), '');
});

test('.wizloft symlink parent is rejected before command execution', async (context) => {
  const outside = await tempRepo();
  context.after(() => cleanup(outside));
  gitInit(outside);
  await writeTrackedContract(outside);
  await writeIsolatedRuntimePackage(outside);
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await symlink(path.join(outside, '.wizloft'), path.join(root, '.wizloft'));
  const stdout = collectStream();
  const stderr = collectStream();
  await assert.rejects(
    () => runProjectHarness(['--help'], runtimeOptions(root, stdout.stream, stderr.stream)),
    (error) =>
      error instanceof HarnessProjectError &&
      error.code === 'MANAGED_PATH_SYMLINK' &&
      error.message.includes('.wizloft'),
  );
  assert.equal(stdout.text(), '');
  assert.equal(stderr.text(), '');
});

test('.wizloft/harness symlink parent is rejected before loading the outside runtime', async (context) => {
  const outside = await tempRepo();
  context.after(() => cleanup(outside));
  gitInit(outside);
  await writeTrackedContract(outside);
  await writeIsolatedRuntimePackage(outside);
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await mkdir(path.join(root, '.wizloft'));
  await symlink(path.join(outside, '.wizloft/harness'), path.join(root, '.wizloft/harness'));
  const stdout = collectStream();
  const stderr = collectStream();
  await assert.rejects(
    () => runProjectHarness(['--help'], runtimeOptions(root, stdout.stream, stderr.stream)),
    (error) =>
      error instanceof HarnessProjectError &&
      error.code === 'MANAGED_PATH_SYMLINK' &&
      error.message.includes('.wizloft/harness'),
  );
  assert.equal(stdout.text(), '');
  assert.equal(stderr.text(), '');
});

test('missing isolated project package uses the specific missing-runtime diagnosis', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  const stdout = collectStream();
  const stderr = collectStream();
  await assert.rejects(
    () => runProjectHarness(['--help'], runtimeOptions(root, stdout.stream, stderr.stream)),
    (error) =>
      error instanceof HarnessProjectError &&
      error.code === 'LOCAL_RUNTIME_INVALID' &&
      error.message ===
        'Cannot resolve @wizloft/harness-project from .wizloft/harness/node_modules',
  );
  assert.equal(stdout.text(), '');
  assert.equal(stderr.text(), '');
});

test('Phase 3A runtime source does not spawn npm or call process.exit', async () => {
  const srcRoot = fileURLToPath(new URL('../src/', import.meta.url));
  const files = ['profile.ts', 'run.ts', 'overlay.ts', 'identity.ts', 'health.ts'];
  for (const file of files) {
    const source = await readFile(path.join(srcRoot, file), 'utf8');
    assert.equal(source.includes('process.exit('), false, file);
    assert.equal(source.includes('child_process'), false, file);
    assert.equal(source.includes('execFile'), false, file);
    assert.equal(source.includes('process.exitCode'), false, file);
  }
});
