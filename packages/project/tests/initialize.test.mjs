import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { HarnessProjectError } from '../dist/errors.js';
import { applyProjectInitializationWithRuntime } from '../dist/initialize.js';
import { isolatedNpmArgv } from '../dist/install.js';
import { planProjectInitialization } from '../dist/plan.js';
import { runProjectHarness } from '../dist/run.js';
import {
  cleanup,
  collectStream,
  gitInit,
  RELEASE,
  simulateIsolatedInstall,
  snapshot,
  tempRepo,
  writeFileTree,
  writeIsolatedRuntimePackage,
  writeLocalPackage,
  writeTrackedContract,
} from './helpers.mjs';

const OLD = '0.0.0-old';
const AGENTS_YAML = `version: 1

providers:
  agentkit:
    kits:
      engineer:
        target: codex
        channel: stable
        version: "0.2.0"
`;

function apply(root, extra = {}) {
  return applyProjectInitializationWithRuntime(
    { root, projectId: extra.projectId ?? 'example', ...extra },
    extra.runtime ?? {},
  );
}

test('CLEAN apply materializes, writes marker last, and a second apply is zero-diff', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const installer = simulateIsolatedInstall();
  const result = await apply(root, { runtime: { installRuntime: installer.installRuntime } });
  assert.equal(result.initialState, 'clean');
  assert.equal(result.finalState, 'current');
  assert.equal(result.applied.at(-1).path, '.wizloft/harness/project.json');
  assert.equal(
    result.applied.some((operation) => operation.kind === 'install'),
    true,
  );
  assert.equal(installer.calls.length, 1);
  assert.equal(installer.calls[0], 'install');
  const marker = await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8');
  assert.match(marker, /"schema": "wizloft.harness.project"/);
  const planned = await planProjectInitialization({ root, projectId: 'example' });
  assert.equal(planned.state, 'current');
  assert.deepEqual(planned.operations, []);

  const before = await snapshot(root);
  const second = await apply(root, { runtime: { installRuntime: installer.installRuntime } });
  assert.deepEqual(second.applied, []);
  assert.equal(second.finalState, 'current');
  assert.equal(installer.calls.length, 1);
  assert.equal(await snapshot(root), before);

  const stdout = collectStream();
  const exitCode = await runProjectHarness(['--help'], {
    repositoryRoot: root,
    env: {},
    stdin: { read() {} },
    stdout: stdout.stream,
    stderr: collectStream().stream,
  });
  assert.equal(exitCode, 0);
  assert.match(stdout.text(), /Harness module commands/);
});

test('EXISTING apply preserves user files, agents.yaml, and AgentKit', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const agents = '# keep agents\n';
  await writeFileTree(root, {
    'AGENTS.md': agents,
    'README.md': 'hello\n',
    '.wizloft/agents.yaml': AGENTS_YAML,
    '.agentkit/config.yaml': 'coding_level: 3\n',
  });
  const installer = simulateIsolatedInstall();
  await apply(root, { runtime: { installRuntime: installer.installRuntime } });
  const agentsAfter = await readFile(path.join(root, 'AGENTS.md'), 'utf8');
  assert.equal(agentsAfter.startsWith(agents), true);
  assert.equal(await readFile(path.join(root, 'README.md'), 'utf8'), 'hello\n');
  assert.equal(await readFile(path.join(root, '.wizloft/agents.yaml'), 'utf8'), AGENTS_YAML);
  assert.equal(
    await readFile(path.join(root, '.agentkit/config.yaml'), 'utf8'),
    'coding_level: 3\n',
  );
});

test('full apply leaves host package-manager files and Git history/index untouched', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const hostFiles = {
    'package.json': '{"name":"host-app","private":true}\n',
    'pnpm-lock.yaml': 'lockfileVersion: 9\n',
    'yarn.lock': '# yarn lockfile v1\n',
    'package-lock.json': '{"name":"host-app","lockfileVersion":3}\n',
    'README.md': '# Host app\n',
    'src/index.js': 'export const host = true;\n',
    '.agentkit/config.yaml': 'coding_level: 3\n',
    '.wizloft/agents.yaml': AGENTS_YAML,
  };
  await writeFileTree(root, hostFiles);
  execFileSync('git', ['add', '.'], { cwd: root, stdio: 'ignore' });
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Harness Test',
      '-c',
      'user.email=harness@example.invalid',
      'commit',
      '-qm',
      'host',
    ],
    { cwd: root, stdio: 'ignore' },
  );
  const headBefore = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  const installer = simulateIsolatedInstall();
  await apply(root, { runtime: { installRuntime: installer.installRuntime } });
  for (const [relativePath, contents] of Object.entries(hostFiles)) {
    assert.equal(await readFile(path.join(root, relativePath), 'utf8'), contents, relativePath);
  }
  assert.equal(
    execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }),
    headBefore,
  );
  assert.equal(execFileSync('git', ['diff', '--cached'], { cwd: root, encoding: 'utf8' }), '');
});

test('CURRENT apply mutates nothing and does not install', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  await writeIsolatedRuntimePackage(root);
  const before = await snapshot(root);
  const installer = simulateIsolatedInstall();
  const result = await apply(root, { runtime: { installRuntime: installer.installRuntime } });
  assert.deepEqual(result.applied, []);
  assert.equal(result.initialState, 'current');
  assert.equal(result.finalState, 'current');
  assert.equal(installer.calls.length, 0);
  assert.equal(await snapshot(root), before);
});

test('unresolvable local package is repaired with ci and preserves marker bytes', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  await writeLocalPackage(root);
  const markerBefore = await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8');
  const installer = simulateIsolatedInstall();
  const result = await apply(root, { runtime: { installRuntime: installer.installRuntime } });
  assert.equal(result.initialState, 'needs-local-materialization');
  assert.equal(result.finalState, 'current');
  assert.deepEqual(installer.calls, ['ci']);
  assert.equal(
    result.applied.some((operation) => operation.path === '.wizloft/harness/project.json'),
    false,
  );
  assert.equal(
    await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8'),
    markerBefore,
  );
});

test('unsafe local package fails before npm materialization', async (context) => {
  const root = await tempRepo();
  const outside = await tempRepo();
  context.after(() => cleanup(root));
  context.after(() => cleanup(outside));
  gitInit(root);
  await writeTrackedContract(root);
  await writeFileTree(outside, {
    'package.json': `${JSON.stringify({ name: '@wizloft/harness-project', version: RELEASE })}\n`,
  });
  await mkdir(path.join(root, '.wizloft/harness/node_modules/@wizloft'), { recursive: true });
  await symlink(
    outside,
    path.join(root, '.wizloft/harness/node_modules/@wizloft/harness-project'),
    'dir',
  );
  const installer = simulateIsolatedInstall();
  await assert.rejects(
    () => apply(root, { runtime: { installRuntime: installer.installRuntime } }),
    (error) => error instanceof HarnessProjectError && error.code === 'MANAGED_PATH_SYMLINK',
  );
  assert.equal(installer.calls.length, 0);
});

test('needs-local-materialization uses ci and does not rewrite the marker', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  const markerBefore = await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8');
  const installer = simulateIsolatedInstall();
  const result = await apply(root, { runtime: { installRuntime: installer.installRuntime } });
  assert.equal(result.initialState, 'needs-local-materialization');
  assert.equal(result.finalState, 'current');
  assert.deepEqual(installer.calls, ['ci']);
  assert.equal(
    result.applied.some((operation) => operation.path === '.wizloft/harness/project.json'),
    false,
  );
  assert.equal(
    await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8'),
    markerBefore,
  );
  const planned = await planProjectInitialization({ root, projectId: 'example' });
  assert.equal(planned.state, 'current');
  assert.deepEqual(planned.operations, []);
});

test('same-release adapter reconciliation removes CLAUDE block, skips npm, and replaces marker last', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  await writeIsolatedRuntimePackage(root);
  const installer = simulateIsolatedInstall();
  const result = await apply(root, {
    adapters: ['agents'],
    runtime: { installRuntime: installer.installRuntime },
  });
  assert.equal(installer.calls.length, 0);
  assert.equal(
    result.applied.some(
      (operation) => operation.kind === 'remove-block' && operation.path === 'CLAUDE.md',
    ),
    true,
  );
  assert.equal(result.applied.at(-1).path, '.wizloft/harness/project.json');
  const marker = JSON.parse(
    await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8'),
  );
  assert.deepEqual(marker.adapters, ['agents']);
  assert.equal(await readFile(path.join(root, 'CLAUDE.md'), 'utf8'), '');
});

test('same-release generated runner drift is replaced without install or marker rewrite', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  await writeIsolatedRuntimePackage(root);
  const markerBefore = await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8');
  await writeFile(path.join(root, '.wizloft/harness/run.mjs'), 'console.log("drift");\n');
  const installer = simulateIsolatedInstall();
  const result = await apply(root, { runtime: { installRuntime: installer.installRuntime } });
  assert.equal(installer.calls.length, 0);
  assert.deepEqual(
    result.applied.map((operation) => `${operation.kind}:${operation.path}`),
    ['replace:.wizloft/harness/run.mjs'],
  );
  assert.equal(
    await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8'),
    markerBefore,
  );
});

test('fresh clone materialization can reconcile adapter metadata and publish marker last', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root, { adapters: ['agents', 'claude'] });
  const installer = simulateIsolatedInstall();
  const result = await apply(root, {
    adapters: ['agents'],
    runtime: { installRuntime: installer.installRuntime },
  });
  assert.equal(result.initialState, 'needs-local-materialization');
  assert.equal(result.finalState, 'current');
  assert.deepEqual(installer.calls, ['ci']);
  assert.equal(
    result.applied.some(
      (operation) => operation.kind === 'remove-block' && operation.path === 'CLAUDE.md',
    ),
    true,
  );
  assert.equal(result.applied.at(-1)?.path, '.wizloft/harness/project.json');
  const markerAfter = await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8');
  assert.deepEqual(JSON.parse(markerAfter).adapters, ['agents']);
  assert.equal(await readFile(path.join(root, 'CLAUDE.md'), 'utf8'), '');

  const second = await apply(root, {
    adapters: ['agents'],
    runtime: { installRuntime: installer.installRuntime },
  });
  assert.deepEqual(second.applied, []);
  assert.deepEqual(installer.calls, ['ci']);
  assert.equal(
    await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8'),
    markerAfter,
  );
});

test('first-init install failure leaves no marker and is retryable', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const failing = simulateIsolatedInstall({ fail: true });
  await assert.rejects(
    () => apply(root, { runtime: { installRuntime: failing.installRuntime } }),
    (error) =>
      error instanceof HarnessProjectError &&
      error.code === 'INSTALL_FAILED' &&
      error.details?.failed === 'install:.wizloft/harness' &&
      error.details?.pending.includes('create:.wizloft/harness/project.json'),
  );
  await assert.rejects(() => readFile(path.join(root, '.wizloft/harness/project.json')), {
    code: 'ENOENT',
  });
  assert.equal(
    (await readFile(path.join(root, '.wizloft/harness/INSTRUCTIONS.md'), 'utf8')).length > 0,
    true,
  );
  const recovery = await planProjectInitialization({ root, projectId: 'example' });
  assert.equal(recovery.state, 'partial-first-init');
  const retry = simulateIsolatedInstall();
  const result = await apply(root, { runtime: { installRuntime: retry.installRuntime } });
  assert.equal(result.finalState, 'current');
  await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8');
});

test('installer success without local package fails before marker write', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const installer = simulateIsolatedInstall({ skipPackage: true });
  await assert.rejects(
    () => apply(root, { runtime: { installRuntime: installer.installRuntime } }),
    (error) =>
      error instanceof HarnessProjectError &&
      error.code === 'LOCAL_RUNTIME_INVALID' &&
      error.details?.failed === 'install:.wizloft/harness' &&
      !error.details.applied.includes('install:.wizloft/harness'),
  );
  await assert.rejects(() => readFile(path.join(root, '.wizloft/harness/project.json')), {
    code: 'ENOENT',
  });
});

test('wrong local package version fails before marker write', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const installer = simulateIsolatedInstall({ version: OLD });
  await assert.rejects(
    () => apply(root, { runtime: { installRuntime: installer.installRuntime } }),
    (error) =>
      error instanceof HarnessProjectError &&
      error.code === 'LOCAL_RUNTIME_INVALID' &&
      error.details?.failed === 'install:.wizloft/harness' &&
      !error.details.applied.includes('install:.wizloft/harness'),
  );
  await assert.rejects(() => readFile(path.join(root, '.wizloft/harness/project.json')), {
    code: 'ENOENT',
  });
});

test('missing package-lock after install fails before marker write', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const installer = simulateIsolatedInstall({ skipLockfile: true });
  await assert.rejects(
    () => apply(root, { runtime: { installRuntime: installer.installRuntime } }),
    (error) =>
      error instanceof HarnessProjectError &&
      error.code === 'LOCAL_RUNTIME_INVALID' &&
      error.details?.failed === 'install:.wizloft/harness' &&
      !error.details.applied.includes('install:.wizloft/harness'),
  );
  await assert.rejects(() => readFile(path.join(root, '.wizloft/harness/project.json')), {
    code: 'ENOENT',
  });
});

test('post-install generated-file drift fails certification and does not write the marker', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const installer = simulateIsolatedInstall({
    after: async (repo) => {
      await writeFile(path.join(repo, '.wizloft/harness/run.mjs'), 'console.log("concurrent");\n');
    },
  });
  await assert.rejects(
    () => apply(root, { runtime: { installRuntime: installer.installRuntime } }),
    (error) =>
      error instanceof HarnessProjectError &&
      error.code === 'STALE_PLAN' &&
      error.message.includes('run.mjs'),
  );
  await assert.rejects(() => readFile(path.join(root, '.wizloft/harness/project.json')), {
    code: 'ENOENT',
  });
});

test('post-install replan preserves planner code and partial-operation context', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const installer = simulateIsolatedInstall({
    after: async (repo) => {
      await writeFile(path.join(repo, 'AGENTS.md'), '<!-- wizloft-harness:start -->\n');
    },
  });
  await assert.rejects(
    () => apply(root, { runtime: { installRuntime: installer.installRuntime } }),
    (error) =>
      error instanceof HarnessProjectError &&
      error.code === 'MANAGED_BLOCK_CONFLICT' &&
      error.details?.failed === 'certify:.wizloft/harness' &&
      error.details.applied.includes('install:.wizloft/harness') &&
      error.details.pending.includes('create:.wizloft/harness/project.json'),
  );
  await assert.rejects(() => readFile(path.join(root, '.wizloft/harness/project.json')), {
    code: 'ENOENT',
  });
});

test('PROJECT.md content edits during install do not block certification', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const installer = simulateIsolatedInstall({
    after: async (repo) => {
      await writeFile(path.join(repo, '.wizloft/PROJECT.md'), '# user edited project truth\n');
    },
  });
  const result = await apply(root, { runtime: { installRuntime: installer.installRuntime } });
  assert.equal(result.finalState, 'current');
  assert.equal(
    await readFile(path.join(root, '.wizloft/PROJECT.md'), 'utf8'),
    '# user edited project truth\n',
  );
});

test('user bytes outside a managed adapter block during install do not block certification', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeFileTree(root, { 'AGENTS.md': '# keep heading\n' });
  const installer = simulateIsolatedInstall({
    after: async (repo) => {
      const current = await readFile(path.join(repo, 'AGENTS.md'), 'utf8');
      await writeFile(path.join(repo, 'AGENTS.md'), `${current}# extra user note\n`);
    },
  });
  const result = await apply(root, { runtime: { installRuntime: installer.installRuntime } });
  assert.equal(result.finalState, 'current');
  const agents = await readFile(path.join(root, 'AGENTS.md'), 'utf8');
  assert.equal(agents.startsWith('# keep heading\n'), true);
  assert.equal(agents.includes('# extra user note\n'), true);
});

test('marker CREATE race does not clobber a concurrent marker', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const concurrent = '{"schema":"concurrent"}\n';
  const installer = simulateIsolatedInstall();
  await assert.rejects(
    () =>
      apply(root, {
        runtime: {
          installRuntime: installer.installRuntime,
          markerHooks: {
            beforeRename: async ({ destination }) => {
              await writeFile(destination, concurrent);
            },
          },
        },
      }),
    (error) => error instanceof HarnessProjectError && error.code === 'STALE_PLAN',
  );
  assert.equal(
    await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8'),
    concurrent,
  );
});

test('marker REPLACE race preserves the newer marker', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  await writeIsolatedRuntimePackage(root);
  const concurrent = 'concurrent-replace\n';
  await assert.rejects(
    () =>
      apply(root, {
        adapters: ['agents'],
        runtime: {
          installRuntime: simulateIsolatedInstall().installRuntime,
          markerHooks: {
            beforeRename: async ({ destination }) => {
              await writeFile(destination, concurrent);
            },
          },
        },
      }),
    (error) => error instanceof HarnessProjectError && error.code === 'STALE_PLAN',
  );
  assert.equal(
    await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8'),
    concurrent,
  );
});

test('upgrade install failure leaves the old marker byte-identical', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root, { release: OLD });
  await writeLocalPackage(root, OLD);
  const markerBefore = await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8');
  await assert.rejects(
    () =>
      apply(root, {
        runtime: { installRuntime: simulateIsolatedInstall({ fail: true }).installRuntime },
      }),
    (error) => error instanceof HarnessProjectError && error.code === 'INSTALL_FAILED',
  );
  assert.equal(
    await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8'),
    markerBefore,
  );
});

test('upgrade wrong local version leaves the old marker byte-identical', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root, { release: OLD });
  await writeLocalPackage(root, OLD);
  const markerBefore = await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8');
  await assert.rejects(
    () =>
      apply(root, {
        runtime: { installRuntime: simulateIsolatedInstall({ version: OLD }).installRuntime },
      }),
    (error) => error instanceof HarnessProjectError && error.code === 'LOCAL_RUNTIME_INVALID',
  );
  assert.equal(
    await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8'),
    markerBefore,
  );
});

test('upgrade post-install contract drift leaves the old marker byte-identical', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root, { release: OLD });
  await writeLocalPackage(root, OLD);
  const markerBefore = await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8');
  await assert.rejects(
    () =>
      apply(root, {
        runtime: {
          installRuntime: simulateIsolatedInstall({
            after: async (repo) => {
              await writeFile(
                path.join(repo, '.wizloft/harness/run.mjs'),
                'console.log("drift");\n',
              );
            },
          }).installRuntime,
        },
      }),
    (error) => error instanceof HarnessProjectError && error.code === 'STALE_PLAN',
  );
  assert.equal(
    await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8'),
    markerBefore,
  );
});

test('upgrade success replaces the marker last with the target release', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root, { release: OLD });
  await writeLocalPackage(root, OLD);
  const oldMarker = await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8');
  const installer = simulateIsolatedInstall();
  const result = await apply(root, { runtime: { installRuntime: installer.installRuntime } });
  assert.equal(result.initialState, 'upgrade-in-progress');
  assert.equal(result.finalState, 'current');
  assert.equal(result.applied.at(-1).path, '.wizloft/harness/project.json');
  const marker = JSON.parse(
    await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8'),
  );
  assert.equal(marker.runtime.release, RELEASE);
  assert.notEqual(
    await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8'),
    oldMarker,
  );
  const planned = await planProjectInitialization({ root, projectId: 'example' });
  assert.equal(planned.state, 'current');
  assert.deepEqual(planned.operations, []);
});

test('production npm argv is derived from method and never includes a shell', async () => {
  const argv = isolatedNpmArgv('/repo', 'install');
  assert.deepEqual(argv, [
    'install',
    '--prefix',
    path.resolve('/repo', '.wizloft/harness'),
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
  ]);
  const ci = isolatedNpmArgv('/repo', 'ci');
  assert.equal(ci.includes('ci'), true);
  assert.equal(ci.includes('install'), false);
  const source = await readFile(new URL('../src/install.ts', import.meta.url), 'utf8');
  assert.match(source, /execFile/);
  assert.match(source, /shell: false/);
  assert.equal(source.includes('npx'), false);
  assert.equal(source.includes('exec('), false);
});

test('child_process exists only in the bounded installer', async () => {
  const srcRoot = fileURLToPath(new URL('../src/', import.meta.url));
  const { readdir } = await import('node:fs/promises');
  const files = (await readdir(srcRoot)).filter((name) => name.endsWith('.ts'));
  for (const file of files) {
    const source = await readFile(path.join(srcRoot, file), 'utf8');
    if (file === 'install.ts') {
      assert.equal(source.includes('child_process'), true);
      continue;
    }
    assert.equal(source.includes('child_process'), false, file);
  }
});
