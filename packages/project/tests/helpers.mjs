import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderManagedBlock } from '../dist/managed-blocks.js';
import { currentPackageRelease } from '../dist/plan.js';
import {
  adapterInterior,
  gitignoreInterior,
  instructionsContents,
  isolatedManifestContents,
  markerContents,
  profileContents,
  projectTruthContents,
  runnerContents,
} from '../dist/templates.js';

export const RELEASE = currentPackageRelease();

export async function tempRepo(prefix = 'wizloft-harness-project-') {
  return mkdtemp(path.join(tmpdir(), prefix));
}

export function gitInit(root) {
  execFileSync('git', ['init', '--quiet'], { cwd: root, stdio: 'ignore' });
}

export async function writeFileTree(root, files) {
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, contents);
  }
}

export function adapterFile(projectId) {
  return renderManagedBlock('markdown', adapterInterior(projectId), '\n');
}

export function gitignoreFile() {
  return renderManagedBlock('gitignore', gitignoreInterior(), '\n');
}

export function stubLockfile() {
  return `${JSON.stringify(
    {
      name: 'wizloft-harness-project-tooling',
      lockfileVersion: 3,
      requires: true,
      packages: {},
    },
    undefined,
    2,
  )}\n`;
}

export async function writeTrackedContract(
  root,
  { projectId = 'example', release = RELEASE, adapters = ['agents', 'claude'] } = {},
) {
  const files = {
    '.wizloft/harness/INSTRUCTIONS.md': instructionsContents(projectId),
    '.wizloft/harness/profile.mjs': profileContents(),
    '.wizloft/harness/run.mjs': runnerContents(),
    '.wizloft/harness/package.json': isolatedManifestContents(release),
    '.wizloft/harness/package-lock.json': stubLockfile(),
    '.wizloft/harness/project.json': markerContents({ projectId, release, adapters }),
    '.wizloft/PROJECT.md': projectTruthContents(projectId),
    '.gitignore': gitignoreFile(),
  };
  if (adapters.includes('agents')) files['AGENTS.md'] = adapterFile(projectId);
  if (adapters.includes('claude')) files['CLAUDE.md'] = adapterFile(projectId);
  await writeFileTree(root, files);
}

export async function writeLocalPackage(root, version = RELEASE) {
  await writeFileTree(root, {
    '.wizloft/harness/node_modules/@wizloft/harness-project/package.json': `${JSON.stringify(
      { name: '@wizloft/harness-project', version },
      undefined,
      2,
    )}\n`,
  });
}

export async function writeIsolatedRuntimePackage(root, version = RELEASE) {
  const workspaceEntry = fileURLToPath(new URL('../dist/index.js', import.meta.url));
  await writeFileTree(root, {
    '.wizloft/harness/node_modules/@wizloft/harness-project/package.json': `${JSON.stringify(
      {
        name: '@wizloft/harness-project',
        version,
        type: 'module',
        exports: { '.': { import: './dist/index.js' } },
      },
      undefined,
      2,
    )}\n`,
    '.wizloft/harness/node_modules/@wizloft/harness-project/dist/index.js': `export * from ${JSON.stringify(
      pathToFileURL(workspaceEntry).href,
    )};\n`,
  });
}

export function collectStream() {
  let text = '';
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      text += String(chunk);
      callback();
    },
  });
  return {
    stream,
    text() {
      return text;
    },
  };
}

export function failingStream(message = 'injected stream write failure') {
  const stream = new Writable({
    write(_chunk, _encoding, callback) {
      callback(new Error(message));
    },
  });
  stream.on('error', () => undefined);
  return stream;
}

export async function snapshot(root) {
  const entries = [];

  async function walk(relativePath) {
    const absolutePath = relativePath ? path.join(root, relativePath) : root;
    const items = await readdir(absolutePath, { withFileTypes: true });
    items.sort((left, right) => left.name.localeCompare(right.name));
    for (const item of items) {
      const child = relativePath ? `${relativePath}/${item.name}` : item.name;
      if (item.isDirectory()) {
        entries.push(`dir:${child}`);
        await walk(child);
      } else if (item.isSymbolicLink()) {
        entries.push(`symlink:${child}`);
      } else {
        const contents = await readFile(path.join(root, child));
        entries.push(`file:${child}:${contents.toString('base64')}`);
      }
    }
  }

  await walk('');
  return entries.join('\n');
}

export function operationList(plan) {
  return plan.operations.map((operation) => `${operation.kind}:${operation.path}`);
}

export function simulateIsolatedInstall({
  fail = false,
  skipLockfile = false,
  skipPackage = false,
  version = RELEASE,
  after,
} = {}) {
  const calls = [];
  return {
    calls,
    async installRuntime({ root, method }) {
      calls.push(method);
      if (typeof after === 'function') await after(root, method);
      if (fail) {
        const error = new Error('injected isolated npm failure');
        error.code = 1;
        throw error;
      }
      if (!skipLockfile) {
        const lockPath = path.join(root, '.wizloft/harness/package-lock.json');
        try {
          await readFile(lockPath);
        } catch {
          await writeFileTree(root, { '.wizloft/harness/package-lock.json': stubLockfile() });
        }
      }
      if (!skipPackage) await writeIsolatedRuntimePackage(root, version);
    },
  };
}

export async function cleanup(root) {
  await rm(root, { force: true, recursive: true });
}
