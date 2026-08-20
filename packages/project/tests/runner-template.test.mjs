import assert from 'node:assert/strict';
import test from 'node:test';

import { runnerContents } from '../dist/templates.js';

test('planned run.mjs distinguishes missing package from later import failure', () => {
  const source = runnerContents();
  assert.match(source, /createRequire/);
  assert.match(source, /require\.resolve\('@wizloft\/harness-project'\)/);
  assert.match(source, /MODULE_NOT_FOUND/);
  assert.match(source, /npm --prefix \.wizloft\/harness ci --ignore-scripts --no-audit --no-fund/);
  assert.match(source, /await import\('@wizloft\/harness-project'\)/);

  const resolveCatch = source.slice(
    source.indexOf("require.resolve('@wizloft/harness-project')"),
    source.indexOf('if (resolved)'),
  );
  assert.match(resolveCatch, /MODULE_NOT_FOUND/);
  assert.match(resolveCatch, /Cannot resolve @wizloft\/harness-project/);

  const importCatch = source.slice(source.indexOf('if (resolved)'));
  assert.match(importCatch, /fail\(error instanceof Error \? error\.message : String\(error\)\)/);
  assert.doesNotMatch(importCatch, /Cannot resolve @wizloft\/harness-project/);
  assert.doesNotMatch(source, /} catch \{\s*fail\(\s*'Cannot resolve/);
});
