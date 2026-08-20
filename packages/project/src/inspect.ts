import { readdir, readFile } from 'node:fs/promises';

import { type MarkerRead, parseProjectMarker } from './marker.js';
import {
  assertGitBoundary,
  assertLocalRuntimeSafety,
  assertManagedPathSafety,
  assertRoot,
  HARNESS_DIR,
  HARNESS_WHOLE_FILES,
  ISOLATED_MANIFEST_PATH,
  inspectPath,
  LOCAL_PACKAGE_MANIFEST_PATH,
  MARKER_PATH,
  preflightManagedPaths,
  REQUIRED_TRACKED_FILES,
} from './paths.js';

export type RepositoryState =
  | 'clean'
  | 'existing-no-harness'
  | 'partial-first-init'
  | 'needs-local-materialization'
  | 'upgrade-in-progress'
  | 'reconciliation-needed'
  | 'current'
  | 'conflict';

export type RepositorySnapshot = {
  readonly root: string;
  readonly files: Readonly<Record<string, string | undefined>>;
  readonly marker: MarkerRead;
  readonly localPackageVersion: string | undefined;
  readonly harnessDirExists: boolean;
  readonly hasNonGitEntries: boolean;
};

async function readManagedFile(root: string, relativePath: string): Promise<string | undefined> {
  const inspection = await assertManagedPathSafety(root, relativePath, 'file');
  if (!inspection.exists) return undefined;
  return readFile(inspection.absolutePath, 'utf8');
}

async function hasNonGitEntries(root: string): Promise<boolean> {
  const entries = await readdir(root);
  return entries.some((entry) => entry !== '.git');
}

export async function inspectRepository(root: string): Promise<RepositorySnapshot> {
  await assertRoot(root);
  await assertGitBoundary(root);
  await preflightManagedPaths(root);
  await assertLocalRuntimeSafety(root);

  const files: Record<string, string | undefined> = {};
  for (const relativePath of [
    ...REQUIRED_TRACKED_FILES,
    ...HARNESS_WHOLE_FILES,
    'AGENTS.md',
    'CLAUDE.md',
    '.gitignore',
  ]) {
    files[relativePath] = await readManagedFile(root, relativePath);
  }

  const harnessDir = await inspectPath(root, HARNESS_DIR);
  const markerText = files[MARKER_PATH];
  const marker: MarkerRead =
    markerText === undefined
      ? Object.freeze({ status: 'missing' })
      : parseProjectMarker(markerText);

  let localPackageVersion: string | undefined;
  const localPackage = await inspectPath(root, LOCAL_PACKAGE_MANIFEST_PATH);
  if (localPackage.exists) {
    if (localPackage.isSymbolicLink || !localPackage.isFile) {
      localPackageVersion = undefined;
    } else {
      try {
        const parsed = JSON.parse(await readFile(localPackage.absolutePath, 'utf8')) as {
          name?: unknown;
          version?: unknown;
        };
        if (parsed.name === '@wizloft/harness-project' && typeof parsed.version === 'string') {
          localPackageVersion = parsed.version;
        }
      } catch {
        localPackageVersion = undefined;
      }
    }
  }

  return Object.freeze({
    root,
    files: Object.freeze(files),
    marker,
    localPackageVersion,
    harnessDirExists: harnessDir.exists,
    hasNonGitEntries: await hasNonGitEntries(root),
  });
}

function isolatedPin(snapshot: RepositorySnapshot): string | undefined {
  const isolated = snapshot.files[ISOLATED_MANIFEST_PATH];
  if (isolated === undefined) return undefined;
  try {
    const parsed = JSON.parse(isolated) as { dependencies?: Record<string, unknown> };
    const pin = parsed.dependencies?.['@wizloft/harness-project'];
    return typeof pin === 'string' ? pin : undefined;
  } catch {
    return undefined;
  }
}

function requiredTrackedFilesPresent(snapshot: RepositorySnapshot): boolean {
  return REQUIRED_TRACKED_FILES.every((relativePath) => snapshot.files[relativePath] !== undefined);
}

export function classifyRepository(
  snapshot: RepositorySnapshot,
  options: {
    readonly projectId: string;
    readonly targetRelease: string;
  },
): RepositoryState {
  const { marker } = snapshot;

  if (marker.status === 'invalid') return 'conflict';

  if (marker.status === 'valid') {
    if (marker.marker.projectId !== options.projectId) return 'conflict';
    if (!requiredTrackedFilesPresent(snapshot)) return 'conflict';

    const markerRelease = marker.marker.runtime.release;
    const pin = isolatedPin(snapshot);
    const local = snapshot.localPackageVersion;

    if (markerRelease !== options.targetRelease) return 'upgrade-in-progress';
    if (pin !== markerRelease) return 'upgrade-in-progress';
    if (local !== undefined && local !== markerRelease) return 'upgrade-in-progress';
    if (local !== markerRelease) return 'needs-local-materialization';
    return 'current';
  }

  if (snapshot.harnessDirExists || snapshot.files[MARKER_PATH] !== undefined) {
    return 'partial-first-init';
  }
  if (snapshot.hasNonGitEntries) return 'existing-no-harness';
  return 'clean';
}
