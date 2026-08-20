import assert from 'node:assert/strict';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { HarnessProjectError } from '../dist/errors.js';
import { isSupportedNodeVersion } from '../dist/node-version.js';
import { planProjectInitialization } from '../dist/plan.js';
import { isValidProjectId } from '../dist/project-id.js';
import { cleanup, gitInit, tempRepo } from './helpers.mjs';

async function plan(root, extra = {}) {
  return planProjectInitialization({
    root,
    projectId: 'example',
    ...extra,
  });
}

function assertCode(error, code) {
  assert.equal(error instanceof HarnessProjectError, true);
  assert.equal(error.code, code);
}

test('projectId accepts only the exact alpha.3 grammar without coercion', async () => {
  assert.equal(isValidProjectId('example'), true);
  assert.equal(isValidProjectId('a'), true);
  assert.equal(isValidProjectId('a'.repeat(63)), true);
  assert.equal(isValidProjectId('a'.repeat(64)), false);
  assert.equal(isValidProjectId('Example'), false);
  assert.equal(isValidProjectId('ex_ample'), false);
  assert.equal(isValidProjectId('ex.ample'), false);
  assert.equal(isValidProjectId('ex/ample'), false);
  assert.equal(isValidProjectId('ex:ample'), false);
  assert.equal(isValidProjectId('ex@ample'), false);
  assert.equal(isValidProjectId('ex--ample'), false);
  assert.equal(isValidProjectId('-example'), false);
  assert.equal(isValidProjectId(''), false);
  assert.equal(isValidProjectId(undefined), false);
  assert.equal(isValidProjectId(1), false);
  assert.equal(isValidProjectId({ id: 'example' }), false);

  await assert.rejects(
    () => planProjectInitialization({ root: '/tmp', projectId: 1 }),
    (error) => error instanceof HarnessProjectError && error.code === 'INVALID_PROJECT_ID',
  );
  await assert.rejects(
    () => planProjectInitialization({ root: 12, projectId: 'example' }),
    (error) => error instanceof HarnessProjectError && error.code === 'INVALID_ARGV',
  );
  await assert.rejects(
    () =>
      planProjectInitialization({
        root: '/tmp',
        projectId: 'example',
        adapters: 'agents',
      }),
    (error) => error instanceof HarnessProjectError && error.code === 'INVALID_ARGV',
  );
});

test('Node floor is a predicate and fails before repository inspection', async (context) => {
  assert.equal(isSupportedNodeVersion('22.13.0'), true);
  assert.equal(isSupportedNodeVersion('22.12.0'), false);
  assert.equal(isSupportedNodeVersion('21.0.0'), false);
  assert.equal(isSupportedNodeVersion('23.0.0'), true);
  assert.equal(isSupportedNodeVersion('not-a-version'), false);

  const missing = path.join(await tempRepo(), 'does-not-exist');
  context.after(() => cleanup(path.dirname(missing)));
  await assert.rejects(
    () => plan(missing, { nodeVersion: '16.0.0' }),
    (error) => {
      assertCode(error, 'UNSUPPORTED_NODE');
      return true;
    },
  );
});

test('preflight requires an existing directory root and a non-symlink .git', async (context) => {
  const parent = await tempRepo();
  context.after(() => cleanup(parent));

  await assert.rejects(
    () => plan(path.join(parent, 'missing')),
    (error) => {
      assertCode(error, 'ROOT_MISSING');
      return true;
    },
  );

  const asFile = path.join(parent, 'file-root');
  await writeFile(asFile, 'not a directory\n');
  await assert.rejects(
    () => plan(asFile),
    (error) => {
      assertCode(error, 'ROOT_NOT_DIRECTORY');
      return true;
    },
  );

  const noGit = path.join(parent, 'no-git');
  await mkdir(noGit);
  await assert.rejects(
    () => plan(noGit),
    (error) => {
      assertCode(error, 'GIT_MISSING');
      return true;
    },
  );

  const gitLink = path.join(parent, 'git-link');
  await mkdir(gitLink);
  const gitTarget = path.join(parent, 'git-target');
  await mkdir(gitTarget);
  await symlink(gitTarget, path.join(gitLink, '.git'), 'dir');
  await assert.rejects(
    () => plan(gitLink),
    (error) => {
      assertCode(error, 'GIT_INVALID');
      return true;
    },
  );

  const worktree = path.join(parent, 'worktree');
  const gitdir = path.join(parent, 'actual-gitdir');
  await mkdir(worktree);
  await mkdir(gitdir);
  await writeFile(path.join(worktree, '.git'), `gitdir: ${gitdir}\n`);
  const planResult = await plan(worktree);
  assert.equal(planResult.state, 'clean');

  const bogusGit = path.join(parent, 'bogus-git');
  await mkdir(bogusGit);
  await writeFile(path.join(bogusGit, '.git'), 'hello\n');
  await assert.rejects(
    () => plan(bogusGit),
    (error) => {
      assertCode(error, 'GIT_INVALID');
      return true;
    },
  );
});

test('preflight rejects managed symlinks and wrong filesystem types', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  gitInit(root);

  const outside = path.join(path.dirname(root), 'outside-agents.md');
  await writeFile(outside, '# outside\n');
  await symlink(outside, path.join(root, 'AGENTS.md'));
  await assert.rejects(
    () => plan(root),
    (error) => {
      assertCode(error, 'MANAGED_PATH_SYMLINK');
      return true;
    },
  );
  await rmSafe(path.join(root, 'AGENTS.md'));

  await writeFile(path.join(root, '.wizloft'), 'not a directory\n');
  await assert.rejects(
    () => plan(root),
    (error) => {
      assertCode(error, 'MANAGED_PATH_WRONG_TYPE');
      return true;
    },
  );
});

async function rmSafe(target) {
  const { rm } = await import('node:fs/promises');
  await rm(target, { force: true });
}
