import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isValidReleaseVersion,
  PUBLIC_PACKAGES,
  RELEASE_BUGS_URL,
  RELEASE_FILES,
  RELEASE_HOMEPAGE,
  RELEASE_REGISTRY,
  RELEASE_REPOSITORY_URL,
} from './release-contract.mjs';

const repositoryRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const rootManifest = await readJson(path.join(repositoryRoot, 'package.json'));
const releaseVersion = rootManifest.version;
if (!isValidReleaseVersion(releaseVersion)) {
  throw new Error('root package.json must declare a valid non-placeholder semver release version');
}
const rootLicense = await readFile(path.join(repositoryRoot, 'LICENSE'));

for (const entry of PUBLIC_PACKAGES) {
  const packageRoot = path.join(repositoryRoot, entry.directory);
  const manifestPath = path.join(packageRoot, 'package.json');
  const manifest = await readJson(manifestPath);
  if (manifest.name !== entry.name) {
    throw new Error(`${manifestPath} does not match release package ${entry.name}`);
  }

  manifest.version = releaseVersion;
  delete manifest.private;
  manifest.license = 'MIT';
  manifest.engines = { node: '>=22.13.0' };
  manifest.files = [...RELEASE_FILES];
  manifest.types = './dist/index.d.ts';
  manifest.repository = {
    type: 'git',
    url: RELEASE_REPOSITORY_URL,
    directory: entry.directory,
  };
  manifest.homepage = RELEASE_HOMEPAGE;
  manifest.bugs = { url: RELEASE_BUGS_URL };
  manifest.publishConfig = { access: 'public', registry: RELEASE_REGISTRY };
  await writeJson(manifestPath, manifest);
  await writeFile(path.join(packageRoot, 'LICENSE'), rootLicense);

  if (entry.pluginSource !== undefined) {
    const sourcePath = path.join(repositoryRoot, entry.pluginSource);
    const source = await readFile(sourcePath, 'utf8');
    const matches = [...source.matchAll(/\bversion:\s*'([^']+)'/gu)];
    if (matches.length !== 1) {
      throw new Error(`${entry.pluginSource} must contain exactly one runtime plugin version`);
    }
    await writeFile(
      sourcePath,
      source.replace(/(\bversion:\s*)'[^']+'/u, `$1'${releaseVersion}'`),
      'utf8',
    );
  }
}

const selfHostManifestPath = path.join(repositoryRoot, 'profiles/self-host/package.json');
const selfHostManifest = await readJson(selfHostManifestPath);
selfHostManifest.private = true;
await writeJson(selfHostManifestPath, selfHostManifest);

console.log(
  `Synchronized ${PUBLIC_PACKAGES.length} public packages and 8 runtime plugins to ${releaseVersion}`,
);
