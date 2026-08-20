import assert from 'node:assert/strict';
import test from 'node:test';

import { parseProjectMarker } from '../dist/marker.js';
import { markerContents } from '../dist/templates.js';
import { RELEASE } from './helpers.mjs';

function generatedMarker(adapters = ['agents', 'claude']) {
  return JSON.parse(
    markerContents({
      projectId: 'example',
      release: RELEASE,
      adapters,
    }),
  );
}

test('valid generated marker remains accepted', () => {
  const text = markerContents({
    projectId: 'example',
    release: RELEASE,
    adapters: ['agents', 'claude'],
  });
  const parsed = parseProjectMarker(text);
  assert.equal(parsed.status, 'valid');
  if (parsed.status !== 'valid') return;
  assert.equal(parsed.marker.paths.instructions, '.wizloft/harness/INSTRUCTIONS.md');
  assert.equal(parsed.marker.paths.profile, '.wizloft/harness/profile.mjs');
  assert.equal(parsed.marker.paths.runner, '.wizloft/harness/run.mjs');
  assert.equal(parsed.marker.paths.projectTruth, '.wizloft/PROJECT.md');
  assert.equal(parsed.marker.paths.localState, '.wizloft/harness/local');
  assert.deepEqual(parsed.marker.command.argv, ['node', '.wizloft/harness/run.mjs']);
});

test('wrong canonical path is an invalid marker', () => {
  const marker = generatedMarker(['agents']);
  marker.paths.instructions = '.wizloft/INSTRUCTIONS.md';
  const parsed = parseProjectMarker(`${JSON.stringify(marker, undefined, 2)}\n`);
  assert.equal(parsed.status, 'invalid');
});

test('duplicate adapters are rejected rather than deduplicated', () => {
  const marker = generatedMarker(['agents']);
  marker.adapters = ['agents', 'agents'];
  const parsed = parseProjectMarker(`${JSON.stringify(marker, undefined, 2)}\n`);
  assert.equal(parsed.status, 'invalid');
});

test('agents-before-claude order is required', () => {
  const marker = generatedMarker(['agents', 'claude']);
  marker.adapters = ['claude', 'agents'];
  const parsed = parseProjectMarker(`${JSON.stringify(marker, undefined, 2)}\n`);
  assert.equal(parsed.status, 'invalid');
});
