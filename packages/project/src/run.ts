import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { createHarness, type Harness, type HarnessProfile } from '@wizloft/harness';
import { createHarnessCliAdapter } from '@wizloft/harness/cli';
import { createCommandExecutor } from '@wizloft/harness/commands';
import { readFileEvents } from '@wizloft/harness-file-providers/events';

import { fail } from './errors.js';
import { assertLocalProjectRuntime } from './identity.js';
import { parseProjectMarker } from './marker.js';
import { assertSupportedNodeVersion } from './node-version.js';
import {
  assertRoot,
  assertRuntimeParents,
  EVENTS_PATH,
  inspectPath,
  MARKER_PATH,
  PROFILE_PATH,
  resolveManagedPath,
} from './paths.js';

export type RunProjectHarnessOptions = {
  readonly env: Readonly<NodeJS.ProcessEnv>;
  readonly repositoryRoot: string;
  readonly stderr: NodeJS.WritableStream;
  readonly stdin: NodeJS.ReadableStream;
  readonly stdout: NodeJS.WritableStream;
};

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isObject(value: unknown): value is object {
  return value !== null && typeof value === 'object';
}

function hasWrite(value: unknown): value is NodeJS.WritableStream {
  return isObject(value) && 'write' in value && typeof value.write === 'function';
}

async function writeCompleted(stream: NodeJS.WritableStream, text: string): Promise<void> {
  if (text.length === 0) return;
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
      if (typeof stream.off === 'function') stream.off('error', onError);
      reject(error);
    };
    if (typeof stream.once === 'function') stream.once('error', onError);
    stream.write(text, (error) => {
      if (typeof stream.off === 'function') stream.off('error', onError);
      if (error) reject(error);
      else resolve();
    });
  });
}

function validateOptions(options: RunProjectHarnessOptions): RunProjectHarnessOptions {
  if (options === null || typeof options !== 'object') {
    fail('INVALID_ARGV', 'runProjectHarness() requires options');
  }
  if (!nonEmptyString(options.repositoryRoot) || !path.isAbsolute(options.repositoryRoot)) {
    fail('INVALID_ARGV', 'repositoryRoot must be a non-empty absolute path');
  }
  if (!isObject(options.env)) {
    fail('INVALID_ARGV', 'env must be provided');
  }
  if (!isObject(options.stdin)) {
    fail('INVALID_ARGV', 'stdin must be provided');
  }
  if (!hasWrite(options.stdout)) {
    fail('INVALID_ARGV', 'stdout must be a writable stream');
  }
  if (!hasWrite(options.stderr)) {
    fail('INVALID_ARGV', 'stderr must be a writable stream');
  }
  return options;
}

async function loadMarker(root: string) {
  const inspection = await inspectPath(root, MARKER_PATH);
  if (!inspection.exists) {
    fail('MARKER_CONFLICT', `${MARKER_PATH} is missing`, { path: MARKER_PATH });
  }
  if (inspection.isSymbolicLink) {
    fail('MANAGED_PATH_SYMLINK', `Managed path must not be a symlink: ${MARKER_PATH}`, {
      path: MARKER_PATH,
    });
  }
  if (!inspection.isFile) {
    fail('MANAGED_PATH_WRONG_TYPE', `Managed path must be a file: ${MARKER_PATH}`, {
      path: MARKER_PATH,
    });
  }
  const text = await readFile(inspection.absolutePath, 'utf8');
  const parsed = parseProjectMarker(text);
  if (parsed.status !== 'valid') {
    fail(
      'MARKER_CONFLICT',
      parsed.status === 'invalid' ? parsed.reason : `${MARKER_PATH} is invalid`,
      { path: MARKER_PATH },
    );
  }
  return parsed.marker;
}

async function loadGeneratedProfile(root: string, projectId: string): Promise<HarnessProfile> {
  const inspection = await inspectPath(root, PROFILE_PATH);
  if (!inspection.exists) {
    fail('INVALID_PROFILE', `${PROFILE_PATH} is missing`, { path: PROFILE_PATH });
  }
  if (inspection.isSymbolicLink) {
    fail('MANAGED_PATH_SYMLINK', `Managed path must not be a symlink: ${PROFILE_PATH}`, {
      path: PROFILE_PATH,
    });
  }
  if (!inspection.isFile) {
    fail('MANAGED_PATH_WRONG_TYPE', `Managed path must be a file: ${PROFILE_PATH}`, {
      path: PROFILE_PATH,
    });
  }

  let module: Record<string, unknown>;
  try {
    module = (await import(pathToFileURL(inspection.absolutePath).href)) as Record<string, unknown>;
  } catch (error) {
    fail(
      'INVALID_PROFILE',
      `Cannot load ${PROFILE_PATH}: ${error instanceof Error ? error.message : String(error)}`,
      { path: PROFILE_PATH },
      error,
    );
  }
  const factory = module.createProjectProfile;
  if (typeof factory !== 'function') {
    fail('INVALID_PROFILE', `${PROFILE_PATH} must export createProjectProfile()`, {
      path: PROFILE_PATH,
    });
  }
  return (
    factory as (input: {
      readonly projectId: string;
      readonly repositoryRoot: string;
    }) => Promise<HarnessProfile> | HarnessProfile
  )({ repositoryRoot: root, projectId });
}

export async function runProjectHarness(
  argv: readonly string[],
  options: RunProjectHarnessOptions,
): Promise<number> {
  assertSupportedNodeVersion(process.versions.node);
  const validated = validateOptions(options);
  if (!Array.isArray(argv) || argv.some((argument) => typeof argument !== 'string')) {
    fail('INVALID_ARGV', 'argv must be an array of strings');
  }
  const copied = Object.freeze([...argv]);
  void validated.env;
  void validated.stdin;

  await assertRoot(validated.repositoryRoot);
  await assertRuntimeParents(validated.repositoryRoot);
  const marker = await loadMarker(validated.repositoryRoot);
  await assertLocalProjectRuntime(validated.repositoryRoot, marker.runtime.release);

  const profile = await loadGeneratedProfile(validated.repositoryRoot, marker.projectId);
  const eventsPath = resolveManagedPath(validated.repositoryRoot, EVENTS_PATH);

  let harness: Harness | undefined;
  try {
    harness = await createHarness({
      profile,
      eventHistoryReader: {
        read: () => readFileEvents(eventsPath),
      },
    });
    const adapter = createHarnessCliAdapter(createCommandExecutor(harness));
    const execution = await adapter.execute(copied);
    await writeCompleted(validated.stdout, execution.stdout);
    await writeCompleted(validated.stderr, execution.stderr);
    return execution.exitCode;
  } finally {
    if (harness !== undefined) {
      await harness.shutdown();
    }
  }
}
