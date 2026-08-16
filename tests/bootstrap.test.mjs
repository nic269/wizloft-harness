import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { inspectWorkspace } from '../scripts/check-workspace.mjs';

const repositoryRoot = new URL('../', import.meta.url);

async function readRepositoryFile(path) {
  return readFile(new URL(path, repositoryRoot), 'utf8');
}

test('workspace root is private and does not own executable names', async () => {
  const manifest = JSON.parse(await readRepositoryFile('package.json'));

  assert.equal(manifest.private, true);
  assert.equal(manifest.bin, undefined);
  assert.equal(manifest.directories?.bin, undefined);
  assert.match(manifest.packageManager, /^pnpm@\d+\.\d+\.\d+$/u);
  assert.equal(manifest.engines.node, '>=22.13.0');
  assert.equal(manifest.engines.pnpm, '>=11.10.0');
});

test('workspace exposes the complete root verification contract', async () => {
  const manifest = JSON.parse(await readRepositoryFile('package.json'));

  for (const script of ['check', 'typecheck', 'test', 'build', 'verify', 'workspace:check']) {
    assert.equal(typeof manifest.scripts[script], 'string', `missing root script: ${script}`);
  }
});

test('workspace discovers target package roots without requiring packages to exist', async () => {
  const workspace = await readRepositoryFile('pnpm-workspace.yaml');

  assert.match(workspace, /- packages\/\*/u);
  assert.match(workspace, /- plugins\/\*/u);
  assert.match(workspace, /- profiles\/\*/u);
});

test('workspace contract rejects packages that can escape root verification', async (context) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'wizloft-harness-workspace-'));
  context.after(() => rm(fixtureRoot, { force: true, recursive: true }));

  for (const root of ['packages', 'plugins', 'profiles']) {
    await mkdir(path.join(fixtureRoot, root), { recursive: true });
  }

  const missingScriptsRoot = path.join(fixtureRoot, 'packages', 'missing-scripts');
  await mkdir(missingScriptsRoot);
  await writeFile(
    path.join(missingScriptsRoot, 'package.json'),
    JSON.stringify({
      name: '@wizloft/missing-scripts',
      scripts: { build: 'tsc -b' },
    }),
  );

  const invalidScriptsRoot = path.join(fixtureRoot, 'packages', 'invalid-scripts');
  await mkdir(invalidScriptsRoot);
  await writeFile(
    path.join(invalidScriptsRoot, 'package.json'),
    JSON.stringify({
      name: '@wizloft/invalid-scripts',
      bin: { WIZLOFT: './bin/wizloft.js' },
      directories: { bin: 'bin' },
      scripts: {
        build: '   ',
        test: 'echo ready && pnpm run test',
        typecheck: 'tsc --noEmit',
      },
    }),
  );

  const linkedPackageSource = path.join(fixtureRoot, 'linked-package-source');
  await mkdir(linkedPackageSource);
  await writeFile(
    path.join(linkedPackageSource, 'package.json'),
    JSON.stringify({
      name: '@wizloft/linked',
      scripts: {
        build: 'tsc -b',
        test: 'node --test',
        typecheck: 'tsc --noEmit',
      },
    }),
  );
  const linkedPackageRoot = path.join(fixtureRoot, 'plugins', 'linked');
  await symlink(linkedPackageSource, linkedPackageRoot, 'dir');

  const inspection = await inspectWorkspace(fixtureRoot);

  assert.equal(inspection.errors.length, 7);
  assert.deepEqual(
    new Set(inspection.errors),
    new Set([
      '@wizloft/invalid-scripts has empty required script: build',
      '@wizloft/invalid-scripts required script directly invokes itself: test',
      '@wizloft/invalid-scripts must not use package.json directories.bin',
      '@wizloft/invalid-scripts claims executable owned by wizloft-cli: WIZLOFT',
      '@wizloft/missing-scripts is missing required script: test',
      '@wizloft/missing-scripts is missing required script: typecheck',
      `${linkedPackageRoot} must not be a symbolic-link workspace package`,
    ]),
  );
});

test('workspace contract rejects symlinked workspace roots', async (context) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'wizloft-harness-roots-'));
  context.after(() => rm(fixtureRoot, { force: true, recursive: true }));

  const externalPackages = path.join(fixtureRoot, 'external-packages');
  await mkdir(externalPackages);
  await symlink(externalPackages, path.join(fixtureRoot, 'packages'), 'dir');
  await mkdir(path.join(fixtureRoot, 'plugins'));
  await mkdir(path.join(fixtureRoot, 'profiles'));

  const inspection = await inspectWorkspace(fixtureRoot);

  assert.deepEqual(inspection.errors, [
    `${path.join(fixtureRoot, 'packages')} must not be a symbolic-link workspace root`,
  ]);
});
