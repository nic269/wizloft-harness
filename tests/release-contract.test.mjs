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
  for (const workspaceRoot of ['packages', 'profiles']) {
    await mkdir(path.join(targetRoot, workspaceRoot), { recursive: true });
  }
  for (const entry of PUBLIC_PACKAGES) {
    const target = path.join(targetRoot, entry.directory);
    await mkdir(target, { recursive: true });
    for (const file of ['package.json', 'README.md', 'LICENSE']) {
      await cp(path.join(repositoryRoot, entry.directory, file), path.join(target, file));
    }
    for (const pluginSource of entry.pluginSources) {
      const sourceTarget = path.join(targetRoot, pluginSource);
      await mkdir(path.dirname(sourceTarget), { recursive: true });
      await cp(path.join(repositoryRoot, pluginSource), sourceTarget);
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
  assert.equal(isValidReleaseVersion('0.1.0-alpha.3'), true);
  assert.equal(isValidReleaseVersion('not-semver'), false);
  assert.equal(isValidReleaseVersion('0.0.0'), false);
  const inspection = await inspectReleaseContract(repositoryRoot);

  assert.deepEqual(inspection.errors, []);
  assert.equal(inspection.releaseVersion, '0.2.0');
  assert.equal(inspection.publicPackages.length, 4);
  assert.deepEqual(
    PUBLIC_PACKAGES.map(({ name }) => name),
    [
      '@wizloft/harness-kernel',
      '@wizloft/harness',
      '@wizloft/harness-file-providers',
      '@wizloft/harness-project',
    ],
  );
  const project = PUBLIC_PACKAGES.find((entry) => entry.name === '@wizloft/harness-project');
  assert.notEqual(project, undefined);
  assert.equal(project.directory, 'packages/project');
  assert.deepEqual(project.dependencies, [
    '@wizloft/harness',
    '@wizloft/harness-file-providers',
    '@wizloft/harness-kernel',
  ]);
  assert.deepEqual(project.devDependencies, []);
  assert.deepEqual(project.pluginSources, []);
  const providers = PUBLIC_PACKAGES.find(
    (entry) => entry.name === '@wizloft/harness-file-providers',
  );
  assert.deepEqual(Object.keys(providers.exports).sort(), [
    './events',
    './memory',
    './memory-context',
    './repository',
  ]);
});

test('release contract rejects identity drift, plugin drift, and accidental publication', async (context) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'wizloft-release-contract-'));
  context.after(() => rm(fixtureRoot, { force: true, recursive: true }));
  await copyReleaseFixture(fixtureRoot);
  const fixtureReleaseVersion = JSON.parse(
    await readFile(path.join(fixtureRoot, 'package.json'), 'utf8'),
  ).version;

  const harnessManifestPath = path.join(fixtureRoot, 'packages/harness/package.json');
  const harnessManifest = JSON.parse(await readFile(harnessManifestPath, 'utf8'));
  harnessManifest.version = '0.0.0';
  await writeFile(harnessManifestPath, JSON.stringify(harnessManifest));

  const authoritySourcePath = path.join(fixtureRoot, 'packages/harness/src/authority.ts');
  const authoritySource = await readFile(authoritySourcePath, 'utf8');
  await writeFile(
    authoritySourcePath,
    authoritySource.replace(`version: '${fixtureReleaseVersion}'`, "version: '9.9.9'"),
  );

  const unlistedRoot = path.join(fixtureRoot, 'packages/unlisted');
  await mkdir(unlistedRoot);
  await writeFile(
    path.join(unlistedRoot, 'package.json'),
    JSON.stringify({ name: '@wizloft/unlisted', private: false }),
  );

  const inspection = await inspectReleaseContract(fixtureRoot);
  assert.equal(
    inspection.errors.some((error) =>
      error.includes('@wizloft/harness version must equal root release version'),
    ),
    true,
  );
  assert.equal(
    inspection.errors.includes('@wizloft/harness must not use placeholder version 0.0.0'),
    true,
  );
  assert.equal(
    inspection.errors.includes(
      `@wizloft/harness runtime plugin version in packages/harness/src/authority.ts must equal ${fixtureReleaseVersion}`,
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

  const harnessManifestPath = path.join(fixtureRoot, 'packages/harness/package.json');
  const harnessManifest = JSON.parse(await readFile(harnessManifestPath, 'utf8'));
  harnessManifest.peerDependencies = { '@wizloft/harness-kernel': 'workspace:*' };
  harnessManifest.optionalDependencies = { '@wizloft/harness-file-providers': 'workspace:*' };
  await writeFile(harnessManifestPath, JSON.stringify(harnessManifest));

  const inspection = await inspectReleaseContract(fixtureRoot);
  assert.equal(
    inspection.errors.includes(
      '@wizloft/harness internal peerDependencies.@wizloft/harness-kernel is not approved by release graph',
    ),
    true,
  );
  assert.equal(
    inspection.errors.includes(
      '@wizloft/harness internal optionalDependencies.@wizloft/harness-file-providers is not approved by release graph',
    ),
    true,
  );
  assert.equal(
    inspection.errors.some((error) =>
      error.includes('@wizloft/harness internal development dependency graph'),
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
