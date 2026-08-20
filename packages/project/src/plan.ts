import { fail } from './errors.js';
import {
  classifyRepository,
  inspectRepository,
  type RepositorySnapshot,
  type RepositoryState,
} from './inspect.js';
import {
  blockMatches,
  parseManagedFile,
  removeManagedBlock,
  upsertManagedBlock,
} from './managed-blocks.js';
import { assertSupportedNodeVersion } from './node-version.js';
import {
  adapterPath,
  commandArgv,
  normalizeInitOptions,
  type PlanProjectInitializationOptions,
  packageRelease,
  subjectsFor,
} from './options.js';
import {
  type AdapterId,
  AGENTS_PATH,
  CLAUDE_PATH,
  GITIGNORE_PATH,
  HARNESS_DIR,
  HARNESS_WHOLE_FILES,
  INSTRUCTIONS_PATH,
  ISOLATED_MANIFEST_PATH,
  MARKER_PATH,
  PROFILE_PATH,
  PROJECT_TRUTH_PATH,
  RUNNER_PATH,
  resolveRoot,
} from './paths.js';
import {
  adapterInterior,
  gitignoreInterior,
  instructionsContents,
  isolatedManifestContents,
  markerContents,
  profileContents,
  projectTruthContents,
  runnerContents,
} from './templates.js';

export type FileOperationKind = 'create' | 'replace' | 'update-block' | 'remove-block';
export type InstallMethod = 'install' | 'ci';

export type PlannedFileOperation = {
  readonly kind: FileOperationKind;
  readonly path: string;
  readonly contents: string;
};

export type PlannedInstallOperation = {
  readonly kind: 'install';
  readonly path: typeof HARNESS_DIR;
  readonly method: InstallMethod;
  readonly argv: readonly string[];
};

export type PlannedOperation = PlannedFileOperation | PlannedInstallOperation;

export type InitializationPlan = {
  readonly root: string;
  readonly projectId: string;
  readonly state: RepositoryState;
  readonly mode: 'dry-run';
  readonly subjects: {
    readonly project: string;
    readonly harness: string;
  };
  readonly memoryScope: string;
  readonly command: {
    readonly argv: readonly string[];
  };
  readonly adapters: readonly AdapterId[];
  readonly targetRelease: string;
  readonly operations: readonly PlannedOperation[];
};

function freezePlan(plan: InitializationPlan): InitializationPlan {
  return Object.freeze({
    ...plan,
    subjects: Object.freeze({ ...plan.subjects }),
    command: Object.freeze({ argv: Object.freeze([...plan.command.argv]) }),
    adapters: Object.freeze([...plan.adapters]),
    operations: Object.freeze(
      plan.operations.map((operation) =>
        operation.kind === 'install'
          ? Object.freeze({ ...operation, argv: Object.freeze([...operation.argv]) })
          : Object.freeze({ ...operation }),
      ),
    ),
  });
}

function fileOperation(
  kind: FileOperationKind,
  relativePath: string,
  desired: string,
  existing: string | undefined,
): PlannedFileOperation | undefined {
  if (existing === desired) return undefined;
  if (existing === undefined) {
    return Object.freeze({ kind: 'create', path: relativePath, contents: desired });
  }
  return Object.freeze({ kind, path: relativePath, contents: desired });
}

function installArgv(root: string, method: InstallMethod): readonly string[] {
  const prefix = `${root}/${HARNESS_DIR}`.replaceAll('\\', '/');
  if (method === 'ci') {
    return Object.freeze([
      'npm',
      '--prefix',
      prefix,
      'ci',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
    ]);
  }
  return Object.freeze([
    'npm',
    'install',
    '--prefix',
    prefix,
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
  ]);
}

function planWholeFiles(
  snapshot: RepositorySnapshot,
  projectId: string,
  release: string,
): PlannedFileOperation[] {
  const desired = new Map<string, string>([
    [INSTRUCTIONS_PATH, instructionsContents(projectId)],
    [PROFILE_PATH, profileContents()],
    [RUNNER_PATH, runnerContents()],
    [ISOLATED_MANIFEST_PATH, isolatedManifestContents(release)],
  ]);
  const operations: PlannedFileOperation[] = [];
  for (const relativePath of HARNESS_WHOLE_FILES) {
    const contents = desired.get(relativePath);
    if (contents === undefined) continue;
    const existing = snapshot.files[relativePath];
    const kind: FileOperationKind = existing === undefined ? 'create' : 'replace';
    const operation = fileOperation(kind, relativePath, contents, existing);
    if (operation !== undefined) operations.push(operation);
  }
  return operations;
}

function planProjectTruth(snapshot: RepositorySnapshot, projectId: string): PlannedFileOperation[] {
  if (snapshot.files[PROJECT_TRUTH_PATH] !== undefined) return [];
  return [
    Object.freeze({
      kind: 'create',
      path: PROJECT_TRUTH_PATH,
      contents: projectTruthContents(projectId),
    }),
  ];
}

function planAdapterFile(
  snapshot: RepositorySnapshot,
  adapter: AdapterId,
  selected: boolean,
  projectId: string,
): PlannedFileOperation | undefined {
  const relativePath = adapterPath(adapter);
  const existing = snapshot.files[relativePath];
  if (!selected) {
    if (existing === undefined) return undefined;
    const removed = removeManagedBlock(existing, relativePath, 'markdown');
    if (removed === undefined) return undefined;
    if (removed.contents === existing) return undefined;
    return Object.freeze({
      kind: 'remove-block',
      path: relativePath,
      contents: removed.contents,
    });
  }
  const interior = adapterInterior(projectId);
  if (blockMatches(existing, relativePath, 'markdown', interior)) return undefined;
  const upserted = upsertManagedBlock(existing, relativePath, 'markdown', interior);
  return Object.freeze({
    kind: upserted.action,
    path: relativePath,
    contents: upserted.contents,
  });
}

function planGitignore(snapshot: RepositorySnapshot): PlannedFileOperation | undefined {
  const existing = snapshot.files[GITIGNORE_PATH];
  const interior = gitignoreInterior();
  if (blockMatches(existing, GITIGNORE_PATH, 'gitignore', interior)) return undefined;
  const upserted = upsertManagedBlock(existing, GITIGNORE_PATH, 'gitignore', interior);
  return Object.freeze({
    kind: upserted.action,
    path: GITIGNORE_PATH,
    contents: upserted.contents,
  });
}

function parseExistingAdapterBlocks(snapshot: RepositorySnapshot): void {
  parseManagedFile(snapshot.files[AGENTS_PATH], AGENTS_PATH, 'markdown');
  parseManagedFile(snapshot.files[CLAUDE_PATH], CLAUDE_PATH, 'markdown');
  parseManagedFile(snapshot.files[GITIGNORE_PATH], GITIGNORE_PATH, 'gitignore');
}

function planInstall(state: RepositoryState, root: string): PlannedInstallOperation | undefined {
  if (state === 'current' || state === 'reconciliation-needed') return undefined;
  if (state === 'needs-local-materialization') {
    return Object.freeze({
      kind: 'install',
      path: HARNESS_DIR,
      method: 'ci',
      argv: installArgv(root, 'ci'),
    });
  }
  if (
    state === 'clean' ||
    state === 'existing-no-harness' ||
    state === 'partial-first-init' ||
    state === 'upgrade-in-progress'
  ) {
    return Object.freeze({
      kind: 'install',
      path: HARNESS_DIR,
      method: 'install',
      argv: installArgv(root, 'install'),
    });
  }
  return undefined;
}

function planMarker(
  snapshot: RepositorySnapshot,
  projectId: string,
  release: string,
  adapters: readonly AdapterId[],
): PlannedFileOperation | undefined {
  const desired = markerContents({ projectId, release, adapters });
  const existing = snapshot.files[MARKER_PATH];
  if (existing === desired) return undefined;
  return Object.freeze({
    kind: existing === undefined ? 'create' : 'replace',
    path: MARKER_PATH,
    contents: desired,
  });
}

export async function planProjectInitialization(
  options: PlanProjectInitializationOptions,
): Promise<InitializationPlan> {
  if (options === null || typeof options !== 'object') {
    fail('INVALID_ARGV', 'Initialization options must be an object');
  }
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  assertSupportedNodeVersion(nodeVersion);
  const normalized = normalizeInitOptions({ ...options, nodeVersion });
  const root = resolveRoot(normalized.requestedRoot, normalized.cwd);
  const snapshot = await inspectRepository(root);

  if (
    snapshot.marker.status === 'valid' &&
    snapshot.marker.marker.projectId !== normalized.projectId
  ) {
    fail(
      'PROJECT_ID_CONFLICT',
      `projectId ${normalized.projectId} does not match existing marker projectId ${snapshot.marker.marker.projectId}`,
      {
        projectId: normalized.projectId,
        markerProjectId: snapshot.marker.marker.projectId,
      },
    );
  }
  if (snapshot.marker.status === 'invalid') {
    fail('MARKER_CONFLICT', snapshot.marker.reason, { path: MARKER_PATH });
  }

  parseExistingAdapterBlocks(snapshot);

  const state = classifyRepository(snapshot, {
    projectId: normalized.projectId,
    targetRelease: normalized.targetRelease,
  });

  const operations: PlannedOperation[] = [];
  operations.push(
    ...planWholeFiles(snapshot, normalized.projectId, normalized.targetRelease),
    ...planProjectTruth(snapshot, normalized.projectId),
  );

  const agents = planAdapterFile(
    snapshot,
    'agents',
    normalized.adapters.includes('agents'),
    normalized.projectId,
  );
  const claude = planAdapterFile(
    snapshot,
    'claude',
    normalized.adapters.includes('claude'),
    normalized.projectId,
  );
  const gitignore = planGitignore(snapshot);
  if (agents !== undefined) operations.push(agents);
  if (claude !== undefined) operations.push(claude);
  if (gitignore !== undefined) operations.push(gitignore);

  const install = planInstall(state, root);
  if (install !== undefined) operations.push(install);

  const marker = planMarker(
    snapshot,
    normalized.projectId,
    normalized.targetRelease,
    normalized.adapters,
  );
  if (marker !== undefined) operations.push(marker);

  const lastMarker = operations.findLast((operation) => operation.path === MARKER_PATH);
  if (lastMarker !== undefined && operations[operations.length - 1] !== lastMarker) {
    fail('MARKER_CONFLICT', 'Marker create/replace must be planned last');
  }

  const resolvedState =
    state === 'current' && operations.length > 0 ? 'reconciliation-needed' : state;
  if (resolvedState === 'current' && operations.length !== 0) {
    fail('INTERNAL_ERROR', 'current repository state must have zero operations');
  }

  return freezePlan({
    root,
    projectId: normalized.projectId,
    state: resolvedState,
    mode: 'dry-run',
    subjects: subjectsFor(normalized.projectId),
    memoryScope: `project:${normalized.projectId}`,
    command: { argv: commandArgv() },
    adapters: normalized.adapters,
    targetRelease: normalized.targetRelease,
    operations: Object.freeze(operations),
  });
}

export function currentPackageRelease(): string {
  return packageRelease();
}
