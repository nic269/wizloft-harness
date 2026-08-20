import { readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { errorCode, fail } from './errors.js';
import { packageRelease } from './options.js';
import {
  assertLocalRuntimeSafety,
  HARNESS_DIR,
  ISOLATED_MANIFEST_PATH,
  inspectPath,
  inspectRuntimeParents,
  LOCAL_PACKAGE_MANIFEST_PATH,
  LOCAL_PACKAGE_PATH,
  PACKAGE_NAME,
  resolveManagedPath,
} from './paths.js';

export type LocalRuntimeIdentity = {
  readonly resolvedPath: string;
  readonly version: string;
};

export type LocalRuntimeInspection =
  | { readonly ok: true; readonly identity: LocalRuntimeIdentity }
  | { readonly ok: false; readonly kind: 'unavailable' | 'unsafe'; readonly reason: string };

function staysInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export async function inspectLocalProjectRuntime(root: string): Promise<LocalRuntimeInspection> {
  const parents = await inspectRuntimeParents(root);
  if (!parents.ok) {
    return Object.freeze({
      ok: false,
      kind: parents.symlink ? 'unsafe' : 'unavailable',
      reason: parents.symlink
        ? `Managed path must not be a symlink: ${parents.relativePath}`
        : `Managed path must be a directory: ${parents.relativePath}`,
    });
  }

  try {
    await assertLocalRuntimeSafety(root);
  } catch (error) {
    return Object.freeze({
      ok: false,
      kind: 'unsafe',
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  const isolatedManifest = await inspectPath(root, ISOLATED_MANIFEST_PATH);
  if (!isolatedManifest.exists || isolatedManifest.isSymbolicLink || !isolatedManifest.isFile) {
    return Object.freeze({
      ok: false,
      kind: 'unavailable',
      reason: 'Isolated harness package.json is missing or unsafe',
    });
  }

  const manifestInspection = await inspectPath(root, LOCAL_PACKAGE_MANIFEST_PATH);
  if (!manifestInspection.exists) {
    return Object.freeze({
      ok: false,
      kind: 'unavailable',
      reason: `Cannot resolve ${PACKAGE_NAME} from ${HARNESS_DIR}/node_modules`,
    });
  }
  if (manifestInspection.isSymbolicLink || !manifestInspection.isFile) {
    return Object.freeze({
      ok: false,
      kind: 'unsafe',
      reason: `Isolated ${PACKAGE_NAME} package.json is unsafe`,
    });
  }

  let version: string;
  try {
    const parsed = JSON.parse(await readFile(manifestInspection.absolutePath, 'utf8')) as {
      name?: unknown;
      version?: unknown;
      exports?: unknown;
    };
    if (
      parsed.name !== PACKAGE_NAME ||
      typeof parsed.version !== 'string' ||
      parsed.version === ''
    ) {
      return Object.freeze({
        ok: false,
        kind: 'unsafe',
        reason: `Isolated ${PACKAGE_NAME} package identity is invalid`,
      });
    }
    version = parsed.version;
    if (parsed.exports === undefined) {
      return Object.freeze({
        ok: false,
        kind: 'unavailable',
        reason: `Cannot resolve ${PACKAGE_NAME} from ${HARNESS_DIR}/node_modules`,
      });
    }
  } catch (error) {
    return Object.freeze({
      ok: false,
      kind: 'unsafe',
      reason: `Isolated ${PACKAGE_NAME} package.json is unreadable: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  const packageRoot = resolveManagedPath(root, LOCAL_PACKAGE_PATH);
  const harnessDir = resolveManagedPath(root, HARNESS_DIR);
  let resolvedPath: string;
  try {
    const require = createRequire(isolatedManifest.absolutePath);
    resolvedPath = require.resolve(PACKAGE_NAME);
  } catch (error) {
    const code = errorCode(error);
    return Object.freeze({
      ok: false,
      kind: code === 'MODULE_NOT_FOUND' ? 'unavailable' : 'unsafe',
      reason:
        code === 'MODULE_NOT_FOUND'
          ? `Cannot resolve ${PACKAGE_NAME} from ${HARNESS_DIR}/node_modules`
          : `Cannot resolve ${PACKAGE_NAME}: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  let resolvedCanonical: string;
  let packageRootCanonical: string;
  let harnessDirCanonical: string;
  try {
    resolvedCanonical = await realpath(resolvedPath);
    packageRootCanonical = await realpath(packageRoot);
    harnessDirCanonical = await realpath(harnessDir);
  } catch (error) {
    return Object.freeze({
      ok: false,
      kind: 'unsafe',
      reason: `Cannot canonicalize isolated ${PACKAGE_NAME} path: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  if (
    !staysInside(packageRootCanonical, resolvedCanonical) ||
    !staysInside(harnessDirCanonical, resolvedCanonical)
  ) {
    return Object.freeze({
      ok: false,
      kind: 'unsafe',
      reason: `Resolved ${PACKAGE_NAME} escaped the isolated project runtime`,
    });
  }

  return Object.freeze({
    ok: true,
    identity: Object.freeze({ resolvedPath, version }),
  });
}

export async function assertLocalProjectRuntime(
  root: string,
  expectedRelease: string,
): Promise<LocalRuntimeIdentity> {
  const inspection = await inspectLocalProjectRuntime(root);
  if (!inspection.ok) {
    fail('LOCAL_RUNTIME_INVALID', inspection.reason);
  }
  if (inspection.identity.version !== expectedRelease) {
    fail(
      'LOCAL_RUNTIME_INVALID',
      `Isolated ${PACKAGE_NAME} version ${inspection.identity.version} does not match marker runtime.release ${expectedRelease}`,
    );
  }
  const executingRelease = packageRelease();
  if (executingRelease !== expectedRelease) {
    fail(
      'LOCAL_RUNTIME_INVALID',
      `Executing ${PACKAGE_NAME} version ${executingRelease} does not match marker runtime.release ${expectedRelease}`,
    );
  }
  return inspection.identity;
}
