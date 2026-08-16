import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthorityError, createAuthorityService } from '../dist/index.js';

function candidate(contributorId, id, precedence, content = id, resolutionKey) {
  return {
    id,
    content,
    precedence,
    provenance: {
      contributorId,
      sourceId: `source:${id}`,
      sourceType: 'test',
    },
    ...(resolutionKey === undefined ? {} : { resolutionKey }),
  };
}

test('authority resolves missing when no contributor returns a candidate', async () => {
  const service = createAuthorityService();

  const result = await service.resolve({ subject: 'missing' });

  assert.deepEqual(result, {
    status: 'missing',
    subject: 'missing',
    contenders: [],
    shadowed: [],
  });
  assert.ok(Object.isFrozen(result));
});

test('authority uses only the highest numeric precedence set for status', async () => {
  const service = createAuthorityService();
  service.registerContributor({
    id: 'test.authority',
    contribute() {
      return [
        candidate('test.authority', 'lower-conflict', 10, 'old', 'old'),
        candidate('test.authority', 'winner', 20, 'current'),
      ];
    },
  });

  const result = await service.resolve({ subject: 'architecture' });

  assert.equal(result.status, 'resolved');
  assert.deepEqual(
    result.contenders.map(({ id }) => id),
    ['winner'],
  );
  assert.deepEqual(
    result.shadowed.map(({ id }) => id),
    ['lower-conflict'],
  );
});

test('matching explicit resolution identities are resolved corroboration', async () => {
  const service = createAuthorityService();
  service.registerContributor({
    id: 'test.corroboration',
    contribute() {
      return [
        candidate('test.corroboration', 'decision', 100, 'different prose A', 'accepted-v1'),
        candidate('test.corroboration', 'test', 100, 'different prose B', 'accepted-v1'),
      ];
    },
  });

  const result = await service.resolve({ subject: 'contract' });

  assert.equal(result.status, 'resolved');
  assert.equal(result.contenders.length, 2);
});

test('distinct explicit resolution identities produce conflict', async () => {
  const service = createAuthorityService();
  service.registerContributor({
    id: 'test.conflict',
    contribute() {
      return [
        candidate('test.conflict', 'left', 50, 'left prose', 'choice-a'),
        candidate('test.conflict', 'right', 50, 'right prose', 'choice-b'),
      ];
    },
  });

  assert.equal((await service.resolve({ subject: 'choice' })).status, 'conflict');
});

test('missing or mixed resolution identity produces ambiguity', async () => {
  const service = createAuthorityService();
  service.registerContributor({
    id: 'test.ambiguous',
    contribute() {
      return [
        candidate('test.ambiguous', 'identified', 50, 'identified', 'choice-a'),
        candidate('test.ambiguous', 'unidentified', 50, 'unidentified'),
      ];
    },
  });

  assert.equal((await service.resolve({ subject: 'choice' })).status, 'ambiguous');
});

test('authority preserves contributor and item order while snapshotting immutable evidence', async () => {
  const service = createAuthorityService();
  const mutableContent = { nested: { value: 'before' } };
  service.registerContributor({
    id: 'test.first',
    contribute() {
      return [
        candidate('test.first', 'first-a', 10, mutableContent),
        candidate('test.first', 'first-b', 10),
      ];
    },
  });
  service.registerContributor({
    id: 'test.second',
    contribute() {
      return [candidate('test.second', 'second', 10)];
    },
  });

  const result = await service.resolve({ subject: 'ordered' });
  mutableContent.nested.value = 'after';

  assert.deepEqual(
    result.contenders.map(({ id }) => id),
    ['first-a', 'first-b', 'second'],
  );
  assert.equal(result.contenders[0].content.nested.value, 'before');
  assert.ok(Object.isFrozen(result.contenders));
  assert.ok(Object.isFrozen(result.contenders[0].content));
  assert.ok(Object.isFrozen(result.contenders[0].content.nested));
});

test('authority contributor ids are unique while active and disposer removes registration', async () => {
  const service = createAuthorityService();
  const contributor = { id: 'test.disposable', contribute: () => [] };
  const dispose = service.registerContributor(contributor);

  assert.throws(
    () => service.registerContributor(contributor),
    (error) => error instanceof AuthorityError && error.code === 'DUPLICATE_AUTHORITY_CONTRIBUTOR',
  );

  await dispose();
  service.registerContributor(contributor);
  assert.equal((await service.resolve({ subject: 'after-dispose' })).status, 'missing');
});

test('authority snapshots registered contributor identity and behavior', async () => {
  const service = createAuthorityService();
  const contributor = {
    id: 'test.stable',
    label: 'registered behavior',
    contribute() {
      return [candidate('test.stable', 'stable', 1, this.label)];
    },
  };
  const dispose = service.registerContributor(contributor);

  contributor.id = 'test.mutated';
  contributor.contribute = () => [candidate('test.mutated', 'replacement', 1)];

  assert.throws(
    () => service.registerContributor({ id: 'test.stable', contribute: () => [] }),
    (error) => error instanceof AuthorityError && error.code === 'DUPLICATE_AUTHORITY_CONTRIBUTOR',
  );
  const result = await service.resolve({ subject: 'stable-registration' });
  assert.deepEqual(
    result.contenders.map(({ id, content }) => ({ id, content })),
    [{ id: 'stable', content: 'registered behavior' }],
  );

  await dispose();
  service.registerContributor({ id: 'test.stable', contribute: () => [] });
});
