import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  inspectPackedInternalDependencies,
  inspectReleaseContract,
  isValidReleaseVersion,
  PUBLIC_PACKAGES,
} from '../scripts/release-contract.mjs';

const repositoryRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));

async function copyReleaseFixture(targetRoot) {
  await mkdir(targetRoot, { recursive: true });
  await cp(path.join(repositoryRoot, 'package.json'), path.join(targetRoot, 'package.json'));
  await cp(path.join(repositoryRoot, 'LICENSE'), path.join(targetRoot, 'LICENSE'));
  for (const workspaceRoot of ['packages', 'plugins', 'profiles']) {
    await mkdir(path.join(targetRoot, workspaceRoot), { recursive: true });
  }
  for (const entry of PUBLIC_PACKAGES) {
    const target = path.join(targetRoot, entry.directory);
    await mkdir(target, { recursive: true });
    for (const file of ['package.json', 'README.md', 'LICENSE']) {
      await cp(path.join(repositoryRoot, entry.directory, file), path.join(target, file));
    }
    if (entry.pluginSource !== undefined) {
      const sourceTarget = path.join(targetRoot, entry.pluginSource);
      await mkdir(path.dirname(sourceTarget), { recursive: true });
      await cp(path.join(repositoryRoot, entry.pluginSource), sourceTarget);
    }
  }
  const selfHostTarget = path.join(targetRoot, 'profiles/self-host');
  await mkdir(selfHostTarget, { recursive: true });
  await cp(
    path.join(repositoryRoot, 'profiles/self-host/package.json'),
    path.join(selfHostTarget, 'package.json'),
  );
}

test('release contract accepts exactly the approved public package set', async () => {
  assert.equal(isValidReleaseVersion('0.1.0-alpha.2'), true);
  assert.equal(isValidReleaseVersion('not-semver'), false);
  assert.equal(isValidReleaseVersion('0.0.0'), false);
  const inspection = await inspectReleaseContract(repositoryRoot);

  assert.deepEqual(inspection.errors, []);
  assert.equal(inspection.releaseVersion, '0.1.0-alpha.2');
  assert.equal(inspection.publicPackages.length, 13);
});

test('release contract rejects identity drift, plugin drift, and accidental publication', async (context) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'wizloft-release-contract-'));
  context.after(() => rm(fixtureRoot, { force: true, recursive: true }));
  await copyReleaseFixture(fixtureRoot);

  const authorityManifestPath = path.join(fixtureRoot, 'packages/authority/package.json');
  const authorityManifest = JSON.parse(await readFile(authorityManifestPath, 'utf8'));
  authorityManifest.version = '0.0.0';
  await writeFile(authorityManifestPath, JSON.stringify(authorityManifest));

  const authoritySourcePath = path.join(fixtureRoot, 'packages/authority/src/index.ts');
  const authoritySource = await readFile(authoritySourcePath, 'utf8');
  await writeFile(
    authoritySourcePath,
    authoritySource.replace("version: '0.1.0-alpha.2'", "version: '9.9.9'"),
  );

  const unlistedRoot = path.join(fixtureRoot, 'plugins/unlisted');
  await mkdir(unlistedRoot);
  await writeFile(
    path.join(unlistedRoot, 'package.json'),
    JSON.stringify({ name: '@wizloft/unlisted', private: false }),
  );

  const inspection = await inspectReleaseContract(fixtureRoot);
  assert.equal(
    inspection.errors.some((error) =>
      error.includes('@wizloft/harness-authority version must equal root release version'),
    ),
    true,
  );
  assert.equal(
    inspection.errors.includes('@wizloft/harness-authority must not use placeholder version 0.0.0'),
    true,
  );
  assert.equal(
    inspection.errors.includes(
      '@wizloft/harness-authority runtime plugin version must equal 0.1.0-alpha.2',
    ),
    true,
  );
  assert.equal(
    inspection.errors.includes(
      '@wizloft/unlisted is outside the public allowlist and must be private',
    ),
    true,
  );
});

test('release contract models internal development dependencies and rejects peer or optional edges', async (context) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'wizloft-release-graph-'));
  context.after(() => rm(fixtureRoot, { force: true, recursive: true }));
  await copyReleaseFixture(fixtureRoot);

  const baseline = await inspectReleaseContract(fixtureRoot);
  assert.deepEqual(baseline.errors, []);

  const authorityManifestPath = path.join(fixtureRoot, 'packages/authority/package.json');
  const authorityManifest = JSON.parse(await readFile(authorityManifestPath, 'utf8'));
  authorityManifest.peerDependencies = { '@wizloft/harness-context': 'workspace:*' };
  authorityManifest.optionalDependencies = { '@wizloft/harness-memory': 'workspace:*' };
  await writeFile(authorityManifestPath, JSON.stringify(authorityManifest));

  const inspection = await inspectReleaseContract(fixtureRoot);
  assert.equal(
    inspection.errors.includes(
      '@wizloft/harness-authority internal peerDependencies.@wizloft/harness-context is not approved by release graph',
    ),
    true,
  );
  assert.equal(
    inspection.errors.includes(
      '@wizloft/harness-authority internal optionalDependencies.@wizloft/harness-memory is not approved by release graph',
    ),
    true,
  );
  assert.equal(
    inspection.errors.some((error) =>
      error.includes(
        '@wizloft/harness-plugin-memory-context internal development dependency graph',
      ),
    ),
    false,
  );
});

test('packed internal dependencies in every section must be exact and never use workspace protocol', () => {
  for (const section of [
    'dependencies',
    'devDependencies',
    'optionalDependencies',
    'peerDependencies',
  ]) {
    const exactManifest = {
      name: '@wizloft/test-package',
      [section]: { '@wizloft/harness-kernel': '0.1.0-alpha.2' },
    };
    assert.deepEqual(inspectPackedInternalDependencies(exactManifest, '0.1.0-alpha.2'), []);

    const workspaceManifest = {
      name: '@wizloft/test-package',
      [section]: { '@wizloft/harness-kernel': 'workspace:*' },
    };
    const errors = inspectPackedInternalDependencies(workspaceManifest, '0.1.0-alpha.2');
    assert.equal(
      errors.some((error) => error.includes(`packed ${section}.`)),
      true,
    );
    assert.equal(
      errors.some((error) => error.includes('retains workspace protocol')),
      true,
    );
  }
});
