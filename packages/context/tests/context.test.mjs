import assert from 'node:assert/strict';
import test from 'node:test';

import { ContextError, createContextService } from '../dist/index.js';

function item(contributorId, id, role, content = id) {
  return {
    id,
    content,
    provenance: {
      contributorId,
      sourceId: `source:${id}`,
      sourceType: 'test',
    },
    role,
  };
}

test('context composes trust buckets while preserving registration and item order', async () => {
  const service = createContextService();
  service.registerContributor({
    id: 'test.first',
    contribute() {
      return [
        item('test.first', 'history-first', 'historical'),
        item('test.first', 'authority-first-a', 'authority'),
        item('test.first', 'support-first', 'supporting'),
        item('test.first', 'authority-first-b', 'authority'),
      ];
    },
  });
  service.registerContributor({
    id: 'test.second',
    contribute() {
      return [
        item('test.second', 'authority-second', 'authority'),
        item('test.second', 'history-second', 'historical'),
      ];
    },
  });

  const result = await service.resolve({ subject: 'task' });

  assert.deepEqual(
    result.authority.map(({ id }) => id),
    ['authority-first-a', 'authority-first-b', 'authority-second'],
  );
  assert.deepEqual(
    result.supporting.map(({ id }) => id),
    ['support-first'],
  );
  assert.deepEqual(
    result.historical.map(({ id }) => id),
    ['history-first', 'history-second'],
  );
});

test('context keeps duplicate items and snapshots deeply immutable JSON evidence', async () => {
  const service = createContextService();
  const mutable = { nested: ['before'] };
  service.registerContributor({
    id: 'test.snapshot',
    contribute() {
      return [
        item('test.snapshot', 'same', 'supporting', mutable),
        item('test.snapshot', 'same', 'supporting', mutable),
      ];
    },
  });

  const result = await service.resolve({ subject: 'task' });
  mutable.nested[0] = 'after';

  assert.equal(result.supporting.length, 2);
  assert.deepEqual(result.supporting[0].content, { nested: ['before'] });
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.supporting));
  assert.ok(Object.isFrozen(result.supporting[0].content));
  assert.ok(Object.isFrozen(result.supporting[0].content.nested));
});

test('context contributor ids are unique while active and disposer removes registration', async () => {
  const service = createContextService();
  const contributor = {
    id: 'test.disposable',
    contribute: () => [item('test.disposable', 'present', 'authority')],
  };
  const dispose = service.registerContributor(contributor);

  assert.throws(
    () => service.registerContributor(contributor),
    (error) => error instanceof ContextError && error.code === 'DUPLICATE_CONTEXT_CONTRIBUTOR',
  );
  await dispose();

  const result = await service.resolve({ subject: 'after-dispose' });
  assert.deepEqual(result.authority, []);
});

test('context rejects malformed requests and provenance', async () => {
  const service = createContextService();
  await assert.rejects(
    service.resolve({ subject: '' }),
    (error) => error instanceof ContextError && error.code === 'INVALID_CONTEXT_REQUEST',
  );

  service.registerContributor({
    id: 'test.invalid',
    contribute() {
      return [item('wrong-contributor', 'invalid', 'authority')];
    },
  });
  await assert.rejects(
    service.resolve({ subject: 'task' }),
    (error) => error instanceof ContextError && error.code === 'INVALID_CONTEXT_ITEM',
  );
});

test('context snapshots registered contributor identity and behavior', async () => {
  const service = createContextService();
  const contributor = {
    id: 'test.stable',
    label: 'registered behavior',
    contribute() {
      return [item('test.stable', 'stable', 'authority', this.label)];
    },
  };
  const dispose = service.registerContributor(contributor);

  contributor.id = 'test.mutated';
  contributor.contribute = () => [item('test.mutated', 'replacement', 'authority')];

  assert.throws(
    () => service.registerContributor({ id: 'test.stable', contribute: () => [] }),
    (error) => error instanceof ContextError && error.code === 'DUPLICATE_CONTEXT_CONTRIBUTOR',
  );
  const result = await service.resolve({ subject: 'stable-registration' });
  assert.deepEqual(
    result.authority.map(({ id, content }) => ({ id, content })),
    [{ id: 'stable', content: 'registered behavior' }],
  );

  await dispose();
  service.registerContributor({ id: 'test.stable', contribute: () => [] });
});
