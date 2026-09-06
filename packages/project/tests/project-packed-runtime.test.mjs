import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { inspectReleaseContract, PUBLIC_PACKAGES } from '../../../scripts/release-contract.mjs';

const execFile = promisify(execFileCallback);
const repositoryRoot = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const PROJECT_NAME = '@wizloft/harness-project';
const RECOVERY_COMMAND = 'npm --prefix .wizloft/harness ci --ignore-scripts --no-audit --no-fund';
const HEALTH_VALIDATOR_ID = '@wizloft/harness-project:runtime-health';

async function run(command, args, options = {}) {
  try {
    const result = await execFile(command, args, {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      ...options,
    });
    return { status: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    if (typeof error.code !== 'number') throw error;
    return {
      status: error.code,
      stdout: typeof error.stdout === 'string' ? error.stdout : '',
      stderr: typeof error.stderr === 'string' ? error.stderr : '',
    };
  }
}

async function runOk(command, args, options = {}) {
  const result = await run(command, args, options);
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}${result.stderr}`);
  return result;
}

async function snapshot(root) {
  const entries = [];
  async function walk(relativePath) {
    const absolutePath = relativePath === '' ? root : path.join(root, relativePath);
    const children = await readdir(absolutePath, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name));
    for (const child of children) {
      const childPath = relativePath === '' ? child.name : `${relativePath}/${child.name}`;
      if (child.isDirectory()) {
        entries.push(`dir:${childPath}`);
        await walk(childPath);
      } else if (child.isSymbolicLink()) {
        entries.push(`symlink:${childPath}`);
      } else {
        entries.push(
          `file:${childPath}:${(await readFile(path.join(root, childPath))).toString('base64')}`,
        );
      }
    }
  }
  await walk('');
  return entries.join('\n');
}

function staysInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function assertRealInstalledPackage(packageRoot, allowedRoot, forbiddenRoots) {
  const packageStat = await lstat(packageRoot);
  assert.equal(packageStat.isSymbolicLink(), false, `${packageRoot} must not be a symlink`);
  const canonicalPackage = await realpath(packageRoot);
  const canonicalAllowed = await realpath(allowedRoot);
  assert.equal(staysInside(canonicalAllowed, canonicalPackage), true);
  for (const forbiddenRoot of forbiddenRoots) {
    assert.equal(staysInside(await realpath(forbiddenRoot), canonicalPackage), false);
  }
  return canonicalPackage;
}

async function packProofSet(proofRoot, releaseVersion) {
  const tarballsRoot = path.join(proofRoot, 'tarballs');
  const extractedRoot = path.join(proofRoot, 'extracted');
  await mkdir(tarballsRoot, { recursive: true });
  await mkdir(extractedRoot, { recursive: true });
  const proofEntries = [...PUBLIC_PACKAGES];
  assert.equal(PUBLIC_PACKAGES.length, 4);
  assert.equal(
    PUBLIC_PACKAGES.some((entry) => entry.name === PROJECT_NAME),
    true,
  );
  assert.equal(proofEntries.length, 4);

  const packages = new Map();
  for (const entry of proofEntries) {
    const before = new Set(await readdir(tarballsRoot));
    await runOk('pnpm', ['pack', '--pack-destination', tarballsRoot], {
      cwd: path.join(repositoryRoot, entry.directory),
    });
    const created = (await readdir(tarballsRoot)).filter(
      (name) => name.endsWith('.tgz') && !before.has(name),
    );
    assert.equal(created.length, 1, `${entry.name} must create one tarball`);
    const tarballPath = path.join(tarballsRoot, created[0]);
    const extractRoot = path.join(extractedRoot, entry.name.replaceAll('/', '-').replace('@', ''));
    await mkdir(extractRoot, { recursive: true });
    await runOk('tar', ['-xzf', tarballPath, '-C', extractRoot]);
    const manifest = JSON.parse(
      await readFile(path.join(extractRoot, 'package', 'package.json'), 'utf8'),
    );
    assert.equal(manifest.name, entry.name);
    assert.equal(manifest.version, releaseVersion);
    const bytes = await readFile(tarballPath);
    packages.set(entry.name, {
      bytes,
      filename: created[0],
      integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
      manifest,
      shasum: createHash('sha1').update(bytes).digest('hex'),
    });
  }
  assert.equal(packages.size, PUBLIC_PACKAGES.length);
  return packages;
}

async function startRegistry(packages) {
  const requests = [];
  let registryUrl;
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', registryUrl);
    const method = request.method ?? 'GET';
    const pathname = requestUrl.pathname;
    const record = { known: false, method, pathname };
    requests.push(record);
    if (method !== 'GET' && method !== 'HEAD') {
      response.writeHead(405).end();
      return;
    }

    if (pathname.startsWith('/tarballs/')) {
      const name = decodeURIComponent(pathname.slice('/tarballs/'.length, -'.tgz'.length));
      const artifact = packages.get(name);
      if (artifact === undefined) {
        response.writeHead(404).end();
        return;
      }
      record.known = true;
      response.writeHead(200, {
        'content-length': artifact.bytes.length,
        'content-type': 'application/octet-stream',
      });
      response.end(method === 'HEAD' ? undefined : artifact.bytes);
      return;
    }

    let name;
    try {
      name = decodeURIComponent(pathname.slice(1));
    } catch {
      response.writeHead(400).end();
      return;
    }
    const artifact = packages.get(name);
    if (artifact === undefined) {
      response.writeHead(404).end();
      return;
    }
    record.known = true;
    const tarball = `${registryUrl}tarballs/${encodeURIComponent(name)}.tgz`;
    const manifest = {
      ...artifact.manifest,
      dist: { integrity: artifact.integrity, shasum: artifact.shasum, tarball },
    };
    const body = Buffer.from(
      JSON.stringify({
        _id: name,
        name,
        'dist-tags': { latest: artifact.manifest.version },
        versions: { [artifact.manifest.version]: manifest },
      }),
    );
    response.writeHead(200, {
      'content-length': body.length,
      'content-type': 'application/json',
    });
    response.end(method === 'HEAD' ? undefined : body);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, 'object');
  registryUrl = `http://127.0.0.1:${address.port}/`;
  return {
    registryUrl,
    requests,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

async function isolatedNpmEnv(proofRoot, registryUrl, name) {
  const cache = path.join(proofRoot, `${name}-npm-cache`);
  const userConfig = path.join(proofRoot, `${name}-user.npmrc`);
  const globalConfig = path.join(proofRoot, `${name}-global.npmrc`);
  await mkdir(cache, { recursive: true });
  await writeFile(userConfig, '');
  await writeFile(globalConfig, '');
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(?:NODE_AUTH_TOKEN|NPM_TOKEN)$/iu.test(key)) delete env[key];
    if (/^npm_config_.*(?:auth|token|password|credential)/iu.test(key)) delete env[key];
  }
  return {
    ...env,
    HTTP_PROXY: 'http://127.0.0.1:9',
    HTTPS_PROXY: 'http://127.0.0.1:9',
    NO_PROXY: '127.0.0.1,localhost',
    http_proxy: 'http://127.0.0.1:9',
    https_proxy: 'http://127.0.0.1:9',
    no_proxy: '127.0.0.1,localhost',
    npm_config_audit: 'false',
    npm_config_cache: cache,
    npm_config_fund: 'false',
    npm_config_globalconfig: globalConfig,
    npm_config_progress: 'false',
    npm_config_registry: registryUrl,
    npm_config_update_notifier: 'false',
    npm_config_userconfig: userConfig,
  };
}

async function createNpmInvocationSentinel(proofRoot) {
  const binDir = path.join(proofRoot, 'npm-invocation-sentinel', 'bin');
  const logPath = path.join(proofRoot, 'npm-invocation-sentinel', 'invocations.log');
  await mkdir(binDir, { recursive: true });
  const npmPath = path.join(binDir, 'npm');
  await writeFile(
    npmPath,
    [
      `#!${process.execPath}`,
      "import { appendFileSync } from 'node:fs';",
      `appendFileSync(${JSON.stringify(logPath)}, process.argv.slice(2).join(' ') + '\\n');`,
      'process.exit(66);',
      '',
    ].join('\n'),
  );
  await chmod(npmPath, 0o755);
  return {
    env(baseEnv) {
      return {
        ...baseEnv,
        PATH: `${binDir}${path.delimiter}${baseEnv.PATH ?? ''}`,
      };
    },
    async assertUnused() {
      await assert.rejects(() => readFile(logPath), { code: 'ENOENT' });
    },
  };
}

function parseJsonOutput(result) {
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
}

async function runWrapper(root, args, env) {
  return run(process.execPath, ['.wizloft/harness/run.mjs', ...args], { cwd: root, env });
}

function commandValue(result) {
  const envelope = parseJsonOutput(result);
  assert.equal(envelope.kind, 'result');
  return envelope;
}

let resolutionProbeId = 0;
function resolvableSpecifier(packageName) {
  const entry = PUBLIC_PACKAGES.find(({ name }) => name === packageName);
  assert.notEqual(entry, undefined, `unknown public package ${packageName}`);
  if (Object.hasOwn(entry.exports, '.')) return packageName;
  const subpath = Object.keys(entry.exports)[0];
  assert.notEqual(subpath, undefined, `${packageName} must expose at least one subpath`);
  return `${packageName}${subpath.slice(1)}`;
}

async function resolveFromContext(contextRoot, dependencyNames, cwd) {
  const probePath = path.join(
    contextRoot,
    `.runtime-resolution-probe-${process.pid}-${resolutionProbeId++}.mjs`,
  );
  const specifiers = dependencyNames.map(resolvableSpecifier);
  await writeFile(
    probePath,
    `const names = ${JSON.stringify(specifiers)};\nprocess.stdout.write(JSON.stringify(names.map((name) => import.meta.resolve(name))));\n`,
  );
  try {
    const result = await runOk(process.execPath, [probePath], { cwd });
    return JSON.parse(result.stdout);
  } finally {
    await rm(probePath, { force: true });
  }
}

async function discoverInstalledPackage(
  resolvedUrl,
  expectedName,
  canonicalNodeModulesRoot,
  canonicalForbiddenRoots,
) {
  const canonicalEntry = await realpath(fileURLToPath(resolvedUrl));
  assert.equal(staysInside(canonicalNodeModulesRoot, canonicalEntry), true, expectedName);
  for (const forbiddenRoot of canonicalForbiddenRoots) {
    assert.equal(staysInside(forbiddenRoot, canonicalEntry), false, expectedName);
  }

  let candidateRoot = path.dirname(canonicalEntry);
  while (staysInside(canonicalNodeModulesRoot, candidateRoot)) {
    const candidateStat = await lstat(candidateRoot);
    assert.equal(candidateStat.isSymbolicLink(), false, `${candidateRoot} must not be a symlink`);
    const manifestPath = path.join(candidateRoot, 'package.json');
    let manifestStat;
    try {
      manifestStat = await lstat(manifestPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        candidateRoot = path.dirname(candidateRoot);
        continue;
      }
      throw error;
    }
    assert.equal(manifestStat.isSymbolicLink(), false, `${manifestPath} must not be a symlink`);
    assert.equal(manifestStat.isFile(), true, `${manifestPath} must be a regular file`);
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    assert.equal(manifest.name, expectedName, `${manifestPath} has the wrong package identity`);
    const canonicalPackageRoot = await realpath(candidateRoot);
    assert.equal(staysInside(canonicalNodeModulesRoot, canonicalPackageRoot), true, expectedName);
    assert.equal(staysInside(canonicalPackageRoot, canonicalEntry), true, expectedName);
    for (const forbiddenRoot of canonicalForbiddenRoots) {
      assert.equal(staysInside(forbiddenRoot, canonicalPackageRoot), false, expectedName);
    }
    return { canonicalPackageRoot, manifest };
  }
  assert.fail(`Could not discover installed package root for ${expectedName}`);
}

async function assertRuntimeResolution(
  root,
  packages,
  releaseVersion,
  forbiddenRoots,
  registryRequests,
) {
  const harnessRoot = path.join(root, '.wizloft/harness');
  const nodeModulesRoot = path.join(harnessRoot, 'node_modules');
  const canonicalNodeModulesRoot = await realpath(nodeModulesRoot);
  const canonicalForbiddenRoots = await Promise.all(forbiddenRoots.map((entry) => realpath(entry)));
  const requestsBeforeResolution = registryRequests.length;
  const rootResolvedUrls = await resolveFromContext(harnessRoot, [PROJECT_NAME], root);
  assert.equal(rootResolvedUrls.length, 1);

  const pending = [{ name: PROJECT_NAME, resolvedUrl: rootResolvedUrls[0] }];
  const reachedNames = new Set();
  const reachedPhysicalRoots = new Set();
  while (pending.length > 0) {
    const { name, resolvedUrl } = pending.shift();
    const { canonicalPackageRoot, manifest } = await discoverInstalledPackage(
      resolvedUrl,
      name,
      canonicalNodeModulesRoot,
      canonicalForbiddenRoots,
    );
    assert.equal(manifest.version, releaseVersion, name);
    reachedNames.add(name);
    if (reachedPhysicalRoots.has(canonicalPackageRoot)) continue;
    reachedPhysicalRoots.add(canonicalPackageRoot);

    const dependencyNames = Object.keys(manifest.dependencies ?? {}).filter((dependencyName) =>
      packages.has(dependencyName),
    );
    dependencyNames.sort((left, right) => left.localeCompare(right));
    const resolvedDependencies = await resolveFromContext(
      canonicalPackageRoot,
      dependencyNames,
      root,
    );
    assert.equal(resolvedDependencies.length, dependencyNames.length);
    for (const [index, dependencyName] of dependencyNames.entries()) {
      pending.push({ name: dependencyName, resolvedUrl: resolvedDependencies[index] });
    }
  }
  assert.deepEqual([...reachedNames].sort(), [...packages.keys()].sort());
  assert.equal(reachedNames.has('@wizloft/harness-file-providers'), true);
  assert.equal(registryRequests.length, requestsBeforeResolution);
}

async function assertRuntimeCommands(root, env) {
  const help = await runWrapper(root, ['--help'], env);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Harness module commands/u);

  const inspect = await runWrapper(root, ['inspect', '--json'], env);
  assert.equal(inspect.status, 0, inspect.stderr);
  assert.equal(commandValue(inspect).commandId, 'harness.inspect');

  const projectAuthority = await runWrapper(
    root,
    ['authority', 'resolve', '--json', '--input', JSON.stringify({ subject: 'example:project' })],
    env,
  );
  assert.equal(projectAuthority.status, 0, projectAuthority.stderr);
  assert.equal(commandValue(projectAuthority).value.status, 'resolved');
  assert.equal(
    commandValue(projectAuthority).value.contenders[0].provenance.path,
    '.wizloft/PROJECT.md',
  );

  const harnessAuthority = await runWrapper(
    root,
    ['authority', 'resolve', '--json', '--input', JSON.stringify({ subject: 'example:harness' })],
    env,
  );
  assert.equal(harnessAuthority.status, 0, harnessAuthority.stderr);
  assert.equal(
    commandValue(harnessAuthority).value.contenders[0].provenance.path,
    '.wizloft/harness/INSTRUCTIONS.md',
  );

  const context = await runWrapper(
    root,
    ['context', 'resolve', '--json', '--input', JSON.stringify({ subject: 'example:project' })],
    env,
  );
  assert.equal(context.status, 0, context.stderr);
  assert.deepEqual(
    commandValue(context).value.authority.map((item) => item.provenance.path),
    ['.wizloft/PROJECT.md', '.wizloft/harness/INSTRUCTIONS.md'],
  );

  const request = {
    correlationId: 'packed-runtime-health',
    changedPaths: ['.wizloft/PROJECT.md'],
  };
  const selection = await runWrapper(
    root,
    ['validation', 'select', '--json', '--input', JSON.stringify(request)],
    env,
  );
  assert.equal(selection.status, 0, selection.stderr);
  assert.equal(
    commandValue(selection).value.entries.find((entry) => entry.validatorId === HEALTH_VALIDATOR_ID)
      ?.status,
    'selected',
  );
  const validation = await runWrapper(
    root,
    ['validation', 'run', '--json', '--input', JSON.stringify(request)],
    env,
  );
  assert.equal(validation.status, 0, validation.stderr);
  assert.equal(commandValue(validation).value.ok, true);
  assert.equal(
    commandValue(validation).value.outcomes.find(
      (outcome) => outcome.validatorId === HEALTH_VALIDATOR_ID,
    )?.status,
    'passed',
  );
}

test('packed initializer materializes and runs an isolated generated repository and fresh clone', {
  timeout: 120_000,
}, async (context) => {
  const proofRoot = await mkdtemp(path.join(tmpdir(), 'wizloft-project-packed-runtime-'));
  context.after(() => rm(proofRoot, { force: true, recursive: true }));
  const releaseInspection = await inspectReleaseContract(repositoryRoot);
  assert.deepEqual(releaseInspection.errors, []);
  const releaseVersion = releaseInspection.releaseVersion;
  const packages = await packProofSet(proofRoot, releaseVersion);
  const registry = await startRegistry(packages);
  let registryClosed = false;
  context.after(async () => {
    if (!registryClosed) await registry.close();
  });

  const bootstrapRoot = path.join(proofRoot, 'bootstrap');
  await mkdir(bootstrapRoot);
  await writeFile(
    path.join(bootstrapRoot, 'package.json'),
    `${JSON.stringify({
      name: 'wizloft-packed-initializer-bootstrap',
      version: '0.0.0',
      private: true,
      dependencies: { [PROJECT_NAME]: releaseVersion },
    })}\n`,
  );
  const bootstrapEnv = await isolatedNpmEnv(proofRoot, registry.registryUrl, 'bootstrap');
  await runOk('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: bootstrapRoot,
    env: bootstrapEnv,
  });
  const bootstrapProjectRoot = path.join(bootstrapRoot, 'node_modules/@wizloft/harness-project');
  await assertRealInstalledPackage(bootstrapProjectRoot, bootstrapRoot, [repositoryRoot]);
  const bootstrapManifest = JSON.parse(
    await readFile(path.join(bootstrapProjectRoot, 'package.json'), 'utf8'),
  );
  assert.equal(bootstrapManifest.version, releaseVersion);
  const binPath = path.resolve(
    bootstrapProjectRoot,
    bootstrapManifest.bin['wizloft-harness-project'],
  );

  const generatedRepo = path.join(proofRoot, 'generated-repo');
  await mkdir(generatedRepo);
  await runOk('git', ['init', '--quiet'], { cwd: generatedRepo });
  const generatedEnv = await isolatedNpmEnv(proofRoot, registry.registryUrl, 'generated');
  const dryRunBefore = await snapshot(generatedRepo);
  const requestsBeforeDryRun = registry.requests.length;
  const dryRun = await runOk(
    process.execPath,
    [binPath, 'init', '--root', generatedRepo, '--project-id', 'example', '--dry-run', '--json'],
    { cwd: bootstrapRoot, env: generatedEnv },
  );
  const dryRunJson = parseJsonOutput(dryRun);
  assert.equal(dryRunJson.state, 'clean');
  const installIndex = dryRunJson.operations.findIndex(({ kind }) => kind === 'install');
  const markerIndex = dryRunJson.operations.findIndex(
    ({ path: relativePath }) => relativePath === '.wizloft/harness/project.json',
  );
  assert.equal(installIndex >= 0 && installIndex < markerIndex, true);
  assert.equal(markerIndex, dryRunJson.operations.length - 1);
  assert.equal(await snapshot(generatedRepo), dryRunBefore);
  assert.equal(registry.requests.length, requestsBeforeDryRun);

  const applied = await runOk(
    process.execPath,
    [binPath, 'init', '--root', generatedRepo, '--project-id', 'example', '--json'],
    { cwd: bootstrapRoot, env: generatedEnv },
  );
  const applyJson = parseJsonOutput(applied);
  assert.equal(applyJson.initialState, 'clean');
  assert.equal(applyJson.finalState, 'current');
  assert.equal(applyJson.applied.at(-1)?.path, '.wizloft/harness/project.json');

  for (const relativePath of [
    '.wizloft/PROJECT.md',
    '.wizloft/harness/INSTRUCTIONS.md',
    '.wizloft/harness/profile.mjs',
    '.wizloft/harness/run.mjs',
    '.wizloft/harness/package.json',
    '.wizloft/harness/package-lock.json',
    '.wizloft/harness/project.json',
    '.wizloft/harness/node_modules',
    'AGENTS.md',
    'CLAUDE.md',
    '.gitignore',
  ]) {
    await lstat(path.join(generatedRepo, relativePath));
  }
  await assert.rejects(() => readFile(path.join(generatedRepo, 'package.json')), {
    code: 'ENOENT',
  });

  const isolatedManifestPath = path.join(generatedRepo, '.wizloft/harness/package.json');
  const isolatedManifest = JSON.parse(await readFile(isolatedManifestPath, 'utf8'));
  assert.equal(isolatedManifest.private, true);
  assert.deepEqual(isolatedManifest.dependencies, { [PROJECT_NAME]: releaseVersion });
  const lockPath = path.join(generatedRepo, '.wizloft/harness/package-lock.json');
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  assert.equal(lock.lockfileVersion >= 2, true);
  assert.equal(lock.packages[''].dependencies[PROJECT_NAME], releaseVersion);
  assert.equal(lock.packages[`node_modules/${PROJECT_NAME}`].version, releaseVersion);
  assert.match(
    lock.packages[`node_modules/${PROJECT_NAME}`].resolved,
    new RegExp(`^${registry.registryUrl.replaceAll('.', '\\.')}`),
  );

  const generatedProjectRoot = path.join(
    generatedRepo,
    '.wizloft/harness/node_modules/@wizloft/harness-project',
  );
  await assertRealInstalledPackage(
    generatedProjectRoot,
    path.join(generatedRepo, '.wizloft/harness/node_modules'),
    [repositoryRoot, path.join(bootstrapRoot, 'node_modules')],
  );
  await assertRuntimeResolution(
    generatedRepo,
    packages,
    releaseVersion,
    [repositoryRoot, path.join(bootstrapRoot, 'node_modules')],
    registry.requests,
  );

  const requestsBeforeRuntime = registry.requests.length;
  await assertRuntimeCommands(generatedRepo, generatedEnv);
  assert.equal(registry.requests.length, requestsBeforeRuntime);

  await runOk('git', ['add', '.'], { cwd: generatedRepo });
  await runOk(
    'git',
    [
      '-c',
      'user.name=Harness Test',
      '-c',
      'user.email=harness@example.invalid',
      'commit',
      '--quiet',
      '-m',
      'generated contract',
    ],
    { cwd: generatedRepo },
  );
  const cloneRoot = path.join(proofRoot, 'fresh-clone');
  await runOk('git', ['clone', '--quiet', generatedRepo, cloneRoot], { cwd: proofRoot });
  await assert.rejects(() => lstat(path.join(cloneRoot, '.wizloft/harness/node_modules')), {
    code: 'ENOENT',
  });
  const markerBeforeCi = await readFile(path.join(cloneRoot, '.wizloft/harness/project.json'));
  const lockBeforeCi = await readFile(path.join(cloneRoot, '.wizloft/harness/package-lock.json'));
  const beforeRecovery = await runWrapper(cloneRoot, ['inspect', '--json'], generatedEnv);
  assert.equal(beforeRecovery.status, 1);
  assert.equal(beforeRecovery.stderr.split(RECOVERY_COMMAND).length - 1, 1);

  const cloneEnv = await isolatedNpmEnv(proofRoot, registry.registryUrl, 'clone');
  await runOk(
    'npm',
    ['--prefix', '.wizloft/harness', 'ci', '--ignore-scripts', '--no-audit', '--no-fund'],
    { cwd: cloneRoot, env: cloneEnv },
  );
  assert.equal(
    (await readFile(path.join(cloneRoot, '.wizloft/harness/project.json'))).equals(markerBeforeCi),
    true,
  );
  assert.equal(
    (await readFile(path.join(cloneRoot, '.wizloft/harness/package-lock.json'))).equals(
      lockBeforeCi,
    ),
    true,
  );
  await assertRuntimeResolution(
    cloneRoot,
    packages,
    releaseVersion,
    [repositoryRoot, path.join(bootstrapRoot, 'node_modules')],
    registry.requests,
  );
  const requestsBeforeCloneRuntime = registry.requests.length;
  await assertRuntimeCommands(cloneRoot, cloneEnv);
  assert.equal(registry.requests.length, requestsBeforeCloneRuntime);

  const requestsBeforeReinit = registry.requests.length;
  const beforeCurrent = await snapshot(generatedRepo);
  const npmSentinel = await createNpmInvocationSentinel(proofRoot);
  const currentEnv = npmSentinel.env(generatedEnv);
  const currentApply = await runOk(
    process.execPath,
    [binPath, 'init', '--root', generatedRepo, '--project-id', 'example', '--json'],
    { cwd: bootstrapRoot, env: currentEnv },
  );
  const currentApplyJson = parseJsonOutput(currentApply);
  assert.equal(currentApplyJson.initialState, 'current');
  assert.equal(currentApplyJson.finalState, 'current');
  assert.deepEqual(currentApplyJson.applied, []);
  assert.equal(await snapshot(generatedRepo), beforeCurrent);
  const currentDryRun = await runOk(
    process.execPath,
    [binPath, 'init', '--root', generatedRepo, '--project-id', 'example', '--dry-run', '--json'],
    { cwd: bootstrapRoot, env: currentEnv },
  );
  assert.equal(parseJsonOutput(currentDryRun).state, 'current');
  assert.deepEqual(parseJsonOutput(currentDryRun).operations, []);
  assert.equal(await snapshot(generatedRepo), beforeCurrent);
  assert.equal(registry.requests.length, requestsBeforeReinit);
  await npmSentinel.assertUnused();

  const marker = JSON.parse(
    await readFile(path.join(generatedRepo, '.wizloft/harness/project.json'), 'utf8'),
  );
  assert.equal(marker.schema, 'wizloft.harness.project');
  assert.equal(marker.generatedBy.package, PROJECT_NAME);
  assert.equal(marker.generatedBy.version, releaseVersion);
  assert.equal(marker.runtime.package, PROJECT_NAME);
  assert.equal(marker.runtime.release, releaseVersion);
  assert.equal(marker.projectId, 'example');
  assert.deepEqual(marker.command.argv, ['node', '.wizloft/harness/run.mjs']);

  await registry.close();
  registryClosed = true;
  const originalOffline = await runWrapper(generatedRepo, ['inspect', '--json'], generatedEnv);
  assert.equal(originalOffline.status, 0, originalOffline.stderr);
  const cloneOffline = await runWrapper(cloneRoot, ['inspect', '--json'], cloneEnv);
  assert.equal(cloneOffline.status, 0, cloneOffline.stderr);

  assert.equal(registry.requests.length > 0, true);
  assert.equal(
    registry.requests.every(({ known }) => known),
    true,
  );
  assert.equal(
    registry.requests.every(({ method }) => method === 'GET' || method === 'HEAD'),
    true,
  );
});
