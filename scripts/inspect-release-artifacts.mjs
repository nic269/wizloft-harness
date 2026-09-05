import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { PUBLIC_PACKAGES } from './release-contract.mjs';

const execFile = promisify(execFileCallback);
const FORBIDDEN_FILE_SHA256 = new Set([
  '05a631458710b3ac50edb9234d8d946ae7470e33af731a2a0a6e1d0c0c795bb7',
  'd414e0737a498fe710e7ffb224de0ed14cf847bfc42b18529ca10d4e118882b9',
  '9f1d1c07e25d5b396b7f55df0528ab30e468a01977c8dc9cd57d2cd1f43c7154',
  '8899add5e17b506145541a191ca9f562a15ba24411ff7287275cbad49d9822dd',
  'affc08739ab30ac2c3d610cbee1e116fce4bc45c6fb88a5c4e62ecf42e107edc',
]);
const FORBIDDEN_PACKAGE_SHA1 = new Set([
  '0f0e670fa0e43cdf81cc3f7596e74910bd247fc6',
  '621a5786ea5e82611571caaebbbc0c45233746a7',
  '8f362eda1bf516c074d3d599cba6b4f98f18d080',
  '2576a3539e0e38aba63b012c471477d75b03f236',
  '540d7396e8a00dce871668bb46ce790480f4a2cc',
]);
const FORBIDDEN_PACKAGE_SHA512 = new Set([
  'sha512-wcfNvV/Vc0RDgLX9+DwUtHIA9EfcuBguWgAvKo6+YZug4m+dZbf38s+/CS2YOHxk4zLtXvZLGhSFVZKz4rqurw==',
  'sha512-QuJ0Zc/EozGNeGCAhDuryXKfykj8OtD6FrDttkKJiadHdjcl1uGKBXDFSVlpnEdLV+ZoIS8gm9N7buLA28FwGg==',
  'sha512-O1jwC3sOspfwThpme5f/ivN6gNLZk5DubIRxSLToUYbKqt2YF6y+gZCo2kH/KOnZqIRb6FOUOUCYGmsF0/f32Q==',
  'sha512-JZNklTnTFooSUSfIS9AjuXmfPrqL/MAZr4biVGjEkrE3Vit5yYm3VjCEDLG8uSLbQlP3eUNPyZKPClnCzsbefA==',
  'sha512-L4En6T5cJ6xNU7vQgabDEJBYhy8JbxW/x0/Bpe4zZDFyMWHqjWbSrDsdpJCIHDZbPEmE2yJNnmXeK/LSj4LR+A==',
]);
const FORBIDDEN_TEXT = [
  '_0x240a',
  '_0x4963',
  '0xa322e5f39adc2490ef6f0121063e358050d311d3080e',
  'eth.drpc.org',
  'h.drpc.org',
  'ethereum-rpc.publicnode.com',
  'filterby=from',
  '/0x/ls',
  '/0x/cl',
  'global.r=require',
  'global.m=module',
];
const FORBIDDEN_EXECUTION = [
  /\beval\s*\(/u,
  /\bnew\s+Function\s*\(/u,
  /\bspawn\s*\([^\n]*detached\s*:\s*true/u,
  /\bimport(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*(?:\n|$))*\((?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*(?:\n|$))*['"`](?:data:|https?:)/u,
];

function digest(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest('hex');
}

function sri(algorithm, bytes) {
  return `${algorithm}-${createHash(algorithm).update(bytes).digest('base64')}`;
}

function assertSafeFilename(filename) {
  assert.equal(typeof filename, 'string');
  assert.equal(filename, path.basename(filename), `unsafe artifact filename: ${filename}`);
  assert.match(filename, /^[a-z0-9][a-z0-9._-]*\.tgz$/u);
}

function normalizePackagePath(packageName, value) {
  assert.equal(typeof value, 'string', `${packageName} executable path must be a string`);
  assert.equal(
    value.includes('\\'),
    false,
    `${packageName} executable path must use POSIX separators`,
  );
  const normalized = path.posix.normalize(value).replace(/^\.\//u, '');
  assert.equal(
    path.posix.isAbsolute(normalized),
    false,
    `${packageName} executable path is absolute`,
  );
  assert.equal(
    normalized === '..' || normalized.startsWith('../'),
    false,
    `${packageName} executable path escapes the package`,
  );
  assert.notEqual(normalized, '.', `${packageName} executable path is empty`);
  return normalized;
}

async function listExecutableFiles(packageRoot, manifest) {
  const declaredBins = new Set(
    (typeof manifest.bin === 'string'
      ? [manifest.bin]
      : Object.values(manifest.bin ?? {}).filter((value) => typeof value === 'string')
    ).map((value) => normalizePackagePath(manifest.name, value)),
  );
  const executableFiles = [];
  async function walk(directory, relativeDirectory = '') {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      assert.equal(
        entry.isSymbolicLink(),
        false,
        `${manifest.name} package contains symbolic link ${relativePath}`,
      );
      if (entry.isDirectory()) {
        await walk(path.join(directory, entry.name), relativePath);
        continue;
      }
      assert.equal(
        entry.isFile(),
        true,
        `${manifest.name} package contains unsafe ${relativePath}`,
      );
      if (
        ['.js', '.mjs', '.cjs'].includes(path.posix.extname(relativePath)) ||
        declaredBins.has(relativePath)
      ) {
        executableFiles.push(relativePath);
      }
    }
  }
  await walk(packageRoot);
  assert.ok(executableFiles.includes('dist/index.js'), `${manifest.name} entrypoint is missing`);
  for (const declaredBin of declaredBins) {
    assert.ok(
      executableFiles.includes(declaredBin),
      `${manifest.name} bin ${declaredBin} is missing`,
    );
  }
  return executableFiles;
}

async function inspectExecutable(packageRoot, packageName, relativePath) {
  const bytes = await readFile(path.join(packageRoot, relativePath));
  const sha256 = digest('sha256', bytes);
  assert.equal(
    FORBIDDEN_FILE_SHA256.has(sha256),
    false,
    `${packageName} ${relativePath} matches a malware IOC`,
  );
  const source = bytes.toString('utf8');
  const normalized = source.toLowerCase().replaceAll(/\s+/gu, '');
  for (const indicator of FORBIDDEN_TEXT) {
    assert.equal(
      normalized.includes(indicator.toLowerCase()),
      false,
      `${packageName} ${relativePath} contains forbidden indicator ${indicator}`,
    );
  }
  for (const pattern of FORBIDDEN_EXECUTION) {
    assert.equal(pattern.test(source), false, `${packageName} ${relativePath} matches ${pattern}`);
  }
  const longestLine = source
    .split('\n')
    .reduce((maximum, line) => Math.max(maximum, line.length), 0);
  assert.ok(
    longestLine < 10_000,
    `${packageName} ${relativePath} contains an obfuscated long line`,
  );
  return Object.freeze({ path: relativePath, sha256 });
}

async function inspectTarball(artifactsRoot, artifact, releaseVersion) {
  assertSafeFilename(artifact.filename);
  const tarballPath = path.join(artifactsRoot, artifact.filename);
  const bytes = await readFile(tarballPath);
  const sha1 = digest('sha1', bytes);
  const sha256 = digest('sha256', bytes);
  const sha512 = sri('sha512', bytes);
  assert.equal(FORBIDDEN_PACKAGE_SHA1.has(sha1), false, `${artifact.name} matches a malware SHA-1`);
  assert.equal(
    FORBIDDEN_PACKAGE_SHA512.has(sha512),
    false,
    `${artifact.name} matches a malware SHA-512`,
  );
  assert.equal(bytes.byteLength, artifact.size, `${artifact.name} tarball size mismatch`);
  assert.equal(sha1, artifact.sha1, `${artifact.name} tarball SHA-1 mismatch`);
  assert.equal(sha256, artifact.sha256, `${artifact.name} tarball SHA-256 mismatch`);
  assert.equal(sha512, artifact.sha512, `${artifact.name} tarball SHA-512 mismatch`);

  const extractionRoot = await mkdtemp(path.join(os.tmpdir(), 'wizloft-release-scan-'));
  try {
    await execFile('tar', ['-xzf', tarballPath, '-C', extractionRoot]);
    const packageRoot = path.join(extractionRoot, 'package');
    const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
    assert.equal(manifest.name, artifact.name, `${artifact.name} packed identity mismatch`);
    assert.equal(manifest.version, releaseVersion, `${artifact.name} packed version mismatch`);

    const executableFiles = [];
    for (const relativePath of await listExecutableFiles(packageRoot, manifest)) {
      executableFiles.push(await inspectExecutable(packageRoot, artifact.name, relativePath));
    }
    const entrypointSha256 = executableFiles.find(
      ({ path: relativePath }) => relativePath === 'dist/index.js',
    ).sha256;

    return Object.freeze({
      name: artifact.name,
      version: releaseVersion,
      filename: artifact.filename,
      size: bytes.byteLength,
      sha1,
      sha256,
      sha512,
      entrypointSha256,
      executableFiles: Object.freeze(executableFiles),
    });
  } finally {
    await rm(extractionRoot, { force: true, recursive: true });
  }
}

export async function inspectReleaseArtifacts(artifactsRoot) {
  assert.equal(path.isAbsolute(artifactsRoot), true, 'artifacts directory must be absolute');
  const manifestPath = path.join(artifactsRoot, 'release-artifacts.json');
  const manifestBytes = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(typeof manifest.releaseVersion, 'string');
  assert.deepEqual(
    manifest.artifacts.map(({ name }) => name),
    PUBLIC_PACKAGES.map(({ name }) => name),
    'artifact manifest must preserve dependency-safe public package order',
  );
  assert.equal(new Set(manifest.artifacts.map(({ filename }) => filename)).size, 14);

  const artifacts = [];
  for (const artifact of manifest.artifacts) {
    assert.equal(artifact.version, manifest.releaseVersion);
    artifacts.push(await inspectTarball(artifactsRoot, artifact, manifest.releaseVersion));
  }
  return Object.freeze({
    releaseVersion: manifest.releaseVersion,
    source: Object.freeze({ ...manifest.source }),
    manifestSha256: digest('sha256', manifestBytes),
    artifacts: Object.freeze(artifacts),
  });
}

const invokedPath = process.argv[1] === undefined ? '' : path.resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  assert.equal(
    process.argv.length,
    3,
    'usage: node scripts/inspect-release-artifacts.mjs <absolute-artifacts-directory>',
  );
  const result = await inspectReleaseArtifacts(process.argv[2]);
  console.log(JSON.stringify(result, null, 2));
}
