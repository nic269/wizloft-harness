import assert from 'node:assert/strict';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { createHarness } from '@wizloft/harness';
import { HarnessProjectError } from '../dist/errors.js';
import { projectHealthPlugin } from '../dist/health.js';
import {
  createGeneratedProjectProfile,
  PROJECT_HEALTH_PLUGIN_NAME,
  PROJECT_HEALTH_VALIDATOR_ID,
} from '../dist/profile.js';
import { cleanup, RELEASE, tempRepo, writeFileTree } from './helpers.mjs';

const FORBIDDEN_INGESTION = [
  'README.md',
  'docs/architecture.md',
  'package.json',
  '.wizloft/agents.yaml',
  'AGENTS.md',
  'CLAUDE.md',
  '.agentkit/config.yaml',
];

function repositoryConfig(profile) {
  return profile.layers[0].config['@wizloft/repository-files'];
}

function pluginNames(profile) {
  return profile.layers[0].plugins.map((plugin) => plugin.name);
}

async function writeOverlay(root, source) {
  await mkdir(path.join(root, '.wizloft/harness'), { recursive: true });
  await writeFile(path.join(root, '.wizloft/harness/profile.local.mjs'), source);
}

test('default generated profile uses exact Authority/Context defaults and MUH providers', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  const first = await createGeneratedProjectProfile({
    repositoryRoot: root,
    projectId: 'example',
  });
  const second = await createGeneratedProjectProfile({
    repositoryRoot: root,
    projectId: 'example',
  });
  const config = repositoryConfig(first);
  assert.deepEqual(pluginNames(first), [
    '@wizloft/authority',
    '@wizloft/context',
    '@wizloft/evidence',
    '@wizloft/validation',
    '@wizloft/file-events',
    '@wizloft/file-memory',
    '@wizloft/memory-context',
    '@wizloft/repository-files',
    PROJECT_HEALTH_PLUGIN_NAME,
  ]);
  assert.deepEqual(config.authority, [
    { subject: 'example:project', path: '.wizloft/PROJECT.md', precedence: 100 },
    { subject: 'example:harness', path: '.wizloft/harness/INSTRUCTIONS.md', precedence: 90 },
  ]);
  assert.deepEqual(config.context, [
    { subject: 'example:project', path: '.wizloft/PROJECT.md', role: 'authority' },
    { subject: 'example:project', path: '.wizloft/harness/INSTRUCTIONS.md', role: 'authority' },
  ]);
  assert.deepEqual(repositoryConfig(second).authority, config.authority);
  assert.deepEqual(repositoryConfig(second).context, config.context);
  assert.equal(
    first.layers[0].config['@wizloft/file-events'].path,
    path.join(root, '.wizloft/harness/local/events.jsonl'),
  );
  assert.equal(
    first.layers[0].config['@wizloft/file-memory'].path,
    path.join(root, '.wizloft/harness/local/memory.jsonl'),
  );
  assert.deepEqual(first.layers[0].config['@wizloft/memory-context'].mappings, [
    {
      subject: 'example:project',
      role: 'supporting',
      query: { scope: 'project:example', states: ['active'] },
    },
    {
      subject: 'example:project',
      role: 'historical',
      query: { scope: 'project:example', states: ['stale', 'superseded'] },
    },
  ]);
});

test('default Context does not ingest README, docs, package, AGENTS, or AgentKit files', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  await writeFileTree(root, {
    'README.md': '# readme\n',
    'docs/architecture.md': '# docs\n',
    'package.json': '{}\n',
    '.wizloft/agents.yaml': 'version: 1\n',
    'AGENTS.md': '# agents\n',
    'CLAUDE.md': '# claude\n',
    '.agentkit/config.yaml': 'coding_level: 3\n',
    '.wizloft/PROJECT.md': '# example\n',
    '.wizloft/harness/INSTRUCTIONS.md': '# instructions\n',
  });
  const profile = await createGeneratedProjectProfile({
    repositoryRoot: root,
    projectId: 'example',
  });
  const config = repositoryConfig(profile);
  const mapped = [...config.authority, ...config.context].map((item) => item.path);
  for (const forbidden of FORBIDDEN_INGESTION) {
    assert.equal(mapped.includes(forbidden), false, forbidden);
  }
  const harness = await createHarness({ profile });
  context.after(() => harness.shutdown());
  const resolution = await harness.context.resolve({ subject: 'example:project' });
  const observed = [...resolution.authority, ...resolution.supporting, ...resolution.historical]
    .map((item) => item.provenance.path)
    .filter((value) => value !== undefined);
  for (const forbidden of FORBIDDEN_INGESTION) {
    assert.equal(observed.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(
    resolution.authority.map((item) => item.provenance.path),
    ['.wizloft/PROJECT.md', '.wizloft/harness/INSTRUCTIONS.md'],
  );
});

test('missing overlay is a no-op', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  const profile = await createGeneratedProjectProfile({
    repositoryRoot: root,
    projectId: 'example',
  });
  assert.equal(repositoryConfig(profile).authority.length, 2);
  assert.equal(repositoryConfig(profile).context.length, 2);
});

test('valid overlay Authority and Context append after generated defaults', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  await writeOverlay(
    root,
    `export function createProjectSourceOverlay() {
  return {
    authority: [
      { subject: 'example:decision:foo', path: 'docs/foo.md', precedence: 80 },
    ],
    context: [
      { subject: 'example:project', path: 'docs/foo.md', role: 'authority' },
    ],
  };
}
`,
  );
  const profile = await createGeneratedProjectProfile({
    repositoryRoot: root,
    projectId: 'example',
  });
  assert.deepEqual(
    repositoryConfig(profile).authority.map(
      (item) => `${item.subject}:${item.path}:${item.precedence}`,
    ),
    [
      'example:project:.wizloft/PROJECT.md:100',
      'example:harness:.wizloft/harness/INSTRUCTIONS.md:90',
      'example:decision:foo:docs/foo.md:80',
    ],
  );
  assert.deepEqual(
    repositoryConfig(profile).context.map((item) => `${item.subject}:${item.path}:${item.role}`),
    [
      'example:project:.wizloft/PROJECT.md:authority',
      'example:project:.wizloft/harness/INSTRUCTIONS.md:authority',
      'example:project:docs/foo.md:authority',
    ],
  );
});

test('authority-role Context path backed by generated default Authority succeeds', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  await writeOverlay(
    root,
    `export function createProjectSourceOverlay() {
  return {
    context: [
      { subject: 'example:notes', path: '.wizloft/PROJECT.md', role: 'authority' },
    ],
  };
}
`,
  );
  const profile = await createGeneratedProjectProfile({
    repositoryRoot: root,
    projectId: 'example',
  });
  assert.equal(repositoryConfig(profile).context.at(-1).subject, 'example:notes');
});

async function assertOverlayFails(source, code = 'INVALID_OVERLAY') {
  const root = await tempRepo();
  try {
    await writeOverlay(root, source);
    await assert.rejects(
      () => createGeneratedProjectProfile({ repositoryRoot: root, projectId: 'example' }),
      (error) => error instanceof HarnessProjectError && error.code === code,
    );
  } finally {
    await cleanup(root);
  }
}

test('ungrounded authority-role Context fails bootstrap', async () => {
  await assertOverlayFails(`export function createProjectSourceOverlay() {
  return {
    context: [{ subject: 'example:project', path: 'docs/random.md', role: 'authority' }],
  };
}
`);
});

test('reserved default Authority subject fails', async () => {
  await assertOverlayFails(`export function createProjectSourceOverlay() {
  return {
    authority: [{ subject: 'example:project', path: 'docs/foo.md', precedence: 80 }],
  };
}
`);
});

test('duplicate overlay mapping fails', async () => {
  await assertOverlayFails(`export function createProjectSourceOverlay() {
  return {
    authority: [
      { subject: 'example:decision:foo', path: 'docs/foo.md', precedence: 80 },
      { subject: 'example:decision:foo', path: 'docs/foo.md', precedence: 70 },
    ],
  };
}
`);
});

test('unknown overlay key fails', async () => {
  await assertOverlayFails(`export function createProjectSourceOverlay() {
  return { plugins: [] };
}
`);
});

test('escaping overlay path fails', async () => {
  await assertOverlayFails(`export function createProjectSourceOverlay() {
  return {
    authority: [{ subject: 'example:decision:foo', path: '../secret.md', precedence: 80 }],
  };
}
`);
});

test('arbitrary plugins or capabilities keys fail', async () => {
  await assertOverlayFails(`export function createProjectSourceOverlay() {
  return { authority: [], context: [], capabilities: [] };
}
`);
});

test('Promise overlay result fails bootstrap', async () => {
  await assertOverlayFails(`export function createProjectSourceOverlay() {
  return Promise.resolve({ authority: [], context: [] });
}
`);
});

test('async overlay factory fails bootstrap', async () => {
  await assertOverlayFails(`export async function createProjectSourceOverlay() {
  return { authority: [], context: [] };
}
`);
});

test('health validator is registered as root-required', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  const profile = await createGeneratedProjectProfile({
    repositoryRoot: root,
    projectId: 'example',
  });
  assert.equal(profile.layers[0].config[PROJECT_HEALTH_PLUGIN_NAME].projectId, 'example');
  assert.equal(PROJECT_HEALTH_VALIDATOR_ID, '@wizloft/harness-project:runtime-health');
});

test('health plugin version equals the current package release', () => {
  assert.equal(projectHealthPlugin.version, RELEASE);
});

const OVERLAY_FOO = `export function createProjectSourceOverlay() {
  return {
    authority: [{ subject: 'example:decision:foo', path: 'docs/foo.md', precedence: 80 }],
    context: [{ subject: 'example:project', path: 'docs/foo.md', role: 'authority' }],
  };
}
`;

test('overlay source through an escaping intermediate symlink is INVALID_OVERLAY', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  const outside = await tempRepo();
  context.after(() => cleanup(outside));
  await writeFile(path.join(outside, 'foo.md'), '# outside\n');
  await symlink(outside, path.join(root, 'docs'));
  await writeOverlay(root, OVERLAY_FOO);
  await assert.rejects(
    () => createGeneratedProjectProfile({ repositoryRoot: root, projectId: 'example' }),
    (error) => error instanceof HarnessProjectError && error.code === 'INVALID_OVERLAY',
  );
});

test('missing overlay source under an escaping intermediate symlink is INVALID_OVERLAY', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  const outside = await tempRepo();
  context.after(() => cleanup(outside));
  await symlink(outside, path.join(root, 'docs'));
  await writeOverlay(
    root,
    `export function createProjectSourceOverlay() {
  return {
    authority: [{ subject: 'example:decision:foo', path: 'docs/missing.md', precedence: 80 }],
  };
}
`,
  );
  await assert.rejects(
    () => createGeneratedProjectProfile({ repositoryRoot: root, projectId: 'example' }),
    (error) => error instanceof HarnessProjectError && error.code === 'INVALID_OVERLAY',
  );
});

test('in-root overlay source symlink remains allowed', async (context) => {
  const root = await tempRepo();
  context.after(() => cleanup(root));
  await writeFileTree(root, { 'docs/foo.md': '# foo\n' });
  await symlink(path.join(root, 'docs'), path.join(root, 'docs-link'));
  await writeOverlay(
    root,
    `export function createProjectSourceOverlay() {
  return {
    authority: [{ subject: 'example:decision:foo', path: 'docs-link/foo.md', precedence: 80 }],
    context: [{ subject: 'example:project', path: 'docs-link/foo.md', role: 'authority' }],
  };
}
`,
  );
  const profile = await createGeneratedProjectProfile({
    repositoryRoot: root,
    projectId: 'example',
  });
  assert.equal(repositoryConfig(profile).authority.at(-1).path, 'docs-link/foo.md');
});
