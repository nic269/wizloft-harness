import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryService, MemoryError } from '../dist/index.js';

function createStore(initial = []) {
  const snapshots = [...initial];
  return {
    snapshots,
    store: {
      async appendSnapshot(record) {
        snapshots.push(record);
      },
      async loadSnapshots() {
        return snapshots;
      },
    },
  };
}

function source(sourceId = 'source-1') {
  return { sourceType: 'test', sourceId, path: './docs/../docs/lesson.md' };
}

test('remember snapshots dependencies/input and creates normalized immutable candidate records', async () => {
  const { snapshots, store } = createStore();
  const options = {
    store,
    idFactory: () => 'memory-1',
    clock: () => '2026-08-16T01:00:00.000Z',
  };
  const service = await createMemoryService(options);

  store.appendSnapshot = () => {
    throw new Error('mutated store callback');
  };
  options.idFactory = () => 'mutated-id';
  options.clock = () => '2027-01-01T00:00:00.000Z';

  const input = {
    kind: 'episodic',
    scope: 'project:wizloft',
    content: 'Keep repository authority explicit',
    tags: [' Architecture ', 'architecture', '', 'LESSON'],
    metadata: { nested: { accepted: true } },
    provenance: source(),
  };
  const pending = service.remember(input);
  input.content = 'mutated after remember call';
  input.metadata.nested.accepted = false;
  const record = await pending;

  assert.equal(record.id, 'memory-1');
  assert.equal(record.state, 'candidate');
  assert.equal(record.content, 'Keep repository authority explicit');
  assert.deepEqual(record.tags, ['architecture', 'lesson']);
  assert.equal(record.provenance.path, 'docs/lesson.md');
  assert.equal(record.createdAt, '2026-08-16T01:00:00.000Z');
  assert.equal(snapshots.length, 1);
  assert.ok(Object.isFrozen(record));
  assert.ok(Object.isFrozen(record.tags));
  assert.ok(Object.isFrozen(record.metadata));
  assert.ok(Object.isFrozen(record.metadata.nested));
  assert.deepEqual(service.recall({ scope: 'project:wizloft' }), []);
  assert.deepEqual(
    service.recall({ scope: 'project:wizloft', states: ['candidate'] }).map(({ id }) => id),
    ['memory-1'],
  );
});

test('recall uses exact scope, deterministic filters, recursive metadata subsets, and creation order', async () => {
  const { store } = createStore();
  const ids = ['first', 'second', 'other-scope'];
  const times = [
    '2026-08-16T01:00:00.000Z',
    '2026-08-16T01:00:01.000Z',
    '2026-08-16T01:00:02.000Z',
  ];
  const service = await createMemoryService({
    store,
    idFactory: () => ids.shift(),
    clock: () => times.shift(),
  });

  await service.remember({
    kind: 'semantic',
    scope: 'project:wizloft',
    content: 'Repository authority wins over learned memory',
    tags: ['Architecture', 'Authority'],
    metadata: { stack: { language: 'ts', versions: [22, 11] }, ignored: true },
    provenance: source('one'),
    state: 'active',
  });
  await service.remember({
    kind: 'episodic',
    scope: 'project:wizloft',
    content: 'Authority regression was verified in memory tests',
    tags: ['authority', 'testing'],
    metadata: { stack: { language: 'ts', versions: [22, 10] } },
    provenance: source('two'),
    state: 'active',
  });
  await service.remember({
    kind: 'semantic',
    scope: 'workspace:wizloft',
    content: 'Repository authority in another scope',
    tags: ['authority'],
    provenance: source('three'),
    state: 'active',
  });

  assert.deepEqual(
    service.recall({ scope: 'project:wizloft' }).map(({ id }) => id),
    ['first', 'second'],
  );
  assert.deepEqual(
    service
      .recall({
        scope: 'project:wizloft',
        kinds: ['semantic'],
        keywords: ['REPOSITORY', 'learned'],
        tags: [' AUTHORITY ', 'architecture'],
        metadata: { stack: { versions: [22, 11] } },
      })
      .map(({ id }) => id),
    ['first'],
  );
  assert.deepEqual(
    service.recall({
      scope: 'project:wizloft',
      metadata: { stack: { versions: [22] } },
    }),
    [],
  );
});

test('transition enforces the lifecycle and same-scope active supersession contract', async () => {
  const { store } = createStore();
  const ids = ['old', 'replacement', 'other'];
  let tick = 0;
  const service = await createMemoryService({
    store,
    idFactory: () => ids.shift(),
    clock: () => `2026-08-16T01:00:0${tick++}.000Z`,
  });
  const old = await service.remember({
    kind: 'episodic',
    scope: 'project:wizloft',
    content: 'Old lesson',
    provenance: source('old'),
  });
  const replacement = await service.remember({
    kind: 'semantic',
    scope: 'project:wizloft',
    content: 'New lesson',
    provenance: source('replacement'),
    state: 'active',
  });
  const other = await service.remember({
    kind: 'semantic',
    scope: 'project:other',
    content: 'Other scope',
    provenance: source('other'),
    state: 'active',
  });

  await service.transition({ id: old.id, state: 'active' });
  await service.transition({ id: old.id, state: 'stale' });
  await service.transition({ id: old.id, state: 'active' });
  await assert.rejects(
    service.transition({ id: old.id, state: 'superseded', supersededBy: other.id }),
    (error) => error instanceof MemoryError && error.code === 'INVALID_MEMORY_TRANSITION',
  );
  const superseded = await service.transition({
    id: old.id,
    state: 'superseded',
    supersededBy: replacement.id,
    promotion: { target: 'docs/architecture/MEMORY-MODEL.md', reference: 'memory-contract' },
  });
  const archived = await service.transition({ id: old.id, state: 'archived' });

  assert.equal(superseded.content, 'Old lesson');
  assert.equal(archived.supersededBy, replacement.id);
  assert.equal(archived.promotion.target, 'docs/architecture/MEMORY-MODEL.md');
  assert.deepEqual(
    service
      .recall({ scope: 'project:wizloft', states: ['archived', 'active'] })
      .map(({ id }) => id),
    ['old', 'replacement'],
  );
  await assert.rejects(
    service.transition({ id: old.id, state: 'active' }),
    (error) => error instanceof MemoryError && error.code === 'INVALID_MEMORY_TRANSITION',
  );
});

test('service serializes mutations and does not commit failed persistence', async () => {
  const snapshots = [];
  const releases = [];
  let appendCalls = 0;
  const service = await createMemoryService({
    store: {
      loadSnapshots: () => [],
      appendSnapshot(record) {
        appendCalls += 1;
        return new Promise((resolve, reject) => releases.push({ record, resolve, reject }));
      },
    },
    idFactory: (() => {
      const ids = ['one', 'two', 'three'];
      return () => ids.shift();
    })(),
    clock: () => '2026-08-16T01:00:00.000Z',
  });

  const one = service.remember({
    kind: 'semantic',
    scope: 'organization',
    content: 'One',
    provenance: source('one'),
    state: 'active',
  });
  const two = service.remember({
    kind: 'semantic',
    scope: 'organization',
    content: 'Two',
    provenance: source('two'),
    state: 'active',
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(appendCalls, 1);
  assert.deepEqual(service.recall({ scope: 'organization' }), []);

  snapshots.push(releases[0].record);
  releases[0].resolve();
  await one;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(appendCalls, 2);
  snapshots.push(releases[1].record);
  releases[1].resolve();
  await two;

  const three = service.remember({
    kind: 'semantic',
    scope: 'organization',
    content: 'Three',
    provenance: source('three'),
    state: 'active',
  });
  await new Promise((resolve) => setImmediate(resolve));
  releases[2].reject(new Error('disk unavailable'));
  await assert.rejects(
    three,
    (error) => error instanceof MemoryError && error.code === 'MEMORY_STORE_PERSIST_FAILED',
  );
  assert.deepEqual(
    service.recall({ scope: 'organization' }).map(({ id }) => id),
    ['one', 'two'],
  );
});

test('service reconstructs current state and first-seen order from full snapshot history', async () => {
  const { snapshots, store } = createStore();
  const ids = ['first', 'second'];
  let tick = 0;
  const service = await createMemoryService({
    store,
    idFactory: () => ids.shift(),
    clock: () => `2026-08-16T01:00:0${tick++}.000Z`,
  });
  const first = await service.remember({
    kind: 'semantic',
    scope: 'project:wizloft',
    content: 'First',
    provenance: source('first'),
    state: 'active',
  });
  await service.remember({
    kind: 'semantic',
    scope: 'project:wizloft',
    content: 'Second',
    provenance: source('second'),
    state: 'active',
  });
  await service.transition({ id: first.id, state: 'stale' });

  const restarted = await createMemoryService({ store: createStore(snapshots).store });
  assert.deepEqual(
    restarted
      .recall({ scope: 'project:wizloft', states: ['stale', 'active'] })
      .map(({ id, state }) => [id, state]),
    [
      ['first', 'stale'],
      ['second', 'active'],
    ],
  );
});

test('service rejects structurally invalid and logically impossible persisted history', async () => {
  const base = {
    id: 'memory-1',
    kind: 'semantic',
    scope: 'project:wizloft',
    content: 'Accepted content',
    tags: ['accepted'],
    metadata: {},
    provenance: { sourceType: 'test', sourceId: 'source-1' },
    state: 'active',
    createdAt: '2026-08-16T01:00:00.000Z',
    updatedAt: '2026-08-16T01:00:00.000Z',
  };
  const cases = [
    [{ ...base, tags: [' Not-Normalized '] }],
    [base, { ...base, content: 'Mutated content', state: 'stale' }],
    [
      { ...base, state: 'candidate' },
      { ...base, state: 'stale' },
    ],
    [base, { ...base, state: 'superseded', supersededBy: 'missing' }],
    [{ ...base, state: 'stale' }],
    [
      { ...base, promotion: { target: 'docs/memory.md' } },
      { ...base, state: 'stale', updatedAt: '2026-08-16T01:00:01.000Z' },
    ],
  ];

  for (const history of cases) {
    await assert.rejects(
      createMemoryService({ store: createStore(history).store }),
      (error) => error instanceof MemoryError && error.code === 'CORRUPT_MEMORY_HISTORY',
    );
  }
});

test('id factory failures and invalid results use structured Memory errors', async () => {
  const thrownCause = new Error('id source unavailable');
  const throwingService = await createMemoryService({
    store: createStore().store,
    idFactory() {
      throw thrownCause;
    },
  });
  await assert.rejects(
    throwingService.remember({
      kind: 'semantic',
      scope: 'organization',
      content: 'Throwing id',
      provenance: source(),
    }),
    (error) =>
      error instanceof MemoryError &&
      error.code === 'INVALID_MEMORY_ID' &&
      error.cause === thrownCause,
  );

  const invalidService = await createMemoryService({
    store: createStore().store,
    idFactory: () => '',
  });
  await assert.rejects(
    invalidService.remember({
      kind: 'semantic',
      scope: 'organization',
      content: 'Invalid id',
      provenance: source(),
    }),
    (error) => error instanceof MemoryError && error.code === 'INVALID_MEMORY_ID',
  );
});

test('remember and transition share structured clock normalization with retained causes', async () => {
  const thrownCause = new Error('clock unavailable');
  const throwingService = await createMemoryService({
    store: createStore().store,
    idFactory: () => 'throwing-clock',
    clock() {
      throw thrownCause;
    },
  });
  await assert.rejects(
    throwingService.remember({
      kind: 'semantic',
      scope: 'organization',
      content: 'Throwing clock',
      provenance: source(),
    }),
    (error) =>
      error instanceof MemoryError &&
      error.code === 'INVALID_MEMORY_CLOCK' &&
      error.recordId === 'throwing-clock' &&
      error.cause === thrownCause,
  );

  const invalidService = await createMemoryService({
    store: createStore().store,
    idFactory: () => 'invalid-clock',
    clock: () => 'not-a-time',
  });
  await assert.rejects(
    invalidService.remember({
      kind: 'semantic',
      scope: 'organization',
      content: 'Invalid clock',
      provenance: source(),
    }),
    (error) => error instanceof MemoryError && error.code === 'INVALID_MEMORY_CLOCK',
  );

  let clockCalls = 0;
  const transitionCause = new Error('transition clock unavailable');
  const transitionService = await createMemoryService({
    store: createStore().store,
    idFactory: () => 'transition-clock',
    clock() {
      clockCalls += 1;
      if (clockCalls === 1) return '2026-08-16T01:00:00.000Z';
      throw transitionCause;
    },
  });
  const record = await transitionService.remember({
    kind: 'semantic',
    scope: 'organization',
    content: 'Transition clock',
    provenance: source(),
    state: 'active',
  });
  await assert.rejects(
    transitionService.transition({ id: record.id, state: 'stale' }),
    (error) =>
      error instanceof MemoryError &&
      error.code === 'INVALID_MEMORY_CLOCK' &&
      error.recordId === record.id &&
      error.cause === transitionCause,
  );
  assert.equal(transitionService.recall({ scope: 'organization' })[0].state, 'active');
});

test('invalid input, scope, recall, ids, and store dependencies fail structurally', async () => {
  await assert.rejects(
    createMemoryService({ store: { loadSnapshots: () => [], appendSnapshot: undefined } }),
    (error) => error instanceof MemoryError && error.code === 'INVALID_MEMORY_DEPENDENCY',
  );

  const service = await createMemoryService({
    store: createStore().store,
    idFactory: () => '',
    clock: () => 'not-a-time',
  });
  assert.throws(
    () =>
      service.remember({
        kind: 'semantic',
        scope: 'project:',
        content: 'Invalid',
        provenance: source(),
      }),
    (error) => error instanceof MemoryError && error.code === 'INVALID_MEMORY_INPUT',
  );
  await assert.rejects(
    service.remember({
      kind: 'semantic',
      scope: 'organization',
      content: 'Invalid id',
      provenance: source(),
    }),
    (error) => error instanceof MemoryError && error.code === 'INVALID_MEMORY_ID',
  );
  assert.throws(
    () => service.recall({ scope: 'organization', states: ['unknown'] }),
    (error) => error instanceof MemoryError && error.code === 'INVALID_MEMORY_QUERY',
  );

  const duplicateService = await createMemoryService({
    store: createStore().store,
    idFactory: () => 'duplicate',
    clock: () => '2026-08-16T01:00:00.000Z',
  });
  const duplicateInput = {
    kind: 'semantic',
    scope: 'organization',
    content: 'Duplicate id',
    provenance: source(),
  };
  await duplicateService.remember(duplicateInput);
  await assert.rejects(
    duplicateService.remember(duplicateInput),
    (error) => error instanceof MemoryError && error.code === 'DUPLICATE_MEMORY_ID',
  );
});
