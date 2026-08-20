import assert from 'node:assert/strict';
import test from 'node:test';

import { HarnessProjectError } from '../dist/errors.js';
import {
  parseManagedFile,
  removeManagedBlock,
  upsertManagedBlock,
} from '../dist/managed-blocks.js';

test('schema-1 markdown blocks are recognized as standalone lines', () => {
  const text = [
    '# title',
    '',
    '<!-- wizloft-harness:start -->',
    'interior',
    '<!-- wizloft-harness:end -->',
    'after',
    '',
  ].join('\n');
  const parsed = parseManagedFile(text, 'AGENTS.md', 'markdown');
  assert.equal(parsed.status, 'block');
  assert.equal(parsed.block.style, 'schema-1');
  assert.equal(parsed.block.interior, 'interior');
});

test('legacy markdown blocks are recognized for migration', () => {
  const text = ['<!-- HARNESS:BEGIN -->', 'old', '<!-- HARNESS:END -->', ''].join('\n');
  const parsed = parseManagedFile(text, 'AGENTS.md', 'markdown');
  assert.equal(parsed.status, 'block');
  assert.equal(parsed.block.style, 'legacy');
  const updated = upsertManagedBlock(text, 'AGENTS.md', 'markdown', 'new');
  assert.equal(updated.action, 'update-block');
  assert.match(updated.contents, /<!-- wizloft-harness:start -->/);
  assert.match(updated.contents, /new/);
  assert.doesNotMatch(updated.contents, /HARNESS:BEGIN/);
});

test('gitignore blocks use hash markers', () => {
  const text = ['# user', '# wizloft-harness:start', 'tmp/', '# wizloft-harness:end', ''].join(
    '\n',
  );
  const parsed = parseManagedFile(text, '.gitignore', 'gitignore');
  assert.equal(parsed.status, 'block');
  assert.equal(parsed.block.style, 'gitignore');
});

test('malformed managed blocks conflict', () => {
  const cases = [
    ['<!-- wizloft-harness:start -->\ninterior\n', 'unclosed'],
    [
      '<!-- wizloft-harness:start -->\ninner\n<!-- wizloft-harness:start -->\n<!-- wizloft-harness:end -->\n',
      'nested',
    ],
    [
      '<!-- wizloft-harness:start -->\na\n<!-- wizloft-harness:end -->\n<!-- wizloft-harness:start -->\nb\n<!-- wizloft-harness:end -->\n',
      'duplicate',
    ],
    [
      '<!-- HARNESS:BEGIN -->\nold\n<!-- HARNESS:END -->\n<!-- wizloft-harness:start -->\nnew\n<!-- wizloft-harness:end -->\n',
      'legacy+schema-1',
    ],
    ['prefix <!-- wizloft-harness:start -->\n<!-- wizloft-harness:end -->\n', 'not standalone'],
  ];
  for (const [text] of cases) {
    assert.throws(
      () => parseManagedFile(text, 'AGENTS.md', 'markdown'),
      (error) => error instanceof HarnessProjectError && error.code === 'MANAGED_BLOCK_CONFLICT',
    );
  }
});

test('upsert and remove preserve bytes outside the managed block', () => {
  const original = [
    '# user heading',
    'keep me',
    '<!-- wizloft-harness:start -->',
    'old',
    '<!-- wizloft-harness:end -->',
    'tail',
    '',
  ].join('\n');
  const updated = upsertManagedBlock(original, 'AGENTS.md', 'markdown', 'replacement');
  assert.equal(updated.contents.startsWith('# user heading\nkeep me\n'), true);
  assert.equal(updated.contents.endsWith('tail\n'), true);
  assert.match(updated.contents, /replacement/);

  const removed = removeManagedBlock(original, 'AGENTS.md', 'markdown');
  assert.equal(removed.contents, '# user heading\nkeep me\ntail\n');
});

test('add then remove is byte-reversible when the original has no final newline', () => {
  const original = 'user content';
  const updated = upsertManagedBlock(original, 'AGENTS.md', 'markdown', 'interior');
  assert.equal(updated.contents.startsWith('user content\n<!-- wizloft-harness:start -->'), true);
  assert.equal(updated.contents.endsWith('\n'), false);
  const removed = removeManagedBlock(updated.contents, 'AGENTS.md', 'markdown');
  assert.equal(removed?.contents, original);
});

test('add then remove preserves LF, CRLF, and surrounding bytes', () => {
  const lf = '# heading\nkeep me\n';
  const lfUpdated = upsertManagedBlock(lf, 'AGENTS.md', 'markdown', 'block');
  const lfRemoved = removeManagedBlock(lfUpdated.contents, 'AGENTS.md', 'markdown');
  assert.equal(lfRemoved?.contents, lf);

  const crlf = 'keep\r\n';
  const crlfUpdated = upsertManagedBlock(crlf, 'AGENTS.md', 'markdown', 'next');
  assert.equal(crlfUpdated.contents.includes('\r\n'), true);
  const crlfRemoved = removeManagedBlock(crlfUpdated.contents, 'AGENTS.md', 'markdown');
  assert.equal(crlfRemoved?.contents, crlf);

  const surrounding = [
    'before',
    '<!-- wizloft-harness:start -->',
    'old',
    '<!-- wizloft-harness:end -->',
    'after',
  ].join('\n');
  const replaced = upsertManagedBlock(surrounding, 'AGENTS.md', 'markdown', 'new');
  assert.equal(replaced.contents.startsWith('before\n'), true);
  assert.equal(replaced.contents.endsWith('after'), true);
  const restored = removeManagedBlock(replaced.contents, 'AGENTS.md', 'markdown');
  assert.equal(restored?.contents, 'before\nafter');
});

test('CRLF is preserved for existing files and new files use LF', () => {
  const original = [
    'keep',
    '<!-- wizloft-harness:start -->',
    'old',
    '<!-- wizloft-harness:end -->',
    '',
  ].join('\r\n');
  const updated = upsertManagedBlock(original, 'AGENTS.md', 'markdown', 'next');
  assert.equal(updated.contents.includes('\r\n'), true);
  assert.equal(updated.contents.includes('\r\n<!-- wizloft-harness:start -->\r\nnext\r\n'), true);

  const created = upsertManagedBlock(undefined, 'AGENTS.md', 'markdown', 'fresh');
  assert.equal(created.action, 'create');
  assert.equal(created.contents.includes('\r\n'), false);
  assert.equal(created.contents.endsWith('\n'), true);
});
