import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { authorityPlugin } from '@wizloft/harness-authority';
import { contextPlugin } from '@wizloft/harness-context';
import { evidencePlugin } from '@wizloft/harness-evidence';
import {
  type Disposer,
  defineProfile,
  requireCapability,
  type WizloftPlugin,
} from '@wizloft/harness-kernel';
import { fileEventsPlugin } from '@wizloft/harness-plugin-file-events';
import { fileMemoryPlugin } from '@wizloft/harness-plugin-file-memory';
import { memoryContextPlugin } from '@wizloft/harness-plugin-memory-context';
import { repositoryFilesPlugin } from '@wizloft/harness-plugin-repository-files';
import { VALIDATION_CAPABILITY, validationPlugin } from '@wizloft/harness-validation';

export const SELF_HOST_CONTEXT_SUBJECT = 'self-host:maintenance';
export const SELF_HOST_MEMORY_SCOPE = 'project:wizloft-harness';
export const SELF_HOST_VALIDATION_PLUGIN_NAME = '@wizloft/self-host-validation';
export const SELF_HOST_ROOT_VALIDATOR_ID = '@wizloft/self-host:root-contract';
export const SELF_HOST_AUTHORITY_VALIDATOR_ID = '@wizloft/self-host:authority-docs';

export const SELF_HOST_AUTHORITY_SUBJECTS = Object.freeze({
  activePlan: 'self-host:active-plan',
  agentInstructions: 'self-host:agent-instructions',
  architecture: 'self-host:architecture:core',
  authorityContextEvidence: 'self-host:architecture:authority-context-evidence',
  cliOwnership: 'self-host:decision:cli-ownership',
  cliRewrite: 'self-host:decision:cli-rewrite',
  deepseekInterop: 'self-host:decision:deepseek-interop',
  deterministicComposition: 'self-host:decision:deterministic-composition',
  dogfoodOrder: 'self-host:dogfood-order',
  durabilityPlanes: 'self-host:decision:durability-planes',
  agentAgnostic: 'self-host:decision:agent-agnostic',
  memoryCapability: 'self-host:decision:memory-capability',
  memoryModel: 'self-host:architecture:memory-model',
  milestone: 'self-host:milestone',
  pluginModel: 'self-host:architecture:plugin-model',
  repositoryTruth: 'self-host:repository-truth',
  smallKernel: 'self-host:decision:small-kernel',
  toolchain: 'self-host:decision:toolchain',
});

export const SELF_HOST_AUTHORITY_SOURCES = Object.freeze([
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.repositoryTruth,
    path: 'docs/decisions/0001-repository-is-source-of-truth.md',
  },
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.smallKernel,
    path: 'docs/decisions/0002-small-kernel-plugin-ecosystem.md',
  },
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.agentAgnostic,
    path: 'docs/decisions/0003-agent-agnostic.md',
  },
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.durabilityPlanes,
    path: 'docs/decisions/0004-three-durability-planes.md',
  },
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.memoryCapability,
    path: 'docs/decisions/0005-memory-first-class-capability.md',
  },
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.deterministicComposition,
    path: 'docs/decisions/0006-deterministic-composition.md',
  },
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.deepseekInterop,
    path: 'docs/decisions/0007-deepseek-interoperability-without-dependency.md',
  },
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.toolchain,
    path: 'docs/decisions/0008-v0-typescript-pnpm.md',
  },
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.cliOwnership,
    path: 'docs/decisions/0009-cli-ownership-boundary.md',
  },
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.dogfoodOrder,
    path: 'docs/decisions/0010-dogfood-order.md',
  },
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.cliRewrite,
    path: 'docs/decisions/0011-wizloft-cli-rewrite-strategy.md',
  },
  { subject: SELF_HOST_AUTHORITY_SUBJECTS.architecture, path: 'docs/architecture/ARCHITECTURE.md' },
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.authorityContextEvidence,
    path: 'docs/architecture/AUTHORITY-CONTEXT-EVIDENCE.md',
  },
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.memoryModel,
    path: 'docs/architecture/MEMORY-MODEL.md',
  },
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.pluginModel,
    path: 'docs/architecture/PLUGIN-MODEL.md',
  },
  { subject: SELF_HOST_AUTHORITY_SUBJECTS.agentInstructions, path: 'AGENTS.md' },
  {
    subject: SELF_HOST_AUTHORITY_SUBJECTS.activePlan,
    path: 'docs/plans/active/0001-build-muh.md',
  },
  { subject: SELF_HOST_AUTHORITY_SUBJECTS.milestone, path: 'docs/milestones/SELF-HOST.md' },
]);

export interface CreateSelfHostProfileOptions {
  readonly eventsPath: string;
  readonly memoryPath: string;
  readonly repositoryRoot: string;
}

type SelfHostValidationConfig = {
  readonly root: string;
};

const AUTHORITY_FILES = Object.freeze([
  'AGENTS.md',
  'docs/architecture/ARCHITECTURE.md',
  'docs/architecture/AUTHORITY-CONTEXT-EVIDENCE.md',
  'docs/architecture/MEMORY-MODEL.md',
  'docs/architecture/PLUGIN-MODEL.md',
  'docs/milestones/SELF-HOST.md',
  'docs/plans/active/0001-build-muh.md',
]);

const REQUIRED_ROOT_SCRIPTS = Object.freeze([
  'build',
  'check',
  'test',
  'typecheck',
  'verify',
  'workspace:check',
]);

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeValidationRoot(config: SelfHostValidationConfig): string {
  if (config === null || typeof config !== 'object' || !nonEmptyString(config.root)) {
    throw new TypeError('self-host validation config.root must be a non-empty path');
  }
  return path.resolve(config.root);
}

async function inspectAuthorityDocuments(root: string): Promise<{
  readonly decisionCount: number;
  readonly violations: readonly string[];
}> {
  const violations: string[] = [];
  for (const relativePath of AUTHORITY_FILES) {
    try {
      if ((await readFile(path.join(root, relativePath), 'utf8')).trim().length === 0) {
        violations.push(`${relativePath} is empty`);
      }
    } catch (error) {
      violations.push(
        `${relativePath} is unreadable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  let decisionCount = 0;
  try {
    const decisionsRoot = path.join(root, 'docs', 'decisions');
    const decisionFiles = (await readdir(decisionsRoot))
      .filter((name) => name.endsWith('.md'))
      .sort();
    decisionCount = decisionFiles.length;
    for (const decisionFile of decisionFiles) {
      const content = await readFile(path.join(decisionsRoot, decisionFile), 'utf8');
      if (!content.includes('Status: Accepted')) {
        violations.push(`docs/decisions/${decisionFile} is not marked Accepted`);
      }
    }
  } catch (error) {
    violations.push(
      `docs/decisions is unreadable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return Object.freeze({ decisionCount, violations: Object.freeze(violations) });
}

async function inspectRootContract(root: string): Promise<readonly string[]> {
  const violations: string[] = [];
  try {
    const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    if (manifest.private !== true) violations.push('root package must remain private');
    if (manifest.packageManager !== 'pnpm@11.10.0') {
      violations.push('root packageManager must remain pnpm@11.10.0');
    }
    if (manifest.bin !== undefined) violations.push('root package must not own executables');
    const scripts = manifest.scripts;
    if (scripts === null || typeof scripts !== 'object' || Array.isArray(scripts)) {
      violations.push('root package scripts must be an object');
    } else {
      for (const script of REQUIRED_ROOT_SCRIPTS) {
        if (!nonEmptyString((scripts as Record<string, unknown>)[script])) {
          violations.push(`root package is missing the ${script} script`);
        }
      }
    }
  } catch (error) {
    violations.push(
      `root package.json is invalid: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return Object.freeze(violations);
}

export const selfHostValidationPlugin: WizloftPlugin<SelfHostValidationConfig> = {
  name: SELF_HOST_VALIDATION_PLUGIN_NAME,
  version: '0.0.0',
  requires: [requireCapability(VALIDATION_CAPABILITY)],
  setup(context) {
    const root = normalizeValidationRoot(context.config);
    const validation = context.capabilities.get(VALIDATION_CAPABILITY);
    const disposers: Disposer[] = [];

    disposers.push(
      validation.registerValidator({
        id: SELF_HOST_ROOT_VALIDATOR_ID,
        kind: 'root-required',
        async execute() {
          const violations = await inspectRootContract(root);
          return {
            status: violations.length === 0 ? 'passed' : 'failed',
            summary:
              violations.length === 0
                ? 'Root workspace verification contract is present'
                : `Root workspace contract violations: ${violations.join('; ')}`,
            metadata: { violations: [...violations] },
          };
        },
      }),
    );
    disposers.push(
      validation.registerValidator({
        id: SELF_HOST_AUTHORITY_VALIDATOR_ID,
        kind: 'focused',
        applicable(request) {
          return request.changedPaths.some(
            (changedPath) =>
              changedPath === 'AGENTS.md' ||
              changedPath.startsWith('docs/') ||
              changedPath.startsWith('profiles/self-host/') ||
              changedPath === 'tests/self-host.test.mjs',
          );
        },
        async execute() {
          const inspection = await inspectAuthorityDocuments(root);
          return {
            status: inspection.violations.length === 0 ? 'passed' : 'failed',
            summary:
              inspection.violations.length === 0
                ? `Accepted authority documents are readable (${inspection.decisionCount} decisions)`
                : `Authority document violations: ${inspection.violations.join('; ')}`,
            metadata: {
              decisionCount: inspection.decisionCount,
              violations: [...inspection.violations],
            },
          };
        },
      }),
    );

    return async (): Promise<void> => {
      for (const dispose of disposers.reverse()) await dispose();
    };
  },
};

function requiredPath(value: string, field: string): string {
  if (!nonEmptyString(value)) throw new TypeError(`${field} must be a non-empty path`);
  return path.resolve(value);
}

export function createSelfHostProfile(options: CreateSelfHostProfileOptions) {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('createSelfHostProfile() requires path options');
  }
  const repositoryRoot = requiredPath(options.repositoryRoot, 'repositoryRoot');
  const eventsPath = requiredPath(options.eventsPath, 'eventsPath');
  const memoryPath = requiredPath(options.memoryPath, 'memoryPath');

  const authority = SELF_HOST_AUTHORITY_SOURCES.map(({ subject, path: sourcePath }) => ({
    subject,
    path: sourcePath,
    precedence: 100,
    resolutionKey: subject,
  }));
  const context = [
    ...[
      'AGENTS.md',
      'docs/decisions/0001-repository-is-source-of-truth.md',
      'docs/decisions/0010-dogfood-order.md',
      'docs/architecture/ARCHITECTURE.md',
      'docs/milestones/SELF-HOST.md',
      'docs/plans/active/0001-build-muh.md',
    ].map((sourcePath) => ({
      subject: SELF_HOST_CONTEXT_SUBJECT,
      path: sourcePath,
      role: 'authority' as const,
    })),
    ...[
      'packages/harness/src/index.ts',
      'profiles/self-host/src/index.ts',
      'tests/self-host.test.mjs',
    ].map((sourcePath) => ({
      subject: SELF_HOST_CONTEXT_SUBJECT,
      path: sourcePath,
      role: 'supporting' as const,
    })),
  ];

  return defineProfile({
    layers: [
      {
        name: 'self-host',
        plugins: [
          authorityPlugin,
          contextPlugin,
          evidencePlugin,
          validationPlugin,
          fileEventsPlugin,
          fileMemoryPlugin,
          memoryContextPlugin,
          repositoryFilesPlugin,
          selfHostValidationPlugin,
        ],
        config: {
          '@wizloft/file-events': { path: eventsPath },
          '@wizloft/file-memory': { path: memoryPath },
          '@wizloft/memory-context': {
            mappings: [
              {
                subject: SELF_HOST_CONTEXT_SUBJECT,
                role: 'supporting',
                query: {
                  scope: SELF_HOST_MEMORY_SCOPE,
                  states: ['active', 'stale', 'superseded'],
                },
              },
            ],
          },
          '@wizloft/repository-files': { root: repositoryRoot, authority, context },
          [SELF_HOST_VALIDATION_PLUGIN_NAME]: { root: repositoryRoot },
        },
      },
    ],
  });
}
