import { readFile } from 'node:fs/promises';

import {
  applyProjectFilesystemPlan,
  type FilesystemApplyHooks,
  publishProjectMarker,
} from './apply.js';
import { fail, HarnessProjectError, type ProjectErrorCode } from './errors.js';
import { assertLocalProjectRuntime } from './identity.js';
import type { RepositoryState } from './inspect.js';
import { executeIsolatedNpmInstall, type IsolatedInstaller } from './install.js';
import { parseProjectMarker } from './marker.js';
import type { PlanProjectInitializationOptions } from './options.js';
import { ISOLATED_LOCKFILE_PATH, inspectPath, MARKER_PATH } from './paths.js';
import {
  type InstallMethod,
  type PlannedOperation,
  type PreparedFileOperation,
  type PreparedInitializationPlan,
  type PreparedInstallOperation,
  type PreparedOperation,
  prepareProjectInitialization,
} from './plan.js';

export type AppliedOperation = {
  readonly kind: PlannedOperation['kind'];
  readonly method?: InstallMethod;
  readonly path: string;
};

export type InitializationResult = {
  readonly applied: readonly AppliedOperation[];
  readonly finalState: RepositoryState;
  readonly initialState: RepositoryState;
  readonly projectId: string;
  readonly root: string;
};

export type InitializationRuntime = {
  readonly installRuntime?: IsolatedInstaller;
  readonly markerHooks?: FilesystemApplyHooks;
};

const DEFAULT_INITIALIZATION_RUNTIME: InitializationRuntime = Object.freeze({});

function compactId(operation: AppliedOperation): string {
  return `${operation.kind}:${operation.path}`;
}

function fileId(operation: PreparedFileOperation): AppliedOperation {
  return Object.freeze({ kind: operation.kind, path: operation.path });
}

function installId(operation: PreparedInstallOperation): AppliedOperation {
  return Object.freeze({
    kind: operation.kind,
    path: operation.path,
    method: operation.method,
  });
}

function isMarkerOperation(operation: PreparedOperation): operation is PreparedFileOperation {
  return operation.kind !== 'install' && operation.path === MARKER_PATH;
}

function isInstallOperation(operation: PreparedOperation): operation is PreparedInstallOperation {
  return operation.kind === 'install';
}

function failInitialize(
  code: ProjectErrorCode,
  message: string,
  context: {
    readonly applied: readonly AppliedOperation[];
    readonly failed: AppliedOperation;
    readonly pending: readonly AppliedOperation[];
  },
  extra?: { readonly method?: InstallMethod; readonly exitCode?: number },
  cause?: unknown,
): never {
  fail(
    code,
    message,
    {
      applied: Object.freeze(context.applied.map(compactId)),
      failed: compactId(context.failed),
      pending: Object.freeze(context.pending.map(compactId)),
      ...(extra?.method === undefined ? {} : { method: extra.method }),
      path: context.failed.path,
      ...(extra?.exitCode === undefined ? {} : { exitCode: extra.exitCode }),
    },
    cause,
  );
}

function pendingAfter(
  plan: PreparedInitializationPlan,
  applied: readonly AppliedOperation[],
  failed?: AppliedOperation,
): readonly AppliedOperation[] {
  return Object.freeze(
    plan.operations
      .filter((operation) => {
        const id = operation.kind === 'install' ? installId(operation) : fileId(operation);
        if (applied.some((item) => item.kind === id.kind && item.path === id.path)) return false;
        if (failed !== undefined && failed.kind === id.kind && failed.path === id.path)
          return false;
        return true;
      })
      .map((operation) =>
        operation.kind === 'install' ? installId(operation) : fileId(operation),
      ),
  );
}

async function proveIsolatedLockfile(root: string): Promise<void> {
  const inspection = await inspectPath(root, ISOLATED_LOCKFILE_PATH);
  if (!inspection.exists || inspection.isSymbolicLink || !inspection.isFile) {
    fail('LOCAL_RUNTIME_INVALID', 'Isolated package-lock.json is missing or unsafe', {
      path: ISOLATED_LOCKFILE_PATH,
    });
  }
}

async function proveLocalMaterialization(root: string, targetRelease: string): Promise<void> {
  await proveIsolatedLockfile(root);
  await assertLocalProjectRuntime(root, targetRelease);
}

function operationShape(operation: PreparedOperation): string {
  return `${operation.kind}:${operation.path}`;
}

function certificationDrift(message: string): never {
  fail('STALE_PLAN', message);
}

function certifyPostMaterialization(
  initial: PreparedInitializationPlan,
  cert: PreparedInitializationPlan,
): PreparedFileOperation | undefined {
  const shapes = cert.operations.map(operationShape);
  const marker = cert.operations.find(isMarkerOperation);

  if (initial.state === 'current') {
    if (cert.state !== 'current' || shapes.length !== 0) {
      certificationDrift('Current project changed during runtime proof');
    }
    return undefined;
  }

  if (initial.state === 'reconciliation-needed') {
    const current = cert.state === 'current' && shapes.length === 0;
    const markerOnly =
      cert.state === 'reconciliation-needed' &&
      shapes.length === 1 &&
      marker !== undefined &&
      (marker.kind === 'create' || marker.kind === 'replace');
    if (!current && !markerOnly) {
      certificationDrift(`Reconciliation certification drifted: ${shapes.join(', ')}`);
    }
    return markerOnly ? marker : undefined;
  }

  if (initial.state === 'needs-local-materialization') {
    const current = cert.state === 'current' && shapes.length === 0;
    const markerOnly =
      cert.state === 'reconciliation-needed' &&
      shapes.length === 1 &&
      marker?.kind === 'replace' &&
      cert.operations[0] === marker;
    if (!current && !markerOnly) {
      certificationDrift(`Clone materialization certification drifted: ${shapes.join(', ')}`);
    }
    return markerOnly ? marker : undefined;
  }

  const install = cert.operations.find(isInstallOperation);
  const expectedMarkerKind = initial.state === 'upgrade-in-progress' ? 'replace' : 'create';
  const expectedState =
    initial.state === 'upgrade-in-progress' ? 'upgrade-in-progress' : 'partial-first-init';
  if (
    cert.state !== expectedState ||
    shapes.length !== 2 ||
    install?.method !== 'install' ||
    marker?.kind !== expectedMarkerKind ||
    cert.operations[0] !== install ||
    cert.operations[1] !== marker
  ) {
    certificationDrift(`Initialization certification drifted: ${shapes.join(', ')}`);
  }
  return marker;
}

function failCertification(
  error: unknown,
  initial: PreparedInitializationPlan,
  applied: readonly AppliedOperation[],
): never {
  const code = error instanceof HarnessProjectError ? error.code : 'STALE_PLAN';
  const message = error instanceof Error ? error.message : String(error);
  fail(
    code,
    message,
    {
      ...(error instanceof HarnessProjectError ? error.details : {}),
      applied: Object.freeze(applied.map(compactId)),
      failed: 'certify:.wizloft/harness',
      pending: Object.freeze(pendingAfter(initial, applied).map(compactId)),
    },
    error,
  );
}

function failRuntimeProof(
  error: unknown,
  initial: PreparedInitializationPlan,
  applied: readonly AppliedOperation[],
): never {
  const classified = error instanceof HarnessProjectError ? error.code : 'LOCAL_RUNTIME_INVALID';
  const code =
    classified === 'LOCAL_RUNTIME_INVALID' ||
    classified === 'MANAGED_PATH_SYMLINK' ||
    classified === 'MANAGED_PATH_WRONG_TYPE'
      ? classified
      : 'LOCAL_RUNTIME_INVALID';
  const message = error instanceof Error ? error.message : String(error);
  fail(
    code,
    message,
    {
      ...(error instanceof HarnessProjectError ? error.details : {}),
      applied: Object.freeze(applied.map(compactId)),
      failed: 'prove:.wizloft/harness',
      pending: Object.freeze(pendingAfter(initial, applied).map(compactId)),
    },
    error,
  );
}

async function confirmPublishedMarker(root: string): Promise<void> {
  const inspection = await inspectPath(root, MARKER_PATH);
  if (!inspection.exists || inspection.isSymbolicLink || !inspection.isFile) {
    fail('INTERNAL_ERROR', 'Published sentinel is missing or unsafe', { path: MARKER_PATH });
  }
  const parsed = parseProjectMarker(await readFile(inspection.absolutePath, 'utf8'));
  if (parsed.status !== 'valid') {
    fail(
      'INTERNAL_ERROR',
      parsed.status === 'invalid' ? parsed.reason : 'Published sentinel is invalid',
      { path: MARKER_PATH },
    );
  }
}

export async function applyProjectInitializationWithRuntime(
  options: PlanProjectInitializationOptions,
  runtime: InitializationRuntime,
): Promise<InitializationResult> {
  const initial = await prepareProjectInitialization(options);
  const applied: AppliedOperation[] = [];
  const installer = runtime.installRuntime ?? executeIsolatedNpmInstall;

  const filesystem = await applyProjectFilesystemPlan(initial);
  applied.push(...filesystem.applied);

  const plannedInstall = initial.operations.find(isInstallOperation);
  if (plannedInstall !== undefined) {
    try {
      await installer({ root: initial.root, method: plannedInstall.method });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const exitCode =
        error instanceof HarnessProjectError && typeof error.details?.exitCode === 'number'
          ? error.details.exitCode
          : undefined;
      failInitialize(
        'INSTALL_FAILED',
        error instanceof HarnessProjectError ? error.message : message,
        {
          applied: Object.freeze([...applied]),
          failed: installId(plannedInstall),
          pending: pendingAfter(initial, applied, installId(plannedInstall)),
        },
        {
          method: plannedInstall.method,
          ...(exitCode === undefined ? {} : { exitCode }),
        },
        error,
      );
    }
    try {
      await proveLocalMaterialization(initial.root, initial.targetRelease);
    } catch (error) {
      const classified =
        error instanceof HarnessProjectError ? error.code : 'LOCAL_RUNTIME_INVALID';
      const message = error instanceof Error ? error.message : String(error);
      failInitialize(
        classified === 'LOCAL_RUNTIME_INVALID' ||
          classified === 'MANAGED_PATH_SYMLINK' ||
          classified === 'MANAGED_PATH_WRONG_TYPE'
          ? classified
          : 'LOCAL_RUNTIME_INVALID',
        message,
        {
          applied: Object.freeze([...applied]),
          failed: installId(plannedInstall),
          pending: pendingAfter(initial, applied, installId(plannedInstall)),
        },
        { method: plannedInstall.method },
        error,
      );
    }
    applied.push(installId(plannedInstall));
  } else {
    try {
      await proveLocalMaterialization(initial.root, initial.targetRelease);
    } catch (error) {
      failRuntimeProof(error, initial, applied);
    }
  }

  let certification: PreparedInitializationPlan;
  let marker: PreparedFileOperation | undefined;
  try {
    certification = await prepareProjectInitialization(options);
    marker = certifyPostMaterialization(initial, certification);
  } catch (error) {
    failCertification(error, initial, applied);
  }

  if (marker !== undefined) {
    try {
      await publishProjectMarker(initial.root, marker, runtime.markerHooks ?? {});
    } catch (error) {
      const classified = error instanceof HarnessProjectError ? error.code : 'INTERNAL_ERROR';
      const message = error instanceof Error ? error.message : String(error);
      const preserved =
        classified === 'STALE_PLAN' ||
        classified === 'MANAGED_PATH_SYMLINK' ||
        classified === 'MANAGED_PATH_WRONG_TYPE' ||
        classified === 'MANAGED_PATH_OUTSIDE_ROOT' ||
        classified === 'IO_FAILURE';
      failInitialize(
        preserved ? classified : 'INTERNAL_ERROR',
        message,
        {
          applied: Object.freeze([...applied]),
          failed: fileId(marker),
          pending: Object.freeze([]),
        },
        undefined,
        error,
      );
    }
    applied.push(fileId(marker));
    await confirmPublishedMarker(initial.root);
  }

  return Object.freeze({
    root: initial.root,
    projectId: initial.projectId,
    initialState: initial.state,
    finalState: 'current',
    applied: Object.freeze([...applied]),
  });
}

export function applyProjectInitialization(
  options: PlanProjectInitializationOptions,
): Promise<InitializationResult> {
  return applyProjectInitializationWithRuntime(options, DEFAULT_INITIALIZATION_RUNTIME);
}
