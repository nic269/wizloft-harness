import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { AUTHORITY_CAPABILITY, authorityPlugin } from '@wizloft/harness/authority';
import { CONTEXT_CAPABILITY, contextPlugin } from '@wizloft/harness/context';
import { createHarnessRuntime, HarnessKernelError } from '@wizloft/harness-kernel';

import {
  normalizeRepositorySourcePath,
  REPOSITORY_FILES_PLUGIN_NAME,
  RepositoryFilesError,
  repositoryFilesPlugin,
} from '../dist/repository.js';

async function withRepository(run) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'wizloft-repository-files-'));
  const repositoryRoot = join(temporaryRoot, 'repository');
  await mkdir(repositoryRoot);
  try {
    return await run({ repositoryRoot, temporaryRoot });
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

async function createRepositoryRuntime(config) {
  return createHarnessRuntime({
    profile: {
      layers: [
        {
          name: 'repository',
          plugins: [authorityPlugin, contextPlugin, repositoryFilesPlugin],
          config: { [REPOSITORY_FILES_PLUGIN_NAME]: config },
        },
      ],
    },
  });
}

test('repository-files contributes immutable authority and context with normalized provenance', async () => {
  await withRepository(async ({ repositoryRoot }) => {
    await mkdir(join(repositoryRoot, 'docs'));
    await writeFile(join(repositoryRoot, 'docs', 'decision.md'), 'decision prose\n');
    await writeFile(join(repositoryRoot, 'docs', 'test.md'), 'different corroborating prose\n');
    await writeFile(join(repositoryRoot, 'docs', 'old.md'), 'historical prose\n');
    await writeFile(join(repositoryRoot, 'docs', 'support.md'), 'supporting prose\n');

    const runtime = await createRepositoryRuntime({
      root: repositoryRoot,
      authority: [
        {
          subject: 'architecture',
          path: 'docs/../docs/decision.md',
          precedence: 100,
          resolutionKey: 'architecture-v0',
        },
        {
          subject: 'architecture',
          path: 'docs/test.md',
          precedence: 100,
          resolutionKey: 'architecture-v0',
        },
        {
          subject: 'architecture',
          path: 'docs/old.md',
          precedence: 10,
          resolutionKey: 'architecture-v1',
        },
      ],
      context: [
        { subject: 'architecture', path: 'docs/old.md', role: 'historical' },
        { subject: 'architecture', path: 'docs/decision.md', role: 'authority' },
        { subject: 'architecture', path: 'docs/support.md', role: 'supporting' },
        { subject: 'architecture', path: 'docs/test.md', role: 'authority' },
      ],
    });

    const authority = runtime.getCapability(AUTHORITY_CAPABILITY);
    const context = runtime.getCapability(CONTEXT_CAPABILITY);
    const authorityResult = await authority.resolve({ subject: 'architecture' });
    const contextResult = await context.resolve({ subject: 'architecture' });

    assert.equal(authorityResult.status, 'resolved');
    assert.deepEqual(
      authorityResult.contenders.map(({ provenance }) => provenance.path),
      ['docs/decision.md', 'docs/test.md'],
    );
    assert.deepEqual(
      authorityResult.shadowed.map(({ provenance }) => provenance.path),
      ['docs/old.md'],
    );
    assert.equal(authorityResult.contenders[0].content, 'decision prose\n');
    assert.ok(Object.isFrozen(authorityResult.contenders[0]));
    assert.ok(Object.isFrozen(authorityResult.contenders[0].provenance));

    assert.deepEqual(
      contextResult.authority.map(({ provenance }) => provenance.path),
      ['docs/decision.md', 'docs/test.md'],
    );
    assert.deepEqual(
      contextResult.supporting.map(({ provenance }) => provenance.path),
      ['docs/support.md'],
    );
    assert.deepEqual(
      contextResult.historical.map(({ provenance }) => provenance.path),
      ['docs/old.md'],
    );

    await writeFile(join(repositoryRoot, 'docs', 'decision.md'), 'changed later\n');
    assert.equal(authorityResult.contenders[0].content, 'decision prose\n');
    assert.equal(
      (await authority.resolve({ subject: 'architecture' })).contenders[0].content,
      'changed later\n',
    );

    await runtime.shutdown();
  });
});

test('repository-files leaves multiple unidentified top sources ambiguous', async () => {
  await withRepository(async ({ repositoryRoot }) => {
    await writeFile(join(repositoryRoot, 'a.md'), 'A');
    await writeFile(join(repositoryRoot, 'b.md'), 'B');
    const runtime = await createRepositoryRuntime({
      root: repositoryRoot,
      authority: [
        { subject: 'choice', path: 'a.md', precedence: 1 },
        { subject: 'choice', path: 'b.md', precedence: 1 },
      ],
      context: [],
    });

    assert.equal(
      (await runtime.getCapability(AUTHORITY_CAPABILITY).resolve({ subject: 'choice' })).status,
      'ambiguous',
    );
    await runtime.shutdown();
  });
});

test('repository-files refuses absolute and escaping configured source paths', () => {
  for (const sourcePath of ['/etc/passwd', '../outside.md', 'C:\\outside.md']) {
    assert.throws(
      () => normalizeRepositorySourcePath(sourcePath),
      (error) =>
        error instanceof RepositoryFilesError && error.code === 'REPOSITORY_PATH_OUTSIDE_ROOT',
    );
  }
  assert.equal(normalizeRepositorySourcePath('docs/../AGENTS.md'), 'AGENTS.md');
});

test('repository-files refuses symlinks that resolve outside the repository root', async () => {
  await withRepository(async ({ repositoryRoot, temporaryRoot }) => {
    const outsidePath = join(temporaryRoot, 'outside.md');
    await writeFile(outsidePath, 'outside');
    await symlink(outsidePath, join(repositoryRoot, 'escape.md'));
    const runtime = await createRepositoryRuntime({
      root: repositoryRoot,
      authority: [{ subject: 'escape', path: 'escape.md', precedence: 1 }],
      context: [],
    });

    await assert.rejects(
      runtime.getCapability(AUTHORITY_CAPABILITY).resolve({ subject: 'escape' }),
      (error) =>
        error instanceof RepositoryFilesError && error.code === 'REPOSITORY_PATH_OUTSIDE_ROOT',
    );
    await runtime.shutdown();
  });
});

test('repository-files setup rejects invalid config through structured plugin failure', async () => {
  await assert.rejects(
    createRepositoryRuntime({ root: '', authority: [], context: [] }),
    (error) =>
      error instanceof HarnessKernelError &&
      error.cause instanceof RepositoryFilesError &&
      error.cause.code === 'INVALID_REPOSITORY_FILES_CONFIG',
  );
});

test('repository-files contributor registrations are removed during shutdown', async () => {
  await withRepository(async ({ repositoryRoot }) => {
    await writeFile(join(repositoryRoot, 'authority.md'), 'authority');
    const runtime = await createRepositoryRuntime({
      root: repositoryRoot,
      authority: [{ subject: 'cleanup', path: 'authority.md', precedence: 1 }],
      context: [{ subject: 'cleanup', path: 'authority.md', role: 'authority' }],
    });
    const authority = runtime.getCapability(AUTHORITY_CAPABILITY);
    const context = runtime.getCapability(CONTEXT_CAPABILITY);

    assert.equal((await authority.resolve({ subject: 'cleanup' })).status, 'resolved');
    await runtime.shutdown();

    assert.equal((await authority.resolve({ subject: 'cleanup' })).status, 'missing');
    assert.deepEqual((await context.resolve({ subject: 'cleanup' })).authority, []);
  });
});
