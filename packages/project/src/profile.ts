import path from 'node:path';

import { authorityPlugin } from '@wizloft/harness/authority';
import { contextPlugin } from '@wizloft/harness/context';
import { evidencePlugin } from '@wizloft/harness/evidence';
import { validationPlugin } from '@wizloft/harness/validation';
import { fileEventsPlugin } from '@wizloft/harness-file-providers/events';
import { fileMemoryPlugin } from '@wizloft/harness-file-providers/memory';
import { memoryContextPlugin } from '@wizloft/harness-file-providers/memory-context';
import { repositoryFilesPlugin } from '@wizloft/harness-file-providers/repository';
import { defineProfile, type HarnessProfile } from '@wizloft/harness-kernel';

import { fail } from './errors.js';
import { PROJECT_HEALTH_PLUGIN_NAME, projectHealthPlugin } from './health.js';
import { loadProjectSourceOverlay } from './overlay.js';
import {
  assertRoot,
  EVENTS_PATH,
  INSTRUCTIONS_PATH,
  MEMORY_PATH,
  PROJECT_TRUTH_PATH,
  resolveManagedPath,
} from './paths.js';
import { isValidProjectId } from './project-id.js';

export type CreateGeneratedProjectProfileOptions = {
  readonly projectId: string;
  readonly repositoryRoot: string;
};

export {
  PROJECT_HEALTH_PLUGIN_NAME,
  PROJECT_HEALTH_VALIDATOR_ID,
} from './health.js';

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function createGeneratedProjectProfile(
  options: CreateGeneratedProjectProfileOptions,
): Promise<HarnessProfile> {
  if (options === null || typeof options !== 'object') {
    fail('INVALID_ARGV', 'createGeneratedProjectProfile() requires options');
  }
  if (!nonEmptyString(options.repositoryRoot) || !path.isAbsolute(options.repositoryRoot)) {
    fail('INVALID_ARGV', 'repositoryRoot must be a non-empty absolute path');
  }
  if (!nonEmptyString(options.projectId) || !isValidProjectId(options.projectId)) {
    fail('INVALID_PROJECT_ID', 'projectId must match the alpha.3 grammar');
  }

  await assertRoot(options.repositoryRoot);
  const overlay = await loadProjectSourceOverlay(options.repositoryRoot, options.projectId);
  const projectSubject = `${options.projectId}:project`;
  const harnessSubject = `${options.projectId}:harness`;
  const memoryScope = `project:${options.projectId}`;
  const eventsPath = resolveManagedPath(options.repositoryRoot, EVENTS_PATH);
  const memoryPath = resolveManagedPath(options.repositoryRoot, MEMORY_PATH);

  const authority = Object.freeze([
    Object.freeze({
      subject: projectSubject,
      path: PROJECT_TRUTH_PATH,
      precedence: 100,
    }),
    Object.freeze({
      subject: harnessSubject,
      path: INSTRUCTIONS_PATH,
      precedence: 90,
    }),
    ...overlay.authority,
  ]);
  const context = Object.freeze([
    Object.freeze({
      subject: projectSubject,
      path: PROJECT_TRUTH_PATH,
      role: 'authority' as const,
    }),
    Object.freeze({
      subject: projectSubject,
      path: INSTRUCTIONS_PATH,
      role: 'authority' as const,
    }),
    ...overlay.context,
  ]);

  return defineProfile({
    layers: [
      {
        name: 'project',
        plugins: [
          authorityPlugin,
          contextPlugin,
          evidencePlugin,
          validationPlugin,
          fileEventsPlugin,
          fileMemoryPlugin,
          memoryContextPlugin,
          repositoryFilesPlugin,
          projectHealthPlugin,
        ],
        config: {
          '@wizloft/file-events': { path: eventsPath },
          '@wizloft/file-memory': { path: memoryPath },
          '@wizloft/memory-context': {
            mappings: [
              {
                subject: projectSubject,
                role: 'supporting',
                query: {
                  scope: memoryScope,
                  states: ['active'],
                },
              },
              {
                subject: projectSubject,
                role: 'historical',
                query: {
                  scope: memoryScope,
                  states: ['stale', 'superseded'],
                },
              },
            ],
          },
          '@wizloft/repository-files': {
            root: options.repositoryRoot,
            authority,
            context,
          },
          [PROJECT_HEALTH_PLUGIN_NAME]: {
            root: options.repositoryRoot,
            projectId: options.projectId,
          },
        },
      },
    ],
  });
}
