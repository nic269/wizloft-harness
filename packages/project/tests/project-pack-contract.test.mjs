import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { lstat, mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  inspectPackedInternalDependencies,
  inspectReleaseContract,
  PUBLIC_PACKAGES,
} from '../../../scripts/release-contract.mjs';

const execFile = promisify(execFileCallback);
const repositoryRoot = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const PROJECT_NAME = '@wizloft/harness-project';
const PROJECT_DEPENDENCIES = Object.freeze([
  '@wizloft/harness',
  '@wizloft/harness-authority',
  '@wizloft/harness-cli-adapter',
  '@wizloft/harness-commands',
  '@wizloft/harness-context',
  '@wizloft/harness-evidence',
  '@wizloft/harness-kernel',
  '@wizloft/harness-plugin-file-events',
  '@wizloft/harness-plugin-file-memory',
  '@wizloft/harness-plugin-memory-context',
  '@wizloft/harness-plugin-repository-files',
  '@wizloft/harness-validation',
]);
const EXPECTED_LAYERS = Object.freeze([
  ['@wizloft/harness-kernel'],
  [
    '@wizloft/harness-authority',
    '@wizloft/harness-context',
    '@wizloft/harness-evidence',
    '@wizloft/harness-memory',
    '@wizloft/harness-plugin-file-events',
  ],
  [
    '@wizloft/harness-plugin-file-memory',
    '@wizloft/harness-plugin-memory-context',
    '@wizloft/harness-plugin-repository-files',
    '@wizloft/harness-validation',
  ],
  ['@wizloft/harness'],
  ['@wizloft/harness-commands'],
  ['@wizloft/harness-cli-adapter'],
  [PROJECT_NAME],
]);
const LOCAL_PROTOCOL_PATTERN = /(?:workspace|file|link):/u;

async function run(command, args, options = {}) {
  try {
    return await execFile(command, args, {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      ...options,
    });
  } catch (error) {
    const stdout = typeof error.stdout === 'string' ? error.stdout : '';
    const stderr = typeof error.stderr === 'string' ? error.stderr : '';
    throw new Error(`${command} ${args.join(' ')} failed\n${stdout}${stderr}`, { cause: error });
  }
}

function computeDependencyLayers(graph) {
  const remaining = new Set(graph.keys());
  const completed = new Set();
  const layers = [];

  while (remaining.size > 0) {
    const layer = [...remaining]
      .filter((name) => [...graph.get(name)].every((dependency) => completed.has(dependency)))
      .sort();
    assert.notDeepEqual(layer, [], `packed runtime graph contains a cycle: ${[...remaining]}`);
    layers.push(layer);
    for (const name of layer) {
      remaining.delete(name);
      completed.add(name);
    }
  }

  return layers;
}

function isReachable(graph, source, target) {
  const pending = [...graph.get(source)];
  const visited = new Set();
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === target) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    pending.push(...graph.get(current));
  }
  return false;
}

test('packed project closes the intended fourteen-artifact runtime graph', async (context) => {
  const proofRoot = await mkdtemp(path.join(os.tmpdir(), 'wizloft-project-pack-contract-'));
  context.after(() => rm(proofRoot, { force: true, recursive: true }));
  const tarballsRoot = path.join(proofRoot, 'tarballs');
  const extractedRoot = path.join(proofRoot, 'extracted');
  await mkdir(tarballsRoot, { recursive: true });
  await mkdir(extractedRoot, { recursive: true });

  const releaseInspection = await inspectReleaseContract(repositoryRoot);
  assert.deepEqual(releaseInspection.errors, []);
  const releaseVersion = releaseInspection.releaseVersion;
  const proofEntries = [...PUBLIC_PACKAGES];
  assert.equal(PUBLIC_PACKAGES.length, 14);
  assert.equal(
    PUBLIC_PACKAGES.some((entry) => entry.name === PROJECT_NAME),
    true,
  );
  assert.equal(proofEntries.length, 14);
  assert.equal(new Set(proofEntries.map(({ name }) => name)).size, proofEntries.length);

  const packageRoots = new Map();
  for (const entry of proofEntries) {
    const before = new Set(await readdir(tarballsRoot));
    await run('pnpm', ['pack', '--pack-destination', tarballsRoot], {
      cwd: path.join(repositoryRoot, entry.directory),
    });
    const created = (await readdir(tarballsRoot)).filter(
      (name) => name.endsWith('.tgz') && !before.has(name),
    );
    assert.equal(created.length, 1, `${entry.name} must create exactly one tarball`);

    const extractPath = path.join(extractedRoot, entry.name.replaceAll('/', '-').replace('@', ''));
    await mkdir(extractPath, { recursive: true });
    await run('tar', ['-xzf', path.join(tarballsRoot, created[0]), '-C', extractPath]);
    packageRoots.set(entry.name, path.join(extractPath, 'package'));
  }

  const manifests = new Map();
  for (const entry of proofEntries) {
    const packageRoot = packageRoots.get(entry.name);
    const manifestText = await readFile(path.join(packageRoot, 'package.json'), 'utf8');
    const manifest = JSON.parse(manifestText);
    assert.equal(manifest.name, entry.name);
    assert.equal(manifest.version, releaseVersion);
    assert.deepEqual(inspectPackedInternalDependencies(manifest, releaseVersion), []);
    assert.equal(
      LOCAL_PROTOCOL_PATTERN.test(
        JSON.stringify({
          dependencies: manifest.dependencies,
          devDependencies: manifest.devDependencies,
          optionalDependencies: manifest.optionalDependencies,
          peerDependencies: manifest.peerDependencies,
        }),
      ),
      false,
      `${manifest.name} packed runtime metadata must not contain a local protocol`,
    );
    manifests.set(manifest.name, manifest);
  }
  assert.equal(manifests.size, proofEntries.length);

  const graph = new Map();
  for (const [name, manifest] of manifests) {
    const internalDependencies = Object.entries(manifest.dependencies ?? {}).filter(
      ([dependency]) => dependency.startsWith('@wizloft/harness'),
    );
    for (const [dependency, specifier] of internalDependencies) {
      const target = manifests.get(dependency);
      assert.notEqual(target, undefined, `${name} depends on absent packed package ${dependency}`);
      assert.equal(specifier, target.version, `${name} must exactly pin packed ${dependency}`);
    }
    graph.set(name, new Set(internalDependencies.map(([dependency]) => dependency)));
  }

  const projectManifest = manifests.get(PROJECT_NAME);
  assert.equal(projectManifest.private, undefined);
  assert.deepEqual(Object.keys(projectManifest.dependencies ?? {}).sort(), PROJECT_DEPENDENCIES);
  assert.equal(projectManifest.dependencies['@wizloft/harness-memory'], undefined);
  assert.equal(projectManifest.optionalDependencies, undefined);
  assert.equal(projectManifest.peerDependencies, undefined);
  for (const dependency of PROJECT_DEPENDENCIES) {
    assert.equal(projectManifest.dependencies[dependency], releaseVersion);
  }
  assert.equal(isReachable(graph, PROJECT_NAME, '@wizloft/harness-memory'), true);

  const layers = computeDependencyLayers(graph);
  assert.deepEqual(layers, EXPECTED_LAYERS);
  assert.equal(layers.findIndex((layer) => layer.includes(PROJECT_NAME)) + 1, 7);

  const projectRoot = packageRoots.get(PROJECT_NAME);
  await lstat(path.join(projectRoot, 'package.json'));
  await lstat(path.join(projectRoot, projectManifest.exports['.'].import));
  await lstat(path.join(projectRoot, projectManifest.exports['.'].types));
  await lstat(path.join(projectRoot, projectManifest.types));
  await lstat(path.join(projectRoot, projectManifest.bin['wizloft-harness-project']));
  assert.equal(
    (await readdir(projectRoot)).some((name) => /^README/iu.test(name)),
    true,
  );
  await lstat(path.join(projectRoot, 'LICENSE'));

  const projectMetadata = JSON.stringify(projectManifest);
  assert.equal(LOCAL_PROTOCOL_PATTERN.test(projectMetadata), false);
  assert.equal(projectMetadata.includes(repositoryRoot), false);
});
