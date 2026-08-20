import { randomBytes } from 'node:crypto';
import { link, mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';

import { fail, HarnessProjectError, isFilesystemErrno, type ProjectErrorCode } from './errors.js';
import type { PlanProjectInitializationOptions } from './options.js';
import {
  AGENTS_PATH,
  assertGitBoundary,
  assertManagedPathSafety,
  assertRoot,
  CLAUDE_PATH,
  GITIGNORE_PATH,
  HARNESS_DIR,
  inspectPath,
  MARKER_PATH,
  PHASE2_WRITABLE_PATHS,
  resolveManagedPath,
  WIZLOFT_DIR,
} from './paths.js';
import {
  type FileOperationKind,
  type PlannedOperation,
  type PreparedFileOperation,
  type PreparedInitializationPlan,
  type PreparedOperation,
  prepareProjectInitialization,
} from './plan.js';

export type AppliedOperationId = {
  readonly kind: PlannedOperation['kind'];
  readonly path: string;
};

export type FilesystemApplyResult = {
  readonly applied: readonly AppliedOperationId[];
  readonly pending: readonly AppliedOperationId[];
};

export type FilesystemApplyHooks = {
  readonly beforeOperation?: (input: {
    readonly index: number;
    readonly operation: PreparedOperation;
  }) => Promise<void> | void;
  readonly beforeRename?: (input: {
    readonly relativePath: string;
    readonly destination: string;
    readonly temporaryPath: string;
  }) => Promise<void> | void;
  readonly afterPublish?: (input: {
    readonly relativePath: string;
    readonly destination: string;
    readonly temporaryPath: string;
  }) => Promise<void> | void;
};

const WRITABLE = new Set<string>(PHASE2_WRITABLE_PATHS);

function operationId(operation: PlannedOperation): AppliedOperationId {
  return Object.freeze({ kind: operation.kind, path: operation.path });
}

function compactId(operation: AppliedOperationId): string {
  return `${operation.kind}:${operation.path}`;
}

function isPreparedFileOperation(operation: PreparedOperation): operation is PreparedFileOperation {
  return operation.kind !== 'install' && operation.path !== MARKER_PATH;
}

function failApply(
  code: ProjectErrorCode,
  message: string,
  context: {
    readonly applied: readonly AppliedOperationId[];
    readonly failed: AppliedOperationId;
    readonly pending: readonly AppliedOperationId[];
  },
  cause?: unknown,
): never {
  fail(
    code,
    message,
    {
      applied: Object.freeze(context.applied.map(compactId)),
      failed: compactId(context.failed),
      pending: Object.freeze(context.pending.map(compactId)),
    },
    cause,
  );
}

function classifyApplyError(error: unknown): { code: ProjectErrorCode; message: string } {
  if (error instanceof HarnessProjectError) {
    return { code: error.code, message: error.message };
  }
  const message = error instanceof Error ? error.message : String(error);
  if (isFilesystemErrno(error)) {
    return { code: 'IO_FAILURE', message };
  }
  return { code: 'INTERNAL_ERROR', message };
}

async function currentFileBytes(root: string, relativePath: string): Promise<string | undefined> {
  const inspection = await inspectPath(root, relativePath);
  if (!inspection.exists) return undefined;
  if (inspection.isSymbolicLink) {
    fail('MANAGED_PATH_SYMLINK', `Managed path must not be a symlink: ${relativePath}`, {
      path: relativePath,
    });
  }
  if (!inspection.isFile) {
    fail('MANAGED_PATH_WRONG_TYPE', `Managed path must be a file: ${relativePath}`, {
      path: relativePath,
    });
  }
  return readFile(inspection.absolutePath, 'utf8');
}

function managedParents(relativePath: string): readonly string[] {
  if (
    relativePath === AGENTS_PATH ||
    relativePath === CLAUDE_PATH ||
    relativePath === GITIGNORE_PATH
  ) {
    return Object.freeze([]);
  }
  if (relativePath.startsWith(`${HARNESS_DIR}/`)) {
    return Object.freeze([WIZLOFT_DIR, HARNESS_DIR]);
  }
  if (relativePath.startsWith(`${WIZLOFT_DIR}/`)) {
    return Object.freeze([WIZLOFT_DIR]);
  }
  return Object.freeze([]);
}

async function assertManagedParentsAreDirectories(
  root: string,
  relativePath: string,
): Promise<void> {
  for (const parent of managedParents(relativePath)) {
    const inspection = await inspectPath(root, parent);
    if (!inspection.exists) {
      fail('STALE_PLAN', `Managed parent directory disappeared: ${parent}`, { path: parent });
    }
    if (inspection.isSymbolicLink) {
      fail('MANAGED_PATH_SYMLINK', `Managed path must not be a symlink: ${parent}`, {
        path: parent,
      });
    }
    if (!inspection.isDirectory) {
      fail('MANAGED_PATH_WRONG_TYPE', `Managed path must be a directory: ${parent}`, {
        path: parent,
      });
    }
  }
}

async function ensureManagedDirectory(root: string, relativePath: string): Promise<void> {
  const inspection = await inspectPath(root, relativePath);
  if (!inspection.exists) {
    await mkdir(inspection.absolutePath);
    const created = await inspectPath(root, relativePath);
    if (!created.exists || created.isSymbolicLink || !created.isDirectory) {
      fail('STALE_PLAN', `Managed directory was not created as a real directory: ${relativePath}`, {
        path: relativePath,
      });
    }
    return;
  }
  if (inspection.isSymbolicLink) {
    fail('MANAGED_PATH_SYMLINK', `Managed path must not be a symlink: ${relativePath}`, {
      path: relativePath,
    });
  }
  if (!inspection.isDirectory) {
    fail('MANAGED_PATH_WRONG_TYPE', `Managed path must be a directory: ${relativePath}`, {
      path: relativePath,
    });
  }
}

async function ensureParentDirectories(root: string, relativePath: string): Promise<void> {
  for (const parent of managedParents(relativePath)) {
    await ensureManagedDirectory(root, parent);
  }
}

function assertExpectedState(
  relativePath: string,
  expected: string | undefined,
  actual: string | undefined,
): void {
  if (expected === undefined) {
    if (actual !== undefined) {
      fail(
        'STALE_PLAN',
        `Refusing to create ${relativePath}; destination appeared after planning`,
        { path: relativePath },
      );
    }
    return;
  }
  if (actual === undefined) {
    fail(
      'STALE_PLAN',
      `Refusing to replace ${relativePath}; destination disappeared after planning`,
      { path: relativePath },
    );
  }
  if (actual !== expected) {
    fail(
      'STALE_PLAN',
      `Refusing to overwrite ${relativePath}; current bytes differ from the planned snapshot`,
      { path: relativePath },
    );
  }
}

async function writeAtomicFile(
  root: string,
  relativePath: string,
  contents: string,
  kind: FileOperationKind,
  expected: string | undefined,
  hooks: FilesystemApplyHooks | undefined,
): Promise<void> {
  await ensureParentDirectories(root, relativePath);
  await assertManagedParentsAreDirectories(root, relativePath);
  const destination = resolveManagedPath(root, relativePath);
  const inspection = await inspectPath(root, relativePath);
  if (inspection.exists && inspection.isSymbolicLink) {
    fail('MANAGED_PATH_SYMLINK', `Managed path must not be a symlink: ${relativePath}`, {
      path: relativePath,
    });
  }
  const directory = path.dirname(destination);
  const temporaryPath = path.join(
    directory,
    `.wizloft-harness-${randomBytes(16).toString('hex')}.tmp`,
  );
  const tempRelative = path.relative(root, temporaryPath);
  if (tempRelative.startsWith('..') || path.isAbsolute(tempRelative)) {
    fail('MANAGED_PATH_OUTSIDE_ROOT', 'Temporary write path escaped the repository root', {
      path: relativePath,
    });
  }

  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(temporaryPath, 'wx');
    await handle.writeFile(contents, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    if (hooks?.beforeRename !== undefined) {
      await hooks.beforeRename({ relativePath, destination, temporaryPath });
    }
    await assertManagedParentsAreDirectories(root, relativePath);
    if (kind === 'create') {
      const beforePublish = await inspectPath(root, relativePath);
      if (beforePublish.exists && beforePublish.isSymbolicLink) {
        fail('MANAGED_PATH_SYMLINK', `Managed path must not be a symlink: ${relativePath}`, {
          path: relativePath,
        });
      }
      if (beforePublish.exists && !beforePublish.isFile) {
        fail('MANAGED_PATH_WRONG_TYPE', `Managed path must be a file: ${relativePath}`, {
          path: relativePath,
        });
      }
      try {
        await link(temporaryPath, destination);
      } catch (error) {
        if (isFilesystemErrno(error) && error.code === 'EEXIST') {
          fail(
            'STALE_PLAN',
            `Refusing to create ${relativePath}; destination appeared after planning`,
            { path: relativePath },
          );
        }
        throw error;
      }
      // Successful link is the CREATE commit point. unlink(temp) is best-effort
      // cleanup and must not fail, roll back, or un-apply the published destination.
      try {
        if (hooks?.afterPublish !== undefined) {
          await hooks.afterPublish({ relativePath, destination, temporaryPath });
        }
        await unlink(temporaryPath);
      } catch {
        // Orphan `.wizloft-harness-*.tmp` hardlink may remain.
      }
      return;
    }

    const latestBytes = await currentFileBytes(root, relativePath);
    assertExpectedState(relativePath, expected, latestBytes);
    await rename(temporaryPath, destination);
  } catch (error) {
    if (handle !== undefined) {
      await handle.close().catch(() => undefined);
    }
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function applyFileOperation(
  root: string,
  operation: PreparedFileOperation,
  hooks: FilesystemApplyHooks | undefined,
): Promise<void> {
  if (operation.path === MARKER_PATH || !WRITABLE.has(operation.path)) {
    fail('APPLY_FORBIDDEN', `Phase 2 cannot write ${operation.path}`, {
      path: operation.path,
    });
  }
  await assertManagedPathSafety(root, operation.path);
  const actual = await currentFileBytes(root, operation.path);
  assertExpectedState(operation.path, operation.expected, actual);
  if (operation.kind === 'create' && actual !== undefined) {
    fail('STALE_PLAN', `Refusing to create ${operation.path}; destination already exists`, {
      path: operation.path,
    });
  }
  if (operation.kind !== 'create' && actual === undefined) {
    fail('STALE_PLAN', `Refusing to mutate ${operation.path}; destination is absent`, {
      path: operation.path,
    });
  }
  await writeAtomicFile(
    root,
    operation.path,
    operation.contents,
    operation.kind,
    operation.expected,
    hooks,
  );
}

export async function applyProjectFilesystemPlan(
  plan: PreparedInitializationPlan,
  hooks: FilesystemApplyHooks = {},
): Promise<FilesystemApplyResult> {
  if (plan === null || typeof plan !== 'object' || typeof plan.root !== 'string') {
    fail('INVALID_ARGV', 'Filesystem apply requires an initialization plan with a root');
  }
  await assertRoot(plan.root);
  await assertGitBoundary(plan.root);

  const applied: AppliedOperationId[] = [];
  for (const [index, operation] of plan.operations.entries()) {
    if (!isPreparedFileOperation(operation)) continue;
    try {
      if (hooks.beforeOperation !== undefined) {
        await hooks.beforeOperation({ index, operation });
      }
      await applyFileOperation(plan.root, operation, hooks);
      applied.push(operationId(operation));
    } catch (error) {
      const pending = plan.operations
        .slice(index + 1)
        .filter(
          (candidate) =>
            !applied.some((item) => item.path === candidate.path && item.kind === candidate.kind),
        )
        .map(operationId);
      const skipped = plan.operations
        .filter(
          (candidate, candidateIndex) =>
            candidateIndex !== index &&
            !applied.some((item) => item.path === candidate.path && item.kind === candidate.kind) &&
            !pending.some((item) => item.path === candidate.path && item.kind === candidate.kind),
        )
        .map(operationId);
      const classified = classifyApplyError(error);
      const preserved =
        classified.code === 'STALE_PLAN' ||
        classified.code === 'MANAGED_PATH_SYMLINK' ||
        classified.code === 'MANAGED_PATH_WRONG_TYPE' ||
        classified.code === 'MANAGED_PATH_OUTSIDE_ROOT' ||
        classified.code === 'IO_FAILURE' ||
        classified.code === 'APPLY_FORBIDDEN';
      failApply(
        preserved ? classified.code : 'INTERNAL_ERROR',
        classified.message,
        {
          applied: Object.freeze(applied),
          failed: operationId(operation),
          pending: Object.freeze([...skipped, ...pending]),
        },
        error,
      );
    }
  }

  const pending = Object.freeze(
    plan.operations
      .filter(
        (operation) =>
          !applied.some((item) => item.kind === operation.kind && item.path === operation.path),
      )
      .map(operationId),
  );
  return Object.freeze({
    applied: Object.freeze(applied),
    pending,
  });
}

export async function applyProjectFilesystem(
  options: PlanProjectInitializationOptions,
  hooks: FilesystemApplyHooks = {},
): Promise<FilesystemApplyResult> {
  const plan = await prepareProjectInitialization(options);
  return applyProjectFilesystemPlan(plan, hooks);
}
