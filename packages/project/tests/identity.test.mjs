import assert from 'node:assert/strict';
import { realpath, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { HarnessProjectError } from '../dist/errors.js';
import { inspectLocalProjectRuntime } from '../dist/identity.js';
import { applyProjectInitializationWithRuntime } from '../dist/initialize.js';
import { planProjectInitialization } from '../dist/plan.js';
import {
  cleanup,
  gitInit,
  RELEASE,
  tempRepo,
  writeFileTree,
  writeIsolatedRuntimePackage,
  writeLocalPackage,
  writeTrackedContract,
} from './helpers.mjs';

test('identity accepts the import-only project export and validates its entry', async (context) => {
  const root = await tempRepo('wizloft-identity-import-only-');
  context.after(() => cleanup(root));
  await writeTrackedContract(root);
  await writeIsolatedRuntimePackage(root);

  const inspection = await inspectLocalProjectRuntime(root);
  assert.equal(inspection.ok, true);
  if (!inspection.ok) return;
  assert.equal(inspection.identity.version, RELEASE);
  assert.equal(
    inspection.identity.resolvedPath,
    await realpath(
      path.join(root, '.wizloft/harness/node_modules/@wizloft/harness-project/dist/index.js'),
    ),
  );
});

test('incomplete local package remains unavailable and recoverable with ci', async (context) => {
  const root = await tempRepo('wizloft-identity-incomplete-');
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  await writeLocalPackage(root);

  const inspection = await inspectLocalProjectRuntime(root);
  assert.deepEqual(inspection, {
    ok: false,
    kind: 'unavailable',
    reason: 'Cannot resolve @wizloft/harness-project from .wizloft/harness/node_modules',
  });
  const plan = await planProjectInitialization({ root, projectId: 'example' });
  assert.equal(plan.state, 'needs-local-materialization');
  assert.equal(plan.operations[0]?.kind, 'install');
  assert.equal(plan.operations[0]?.method, 'ci');
});

test('symlinked import entry is unsafe and never triggers npm repair', async (context) => {
  const root = await tempRepo('wizloft-identity-symlink-');
  const outside = await tempRepo('wizloft-identity-outside-');
  context.after(() => cleanup(root));
  context.after(() => cleanup(outside));
  gitInit(root);
  await writeTrackedContract(root);
  await writeFileTree(root, {
    '.wizloft/harness/node_modules/@wizloft/harness-project/package.json': `${JSON.stringify({
      name: '@wizloft/harness-project',
      version: RELEASE,
      type: 'module',
      exports: { '.': { import: './dist/index.js' } },
    })}\n`,
    '.wizloft/harness/node_modules/@wizloft/harness-project/dist/.keep': '',
  });
  const outsideEntry = path.join(outside, 'index.js');
  await writeFile(outsideEntry, 'export {};\n');
  await symlink(
    outsideEntry,
    path.join(root, '.wizloft/harness/node_modules/@wizloft/harness-project/dist/index.js'),
  );

  const inspection = await inspectLocalProjectRuntime(root);
  assert.equal(inspection.ok, false);
  if (inspection.ok) return;
  assert.equal(inspection.kind, 'unsafe');
  assert.match(inspection.reason, /entry is unsafe/);

  const installerCalls = [];
  await assert.rejects(
    () =>
      applyProjectInitializationWithRuntime(
        { root, projectId: 'example' },
        { installRuntime: async () => installerCalls.push('install') },
      ),
    (error) => error instanceof HarnessProjectError && error.code === 'LOCAL_RUNTIME_INVALID',
  );
  assert.deepEqual(installerCalls, []);
});
