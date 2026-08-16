import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { AUTHORITY_CAPABILITY, authorityPlugin } from '@wizloft/harness-authority';
import { CONTEXT_CAPABILITY, contextPlugin } from '@wizloft/harness-context';
import { createHarnessRuntime, HarnessKernelError } from '@wizloft/harness-kernel';
import { MEMORY_CAPABILITY, MemoryError } from '@wizloft/harness-memory';
import { FILE_MEMORY_PLUGIN_NAME, fileMemoryPlugin } from '@wizloft/harness-plugin-file-memory';
import {
  REPOSITORY_FILES_PLUGIN_NAME,
  repositoryFilesPlugin,
} from '@wizloft/harness-plugin-repository-files';

import {
  MEMORY_CONTEXT_PLUGIN_NAME,
  MemoryContextError,
  memoryContextPlugin,
} from '../dist/index.js';

async function withTemporaryDirectory(run) {
  const directory = await mkdtemp(join(tmpdir(), 'wizloft-memory-context-'));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

async function createMemoryContextRuntime(directory, mappings) {
  return createHarnessRuntime({
    profile: {
      layers: [
        {
          name: 'memory-context',
          plugins: [contextPlugin, fileMemoryPlugin, memoryContextPlugin],
          config: {
            [FILE_MEMORY_PLUGIN_NAME]: { path: join(directory, 'memory.jsonl') },
            [MEMORY_CONTEXT_PLUGIN_NAME]: { mappings },
          },
        },
      ],
    },
  });
}

test('memory-context preserves supporting/historical mappings and cleans up on shutdown', async () => {
  await withTemporaryDirectory(async (directory) => {
    const runtime = await createMemoryContextRuntime(directory, [
      {
        subject: 'architecture',
        role: 'supporting',
        query: { scope: 'project:wizloft', tags: ['architecture'] },
      },
      {
        subject: 'architecture',
        role: 'historical',
        query: { scope: 'project:wizloft', states: ['candidate'] },
      },
    ]);
    const memory = runtime.getCapability(MEMORY_CAPABILITY);
    const context = runtime.getCapability(CONTEXT_CAPABILITY);
    await memory.remember({
      kind: 'episodic',
      scope: 'project:wizloft',
      content: 'Candidate lesson',
      tags: ['candidate'],
      provenance: { sourceType: 'test', sourceId: 'candidate' },
    });
    await memory.remember({
      kind: 'semantic',
      scope: 'project:wizloft',
      content: 'Active architecture lesson',
      tags: ['architecture'],
      provenance: { sourceType: 'repository-review', sourceId: 'review-1' },
      state: 'active',
    });

    const resolved = await context.resolve({ subject: 'architecture' });
    assert.deepEqual(
      resolved.supporting.map(({ content }) => content),
      ['Active architecture lesson'],
    );
    assert.deepEqual(
      resolved.historical.map(({ content }) => content),
      ['Candidate lesson'],
    );
    assert.equal(resolved.authority.length, 0);
    assert.equal(resolved.supporting[0].provenance.sourceType, 'memory');

    await runtime.shutdown();
    const afterShutdown = await context.resolve({ subject: 'architecture' });
    assert.deepEqual(afterShutdown.supporting, []);
    assert.deepEqual(afterShutdown.historical, []);
  });
});

test('memory-context rejects authority roles and invalid exact recall queries at setup', async () => {
  await withTemporaryDirectory(async (directory) => {
    await assert.rejects(
      createMemoryContextRuntime(directory, [
        { subject: 'architecture', role: 'authority', query: { scope: 'organization' } },
      ]),
      (error) =>
        error instanceof HarnessKernelError &&
        error.cause instanceof MemoryContextError &&
        error.cause.code === 'INVALID_MEMORY_CONTEXT_CONFIG',
    );
    await assert.rejects(
      createMemoryContextRuntime(directory, [
        { subject: 'architecture', role: 'supporting', query: { scope: 'project:' } },
      ]),
      (error) =>
        error instanceof HarnessKernelError &&
        error.cause instanceof MemoryError &&
        error.cause.code === 'INVALID_MEMORY_QUERY',
    );
  });
});

test('repository Authority remains authoritative when memory-context contributes conflicting Memory', async () => {
  await withTemporaryDirectory(async (directory) => {
    const repositoryRoot = join(directory, 'repository');
    await mkdir(join(repositoryRoot, 'docs'), { recursive: true });
    await writeFile(join(repositoryRoot, 'docs', 'decision.md'), 'Y: repository decision');
    const runtime = await createHarnessRuntime({
      profile: {
        layers: [
          {
            name: 'authority-over-memory',
            plugins: [
              authorityPlugin,
              contextPlugin,
              repositoryFilesPlugin,
              fileMemoryPlugin,
              memoryContextPlugin,
            ],
            config: {
              [REPOSITORY_FILES_PLUGIN_NAME]: {
                root: repositoryRoot,
                authority: [
                  {
                    subject: 'architecture',
                    path: 'docs/decision.md',
                    precedence: 100,
                    resolutionKey: 'repository-y',
                  },
                ],
                context: [{ subject: 'architecture', path: 'docs/decision.md', role: 'authority' }],
              },
              [FILE_MEMORY_PLUGIN_NAME]: { path: join(directory, 'memory.jsonl') },
              [MEMORY_CONTEXT_PLUGIN_NAME]: {
                mappings: [
                  {
                    subject: 'architecture',
                    query: { scope: 'project:wizloft' },
                    role: 'supporting',
                  },
                ],
              },
            },
          },
        ],
      },
    });

    const authority = runtime.getCapability(AUTHORITY_CAPABILITY);
    assert.equal(
      (await authority.resolve({ subject: 'architecture' })).contenders[0].content,
      'Y: repository decision',
    );
    await runtime.getCapability(MEMORY_CAPABILITY).remember({
      kind: 'semantic',
      scope: 'project:wizloft',
      content: 'X: conflicting learned memory',
      provenance: { sourceType: 'test', sourceId: 'conflict-x' },
      state: 'active',
    });

    const authorityAfterMemory = await authority.resolve({ subject: 'architecture' });
    const context = await runtime.getCapability(CONTEXT_CAPABILITY).resolve({
      subject: 'architecture',
    });
    assert.equal(authorityAfterMemory.status, 'resolved');
    assert.equal(authorityAfterMemory.contenders[0].content, 'Y: repository decision');
    assert.deepEqual(
      context.authority.map(({ content }) => content),
      ['Y: repository decision'],
    );
    assert.deepEqual(
      context.supporting.map(({ content }) => content),
      ['X: conflicting learned memory'],
    );
    assert.equal(context.historical.length, 0);
    await runtime.shutdown();
  });
});
