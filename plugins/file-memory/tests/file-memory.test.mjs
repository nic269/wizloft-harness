import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createHarnessRuntime, HarnessKernelError } from '@wizloft/harness-kernel';
import { MEMORY_CAPABILITY, MemoryError } from '@wizloft/harness-memory';

import {
  createFileMemoryStore,
  FILE_MEMORY_PLUGIN_NAME,
  FileMemoryError,
  fileMemoryPlugin,
} from '../dist/index.js';

async function withTemporaryDirectory(run) {
  const directory = await mkdtemp(join(tmpdir(), 'wizloft-file-memory-'));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

async function createFileMemoryRuntime(config) {
  return createHarnessRuntime({
    profile: {
      layers: [
        {
          name: 'memory',
          plugins: [fileMemoryPlugin],
          config: { [FILE_MEMORY_PLUGIN_NAME]: config },
        },
      ],
    },
  });
}

test('file-memory boots without Context, persists, restarts, and provides memory@1', async () => {
  await withTemporaryDirectory(async (directory) => {
    const path = join(directory, 'state', 'memory.jsonl');
    const runtime = await createFileMemoryRuntime({ path });
    const memory = runtime.getCapability(MEMORY_CAPABILITY);
    const candidate = await memory.remember({
      kind: 'episodic',
      scope: 'project:wizloft',
      content: 'Candidate lesson',
      provenance: { sourceType: 'test', sourceId: 'candidate' },
    });
    const active = await memory.remember({
      kind: 'semantic',
      scope: 'project:wizloft',
      content: 'Active architecture lesson',
      provenance: { sourceType: 'repository-review', sourceId: 'review-1' },
      state: 'active',
    });
    await memory.transition({ id: active.id, state: 'stale' });
    await memory.transition({ id: active.id, state: 'active' });
    await runtime.shutdown();

    assert.equal((await readFile(path, 'utf8')).trim().split('\n').length, 4);
    const restarted = await createFileMemoryRuntime({ path });
    assert.deepEqual(
      restarted
        .getCapability(MEMORY_CAPABILITY)
        .recall({ scope: 'project:wizloft', states: ['candidate', 'active'] })
        .map(({ id, state }) => [id, state]),
      [
        [candidate.id, 'candidate'],
        [active.id, 'active'],
      ],
    );
    await restarted.shutdown();
  });
});

test('file-memory treats a missing file as empty and serializes direct store appends', async () => {
  await withTemporaryDirectory(async (directory) => {
    const store = createFileMemoryStore(join(directory, 'nested', 'memory.jsonl'));
    assert.deepEqual(await store.loadSnapshots(), []);
    await Promise.all([
      store.appendSnapshot({ sequence: 1 }),
      store.appendSnapshot({ sequence: 2 }),
      store.appendSnapshot({ sequence: 3 }),
    ]);
    assert.deepEqual(await store.loadSnapshots(), [
      { sequence: 1 },
      { sequence: 2 },
      { sequence: 3 },
    ]);
  });
});

test('file-memory rejects malformed JSON and non-finite parsed JSON during setup', async () => {
  await withTemporaryDirectory(async (directory) => {
    const malformedPath = join(directory, 'malformed.jsonl');
    await writeFile(malformedPath, '{not-json}\n');
    await assert.rejects(
      createFileMemoryRuntime({ path: malformedPath }),
      (error) =>
        error instanceof HarnessKernelError &&
        error.cause instanceof MemoryError &&
        error.cause.code === 'MEMORY_STORE_LOAD_FAILED' &&
        error.cause.cause instanceof FileMemoryError &&
        error.cause.cause.code === 'INVALID_FILE_MEMORY_HISTORY' &&
        error.cause.cause.lineNumber === 1,
    );

    const nonFinitePath = join(directory, 'non-finite.jsonl');
    await writeFile(
      nonFinitePath,
      '{"id":"memory-1","kind":"semantic","scope":"organization","content":"x","tags":[],"metadata":{"score":1e400},"provenance":{"sourceType":"test","sourceId":"1"},"state":"active","createdAt":"2026-08-16T01:00:00.000Z","updatedAt":"2026-08-16T01:00:00.000Z"}\n',
    );
    await assert.rejects(
      createFileMemoryRuntime({ path: nonFinitePath }),
      (error) =>
        error instanceof HarnessKernelError &&
        error.cause instanceof MemoryError &&
        error.cause.code === 'CORRUPT_MEMORY_HISTORY',
    );
  });
});

test('file-memory rejects logically impossible history instead of accepting the last line', async () => {
  await withTemporaryDirectory(async (directory) => {
    const path = join(directory, 'impossible.jsonl');
    const base = {
      id: 'memory-1',
      kind: 'semantic',
      scope: 'organization',
      content: 'Accepted content',
      tags: [],
      metadata: {},
      provenance: { sourceType: 'test', sourceId: '1' },
      state: 'active',
      createdAt: '2026-08-16T01:00:00.000Z',
      updatedAt: '2026-08-16T01:00:00.000Z',
    };
    await writeFile(
      path,
      `${JSON.stringify(base)}\n${JSON.stringify({ ...base, content: 'rewritten', state: 'stale' })}\n`,
    );
    await assert.rejects(
      createFileMemoryRuntime({ path }),
      (error) =>
        error instanceof HarnessKernelError &&
        error.cause instanceof MemoryError &&
        error.cause.code === 'CORRUPT_MEMORY_HISTORY',
    );
  });
});

test('file-memory config rejects legacy Context ownership', async () => {
  await withTemporaryDirectory(async (directory) => {
    await assert.rejects(
      createFileMemoryRuntime({ path: join(directory, 'memory.jsonl'), context: [] }),
      (error) =>
        error instanceof HarnessKernelError &&
        error.cause instanceof FileMemoryError &&
        error.cause.code === 'INVALID_FILE_MEMORY_CONFIG',
    );
  });
});
