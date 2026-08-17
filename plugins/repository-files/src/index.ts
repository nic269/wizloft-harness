import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, posix, relative, resolve, sep, win32 } from 'node:path';

import {
  AUTHORITY_CAPABILITY,
  type AuthorityCandidate,
  type AuthorityContributor,
} from '@wizloft/harness-authority';
import {
  CONTEXT_CAPABILITY,
  type ContextContributor,
  type ContextItem,
  type ContextRole,
} from '@wizloft/harness-context';
import { type Disposer, requireCapability, type WizloftPlugin } from '@wizloft/harness-kernel';

export const REPOSITORY_FILES_PLUGIN_NAME = '@wizloft/repository-files';
export const REPOSITORY_AUTHORITY_CONTRIBUTOR_ID = '@wizloft/repository-files:authority';
export const REPOSITORY_CONTEXT_CONTRIBUTOR_ID = '@wizloft/repository-files:context';

export type RepositoryAuthoritySourceConfig = {
  readonly path: string;
  readonly precedence: number;
  readonly resolutionKey?: string;
  readonly subject: string;
};

export type RepositoryContextSourceConfig = {
  readonly path: string;
  readonly role: ContextRole;
  readonly subject: string;
};

export type RepositoryFilesConfig = {
  readonly authority?: readonly RepositoryAuthoritySourceConfig[];
  readonly context?: readonly RepositoryContextSourceConfig[];
  readonly root: string;
};

export type RepositoryFilesErrorCode =
  | 'INVALID_REPOSITORY_FILES_CONFIG'
  | 'REPOSITORY_PATH_OUTSIDE_ROOT'
  | 'REPOSITORY_SOURCE_READ_FAILED';

export class RepositoryFilesError extends Error {
  readonly code: RepositoryFilesErrorCode;
  readonly sourcePath?: string;

  constructor(
    code: RepositoryFilesErrorCode,
    message: string,
    sourcePath?: string,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'RepositoryFilesError';
    this.code = code;
    if (sourcePath !== undefined) this.sourcePath = sourcePath;
  }
}

interface NormalizedAuthoritySource {
  readonly path: string;
  readonly precedence: number;
  readonly resolutionKey?: string;
  readonly subject: string;
}

interface NormalizedContextSource {
  readonly path: string;
  readonly role: ContextRole;
  readonly subject: string;
}

interface NormalizedConfig {
  readonly authority: readonly NormalizedAuthoritySource[];
  readonly context: readonly NormalizedContextSource[];
  readonly root: string;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function configError(message: string, sourcePath?: string): never {
  throw new RepositoryFilesError('INVALID_REPOSITORY_FILES_CONFIG', message, sourcePath);
}

export function normalizeRepositorySourcePath(sourcePath: string): string {
  if (!nonEmptyString(sourcePath) || sourcePath.includes('\0')) {
    return configError('Repository source paths must be non-empty root-relative paths', sourcePath);
  }
  if (
    posix.isAbsolute(sourcePath) ||
    win32.isAbsolute(sourcePath) ||
    /^[A-Za-z]:/u.test(sourcePath)
  ) {
    throw new RepositoryFilesError(
      'REPOSITORY_PATH_OUTSIDE_ROOT',
      `Repository source path must be root-relative: ${sourcePath}`,
      sourcePath,
    );
  }

  const normalized = posix.normalize(sourcePath.replaceAll('\\', '/'));
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    throw new RepositoryFilesError(
      'REPOSITORY_PATH_OUTSIDE_ROOT',
      `Repository source path escapes the configured root: ${sourcePath}`,
      sourcePath,
    );
  }
  return normalized;
}

function normalizeAuthoritySources(value: unknown): readonly NormalizedAuthoritySource[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value))
    return configError('repository-files config.authority must be an array');

  return Object.freeze(
    value.map((entry, index) => {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        return configError(`repository-files config.authority[${index}] must be an object`);
      }
      const source = entry as Partial<RepositoryAuthoritySourceConfig>;
      if (
        !nonEmptyString(source.subject) ||
        !nonEmptyString(source.path) ||
        typeof source.precedence !== 'number' ||
        !Number.isFinite(source.precedence) ||
        (source.resolutionKey !== undefined && !nonEmptyString(source.resolutionKey))
      ) {
        return configError(`repository-files config.authority[${index}] is invalid`);
      }
      return Object.freeze({
        subject: source.subject,
        path: normalizeRepositorySourcePath(source.path),
        precedence: source.precedence,
        ...(source.resolutionKey === undefined ? {} : { resolutionKey: source.resolutionKey }),
      });
    }),
  );
}

function normalizeContextSources(value: unknown): readonly NormalizedContextSource[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) return configError('repository-files config.context must be an array');

  return Object.freeze(
    value.map((entry, index) => {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        return configError(`repository-files config.context[${index}] must be an object`);
      }
      const source = entry as Partial<RepositoryContextSourceConfig>;
      if (
        !nonEmptyString(source.subject) ||
        !nonEmptyString(source.path) ||
        !['authority', 'supporting', 'historical'].includes(source.role ?? '')
      ) {
        return configError(`repository-files config.context[${index}] is invalid`);
      }
      return Object.freeze({
        subject: source.subject,
        path: normalizeRepositorySourcePath(source.path),
        role: source.role as ContextRole,
      });
    }),
  );
}

function normalizeConfig(value: unknown): NormalizedConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return configError('repository-files config must be an object');
  }
  const config = value as Partial<RepositoryFilesConfig>;
  if (!nonEmptyString(config.root)) {
    return configError('repository-files config.root must be a non-empty path');
  }
  return Object.freeze({
    root: config.root,
    authority: normalizeAuthoritySources(config.authority),
    context: normalizeContextSources(config.context),
  });
}

async function canonicalRepositoryRoot(configuredRoot: string): Promise<string> {
  try {
    const root = await realpath(resolve(configuredRoot));
    if (!(await stat(root)).isDirectory()) {
      return configError('repository-files config.root must resolve to a directory');
    }
    return root;
  } catch (error) {
    if (error instanceof RepositoryFilesError) throw error;
    throw new RepositoryFilesError(
      'INVALID_REPOSITORY_FILES_CONFIG',
      `Cannot resolve repository root: ${configuredRoot}`,
      undefined,
      error,
    );
  }
}

function escapesRoot(root: string, target: string): boolean {
  const fromRoot = relative(root, target);
  return fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot);
}

async function readRepositoryFile(root: string, sourcePath: string): Promise<string> {
  const unresolvedPath = resolve(root, ...sourcePath.split('/'));
  let canonicalPath: string;
  try {
    canonicalPath = await realpath(unresolvedPath);
  } catch (error) {
    throw new RepositoryFilesError(
      'REPOSITORY_SOURCE_READ_FAILED',
      `Cannot resolve repository source: ${sourcePath}`,
      sourcePath,
      error,
    );
  }

  if (escapesRoot(root, canonicalPath)) {
    throw new RepositoryFilesError(
      'REPOSITORY_PATH_OUTSIDE_ROOT',
      `Repository source resolves outside the configured root: ${sourcePath}`,
      sourcePath,
    );
  }

  try {
    return await readFile(canonicalPath, 'utf8');
  } catch (error) {
    throw new RepositoryFilesError(
      'REPOSITORY_SOURCE_READ_FAILED',
      `Cannot read repository source: ${sourcePath}`,
      sourcePath,
      error,
    );
  }
}

function authorityContributor(
  root: string,
  sources: readonly NormalizedAuthoritySource[],
): AuthorityContributor {
  return {
    id: REPOSITORY_AUTHORITY_CONTRIBUTOR_ID,
    async contribute(request) {
      const matches = sources.filter(({ subject }) => subject === request.subject);
      const candidates: AuthorityCandidate[] = [];
      for (const [index, source] of matches.entries()) {
        candidates.push(
          Object.freeze({
            id: `repository-authority:${request.subject}:${source.path}:${index}`,
            content: await readRepositoryFile(root, source.path),
            precedence: source.precedence,
            provenance: Object.freeze({
              contributorId: REPOSITORY_AUTHORITY_CONTRIBUTOR_ID,
              sourceId: `repository-file:${source.path}`,
              sourceType: 'repository-file',
              path: source.path,
            }),
            ...(source.resolutionKey === undefined ? {} : { resolutionKey: source.resolutionKey }),
          }),
        );
      }
      return Object.freeze(candidates);
    },
  };
}

function contextContributor(
  root: string,
  sources: readonly NormalizedContextSource[],
): ContextContributor {
  return {
    id: REPOSITORY_CONTEXT_CONTRIBUTOR_ID,
    async contribute(request) {
      const matches = sources.filter(({ subject }) => subject === request.subject);
      const items: ContextItem[] = [];
      for (const [index, source] of matches.entries()) {
        items.push(
          Object.freeze({
            id: `repository-context:${request.subject}:${source.role}:${source.path}:${index}`,
            content: await readRepositoryFile(root, source.path),
            provenance: Object.freeze({
              contributorId: REPOSITORY_CONTEXT_CONTRIBUTOR_ID,
              sourceId: `repository-file:${source.path}`,
              sourceType: 'repository-file',
              path: source.path,
            }),
            role: source.role,
          }),
        );
      }
      return Object.freeze(items);
    },
  };
}

export const repositoryFilesPlugin: WizloftPlugin<RepositoryFilesConfig> = {
  name: REPOSITORY_FILES_PLUGIN_NAME,
  version: '0.1.0-alpha.1',
  requires: [requireCapability(AUTHORITY_CAPABILITY), requireCapability(CONTEXT_CAPABILITY)],
  async setup(context) {
    const config = normalizeConfig(context.config);
    const root = await canonicalRepositoryRoot(config.root);
    const authority = context.capabilities.get(AUTHORITY_CAPABILITY);
    const contextService = context.capabilities.get(CONTEXT_CAPABILITY);
    const disposeAuthority = authority.registerContributor(
      authorityContributor(root, config.authority),
    );
    let disposeContext: Disposer;
    try {
      disposeContext = contextService.registerContributor(contextContributor(root, config.context));
    } catch (error) {
      await disposeAuthority();
      throw error;
    }

    return async (): Promise<void> => {
      await disposeContext();
      await disposeAuthority();
    };
  },
};
