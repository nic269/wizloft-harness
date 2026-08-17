import assert from 'node:assert/strict';
import test from 'node:test';

import { composeProfile } from '../../../packages/kernel/dist/index.js';
import {
  createSelfHostProfile,
  SELF_HOST_AUTHORITY_SOURCES,
  SELF_HOST_VALIDATION_PLUGIN_NAME,
} from '../dist/index.js';

test('self-host profile composes only concrete existing providers and project validation', () => {
  const resolved = composeProfile(
    createSelfHostProfile({
      repositoryRoot: '/repository',
      eventsPath: '/state/events.jsonl',
      memoryPath: '/state/memory.jsonl',
    }),
  );

  assert.deepEqual(
    resolved.plugins.map(({ name }) => name),
    [
      '@wizloft/authority',
      '@wizloft/context',
      '@wizloft/evidence',
      '@wizloft/validation',
      '@wizloft/file-events',
      '@wizloft/file-memory',
      '@wizloft/memory-context',
      '@wizloft/repository-files',
      SELF_HOST_VALIDATION_PLUGIN_NAME,
    ],
  );
  assert.equal(
    resolved.plugins.some(({ name }) => name.includes('workflow') || name.includes('shell')),
    false,
  );
  const repositoryConfig = resolved.plugins.find(
    ({ name }) => name === '@wizloft/repository-files',
  ).config;
  assert.equal(repositoryConfig.authority.length, SELF_HOST_AUTHORITY_SOURCES.length);
  assert.equal(
    [...repositoryConfig.authority, ...repositoryConfig.context].some(({ path }) =>
      path.startsWith('.references/'),
    ),
    false,
  );
});

test('self-host profile requires explicit repository and durability paths', () => {
  assert.throws(
    () =>
      createSelfHostProfile({ repositoryRoot: '', eventsPath: '/events', memoryPath: '/memory' }),
    /repositoryRoot must be a non-empty path/u,
  );
});
