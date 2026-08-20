import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { fail } from './errors.js';
import type { AdapterId } from './paths.js';

export type { AdapterId };

import { assertProjectId } from './project-id.js';

export type PlanProjectInitializationOptions = {
  readonly root: string;
  readonly projectId: string;
  readonly adapters?: readonly AdapterId[];
  readonly cwd?: string;
  readonly nodeVersion?: string;
};

export type NormalizedInitOptions = {
  readonly root: string;
  readonly cwd: string;
  readonly projectId: string;
  readonly adapters: readonly AdapterId[];
  readonly nodeVersion: string;
  readonly targetRelease: string;
};

export function packageRelease(): string {
  const manifestPath = fileURLToPath(new URL('../package.json', import.meta.url));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { version?: unknown };
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    fail('INTERNAL_ERROR', 'harness-project package.json is missing a version');
  }
  return manifest.version;
}

export function defaultAdapters(): readonly AdapterId[] {
  return Object.freeze(['agents', 'claude']);
}

export function normalizeAdapters(adapters: unknown): readonly AdapterId[] {
  if (adapters === undefined) return defaultAdapters();
  if (!Array.isArray(adapters)) {
    fail('INVALID_ARGV', 'adapters must be an array of agents and/or claude');
  }
  const unique: AdapterId[] = [];
  for (const adapter of adapters) {
    if (adapter !== 'agents' && adapter !== 'claude') {
      fail(
        'INVALID_ARGV',
        `Unknown adapter: ${typeof adapter === 'string' ? adapter : typeof adapter}`,
      );
    }
    if (unique.includes(adapter)) {
      fail('INVALID_ARGV', `Duplicate adapter: ${adapter}`);
    }
    unique.push(adapter);
  }
  unique.sort((left, right) => {
    if (left === right) return 0;
    return left === 'agents' ? -1 : 1;
  });
  return Object.freeze(unique);
}

export function parseAdapterArgument(value: string): readonly AdapterId[] {
  if (value === 'none') return Object.freeze([]);
  const tokens = value
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
  if (tokens.length === 0) {
    fail('INVALID_ARGV', '--adapters requires agents, claude, or none');
  }
  if (tokens.includes('none')) {
    fail('INVALID_ARGV', '--adapters none cannot be combined with other tokens');
  }
  return normalizeAdapters(tokens);
}

export function normalizeInitOptions(
  options: PlanProjectInitializationOptions,
): Omit<NormalizedInitOptions, 'root'> & { readonly requestedRoot: string } {
  if (options === null || typeof options !== 'object') {
    fail('INVALID_ARGV', 'Initialization options must be an object');
  }
  if (options.cwd !== undefined && typeof options.cwd !== 'string') {
    fail('INVALID_ARGV', 'cwd must be a string');
  }
  if (options.nodeVersion !== undefined && typeof options.nodeVersion !== 'string') {
    fail('INVALID_ARGV', 'nodeVersion must be a string');
  }
  if (typeof options.root !== 'string') {
    fail('INVALID_ARGV', '--root is required');
  }
  const cwd = options.cwd ?? process.cwd();
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  return Object.freeze({
    requestedRoot: options.root,
    cwd,
    projectId: assertProjectId(options.projectId),
    adapters: normalizeAdapters(options.adapters),
    nodeVersion,
    targetRelease: packageRelease(),
  });
}

export function adapterPath(adapter: AdapterId): string {
  return adapter === 'agents' ? 'AGENTS.md' : 'CLAUDE.md';
}

export function commandArgv(): readonly string[] {
  return Object.freeze(['node', '.wizloft/harness/run.mjs']);
}

export function subjectsFor(projectId: string): {
  readonly project: string;
  readonly harness: string;
} {
  return Object.freeze({
    project: `${projectId}:project`,
    harness: `${projectId}:harness`,
  });
}
