import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { HarnessProjectError } from '../dist/errors.js';
import { PROJECT_HEALTH_VALIDATOR_ID } from '../dist/health.js';
import { applyProjectInitializationWithRuntime } from '../dist/initialize.js';
import { planProjectInitialization } from '../dist/plan.js';
import { createGeneratedProjectProfile } from '../dist/profile.js';
import { runProjectHarness } from '../dist/run.js';
import { markerContents } from '../dist/templates.js';
import {
  cleanup,
  collectStream,
  failingStream,
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

const OLD_RELEASE = '0.1.0-alpha.1';
const MARKER_PATH = '.wizloft/harness/project.json';
const MANAGED_MARKDOWN_START = '<!-- wizloft-harness:start -->';
const MANAGED_MARKDOWN_END = '<!-- wizloft-harness:end -->';

function apply(root, extra = {}) {
  return applyProjectInitializationWithRuntime(
    { root, projectId: extra.projectId ?? 'example', ...extra },
    extra.runtime ?? {},
  );
}

function runtimeOptions(root, stdout = collectStream(), stderr = collectStream()) {
  return {
    stdout,
    stderr,
    options: {
      repositoryRoot: root,
      env: {},
      stdin: { read() {} },
      stdout: stdout.stream,
      stderr: stderr.stream,
    },
  };
}

async function runJson(root, argv) {
  const io = runtimeOptions(root);
  const exitCode = await runProjectHarness(argv, io.options);
  return { exitCode, stderr: io.stderr.text(), value: JSON.parse(io.stdout.text()) };
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

async function assertMissingMarker(root) {
  await assert.rejects(() => readFile(path.join(root, MARKER_PATH)), { code: 'ENOENT' });
}

test('acceptance: CLEAN repository is runnable, healthy, and byte-idempotent', async (context) => {
  const root = await tempRepo('wizloft-accept-clean-');
  context.after(() => cleanup(root));
  gitInit(root);

  const beforeDryRun = await snapshot(root);
  const dryRun = await planProjectInitialization({ root, projectId: 'example' });
  assert.equal(dryRun.state, 'clean');
  assert.equal(dryRun.operations.at(-1)?.path, MARKER_PATH);
  assert.equal(dryRun.operations.findIndex((operation) => operation.kind === 'install') >= 0, true);
  assert.equal(
    dryRun.operations.findIndex((operation) => operation.kind === 'install') <
      dryRun.operations.findIndex((operation) => operation.path === MARKER_PATH),
    true,
  );
  assert.equal(await snapshot(root), beforeDryRun);

  const installer = simulateIsolatedInstall();
  const initialized = await apply(root, {
    runtime: { installRuntime: installer.installRuntime },
  });
  assert.equal(initialized.initialState, 'clean');
  assert.equal(initialized.finalState, 'current');
  assert.deepEqual(installer.calls, ['install']);
  assert.equal(initialized.applied.at(-1)?.path, MARKER_PATH);

  const current = await planProjectInitialization({ root, projectId: 'example' });
  assert.equal(current.state, 'current');
  assert.deepEqual(current.operations, []);

  const help = runtimeOptions(root);
  assert.equal(await runProjectHarness(['--help'], help.options), 0);
  assert.match(help.stdout.text(), /Harness module commands/);
  const inspect = await runJson(root, ['inspect', '--json']);
  assert.equal(inspect.exitCode, 0);
  assert.equal(inspect.value.commandId, 'harness.inspect');

  const authority = await runJson(root, [
    'authority',
    'resolve',
    '--json',
    '--input',
    JSON.stringify({ subject: 'example:project' }),
  ]);
  assert.equal(authority.exitCode, 0);
  assert.equal(authority.value.value.status, 'resolved');
  assert.equal(authority.value.value.contenders[0].provenance.path, '.wizloft/PROJECT.md');
  assert.equal(authority.value.value.contenders[0].precedence, 100);

  const harnessAuthority = await runJson(root, [
    'authority',
    'resolve',
    '--json',
    '--input',
    JSON.stringify({ subject: 'example:harness' }),
  ]);
  assert.equal(
    harnessAuthority.value.value.contenders[0].provenance.path,
    '.wizloft/harness/INSTRUCTIONS.md',
  );
  assert.equal(harnessAuthority.value.value.contenders[0].precedence, 90);

  const resolvedContext = await runJson(root, [
    'context',
    'resolve',
    '--json',
    '--input',
    JSON.stringify({ subject: 'example:project' }),
  ]);
  assert.deepEqual(
    resolvedContext.value.value.authority.map((item) => item.provenance.path),
    ['.wizloft/PROJECT.md', '.wizloft/harness/INSTRUCTIONS.md'],
  );

  const selection = await runJson(root, [
    'validation',
    'select',
    '--json',
    '--input',
    JSON.stringify({ correlationId: 'accept-clean-select', changedPaths: ['README.md'] }),
  ]);
  const selected = selection.value.value.entries.find(
    (entry) => entry.validatorId === PROJECT_HEALTH_VALIDATOR_ID,
  );
  assert.equal(selected?.kind, 'root-required');
  assert.equal(selected?.status, 'selected');

  const validation = await runJson(root, [
    'validation',
    'run',
    '--json',
    '--input',
    JSON.stringify({
      correlationId: 'accept-clean-run',
      changedPaths: ['.wizloft/PROJECT.md'],
    }),
  ]);
  assert.equal(validation.exitCode, 0);
  assert.equal(validation.value.value.ok, true);
  assert.equal(
    validation.value.value.outcomes.find(
      (outcome) => outcome.validatorId === PROJECT_HEALTH_VALIDATOR_ID,
    )?.status,
    'passed',
  );

  const beforeSecondPass = await snapshot(root);
  const secondDryRun = await planProjectInitialization({ root, projectId: 'example' });
  assert.equal(secondDryRun.state, 'current');
  assert.deepEqual(secondDryRun.operations, []);
  const secondApply = await apply(root, {
    runtime: { installRuntime: installer.installRuntime },
  });
  assert.equal(secondApply.initialState, 'current');
  assert.equal(secondApply.finalState, 'current');
  assert.deepEqual(secondApply.applied, []);
  assert.deepEqual(installer.calls, ['install']);
  assert.equal(await snapshot(root), beforeSecondPass);
});

test('acceptance: EXISTING repository preserves host, adapter, Git, and AgentKit bytes', async (context) => {
  const root = await tempRepo('wizloft-accept-existing-');
  context.after(() => cleanup(root));
  gitInit(root);
  const hostFiles = {
    'README.md': '# Existing repository\n',
    'src/index.js': 'export const existing = true;\n',
    'package.json': '{"name":"existing-app","private":true}\n',
    'pnpm-lock.yaml': 'lockfileVersion: 9\n',
    '.wizloft/agents.yaml': 'version: 1\n',
    '.agentkit/config.yaml': 'coding_level: 3\n',
  };
  const agentsUser = '# User AGENTS\nkeep agents bytes\n';
  const claudeUser = '# User CLAUDE\nkeep claude bytes\n';
  const ignoreUser = 'node_modules/\n.local-user/\n';
  await writeFileTree(root, {
    ...hostFiles,
    'AGENTS.md': agentsUser,
    'CLAUDE.md': claudeUser,
    '.gitignore': ignoreUser,
  });
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
  const initialized = await apply(root, {
    runtime: { installRuntime: installer.installRuntime },
  });
  assert.equal(initialized.initialState, 'existing-no-harness');
  assert.equal(initialized.finalState, 'current');
  assert.equal(initialized.applied.at(-1)?.path, MARKER_PATH);
  for (const [relativePath, contents] of Object.entries(hostFiles)) {
    assert.equal(await readFile(path.join(root, relativePath), 'utf8'), contents, relativePath);
  }
  const agents = await readFile(path.join(root, 'AGENTS.md'), 'utf8');
  const claude = await readFile(path.join(root, 'CLAUDE.md'), 'utf8');
  const gitignore = await readFile(path.join(root, '.gitignore'), 'utf8');
  assert.equal(agents.startsWith(agentsUser), true);
  assert.equal(claude.startsWith(claudeUser), true);
  assert.equal(gitignore.startsWith(ignoreUser), true);
  assert.equal(count(agents, MANAGED_MARKDOWN_START), 1);
  assert.equal(count(claude, MANAGED_MARKDOWN_START), 1);
  assert.equal(count(gitignore, '# wizloft-harness:start'), 1);
  assert.equal(
    execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }),
    headBefore,
  );
  assert.equal(execFileSync('git', ['diff', '--cached'], { cwd: root, encoding: 'utf8' }), '');

  const beforeSecond = await snapshot(root);
  const second = await apply(root, {
    runtime: { installRuntime: installer.installRuntime },
  });
  assert.deepEqual(second.applied, []);
  assert.deepEqual(installer.calls, ['install']);
  assert.equal(await snapshot(root), beforeSecond);
});

test('acceptance: CONFLICT preflight matrix fails without mutation', async (context) => {
  const malformedBlocks = [
    `${MANAGED_MARKDOWN_START}\nunclosed\n`,
    `${MANAGED_MARKDOWN_START}\nouter\n${MANAGED_MARKDOWN_START}\n${MANAGED_MARKDOWN_END}\n`,
    `${MANAGED_MARKDOWN_START}\none\n${MANAGED_MARKDOWN_END}\n${MANAGED_MARKDOWN_START}\ntwo\n${MANAGED_MARKDOWN_END}\n`,
    `<!-- HARNESS:BEGIN -->\nlegacy\n<!-- HARNESS:END -->\n${MANAGED_MARKDOWN_START}\nnew\n${MANAGED_MARKDOWN_END}\n`,
  ];
  const cases = [
    { name: 'missing .git', code: 'GIT_MISSING', setup: async (_root) => undefined },
    {
      name: 'root file',
      code: 'ROOT_NOT_DIRECTORY',
      rootFile: true,
      setup: async (root) => writeFile(root, 'not a directory\n'),
    },
    {
      name: '.git symlink',
      code: 'GIT_INVALID',
      setup: async (root) => {
        const target = path.join(path.dirname(root), `${path.basename(root)}-git-target`);
        await mkdir(target);
        await symlink(target, path.join(root, '.git'), 'dir');
      },
    },
    {
      name: 'invalid worktree .git file',
      code: 'GIT_INVALID',
      setup: async (root) => writeFile(path.join(root, '.git'), 'invalid\n'),
    },
    ...[
      ['.wizloft symlink', '.wizloft'],
      ['.wizloft/harness symlink', '.wizloft/harness'],
      ['PROJECT.md symlink', '.wizloft/PROJECT.md'],
      ['AGENTS.md symlink', 'AGENTS.md'],
      ['CLAUDE.md symlink', 'CLAUDE.md'],
      ['.gitignore symlink', '.gitignore'],
    ].map(([name, relativePath]) => ({
      name,
      code: 'MANAGED_PATH_SYMLINK',
      git: true,
      setup: async (root) => {
        const target = path.join(root, 'fixture-target');
        await writeFile(target, 'target\n');
        await mkdir(path.dirname(path.join(root, relativePath)), { recursive: true });
        await symlink(target, path.join(root, relativePath));
      },
    })),
    {
      name: '.wizloft/harness wrong type',
      code: 'MANAGED_PATH_WRONG_TYPE',
      git: true,
      setup: async (root) => {
        await mkdir(path.join(root, '.wizloft'));
        await writeFile(path.join(root, '.wizloft/harness'), 'file\n');
      },
    },
    ...malformedBlocks.map((contents, index) => ({
      name: ['unclosed block', 'nested block', 'duplicate block', 'legacy plus schema block'][
        index
      ],
      code: 'MANAGED_BLOCK_CONFLICT',
      git: true,
      setup: async (root) => writeFile(path.join(root, 'AGENTS.md'), contents),
    })),
    {
      name: 'unsupported marker schema',
      code: 'MARKER_CONFLICT',
      git: true,
      setup: async (root) => {
        await writeTrackedContract(root);
        const marker = JSON.parse(await readFile(path.join(root, MARKER_PATH), 'utf8'));
        marker.schemaVersion = 999;
        await writeFile(path.join(root, MARKER_PATH), `${JSON.stringify(marker)}\n`);
      },
    },
    {
      name: 'invalid marker shape',
      code: 'MARKER_CONFLICT',
      git: true,
      setup: async (root) => {
        await writeFileTree(root, { [MARKER_PATH]: '{"schema":"wizloft.harness.project"}\n' });
      },
    },
    {
      name: 'projectId mismatch',
      code: 'PROJECT_ID_CONFLICT',
      git: true,
      projectId: 'different',
      setup: async (root) => writeTrackedContract(root),
    },
    {
      name: 'unsupported Node',
      code: 'UNSUPPORTED_NODE',
      git: true,
      nodeVersion: '22.12.9',
      setup: async () => undefined,
    },
  ];

  for (const fixture of cases) {
    const container = await tempRepo('wizloft-accept-conflict-');
    context.after(() => cleanup(container));
    const root = path.join(container, 'repo');
    if (!fixture.rootFile) await mkdir(root);
    if (fixture.git) gitInit(root);
    await fixture.setup(root);
    const before = await snapshot(container);
    const installer = simulateIsolatedInstall();
    await assert.rejects(
      () =>
        applyProjectInitializationWithRuntime(
          {
            root,
            projectId: fixture.projectId ?? 'example',
            nodeVersion: fixture.nodeVersion,
          },
          { installRuntime: installer.installRuntime },
        ),
      (error) => {
        assert.equal(error instanceof HarnessProjectError, true, fixture.name);
        assert.equal(error.code, fixture.code, fixture.name);
        return true;
      },
    );
    assert.equal(await snapshot(container), before, fixture.name);
    assert.deepEqual(installer.calls, [], fixture.name);
  }
});

test('acceptance: first-init failures withhold marker and retry commits current state', async (context) => {
  const failures = [
    ['npm failure', simulateIsolatedInstall({ fail: true })],
    ['missing package', simulateIsolatedInstall({ skipPackage: true })],
    ['wrong runtime', simulateIsolatedInstall({ version: OLD_RELEASE })],
    ['missing lockfile', simulateIsolatedInstall({ skipLockfile: true })],
    [
      'post-materialization drift',
      simulateIsolatedInstall({
        after: async (root) => {
          await writeFile(path.join(root, '.wizloft/harness/run.mjs'), 'concurrent drift\n');
        },
      }),
    ],
  ];
  for (const [name, installer] of failures) {
    const root = await tempRepo('wizloft-accept-first-failure-');
    context.after(() => cleanup(root));
    gitInit(root);
    await assert.rejects(
      () => apply(root, { runtime: { installRuntime: installer.installRuntime } }),
      (error) => error instanceof HarnessProjectError,
      name,
    );
    await assertMissingMarker(root);
  }

  const raceRoot = await tempRepo('wizloft-accept-create-race-');
  context.after(() => cleanup(raceRoot));
  gitInit(raceRoot);
  const concurrent = '{"schema":"concurrent"}\n';
  await assert.rejects(
    () =>
      apply(raceRoot, {
        runtime: {
          installRuntime: simulateIsolatedInstall().installRuntime,
          markerHooks: {
            beforeRename: ({ destination }) => writeFile(destination, concurrent),
          },
        },
      }),
    (error) => error instanceof HarnessProjectError && error.code === 'STALE_PLAN',
  );
  assert.equal(await readFile(path.join(raceRoot, MARKER_PATH), 'utf8'), concurrent);

  const retryRoot = await tempRepo('wizloft-accept-retry-');
  context.after(() => cleanup(retryRoot));
  gitInit(retryRoot);
  await assert.rejects(() =>
    apply(retryRoot, {
      runtime: { installRuntime: simulateIsolatedInstall({ fail: true }).installRuntime },
    }),
  );
  const partial = await planProjectInitialization({ root: retryRoot, projectId: 'example' });
  assert.equal(partial.state, 'partial-first-init');
  const recovered = await apply(retryRoot, {
    runtime: { installRuntime: simulateIsolatedInstall().installRuntime },
  });
  assert.equal(recovered.finalState, 'current');
  assert.equal(recovered.applied.at(-1)?.path, MARKER_PATH);
});

test('acceptance: upgrade failures preserve old marker and success replaces it last', async (context) => {
  const failureInstallers = [
    simulateIsolatedInstall({ fail: true }),
    simulateIsolatedInstall({ version: OLD_RELEASE }),
    simulateIsolatedInstall({
      after: async (root) => {
        await writeFile(path.join(root, '.wizloft/harness/run.mjs'), 'upgrade drift\n');
      },
    }),
  ];
  for (const installer of failureInstallers) {
    const root = await tempRepo('wizloft-accept-upgrade-failure-');
    context.after(() => cleanup(root));
    gitInit(root);
    await writeTrackedContract(root, { release: OLD_RELEASE });
    await writeLocalPackage(root, OLD_RELEASE);
    const markerBefore = await readFile(path.join(root, MARKER_PATH), 'utf8');
    await assert.rejects(() =>
      apply(root, { runtime: { installRuntime: installer.installRuntime } }),
    );
    assert.equal(await readFile(path.join(root, MARKER_PATH), 'utf8'), markerBefore);
  }

  const raceRoot = await tempRepo('wizloft-accept-replace-race-');
  context.after(() => cleanup(raceRoot));
  gitInit(raceRoot);
  await writeTrackedContract(raceRoot);
  await writeIsolatedRuntimePackage(raceRoot);
  const concurrent = markerContents({ projectId: 'example', release: RELEASE, adapters: [] });
  await assert.rejects(
    () =>
      apply(raceRoot, {
        adapters: ['agents'],
        runtime: {
          installRuntime: simulateIsolatedInstall().installRuntime,
          markerHooks: {
            beforeRename: ({ destination }) => writeFile(destination, concurrent),
          },
        },
      }),
    (error) => error instanceof HarnessProjectError && error.code === 'STALE_PLAN',
  );
  assert.equal(await readFile(path.join(raceRoot, MARKER_PATH), 'utf8'), concurrent);

  const successRoot = await tempRepo('wizloft-accept-upgrade-success-');
  context.after(() => cleanup(successRoot));
  gitInit(successRoot);
  await writeTrackedContract(successRoot, { release: OLD_RELEASE });
  await writeLocalPackage(successRoot, OLD_RELEASE);
  const oldMarker = await readFile(path.join(successRoot, MARKER_PATH), 'utf8');
  const success = await apply(successRoot, {
    runtime: { installRuntime: simulateIsolatedInstall().installRuntime },
  });
  assert.equal(success.initialState, 'upgrade-in-progress');
  assert.equal(success.finalState, 'current');
  assert.equal(success.applied.at(-1)?.path, MARKER_PATH);
  const newMarker = await readFile(path.join(successRoot, MARKER_PATH), 'utf8');
  assert.notEqual(newMarker, oldMarker);
  const parsedMarker = JSON.parse(newMarker);
  assert.equal(parsedMarker.generatedBy.version, RELEASE);
  assert.equal(parsedMarker.runtime.release, RELEASE);
  const finalPlan = await planProjectInitialization({ root: successRoot, projectId: 'example' });
  assert.equal(finalPlan.state, 'current');
  assert.deepEqual(finalPlan.operations, []);
});

test('acceptance: fresh clone recovers with ci while preserving marker bytes', async (context) => {
  const source = await tempRepo('wizloft-accept-clone-source-');
  const clone = await tempRepo('wizloft-accept-clone-target-');
  context.after(() => cleanup(source));
  context.after(() => cleanup(clone));
  gitInit(source);
  await apply(source, {
    runtime: { installRuntime: simulateIsolatedInstall().installRuntime },
  });
  gitInit(clone);
  for (const relativePath of [
    '.wizloft/harness/INSTRUCTIONS.md',
    '.wizloft/harness/profile.mjs',
    '.wizloft/harness/run.mjs',
    '.wizloft/harness/package.json',
    '.wizloft/harness/package-lock.json',
    MARKER_PATH,
    '.wizloft/PROJECT.md',
    'AGENTS.md',
    'CLAUDE.md',
    '.gitignore',
  ]) {
    await writeFileTree(clone, {
      [relativePath]: await readFile(path.join(source, relativePath), 'utf8'),
    });
  }
  const markerBefore = await readFile(path.join(clone, MARKER_PATH), 'utf8');
  const planned = await planProjectInitialization({ root: clone, projectId: 'example' });
  assert.equal(planned.state, 'needs-local-materialization');
  assert.equal(planned.operations[0]?.kind, 'install');
  assert.equal(planned.operations[0]?.method, 'ci');

  const runnerBefore = spawnSync(
    process.execPath,
    ['.wizloft/harness/run.mjs', 'inspect', '--json'],
    {
      cwd: clone,
      encoding: 'utf8',
    },
  );
  assert.equal(runnerBefore.status, 1);
  const recovery = 'npm --prefix .wizloft/harness ci --ignore-scripts --no-audit --no-fund';
  assert.equal(count(runnerBefore.stderr, recovery), 1);

  const installer = simulateIsolatedInstall();
  const initialized = await apply(clone, {
    runtime: { installRuntime: installer.installRuntime },
  });
  assert.equal(initialized.initialState, 'needs-local-materialization');
  assert.deepEqual(installer.calls, ['ci']);
  assert.equal(await readFile(path.join(clone, MARKER_PATH), 'utf8'), markerBefore);
  const finalPlan = await planProjectInitialization({ root: clone, projectId: 'example' });
  assert.equal(finalPlan.state, 'current');
  assert.deepEqual(finalPlan.operations, []);
  assert.equal((await runJson(clone, ['inspect', '--json'])).exitCode, 0);
});

test('acceptance: fresh clone plus adapter change uses ci and canonical marker-last reconciliation', async (context) => {
  const root = await tempRepo('wizloft-accept-clone-adapter-');
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root, { adapters: ['agents', 'claude'] });
  const claudeUser = '# Keep Claude user bytes\n';
  const currentClaude = await readFile(path.join(root, 'CLAUDE.md'), 'utf8');
  await writeFile(path.join(root, 'CLAUDE.md'), `${claudeUser}${currentClaude}`);
  const installer = simulateIsolatedInstall();
  const initialized = await apply(root, {
    adapters: ['agents'],
    runtime: { installRuntime: installer.installRuntime },
  });
  assert.equal(initialized.initialState, 'needs-local-materialization');
  assert.deepEqual(installer.calls, ['ci']);
  assert.equal(initialized.applied.at(-1)?.path, MARKER_PATH);
  assert.equal(await readFile(path.join(root, 'CLAUDE.md'), 'utf8'), claudeUser);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, MARKER_PATH), 'utf8')).adapters, [
    'agents',
  ]);
  const beforeSecond = await snapshot(root);
  const second = await apply(root, {
    adapters: ['agents'],
    runtime: { installRuntime: installer.installRuntime },
  });
  assert.deepEqual(second.applied, []);
  assert.deepEqual(installer.calls, ['ci']);
  assert.equal(await snapshot(root), beforeSecond);
});

test('acceptance: adapter desired-state matrix preserves user bytes and is idempotent', async (context) => {
  const cases = [
    { from: ['agents', 'claude'], requested: ['agents'], expected: ['agents'] },
    {
      from: ['agents'],
      requested: ['claude', 'agents'],
      expected: ['agents', 'claude'],
    },
    { from: ['agents', 'claude'], requested: [], expected: [] },
    { from: [], requested: ['agents'], expected: ['agents'] },
  ];
  for (const fixture of cases) {
    const root = await tempRepo('wizloft-accept-adapters-');
    context.after(() => cleanup(root));
    gitInit(root);
    await writeTrackedContract(root, { adapters: fixture.from });
    await writeIsolatedRuntimePackage(root);
    const user = {
      agents: '# Agents user prefix\n',
      claude: '# Claude user prefix\n',
    };
    for (const [adapter, file] of [
      ['agents', 'AGENTS.md'],
      ['claude', 'CLAUDE.md'],
    ]) {
      const managed = fixture.from.includes(adapter)
        ? await readFile(path.join(root, file), 'utf8')
        : '';
      await writeFile(path.join(root, file), `${user[adapter]}${managed}`);
    }
    const installer = simulateIsolatedInstall();
    const result = await apply(root, {
      adapters: fixture.requested,
      runtime: { installRuntime: installer.installRuntime },
    });
    assert.equal(result.applied.at(-1)?.path, MARKER_PATH);
    assert.deepEqual(installer.calls, []);
    for (const [adapter, file] of [
      ['agents', 'AGENTS.md'],
      ['claude', 'CLAUDE.md'],
    ]) {
      const contents = await readFile(path.join(root, file), 'utf8');
      assert.equal(contents.startsWith(user[adapter]), true);
      assert.equal(
        count(contents, MANAGED_MARKDOWN_START),
        fixture.expected.includes(adapter) ? 1 : 0,
      );
    }
    assert.deepEqual(
      JSON.parse(await readFile(path.join(root, MARKER_PATH), 'utf8')).adapters,
      fixture.expected,
    );
    const beforeSecond = await snapshot(root);
    const second = await apply(root, {
      adapters: fixture.requested,
      runtime: { installRuntime: installer.installRuntime },
    });
    assert.deepEqual(second.applied, []);
    assert.deepEqual(installer.calls, []);
    assert.equal(await snapshot(root), beforeSecond);
  }
});

test('acceptance: generated profile defaults, memory roles, and overlay boundary stay explicit', async (context) => {
  const root = await tempRepo('wizloft-accept-profile-');
  context.after(() => cleanup(root));
  await writeFileTree(root, {
    'README.md': '# ignored\n',
    'docs/ignored.md': '# ignored\n',
    'package.json': '{}\n',
    'AGENTS.md': '# ignored\n',
    'CLAUDE.md': '# ignored\n',
    '.wizloft/agents.yaml': 'version: 1\n',
    '.agentkit/config.yaml': 'coding_level: 3\n',
  });
  const profile = await createGeneratedProjectProfile({
    repositoryRoot: root,
    projectId: 'example',
  });
  const config = profile.layers[0].config;
  assert.deepEqual(config['@wizloft/repository-files'].authority, [
    { subject: 'example:project', path: '.wizloft/PROJECT.md', precedence: 100 },
    { subject: 'example:harness', path: '.wizloft/harness/INSTRUCTIONS.md', precedence: 90 },
  ]);
  assert.deepEqual(config['@wizloft/repository-files'].context, [
    { subject: 'example:project', path: '.wizloft/PROJECT.md', role: 'authority' },
    { subject: 'example:project', path: '.wizloft/harness/INSTRUCTIONS.md', role: 'authority' },
  ]);
  assert.deepEqual(config['@wizloft/memory-context'].mappings, [
    {
      subject: 'example:project',
      role: 'supporting',
      query: { scope: 'project:example', states: ['active'] },
    },
    {
      subject: 'example:project',
      role: 'historical',
      query: { scope: 'project:example', states: ['stale', 'superseded'] },
    },
  ]);
  const mapped = [
    ...config['@wizloft/repository-files'].authority,
    ...config['@wizloft/repository-files'].context,
  ].map((entry) => entry.path);
  for (const forbidden of [
    'README.md',
    'docs/ignored.md',
    'package.json',
    'AGENTS.md',
    'CLAUDE.md',
    '.wizloft/agents.yaml',
    '.agentkit/config.yaml',
  ]) {
    assert.equal(mapped.includes(forbidden), false, forbidden);
  }

  await writeFileTree(root, {
    'docs/decision.md': '# decision\n',
    '.wizloft/harness/profile.local.mjs': `export function createProjectSourceOverlay() {
  return {
    authority: [{ subject: 'example:decision:test', path: 'docs/decision.md', precedence: 80 }],
    context: [{ subject: 'example:project', path: 'docs/decision.md', role: 'authority' }],
  };
}\n`,
  });
  const overlaid = await createGeneratedProjectProfile({
    repositoryRoot: root,
    projectId: 'example',
  });
  assert.equal(
    overlaid.layers[0].config['@wizloft/repository-files'].authority.at(-1).path,
    'docs/decision.md',
  );
  assert.equal(
    overlaid.layers[0].config['@wizloft/repository-files'].context.at(-1).role,
    'authority',
  );
});

test('acceptance: overlay rejection matrix blocks unsafe or expanded configuration', async (context) => {
  const invalidSources = [
    `export function createProjectSourceOverlay() { return { authority: [{ subject: 'example:project', path: 'docs/a.md', precedence: 80 }] }; }\n`,
    `export function createProjectSourceOverlay() { return { authority: [{ subject: 'example:test', path: 'docs/a.md', precedence: 80 }, { subject: 'example:test', path: 'docs/a.md', precedence: 70 }] }; }\n`,
    `export function createProjectSourceOverlay() { return { unknown: [] }; }\n`,
    `export function createProjectSourceOverlay() { return { plugins: [] }; }\n`,
    `export function createProjectSourceOverlay() { return { capabilities: [] }; }\n`,
    `export function createProjectSourceOverlay() { return Promise.resolve({ authority: [], context: [] }); }\n`,
    `export async function createProjectSourceOverlay() { return { authority: [], context: [] }; }\n`,
    `export function createProjectSourceOverlay() { return { context: [{ subject: 'example:project', path: 'docs/a.md', role: 'authority' }] }; }\n`,
  ];
  for (const source of invalidSources) {
    const root = await tempRepo('wizloft-accept-overlay-invalid-');
    context.after(() => cleanup(root));
    await writeFileTree(root, {
      'docs/a.md': '# a\n',
      '.wizloft/harness/profile.local.mjs': source,
    });
    await assert.rejects(
      () => createGeneratedProjectProfile({ repositoryRoot: root, projectId: 'example' }),
      (error) => error instanceof HarnessProjectError && error.code === 'INVALID_OVERLAY',
    );
  }

  const escaped = await tempRepo('wizloft-accept-overlay-escape-');
  const outside = await tempRepo('wizloft-accept-overlay-outside-');
  context.after(() => cleanup(escaped));
  context.after(() => cleanup(outside));
  await writeFile(path.join(outside, 'a.md'), '# outside\n');
  await symlink(outside, path.join(escaped, 'docs'));
  await writeFileTree(escaped, {
    '.wizloft/harness/profile.local.mjs': `export function createProjectSourceOverlay() {
  return { authority: [{ subject: 'example:test', path: 'docs/a.md', precedence: 80 }] };
}\n`,
  });
  await assert.rejects(
    () => createGeneratedProjectProfile({ repositoryRoot: escaped, projectId: 'example' }),
    (error) => error instanceof HarnessProjectError && error.code === 'INVALID_OVERLAY',
  );

  const inRoot = await tempRepo('wizloft-accept-overlay-in-root-');
  context.after(() => cleanup(inRoot));
  await writeFileTree(inRoot, { 'docs/a.md': '# in root\n' });
  await symlink(path.join(inRoot, 'docs'), path.join(inRoot, 'docs-link'));
  await writeFileTree(inRoot, {
    '.wizloft/harness/profile.local.mjs': `export function createProjectSourceOverlay() {
  return { authority: [{ subject: 'example:test', path: 'docs-link/a.md', precedence: 80 }] };
}\n`,
  });
  const accepted = await createGeneratedProjectProfile({
    repositoryRoot: inRoot,
    projectId: 'example',
  });
  assert.equal(
    accepted.layers[0].config['@wizloft/repository-files'].authority.at(-1).path,
    'docs-link/a.md',
  );
});

test('acceptance: runner command boundary and generated wrapper render failures once', async (context) => {
  const root = await tempRepo('wizloft-accept-runner-');
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  await writeIsolatedRuntimePackage(root);

  const invalid = runtimeOptions(root);
  assert.equal(await runProjectHarness(['not-a-command'], invalid.options), 2);
  assert.match(invalid.stderr.text(), /UNKNOWN_CLI_COMMAND|Unknown Harness command/);

  const source = await readFile(path.join(root, '.wizloft/harness/run.mjs'), 'utf8');
  assert.equal(source.includes('process.exit('), false);
  assert.equal(count(source, "await import('@wizloft/harness-project')"), 1);

  await writeFile(
    path.join(root, '.wizloft/harness/profile.local.mjs'),
    `export function createProjectSourceOverlay() { return { plugins: [] }; }\n`,
  );
  const renderedBootstrap = spawnSync(process.execPath, ['.wizloft/harness/run.mjs', '--help'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(renderedBootstrap.status, 1);
  assert.equal(count(renderedBootstrap.stderr, 'Unknown overlay key: plugins'), 1);
  await writeFile(
    path.join(root, '.wizloft/harness/profile.local.mjs'),
    'export function createProjectSourceOverlay() { return {}; }\n',
  );

  await assert.rejects(
    () =>
      runProjectHarness(
        ['--help'],
        runtimeOptions(root, { stream: failingStream(), text: () => '' }).options,
      ),
    /injected stream write failure/,
  );
  const retry = runtimeOptions(root);
  assert.equal(await runProjectHarness(['--help'], retry.options), 0);

  const broken = await tempRepo('wizloft-accept-runner-broken-');
  context.after(() => cleanup(broken));
  gitInit(broken);
  await writeTrackedContract(broken);
  const result = spawnSync(process.execPath, ['.wizloft/harness/run.mjs', '--help'], {
    cwd: broken,
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.equal(count(result.stderr, 'Cannot resolve @wizloft/harness-project'), 1);

  const bootstrap = await tempRepo('wizloft-accept-runner-bootstrap-');
  context.after(() => cleanup(bootstrap));
  gitInit(bootstrap);
  await mkdir(path.join(bootstrap, '.wizloft/harness'), { recursive: true });
  const io = runtimeOptions(bootstrap);
  await assert.rejects(
    () => runProjectHarness(['--help'], io.options),
    (error) => error instanceof HarnessProjectError && error.code === 'MARKER_CONFLICT',
  );
  assert.equal(io.stdout.text(), '');
  assert.equal(io.stderr.text(), '');
});
