import assert from 'node:assert/strict';
import { chmod, mkdir, readdir, readFile, rename, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { applyProjectFilesystem, applyProjectFilesystemPlan } from '../dist/apply.js';
import { HarnessProjectError } from '../dist/errors.js';
import { prepareProjectInitialization } from '../dist/plan.js';
import {
  cleanup,
  gitInit,
  snapshot,
  tempRepo,
  writeFileTree,
  writeIsolatedRuntimePackage,
  writeTrackedContract,
} from './helpers.mjs';

const AGENTS_YAML = `version: 1

providers:
  agentkit:
    kits:
      engineer:
        target: codex
        channel: stable
        version: "0.2.0"
`;

const USER_GITIGNORE = `.references
node_modules/
/engineer/
/.agents/skills/ak-*/
`;

const AGENTKIT_CONFIG = '# AgentKit project configuration.\ncoding_level: 3\n';

async function plan(root, extra = {}) {
  return prepareProjectInitialization({
    root,
    projectId: extra.projectId ?? 'example',
    ...extra,
  });
}

function fileOps(resultPlan) {
  return resultPlan.operations.filter(
    (operation) =>
      operation.kind !== 'install' && operation.path !== '.wizloft/harness/project.json',
  );
}

test('CLEAN filesystem apply writes non-marker files and leaves install/marker pending', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const resultPlan = await plan(root);
  const result = await applyProjectFilesystemPlan(resultPlan);
  assert.deepEqual(
    result.applied.map((operation) => `${operation.kind}:${operation.path}`),
    fileOps(resultPlan).map((operation) => `${operation.kind}:${operation.path}`),
  );
  assert.deepEqual(
    result.pending.map((operation) => `${operation.kind}:${operation.path}`),
    ['install:.wizloft/harness', 'create:.wizloft/harness/project.json'],
  );
  assert.equal(
    await readFile(path.join(root, '.wizloft/harness/INSTRUCTIONS.md'), 'utf8').then(
      (text) => text.length > 0,
    ),
    true,
  );
  assert.equal(
    await readFile(path.join(root, '.wizloft/PROJECT.md'), 'utf8').then((text) =>
      text.includes('# example'),
    ),
    true,
  );
  await assert.rejects(() => readFile(path.join(root, '.wizloft/harness/project.json')), {
    code: 'ENOENT',
  });
  await assert.rejects(() => readFile(path.join(root, '.wizloft/harness/package-lock.json')), {
    code: 'ENOENT',
  });
  const harnessEntries = await readdir(path.join(root, '.wizloft/harness'));
  assert.equal(harnessEntries.includes('node_modules'), false);
  assert.equal(harnessEntries.includes('project.json'), false);
});

test('EXISTING apply preserves user bytes outside managed blocks and ignores unrelated files', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const agents = '# existing agents\nplease keep\n';
  const gitignore = 'node_modules/\n';
  const readme = 'hello\n';
  const source = 'export {}\n';
  await writeFileTree(root, {
    'AGENTS.md': agents,
    'CLAUDE.md': '# existing claude\n',
    '.gitignore': gitignore,
    'README.md': readme,
    'src/app.ts': source,
  });
  const resultPlan = await plan(root);
  await applyProjectFilesystemPlan(resultPlan);
  const agentsAfter = await readFile(path.join(root, 'AGENTS.md'), 'utf8');
  assert.equal(agentsAfter.startsWith(agents), true);
  assert.equal(agentsAfter.includes('please keep'), true);
  const ignoreAfter = await readFile(path.join(root, '.gitignore'), 'utf8');
  assert.equal(ignoreAfter.startsWith(gitignore), true);
  assert.equal(await readFile(path.join(root, 'README.md'), 'utf8'), readme);
  assert.equal(await readFile(path.join(root, 'src/app.ts'), 'utf8'), source);
});

test('apply preserves .wizloft/agents.yaml and only creates the Harness subtree', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeFileTree(root, { '.wizloft/agents.yaml': AGENTS_YAML });
  const before = await readFile(path.join(root, '.wizloft/agents.yaml'), 'utf8');
  await applyProjectFilesystemPlan(await plan(root));
  assert.equal(await readFile(path.join(root, '.wizloft/agents.yaml'), 'utf8'), before);
  assert.equal(before, AGENTS_YAML);
  await readFile(path.join(root, '.wizloft/harness/run.mjs'), 'utf8');
});

test('apply does not touch an unrelated .agentkit tree', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeFileTree(root, { '.agentkit/config.yaml': AGENTKIT_CONFIG });
  const before = await snapshot(root);
  await applyProjectFilesystemPlan(await plan(root));
  assert.equal(await readFile(path.join(root, '.agentkit/config.yaml'), 'utf8'), AGENTKIT_CONFIG);
  const afterAgentkit = await snapshot(path.join(root, '.agentkit'));
  assert.equal(afterAgentkit.includes('file:config.yaml:'), true);
  assert.equal(before.includes('file:.agentkit/config.yaml:'), true);
});

test('stale PROJECT.md create fails rather than overwriting', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const resultPlan = await plan(root);
  const concurrent = '# concurrent project truth\n';
  await mkdir(path.join(root, '.wizloft'), { recursive: true });
  await writeFile(path.join(root, '.wizloft/PROJECT.md'), concurrent);
  await assert.rejects(
    () => applyProjectFilesystemPlan(resultPlan),
    (error) =>
      error instanceof HarnessProjectError &&
      error.code === 'STALE_PLAN' &&
      error.details?.failed === 'create:.wizloft/PROJECT.md',
  );
  assert.equal(await readFile(path.join(root, '.wizloft/PROJECT.md'), 'utf8'), concurrent);
});

test('replan apply does not overwrite a concurrent PROJECT.md', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await mkdir(path.join(root, '.wizloft'), { recursive: true });
  const concurrent = '# concurrent project truth\n';
  await writeFile(path.join(root, '.wizloft/PROJECT.md'), concurrent);
  await applyProjectFilesystem({ root, projectId: 'example' });
  assert.equal(await readFile(path.join(root, '.wizloft/PROJECT.md'), 'utf8'), concurrent);
});

test('stale AGENTS.md update fails rather than overwriting', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeFile(path.join(root, 'AGENTS.md'), '# original agents\n');
  const resultPlan = await plan(root);
  await writeFile(path.join(root, 'AGENTS.md'), '# edited by another actor\n');
  await assert.rejects(
    () => applyProjectFilesystemPlan(resultPlan),
    (error) =>
      error instanceof HarnessProjectError &&
      error.code === 'STALE_PLAN' &&
      String(error.details?.failed).includes('AGENTS.md'),
  );
  assert.equal(await readFile(path.join(root, 'AGENTS.md'), 'utf8'), '# edited by another actor\n');
});

test('stale run.mjs replace fails rather than overwriting', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeTrackedContract(root);
  await writeIsolatedRuntimePackage(root);
  await writeFile(path.join(root, '.wizloft/harness/run.mjs'), 'console.log("old");\n');
  const resultPlan = await plan(root);
  await writeFile(path.join(root, '.wizloft/harness/run.mjs'), 'console.log("concurrent");\n');
  await assert.rejects(
    () => applyProjectFilesystemPlan(resultPlan),
    (error) =>
      error instanceof HarnessProjectError &&
      error.code === 'STALE_PLAN' &&
      String(error.details?.failed).includes('run.mjs'),
  );
  assert.equal(
    await readFile(path.join(root, '.wizloft/harness/run.mjs'), 'utf8'),
    'console.log("concurrent");\n',
  );
});

test('atomic rename failure leaves the destination unchanged and cleans the temp file', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const resultPlan = await plan(root);
  await assert.rejects(
    () =>
      applyProjectFilesystemPlan(resultPlan, {
        beforeRename: async ({ temporaryPath }) => {
          throw new Error(`injected rename failure at ${temporaryPath}`);
        },
      }),
    (error) => error instanceof HarnessProjectError && error.code === 'INTERNAL_ERROR',
  );
  await assert.rejects(() => readFile(path.join(root, '.wizloft/harness/INSTRUCTIONS.md')), {
    code: 'ENOENT',
  });
  await assert.rejects(() => readFile(path.join(root, '.wizloft/harness/project.json')), {
    code: 'ENOENT',
  });
  const harnessDir = path.join(root, '.wizloft/harness');
  const entries = await readdir(harnessDir).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  assert.equal(
    entries.some((entry) => entry.startsWith('.wizloft-harness-') && entry.endsWith('.tmp')),
    false,
  );
});

test('partial multi-file failure reports applied/failed/pending and leaves no marker', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const resultPlan = await plan(root);
  await assert.rejects(
    () =>
      applyProjectFilesystemPlan(resultPlan, {
        beforeOperation: ({ index }) => {
          if (index === 1) throw new Error('injected after first file');
        },
      }),
    (error) => {
      assert.equal(error instanceof HarnessProjectError, true);
      assert.equal(error.code, 'INTERNAL_ERROR');
      assert.deepEqual(error.details?.applied, ['create:.wizloft/harness/INSTRUCTIONS.md']);
      assert.equal(error.details?.failed, 'create:.wizloft/harness/profile.mjs');
      assert.equal(Array.isArray(error.details?.pending), true);
      assert.equal(error.details?.pending.includes('create:.wizloft/harness/project.json'), true);
      return true;
    },
  );
  assert.equal(
    (await readFile(path.join(root, '.wizloft/harness/INSTRUCTIONS.md'), 'utf8')).length > 0,
    true,
  );
  await assert.rejects(() => readFile(path.join(root, '.wizloft/harness/profile.mjs')), {
    code: 'ENOENT',
  });
  await assert.rejects(() => readFile(path.join(root, '.wizloft/harness/project.json')), {
    code: 'ENOENT',
  });
  const recovery = await plan(root);
  assert.equal(recovery.state, 'partial-first-init');
  assert.equal(
    recovery.operations.some((operation) => operation.path === '.wizloft/harness/INSTRUCTIONS.md'),
    false,
  );
  assert.equal(
    recovery.operations.some((operation) => operation.path === '.wizloft/harness/profile.mjs'),
    true,
  );
});

test('remove-block apply keeps the user file and exact outside bytes', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const userClaude = '# keep claude heading\n';
  await writeTrackedContract(root, { adapters: ['agents', 'claude'] });
  await writeIsolatedRuntimePackage(root);
  await writeFile(
    path.join(root, 'CLAUDE.md'),
    `${userClaude}<!-- wizloft-harness:start -->\nold\n<!-- wizloft-harness:end -->\n`,
  );
  const resultPlan = await plan(root, { adapters: ['agents'] });
  const claudeOp = resultPlan.operations.find((operation) => operation.path === 'CLAUDE.md');
  assert.equal(claudeOp?.kind, 'remove-block');
  const markerBefore = await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8');
  const result = await applyProjectFilesystemPlan(resultPlan);
  assert.equal(await readFile(path.join(root, 'CLAUDE.md'), 'utf8'), userClaude);
  assert.equal(
    await readFile(path.join(root, '.wizloft/harness/project.json'), 'utf8'),
    markerBefore,
  );
  assert.equal(
    result.pending.some(
      (operation) =>
        operation.path === '.wizloft/harness/project.json' && operation.kind === 'replace',
    ),
    true,
  );
});

test('representative .gitignore user/AgentKit lines remain byte-identical after apply', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeFile(path.join(root, '.gitignore'), USER_GITIGNORE);
  await applyProjectFilesystemPlan(await plan(root));
  const after = await readFile(path.join(root, '.gitignore'), 'utf8');
  assert.equal(after.startsWith(USER_GITIGNORE), true);
  assert.equal(after.includes('# wizloft-harness:start'), true);
  assert.equal(after.split('# wizloft-harness:start').length, 2);
});

test('existing-file bytes changed after temp preparation are STALE_PLAN and preserved', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  await writeFile(path.join(root, 'AGENTS.md'), '# original agents\n');
  const resultPlan = await plan(root);
  await assert.rejects(
    () =>
      applyProjectFilesystemPlan(resultPlan, {
        beforeRename: async ({ relativePath }) => {
          if (relativePath === 'AGENTS.md') {
            await writeFile(path.join(root, 'AGENTS.md'), '# concurrent agents\n');
          }
        },
      }),
    (error) => error instanceof HarnessProjectError && error.code === 'STALE_PLAN',
  );
  assert.equal(await readFile(path.join(root, 'AGENTS.md'), 'utf8'), '# concurrent agents\n');
  const entries = await readdir(root);
  assert.equal(
    entries.some((entry) => entry.startsWith('.wizloft-harness-') && entry.endsWith('.tmp')),
    false,
  );
});

test('CREATE stays applied if temp-name cleanup fails after successful publication', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const resultPlan = await plan(root);
  const create = resultPlan.operations.find(
    (operation) => operation.path === '.wizloft/harness/INSTRUCTIONS.md',
  );
  assert.equal(create?.kind, 'create');
  const isolated = Object.freeze({
    ...resultPlan,
    operations: Object.freeze([
      create,
      ...resultPlan.operations.filter(
        (operation) =>
          operation.kind === 'install' || operation.path === '.wizloft/harness/project.json',
      ),
    ]),
  });
  const result = await applyProjectFilesystemPlan(isolated, {
    afterPublish: async () => {
      throw new Error('injected CREATE temp cleanup failure');
    },
  });
  assert.deepEqual(
    result.applied.map((operation) => `${operation.kind}:${operation.path}`),
    ['create:.wizloft/harness/INSTRUCTIONS.md'],
  );
  assert.equal(
    await readFile(path.join(root, '.wizloft/harness/INSTRUCTIONS.md'), 'utf8'),
    create.contents,
  );
  await assert.rejects(() => readFile(path.join(root, '.wizloft/harness/project.json')), {
    code: 'ENOENT',
  });
  const entries = await readdir(path.join(root, '.wizloft/harness'));
  assert.equal(
    entries.some((entry) => entry.startsWith('.wizloft-harness-') && entry.endsWith('.tmp')),
    true,
  );
});

test('CREATE publication refuses to clobber a destination that appears after temp preparation', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const resultPlan = await plan(root);
  const concurrent = '# concurrent instructions\n';
  await assert.rejects(
    () =>
      applyProjectFilesystemPlan(resultPlan, {
        beforeRename: async ({ relativePath, destination }) => {
          if (relativePath === '.wizloft/harness/INSTRUCTIONS.md') {
            await writeFile(destination, concurrent);
          }
        },
      }),
    (error) => error instanceof HarnessProjectError && error.code === 'STALE_PLAN',
  );
  assert.equal(
    await readFile(path.join(root, '.wizloft/harness/INSTRUCTIONS.md'), 'utf8'),
    concurrent,
  );
  const entries = await readdir(path.join(root, '.wizloft/harness'));
  assert.equal(
    entries.some((entry) => entry.startsWith('.wizloft-harness-') && entry.endsWith('.tmp')),
    false,
  );
});

test('fabricated README.md operation is APPLY_FORBIDDEN and writes nothing', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const resultPlan = await plan(root);
  const forged = Object.freeze({
    ...resultPlan,
    operations: Object.freeze([
      Object.freeze({
        kind: 'create',
        path: 'README.md',
        contents: 'forged\n',
      }),
      ...resultPlan.operations,
    ]),
  });
  await assert.rejects(
    () => applyProjectFilesystemPlan(forged),
    (error) =>
      error instanceof HarnessProjectError &&
      error.code === 'APPLY_FORBIDDEN' &&
      error.details?.failed === 'create:README.md',
  );
  await assert.rejects(() => readFile(path.join(root, 'README.md')), { code: 'ENOENT' });
});

test('managed parent directory becoming a symlink before publication is rejected', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);
  const resultPlan = await plan(root);
  const outside = path.join(root, 'outside-harness');
  await mkdir(outside);
  await assert.rejects(
    () =>
      applyProjectFilesystemPlan(resultPlan, {
        beforeRename: async ({ relativePath }) => {
          if (relativePath !== '.wizloft/harness/INSTRUCTIONS.md') return;
          const wizloft = path.join(root, '.wizloft');
          const backup = path.join(root, '.wizloft.bak');
          await writeFile(path.join(outside, 'keep'), 'x\n');
          await rename(wizloft, backup);
          await symlink(outside, wizloft);
        },
      }),
    (error) => error instanceof HarnessProjectError && error.code === 'MANAGED_PATH_SYMLINK',
  );
});

test('filesystem errno during publication maps to IO_FAILURE', async (context) => {
  const root = await tempRepo();
  context.after(async () => {
    await chmod(path.join(root, '.wizloft/harness'), 0o700).catch(() => undefined);
    await cleanup(root);
  });
  gitInit(root);
  const resultPlan = await plan(root);
  await assert.rejects(
    () =>
      applyProjectFilesystemPlan(resultPlan, {
        beforeRename: async ({ destination }) => {
          await chmod(path.dirname(destination), 0o555);
        },
      }),
    (error) => error instanceof HarnessProjectError && error.code === 'IO_FAILURE',
  );
});

test('Phase 2 apply never invokes npm, child_process, or npx and cannot write the marker', async () => {
  const source = await readFile(new URL('../src/apply.ts', import.meta.url), 'utf8');
  assert.equal(source.includes('child_process'), false);
  assert.equal(source.includes('execFile'), false);
  assert.equal(source.includes('spawn('), false);
  assert.equal(source.includes('npx'), false);
  assert.match(source, /APPLY_FORBIDDEN/);
  assert.match(source, /PHASE2_WRITABLE_PATHS/);
});

test('Phase 2 filesystem writer still cannot write the marker', async () => {
  const source = await readFile(new URL('../src/apply.ts', import.meta.url), 'utf8');
  assert.match(source, /publishProjectMarker/);
  assert.match(source, /APPLY_FORBIDDEN/);
});
