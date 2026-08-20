import assert from 'node:assert/strict';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { HarnessProjectError } from '../dist/errors.js';
import { planProjectInitialization } from '../dist/plan.js';
import {
  adapterFile,
  cleanup,
  gitInit,
  operationList,
  RELEASE,
  snapshot,
  tempRepo,
  writeFileTree,
  writeLocalPackage,
  writeTrackedContract,
} from './helpers.mjs';

async function plan(root, extra = {}) {
  return planProjectInitialization({
    root,
    projectId: extra.projectId ?? 'example',
    ...extra,
  });
}

test('CLEAN empty git init plans create, install, and marker-last and writes nothing', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const before = await snapshot(root);
  const result = await plan(root);
  assert.equal(result.state, 'clean');
  assert.deepEqual(operationList(result), [
    'create:.wizloft/harness/INSTRUCTIONS.md',
    'create:.wizloft/harness/profile.mjs',
    'create:.wizloft/harness/run.mjs',
    'create:.wizloft/harness/package.json',
    'create:.wizloft/PROJECT.md',
    'create:AGENTS.md',
    'create:CLAUDE.md',
    'create:.gitignore',
    'install:.wizloft/harness',
    'create:.wizloft/harness/project.json',
  ]);
  assert.equal(result.operations.at(-1)?.path, '.wizloft/harness/project.json');
  const install = result.operations.find((operation) => operation.kind === 'install');
  assert.equal(install?.method, 'install');
  assert.equal(install?.argv.includes('install'), true);
  assert.equal(install?.argv.includes('--ignore-scripts'), true);
  assert.equal(await snapshot(root), before);
});

test('EXISTING user files keep outside bytes and do not touch unrelated paths', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const agents = '# existing agents\nplease keep\n';
  const gitignore = 'node_modules/\n';
  await writeFileTree(root, {
    'AGENTS.md': agents,
    'CLAUDE.md': '# existing claude\n',
    '.gitignore': gitignore,
    'README.md': 'hello\n',
    'src/app.ts': 'export {}\n',
  });
  const before = await snapshot(root);
  const result = await plan(root);
  assert.equal(result.state, 'existing-no-harness');
  const agentsOp = result.operations.find((operation) => operation.path === 'AGENTS.md');
  assert.equal(agentsOp?.kind, 'update-block');
  assert.equal(agentsOp?.contents.startsWith(agents), true);
  assert.equal(agentsOp?.contents.includes('please keep'), true);
  const ignoreOp = result.operations.find((operation) => operation.path === '.gitignore');
  assert.equal(ignoreOp?.contents.startsWith(gitignore), true);
  assert.equal(
    result.operations.some(
      (operation) => operation.path === 'README.md' || operation.path === 'src/app.ts',
    ),
    false,
  );
  assert.equal(await snapshot(root), before);
});

test('CURRENT matching contract plans zero operations', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  await writeLocalPackage(root);
  const before = await snapshot(root);
  const result = await plan(root);
  assert.equal(result.state, 'current');
  assert.equal(result.operations.length, 0);
  assert.deepEqual(result.operations, []);
  assert.equal(await snapshot(root), before);
});

test('current runtime with adapter desired-state drift is reconciliation-needed', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root, { adapters: ['agents', 'claude'] });
  await writeLocalPackage(root);
  const result = await plan(root, { adapters: ['agents'] });
  assert.equal(result.state, 'reconciliation-needed');
  assert.equal(
    result.operations.find((operation) => operation.path === 'CLAUDE.md')?.kind,
    'remove-block',
  );
  assert.equal(result.operations.at(-1)?.path, '.wizloft/harness/project.json');
  assert.equal(
    result.operations.some((operation) => operation.kind === 'install'),
    false,
  );
});

test('current runtime with generated runner drift is reconciliation-needed, not upgrade', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  await writeLocalPackage(root);
  await writeFile(path.join(root, '.wizloft/harness/run.mjs'), 'console.log("drift");\n');
  const result = await plan(root);
  assert.equal(result.state, 'reconciliation-needed');
  assert.equal(
    result.operations.find((operation) => operation.path === '.wizloft/harness/run.mjs')?.kind,
    'replace',
  );
  assert.equal(
    result.operations.some((operation) => operation.kind === 'install'),
    false,
  );
  assert.notEqual(result.state, 'upgrade-in-progress');
});

test('adapter desired-state add, remove-block, none, and idempotent planning', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root, { adapters: ['agents'] });
  await writeLocalPackage(root);

  const addClaude = await plan(root, { adapters: ['agents', 'claude'] });
  assert.equal(addClaude.state, 'reconciliation-needed');
  assert.equal(
    addClaude.operations.some(
      (operation) => operation.kind === 'create' && operation.path === 'CLAUDE.md',
    ),
    true,
  );
  assert.equal(addClaude.operations.at(-1)?.path, '.wizloft/harness/project.json');
  assert.equal(
    addClaude.operations.some((operation) => operation.kind === 'install'),
    false,
  );

  await writeFileTree(root, { 'CLAUDE.md': adapterFile('example') });
  await writeTrackedContract(root, { adapters: ['agents', 'claude'] });
  await writeLocalPackage(root);
  const both = await plan(root, { adapters: ['agents', 'claude'] });
  assert.equal(both.state, 'current');
  assert.deepEqual(both.operations, []);

  const removeClaude = await plan(root, { adapters: ['agents'] });
  const claudeOp = removeClaude.operations.find((operation) => operation.path === 'CLAUDE.md');
  assert.equal(claudeOp?.kind, 'remove-block');
  assert.equal(
    removeClaude.operations.some((operation) => operation.path === 'AGENTS.md'),
    false,
  );

  const none = await plan(root, { adapters: [] });
  assert.equal(
    none.operations.find((operation) => operation.path === 'AGENTS.md')?.kind,
    'remove-block',
  );
  assert.equal(
    none.operations.find((operation) => operation.path === 'CLAUDE.md')?.kind,
    'remove-block',
  );
  assert.equal(
    none.operations.some(
      (operation) => operation.kind === 'remove-block' && operation.path === '.gitignore',
    ),
    false,
  );
});

test('symlinked isolated project package cannot classify as current', async (context) => {
  const root = await tempRepo();
  const outside = await tempRepo();
  context.after(() => cleanup(root));
  context.after(() => cleanup(outside));
  gitInit(root);
  await writeTrackedContract(root);
  await writeFileTree(outside, {
    'package.json': `${JSON.stringify({ name: '@wizloft/harness-project', version: RELEASE }, undefined, 2)}\n`,
  });
  await mkdir(path.join(root, '.wizloft/harness/node_modules/@wizloft'), { recursive: true });
  await symlink(
    outside,
    path.join(root, '.wizloft/harness/node_modules/@wizloft/harness-project'),
    'dir',
  );
  await assert.rejects(
    () => plan(root),
    (error) => error instanceof HarnessProjectError && error.code === 'MANAGED_PATH_SYMLINK',
  );
});

test('fresh clone with valid tracked contract needs local materialization, not conflict', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  const before = await snapshot(root);
  const result = await plan(root);
  assert.equal(result.state, 'needs-local-materialization');
  assert.deepEqual(
    result.operations.map((operation) => `${operation.kind}:${operation.path}`),
    ['install:.wizloft/harness'],
  );
  assert.equal(result.operations[0]?.method, 'ci');
  assert.equal(result.operations[0]?.argv.includes('ci'), true);
  assert.equal(
    result.operations.some((operation) => operation.path === '.wizloft/harness/project.json'),
    false,
  );
  assert.equal(await snapshot(root), before);
});

test('upgrade-in-progress is distinct from a fresh clone', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root, { release: '0.1.0-alpha.1' });
  await writeFileTree(root, {
    '.wizloft/harness/package.json': `${JSON.stringify(
      {
        name: 'wizloft-harness-project-tooling',
        version: '0.0.0',
        private: true,
        type: 'module',
        dependencies: { '@wizloft/harness-project': RELEASE },
      },
      undefined,
      2,
    )}\n`,
  });
  const result = await plan(root);
  assert.equal(result.state, 'upgrade-in-progress');
  assert.equal(
    result.operations.some((operation) => operation.kind === 'install'),
    true,
  );
  assert.equal(result.operations.at(-1)?.path, '.wizloft/harness/project.json');
  assert.notEqual(result.state, 'needs-local-materialization');
});

test('projectId mismatch against a valid marker is a conflict', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root, { projectId: 'example' });
  await writeLocalPackage(root);
  await assert.rejects(
    () => plan(root, { projectId: 'other-id' }),
    (error) => error instanceof HarnessProjectError && error.code === 'PROJECT_ID_CONFLICT',
  );
});

test('unsupported Node produces zero planned writes', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const before = await snapshot(root);
  await assert.rejects(
    () => plan(root, { nodeVersion: '22.12.9' }),
    (error) => error instanceof HarnessProjectError && error.code === 'UNSUPPORTED_NODE',
  );
  assert.equal(await snapshot(root), before);
});

test('malformed adapter blocks conflict before planning writes', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeFile(path.join(root, 'AGENTS.md'), '<!-- wizloft-harness:start -->\nunclosed\n');
  const before = await snapshot(root);
  await assert.rejects(
    () => plan(root),
    (error) => error instanceof HarnessProjectError && error.code === 'MANAGED_BLOCK_CONFLICT',
  );
  assert.equal(await snapshot(root), before);
});

test('planned operations are deeply frozen', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const result = await plan(root);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.operations), true);
  assert.equal(Object.isFrozen(result.operations[0]), true);
});
