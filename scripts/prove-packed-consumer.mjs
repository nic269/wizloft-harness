import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import {
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  realpath,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import os, { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { inspectReleaseArtifacts } from './inspect-release-artifacts.mjs';
import {
  inspectPackedInternalDependencies,
  inspectReleaseContract,
  PUBLIC_PACKAGES,
} from './release-contract.mjs';

const execFile = promisify(execFileCallback);
const repositoryRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const artifactsDestination = parseArtifactsDestination(process.argv.slice(2));
const proofRoot = await mkdtemp(path.join(tmpdir(), 'wizloft-harness-packed-consumer-'));
const defaultTarballsRoot = path.join(proofRoot, 'consumer', 'tarballs');
const extractedRoot = path.join(proofRoot, 'extracted');
const consumerRoot = path.join(proofRoot, 'consumer');
const npmCache = path.join(consumerRoot, '.npm-cache');

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

const PROJECT_NAME = '@wizloft/harness-project';
const LOCAL_PROTOCOL_PATTERN = /(?:workspace|file|link):/u;

function isContainedPath(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..');
}

function parseArtifactsDestination(args) {
  if (args.length === 0) return null;
  assert.equal(
    args[0],
    '--artifacts-dir',
    'usage: node scripts/prove-packed-consumer.mjs [--artifacts-dir <outside-repository-path>]',
  );
  assert.equal(
    args.length,
    2,
    'usage: node scripts/prove-packed-consumer.mjs [--artifacts-dir <outside-repository-path>]',
  );
  assert.notEqual(args[1], '', '--artifacts-dir requires a destination');
  assert.equal(path.isAbsolute(args[1]), true, '--artifacts-dir must be an absolute path');
  return path.normalize(args[1]);
}

async function stableDirectoryPath(handle) {
  if (process.platform === 'darwin') {
    const stats = await handle.stat({ bigint: true });
    return path.join('/.vol', String(stats.dev), String(stats.ino));
  }
  if (process.platform === 'linux') {
    return path.join('/proc', String(process.pid), 'fd', String(handle.fd));
  }
  throw new Error('--artifacts-dir requires Darwin file-ID paths or Linux descriptor paths');
}

function sameFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

async function openAnchoredDirectory(directory) {
  const canonicalDirectory = await realpath(directory);
  const root = path.parse(canonicalDirectory).root;
  let handle = await open(
    root,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW,
  );
  try {
    for (const component of path
      .relative(root, canonicalDirectory)
      .split(path.sep)
      .filter(Boolean)) {
      const anchor = await stableDirectoryPath(handle);
      const next = await open(
        path.join(anchor, component),
        fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW,
      );
      await handle.close();
      handle = next;
    }
    return handle;
  } catch (error) {
    await handle.close();
    throw error;
  }
}

async function assertDestinationBoundary(artifactsDirectory) {
  const boundary = await lstat(artifactsDirectory.destination, { bigint: true });
  assert.equal(
    boundary.isSymbolicLink(),
    false,
    '--artifacts-dir must not be replaced by a symbolic link',
  );
  assert.equal(
    sameFile(boundary, await artifactsDirectory.handle.stat({ bigint: true })),
    true,
    '--artifacts-dir must not be replaced or renamed during proof',
  );
}

async function prepareArtifactsDirectory(destination) {
  assert.equal(
    ['darwin', 'linux'].includes(process.platform),
    true,
    '--artifacts-dir requires Darwin file-ID paths or Linux descriptor paths',
  );
  const canonicalRepositoryRoot = await realpath(repositoryRoot);
  const parent = path.dirname(destination);
  const basename = path.basename(destination);
  const parentHandle = await openAnchoredDirectory(parent);
  try {
    const parentAnchor = await stableDirectoryPath(parentHandle);
    const canonicalParent = await realpath(parent);
    assert.equal(
      sameFile(
        await stat(canonicalParent, { bigint: true }),
        await parentHandle.stat({ bigint: true }),
      ),
      true,
      '--artifacts-dir parent must not be replaced during creation',
    );
    const canonicalCandidate = path.join(canonicalParent, basename);
    assert.equal(
      isContainedPath(canonicalRepositoryRoot, canonicalCandidate),
      false,
      '--artifacts-dir must resolve outside the repository',
    );
    await mkdir(path.join(parentAnchor, basename), { mode: 0o700 });
    const handle = await open(
      path.join(parentAnchor, basename),
      fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW,
    );
    const anchor = await stableDirectoryPath(handle);
    const artifactsDirectory = {
      anchor,
      childAnchor: anchor,
      destination,
      handle,
    };
    try {
      await assertDestinationBoundary(artifactsDirectory);
      assert.deepEqual(await readdir(artifactsDirectory.anchor), []);
      return artifactsDirectory;
    } catch (error) {
      await handle.close();
      throw error;
    }
  } finally {
    await parentHandle.close();
  }
}

async function inspectCleanSource(expectedSource = null) {
  const { stdout: status } = await run('git', [
    '--no-optional-locks',
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
  ]);
  assert.equal(status, '', 'artifact proof requires a clean index and worktree');
  const { stdout: commitOutput } = await run('git', ['rev-parse', 'HEAD']);
  const commit = commitOutput.trim();
  const { stdout: treeOutput } = await run('git', ['rev-parse', `${commit}^{tree}`]);
  const source = { commit, tree: treeOutput.trim() };
  if (expectedSource !== null) {
    assert.deepEqual(
      source,
      expectedSource,
      'artifact proof source commit/tree changed during proof',
    );
  }
  return source;
}

async function finalizeReleaseArtifacts(
  artifactsDirectory,
  releaseVersion,
  source,
  tools,
  packedArtifacts,
) {
  const artifacts = PUBLIC_PACKAGES.map(({ name }) => {
    const artifact = packedArtifacts.get(name);
    assert.ok(artifact, `missing packed artifact for ${name}`);
    return {
      name,
      version: artifact.manifest.version,
      filename: artifact.filename,
      size: artifact.size,
      sha1: artifact.shasum,
      sha256: artifact.sha256,
      sha512: artifact.integrity,
    };
  });
  assert.equal(artifacts.length, 14);
  assert.equal(new Set(artifacts.map(({ filename }) => filename)).size, 14);
  const manifest = {
    schemaVersion: 1,
    releaseVersion,
    source,
    tools,
    artifacts,
  };
  const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const finalName = 'release-artifacts.json';
  const temporaryName = `.release-artifacts.${randomBytes(16).toString('hex')}.tmp`;
  const temporaryPath = path.join(artifactsDirectory.anchor, temporaryName);
  const finalPath = path.join(artifactsDirectory.anchor, finalName);
  const finalizationDelay = Number(process.env.WIZLOFT_PACKED_PROOF_FINALIZATION_DELAY_MS ?? 0);
  assert.equal(
    Number.isInteger(finalizationDelay) && finalizationDelay >= 0 && finalizationDelay <= 30_000,
    true,
    'WIZLOFT_PACKED_PROOF_FINALIZATION_DELAY_MS must be an integer from 0 through 30000',
  );
  let installed = false;
  try {
    if (finalizationDelay > 0) await delay(finalizationDelay);
    await inspectCleanSource(source);
    await validateRetainedArtifacts(artifactsDirectory, packedArtifacts);
    const temporary = await open(
      temporaryPath,
      fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW,
      0o600,
    );
    try {
      await temporary.writeFile(bytes);
      await temporary.sync();
    } finally {
      await temporary.close();
    }
    assert.deepEqual(JSON.parse(await readFile(temporaryPath, 'utf8')), manifest);
    if (process.env.WIZLOFT_PACKED_PROOF_FAIL_BEFORE_MANIFEST_FINALIZE === '1') {
      throw new Error('injected failure before artifact manifest finalization');
    }
    await inspectCleanSource(source);
    await validateRetainedArtifacts(artifactsDirectory, packedArtifacts, [temporaryName]);
    await assertDestinationBoundary(artifactsDirectory);
    await link(temporaryPath, finalPath);
    installed = true;
    await artifactsDirectory.handle.sync();
    await assertDestinationBoundary(artifactsDirectory);
    return {
      artifacts,
      manifestPath: path.join(artifactsDirectory.destination, finalName),
      sha256,
    };
  } catch (error) {
    if (installed) {
      await unlink(finalPath).catch((unlinkError) => {
        if (unlinkError?.code !== 'ENOENT') throw unlinkError;
      });
      await artifactsDirectory.handle.sync();
    }
    throw error;
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (error?.code !== 'ENOENT') throw error;
    });
    await artifactsDirectory.handle.sync();
  }
}

async function validateRetainedArtifacts(
  artifactsDirectory,
  packedArtifacts,
  additionalEntries = [],
) {
  const expectedFilenames = [
    ...PUBLIC_PACKAGES.map(({ name }) => packedArtifacts.get(name).filename),
    ...additionalEntries,
  ];
  assert.deepEqual(
    (await readdir(artifactsDirectory.anchor)).sort(),
    expectedFilenames.toSorted(),
    'artifact destination must contain only retained tarballs and expected finalization entries',
  );
  for (const { name } of PUBLIC_PACKAGES) {
    const artifact = packedArtifacts.get(name);
    const retained = await open(
      path.join(artifactsDirectory.anchor, artifact.filename),
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    try {
      assert.equal((await retained.stat({ bigint: true })).isFile(), true);
      const bytes = await retained.readFile();
      assert.equal(bytes.byteLength, artifact.size);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), artifact.sha256);
      assert.equal(bytes.equals(artifact.bytes), true);
    } finally {
      await retained.close();
    }
  }
  await artifactsDirectory.handle.sync();
  await assertDestinationBoundary(artifactsDirectory);
}

async function isolatedNpmEnv(root, registryUrl, name) {
  const cache = path.join(root, `${name}-npm-cache`);
  const userConfig = path.join(root, `${name}-user.npmrc`);
  const globalConfig = path.join(root, `${name}-global.npmrc`);
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

async function startLoopbackRegistry(packages) {
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

async function proveGeneratedProjectOfflineInspect(releaseVersion, packedArtifacts) {
  const registry = await startLoopbackRegistry(packedArtifacts);
  try {
    const bootstrapRoot = path.join(proofRoot, 'generated', 'bootstrap');
    await mkdir(bootstrapRoot, { recursive: true });
    await writeFile(
      path.join(bootstrapRoot, 'package.json'),
      `${JSON.stringify({
        name: 'wizloft-packed-initializer-bootstrap',
        version: '0.0.0',
        private: true,
        dependencies: { [PROJECT_NAME]: releaseVersion },
      })}\n`,
    );
    const bootstrapEnv = await isolatedNpmEnv(
      proofRoot,
      registry.registryUrl,
      'generated-bootstrap',
    );
    await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: bootstrapRoot,
      env: bootstrapEnv,
    });

    const bootstrapProjectRoot = path.join(bootstrapRoot, 'node_modules/@wizloft/harness-project');
    const bootstrapManifest = JSON.parse(
      await readFile(path.join(bootstrapProjectRoot, 'package.json'), 'utf8'),
    );
    assert.equal(bootstrapManifest.version, releaseVersion);
    const binPath = path.resolve(
      bootstrapProjectRoot,
      bootstrapManifest.bin['wizloft-harness-project'],
    );

    const generatedRepo = path.join(proofRoot, 'generated', 'repo');
    await mkdir(generatedRepo);
    await run('git', ['init', '--quiet'], { cwd: generatedRepo });
    const generatedEnv = await isolatedNpmEnv(proofRoot, registry.registryUrl, 'generated-repo');
    const applied = await run(
      process.execPath,
      [binPath, 'init', '--root', generatedRepo, '--project-id', 'example', '--json'],
      { cwd: bootstrapRoot, env: generatedEnv },
    );
    const applyJson = JSON.parse(applied.stdout);
    assert.equal(applyJson.finalState, 'current');

    const isolatedManifest = JSON.parse(
      await readFile(path.join(generatedRepo, '.wizloft/harness/package.json'), 'utf8'),
    );
    assert.deepEqual(isolatedManifest.dependencies, { [PROJECT_NAME]: releaseVersion });
    assert.equal(LOCAL_PROTOCOL_PATTERN.test(JSON.stringify(isolatedManifest.dependencies)), false);
    await lstat(path.join(generatedRepo, '.wizloft/harness/run.mjs'));
    await lstat(path.join(generatedRepo, '.wizloft/harness/node_modules/@wizloft/harness-project'));
    assert.equal(registry.requests.length > 0, true);
    assert.equal(
      registry.requests.every(({ known }) => known),
      true,
    );
    assert.equal(
      registry.requests.every(({ method }) => method === 'GET' || method === 'HEAD'),
      true,
    );

    await registry.close();
    const offlineEnv = {
      ...generatedEnv,
      npm_config_offline: 'true',
      npm_config_registry: 'http://127.0.0.1:9/',
    };
    const inspect = await run(process.execPath, ['.wizloft/harness/run.mjs', 'inspect', '--json'], {
      cwd: generatedRepo,
      env: offlineEnv,
    });
    const envelope = JSON.parse(inspect.stdout);
    assert.equal(envelope.kind, 'result');
    assert.equal(envelope.commandId, 'harness.inspect');
    process.stdout.write('Generated-project packed offline inspect passed.\n');
  } catch (error) {
    await registry.close().catch(() => {});
    throw error;
  }
}

const consumerScenario = String.raw`
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { authorityPlugin } from '@wizloft/harness-authority';
import { createHarness, defineProfile } from '@wizloft/harness';
import { createHarnessCliAdapter } from '@wizloft/harness-cli-adapter';
import { createCommandExecutor } from '@wizloft/harness-commands';
import { contextPlugin } from '@wizloft/harness-context';
import { evidencePlugin } from '@wizloft/harness-evidence';
import { requireCapability } from '@wizloft/harness-kernel';
import { MEMORY_CAPABILITY_ID } from '@wizloft/harness-memory';
import { fileEventsPlugin, readFileEvents } from '@wizloft/harness-plugin-file-events';
import { fileMemoryPlugin } from '@wizloft/harness-plugin-file-memory';
import { memoryContextPlugin } from '@wizloft/harness-plugin-memory-context';
import { repositoryFilesPlugin } from '@wizloft/harness-plugin-repository-files';
import { VALIDATION_CAPABILITY, validationPlugin } from '@wizloft/harness-validation';

const releaseVersion = process.env.WIZLOFT_RELEASE_VERSION;
assert.equal(typeof releaseVersion, 'string');
assert.equal(MEMORY_CAPABILITY_ID, 'memory@1');

const fixtureRoot = path.resolve('fixture');
const stateRoot = path.resolve('state');
const eventsPath = path.join(stateRoot, 'events.jsonl');
const memoryPath = path.join(stateRoot, 'memory.jsonl');
await mkdir(fixtureRoot, { recursive: true });
await mkdir(stateRoot, { recursive: true });
await writeFile(path.join(fixtureRoot, 'authority.md'), '# Accepted external release authority\n');
await writeFile(path.join(fixtureRoot, 'supporting.md'), 'External packed consumer context\n');

const validatorPlugin = {
  name: '@external/release-validator',
  version: releaseVersion,
  requires: [requireCapability(VALIDATION_CAPABILITY)],
  setup(context) {
    return context.capabilities.get(VALIDATION_CAPABILITY).registerValidator({
      id: '@external/release-validator:fixture',
      kind: 'focused',
      applicable(request) {
        return request.changedPaths.includes('release.txt');
      },
      execute(request) {
        const passed =
          request.metadata !== null &&
          typeof request.metadata === 'object' &&
          !Array.isArray(request.metadata) &&
          request.metadata.expected === 'pass';
        return {
          status: passed ? 'passed' : 'failed',
          summary: passed ? 'External fixture passed' : 'External fixture failed as requested',
          metadata: { observed: passed ? 'pass' : 'fail' },
        };
      },
    });
  },
};

const profile = defineProfile({
  layers: [
    {
      name: 'external-packed-consumer',
      plugins: [
        authorityPlugin,
        contextPlugin,
        evidencePlugin,
        validationPlugin,
        fileEventsPlugin,
        fileMemoryPlugin,
        memoryContextPlugin,
        repositoryFilesPlugin,
        validatorPlugin,
      ],
      config: {
        '@wizloft/file-events': { path: eventsPath },
        '@wizloft/file-memory': { path: memoryPath },
        '@wizloft/memory-context': {
          mappings: [
            {
              subject: 'release:context',
              role: 'supporting',
              query: {
                scope: 'project:external-release-proof',
                states: ['active', 'superseded'],
              },
            },
          ],
        },
        '@wizloft/repository-files': {
          root: fixtureRoot,
          authority: [
            {
              subject: 'release:authority',
              path: 'authority.md',
              precedence: 100,
              resolutionKey: 'accepted-external-release',
            },
          ],
          context: [
            {
              subject: 'release:context',
              path: 'authority.md',
              role: 'authority',
            },
            {
              subject: 'release:context',
              path: 'supporting.md',
              role: 'supporting',
            },
          ],
        },
      },
    },
  ],
});

function result(envelope) {
  assert.equal(envelope.kind, 'result', JSON.stringify(envelope));
  return envelope.value;
}

async function cliResult(cli, argv, expectedExit = 0) {
  const execution = await cli.execute(['--json', ...argv]);
  assert.equal(execution.exitCode, expectedExit, execution.stdout || execution.stderr);
  assert.equal(execution.stderr, '');
  return result(JSON.parse(execution.stdout));
}

const firstHarness = await createHarness({
  profile,
  runtimeIdGenerator: () => 'external-packed-runtime-1',
  eventHistoryReader: { read: () => readFileEvents(eventsPath) },
});
const firstCommands = createCommandExecutor(firstHarness);
const firstCli = createHarnessCliAdapter(firstCommands);

const authority = await cliResult(firstCli, [
  'authority',
  'resolve',
  '--input',
  JSON.stringify({ subject: 'release:authority' }),
]);
assert.equal(authority.status, 'resolved');
assert.equal(authority.contenders[0].provenance.path, 'authority.md');

const candidate = result(
  await firstCommands.execute({
    commandId: 'memory.remember',
    input: {
      kind: 'semantic',
      scope: 'project:external-release-proof',
      content: 'Initial external release lesson',
      provenance: { sourceType: 'external-consumer', sourceId: 'initial-lesson' },
      tags: ['release'],
    },
  }),
);
assert.equal(candidate.state, 'candidate');
const activated = result(
  await firstCommands.execute({
    commandId: 'memory.transition',
    input: { id: candidate.id, state: 'active' },
  }),
);
assert.equal(activated.state, 'active');
const stale = result(
  await firstCommands.execute({
    commandId: 'memory.transition',
    input: { id: candidate.id, state: 'stale' },
  }),
);
assert.equal(stale.state, 'stale');
const replacement = result(
  await firstCommands.execute({
    commandId: 'memory.remember',
    input: {
      kind: 'semantic',
      scope: 'project:external-release-proof',
      state: 'active',
      content: 'Current external release lesson',
      provenance: { sourceType: 'external-consumer', sourceId: 'current-lesson' },
      tags: ['release'],
    },
  }),
);
const superseded = result(
  await firstCommands.execute({
    commandId: 'memory.transition',
    input: { id: candidate.id, state: 'superseded', supersededBy: replacement.id },
  }),
);
assert.equal(superseded.state, 'superseded');

const context = await cliResult(firstCli, [
  'context',
  'resolve',
  '--input',
  JSON.stringify({ subject: 'release:context' }),
]);
assert.equal(context.authority.length, 1);
assert.equal(context.supporting.length, 3);
assert.equal(
  context.supporting.filter((item) => item.provenance.sourceType === 'memory').length,
  2,
);

const passRequest = {
  correlationId: 'external-pass',
  changedPaths: ['release.txt'],
  metadata: { expected: 'pass' },
};
const selection = await cliResult(firstCli, [
  'validation',
  'select',
  '--input',
  JSON.stringify(passRequest),
]);
assert.deepEqual(
  selection.entries.map(({ status, validatorId }) => ({ status, validatorId })),
  [{ status: 'selected', validatorId: '@external/release-validator:fixture' }],
);
const passing = await cliResult(firstCli, [
  'validation',
  'run',
  '--input',
  JSON.stringify(passRequest),
]);
assert.equal(passing.ok, true);
assert.equal(passing.outcomes[0].status, 'passed');

const failing = await cliResult(
  firstCli,
  [
    'validation',
    'run',
    '--input',
    JSON.stringify({
      correlationId: 'external-fail',
      changedPaths: ['release.txt'],
      metadata: { expected: 'fail' },
    }),
  ],
  1,
);
assert.equal(failing.ok, false);
assert.equal(failing.outcomes[0].status, 'failed');

const evidence = await cliResult(firstCli, ['evidence', 'list']);
assert.equal(evidence.length, 2);
const events = await cliResult(firstCli, ['events', 'read']);
assert.equal(events.length, 2);
assert.equal(events.every(({ type }) => type === 'wizloft.evidence.recorded'), true);

const inspection = await cliResult(firstCli, ['inspect']);
assert.equal(inspection.runtimeId, 'external-packed-runtime-1');
assert.equal(inspection.capabilities.length, 5);
const publicRuntimePlugins = new Set([
  '@wizloft/authority',
  '@wizloft/context',
  '@wizloft/evidence',
  '@wizloft/validation',
  '@wizloft/file-events',
  '@wizloft/file-memory',
  '@wizloft/memory-context',
  '@wizloft/repository-files',
]);
for (const plugin of inspection.plugins) {
  if (publicRuntimePlugins.has(plugin.name)) assert.equal(plugin.version, releaseVersion);
}
assert.equal(
  inspection.plugins.filter(({ name }) => publicRuntimePlugins.has(name)).length,
  publicRuntimePlugins.size,
);

await firstHarness.shutdown();
assert.equal(firstHarness.inspect().state, 'disposed');
const disposed = await firstCommands.execute({
  commandId: 'memory.recall',
  input: { scope: 'project:external-release-proof' },
});
assert.equal(disposed.kind, 'error');
assert.equal(disposed.error.code, 'HARNESS_NOT_ACTIVE');

const secondHarness = await createHarness({
  profile,
  runtimeIdGenerator: () => 'external-packed-runtime-2',
  eventHistoryReader: { read: () => readFileEvents(eventsPath) },
});
const secondCommands = createCommandExecutor(secondHarness);
const recalled = result(
  await secondCommands.execute({
    commandId: 'memory.recall',
    input: {
      scope: 'project:external-release-proof',
      states: ['active', 'superseded'],
    },
  }),
);
assert.deepEqual(
  recalled.map(({ id, state }) => ({ id, state })),
  [
    { id: candidate.id, state: 'superseded' },
    { id: replacement.id, state: 'active' },
  ],
);
assert.equal(result(await secondCommands.execute({ commandId: 'events.read' })).length, 2);
assert.equal(
  result(
    await secondCommands.execute({
      commandId: 'authority.resolve',
      input: { subject: 'release:authority' },
    }),
  ).status,
  'resolved',
);
await secondHarness.shutdown();

const persistedMemory = await readFile(memoryPath, 'utf8');
assert.equal(persistedMemory.trim().split('\n').length, 5);
console.log('External packed consumer scenario passed.');
`;

let artifactsDirectory = null;
let artifactCompletionOutputWritten = false;
let artifactCompletion = null;
let artifactInspection = null;
try {
  const artifactMode = artifactsDestination !== null;
  const source = artifactMode ? await inspectCleanSource() : null;
  if (artifactMode) {
    artifactsDirectory = await prepareArtifactsDirectory(artifactsDestination);
  }
  const tarballsRoot = artifactsDirectory?.anchor ?? defaultTarballsRoot;
  const childTarballsRoot = artifactsDirectory?.childAnchor ?? tarballsRoot;
  const releaseInspection = await inspectReleaseContract(repositoryRoot);
  assert.deepEqual(releaseInspection.errors, []);
  const releaseVersion = releaseInspection.releaseVersion;
  assert.equal(PUBLIC_PACKAGES.length, 14);
  assert.equal(new Set(PUBLIC_PACKAGES.map(({ name }) => name)).size, 14);
  assert.equal(
    PUBLIC_PACKAGES.some((entry) => entry.name === PROJECT_NAME),
    true,
  );

  const rootLicense = await readFile(path.join(repositoryRoot, 'LICENSE'));
  await mkdir(consumerRoot, { recursive: true });
  if (!artifactMode) await mkdir(tarballsRoot, { recursive: true });
  await mkdir(extractedRoot, { recursive: true });

  const tarballByName = new Map();
  const packedArtifacts = new Map();
  for (const entry of PUBLIC_PACKAGES) {
    const sourceManifest = JSON.parse(
      await readFile(path.join(repositoryRoot, entry.directory, 'package.json'), 'utf8'),
    );
    for (const lifecycle of ['prepack', 'prepare', 'prepublish', 'postpack']) {
      assert.equal(
        sourceManifest.scripts?.[lifecycle],
        undefined,
        `${entry.name} must not execute ${lifecycle} while packing`,
      );
    }
    const before = new Set(await readdir(tarballsRoot));
    await run(
      'pnpm',
      [
        `--config.store-dir=${path.join(proofRoot, 'pnpm-store')}`,
        'pack',
        '--pack-destination',
        childTarballsRoot,
      ],
      {
        cwd: path.join(repositoryRoot, entry.directory),
      },
    );
    const created = (await readdir(tarballsRoot)).filter(
      (name) => name.endsWith('.tgz') && !before.has(name),
    );
    assert.equal(created.length, 1, `${entry.name} must create exactly one tarball`);
    tarballByName.set(entry.name, created[0]);
  }
  assert.equal(tarballByName.size, PUBLIC_PACKAGES.length);
  assert.equal(tarballByName.has(PROJECT_NAME), true);

  for (const entry of PUBLIC_PACKAGES) {
    const tarballName = tarballByName.get(entry.name);
    const tarballPath = path.join(tarballsRoot, tarballName);
    const childTarballPath = path.join(childTarballsRoot, tarballName);
    const extractPath = path.join(extractedRoot, entry.name.replaceAll('/', '-').replace('@', ''));
    await mkdir(extractPath, { recursive: true });
    await run('tar', ['-xzf', childTarballPath, '-C', extractPath]);
    const packageRoot = path.join(extractPath, 'package');
    const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
    assert.equal(manifest.name, entry.name);
    assert.equal(manifest.version, releaseVersion);
    assert.equal(manifest.private, undefined);
    assert.equal(manifest.engines.node, '>=22.13.0');
    assert.equal(manifest.publishConfig.access, 'public');
    assert.equal(manifest.publishConfig.registry, 'https://registry.npmjs.org/');
    assert.equal(manifest.publishConfig.tag, undefined);
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

    const packageEntries = await readdir(packageRoot);
    assert.equal(
      packageEntries.some((name) => /^README/iu.test(name)),
      true,
    );
    assert.equal((await readFile(path.join(packageRoot, 'LICENSE'))).equals(rootLicense), true);
    await lstat(path.join(packageRoot, 'package.json'));
    await lstat(path.join(packageRoot, manifest.exports['.'].import));
    await lstat(path.join(packageRoot, manifest.exports['.'].types));
    if (entry.name === PROJECT_NAME) {
      assert.deepEqual(Object.keys(manifest.dependencies ?? {}).sort(), [
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
      assert.equal(manifest.dependencies['@wizloft/harness-memory'], undefined);
      assert.equal(manifest.optionalDependencies, undefined);
      assert.equal(manifest.peerDependencies, undefined);
      await lstat(path.join(packageRoot, manifest.bin['wizloft-harness-project']));
    }

    let bytes;
    if (artifactsDirectory === null) {
      bytes = await readFile(tarballPath);
    } else {
      const tarball = await open(tarballPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
      try {
        bytes = await tarball.readFile();
        await tarball.sync();
      } finally {
        await tarball.close();
      }
    }
    packedArtifacts.set(entry.name, {
      bytes,
      size: bytes.byteLength,
      filename: tarballName,
      integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
      manifest,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      shasum: createHash('sha1').update(bytes).digest('hex'),
    });
  }
  assert.equal(packedArtifacts.size, 14);
  const [{ stdout: npmVersion }, { stdout: pnpmVersion }] = await Promise.all([
    run('npm', ['--version']),
    run('pnpm', ['--version']),
  ]);
  const tools = {
    node: process.version,
    npm: npmVersion.trim(),
    pnpm: pnpmVersion.trim(),
  };
  if (artifactsDirectory !== null) {
    artifactCompletion = await finalizeReleaseArtifacts(
      artifactsDirectory,
      releaseVersion,
      source,
      tools,
      packedArtifacts,
    );
    artifactInspection = await inspectReleaseArtifacts(artifactsDirectory.anchor);
    assert.equal(artifactInspection.releaseVersion, releaseVersion);
    assert.deepEqual(artifactInspection.source, source);
    assert.equal(artifactInspection.manifestSha256, artifactCompletion.sha256);
  }

  const dependencies = Object.fromEntries(
    PUBLIC_PACKAGES.map((entry) => [
      entry.name,
      artifactsDirectory === null
        ? `file:./tarballs/${tarballByName.get(entry.name)}`
        : `file:${path.join(childTarballsRoot, tarballByName.get(entry.name))}`,
    ]),
  );
  await writeFile(
    path.join(consumerRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'wizloft-harness-external-consumer-proof',
        version: '0.0.0',
        private: true,
        type: 'module',
        dependencies,
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(path.join(consumerRoot, 'consumer.mjs'), consumerScenario, 'utf8');

  const installEnvironment = {
    ...process.env,
    npm_config_audit: 'false',
    npm_config_cache: npmCache,
    npm_config_fund: 'false',
    npm_config_offline: 'true',
    npm_config_registry: 'http://127.0.0.1:9/',
  };
  await run('npm', ['install', '--ignore-scripts', '--offline', '--no-audit', '--no-fund'], {
    cwd: consumerRoot,
    env: installEnvironment,
  });
  await run('npm', ['ls', '--all'], {
    cwd: consumerRoot,
    env: installEnvironment,
  });

  for (const entry of PUBLIC_PACKAGES) {
    const installed = await lstat(
      path.join(consumerRoot, 'node_modules', ...entry.name.split('/')),
    );
    assert.equal(installed.isSymbolicLink(), false, `${entry.name} must not install as a symlink`);
  }

  const scenario = await run(process.execPath, ['consumer.mjs'], {
    cwd: consumerRoot,
    env: { ...process.env, WIZLOFT_RELEASE_VERSION: releaseVersion },
  });
  process.stdout.write(scenario.stdout);

  await proveGeneratedProjectOfflineInspect(releaseVersion, packedArtifacts);

  if (artifactsDirectory !== null) {
    const finalInspection = await inspectReleaseArtifacts(artifactsDirectory.anchor);
    assert.deepEqual(
      finalInspection,
      artifactInspection,
      'frozen release packet changed after packed execution',
    );
  }

  console.log(
    JSON.stringify(
      {
        ...tools,
        os: `${os.platform()} ${os.release()} ${os.arch()}`,
        packages: PUBLIC_PACKAGES.length,
        generatedProjectInspect: 'passed',
      },
      null,
      2,
    ),
  );
  if (artifactCompletion !== null) {
    console.log(
      JSON.stringify(
        {
          artifactManifest: artifactCompletion.manifestPath,
          source,
          manifestSha256: artifactCompletion.sha256,
          artifacts: artifactCompletion.artifacts,
        },
        null,
        2,
      ),
    );
  }
  artifactCompletionOutputWritten = artifactCompletion !== null;
} finally {
  if (artifactsDirectory !== null) {
    if (!artifactCompletionOutputWritten) {
      await unlink(path.join(artifactsDirectory.anchor, 'release-artifacts.json')).catch(
        (error) => {
          if (error?.code !== 'ENOENT') throw error;
        },
      );
      await artifactsDirectory.handle.sync();
    }
    await artifactsDirectory.handle.close();
  }
  await rm(proofRoot, { force: true, recursive: true });
}
