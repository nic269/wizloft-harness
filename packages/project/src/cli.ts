import { fail, HarnessProjectError, isFilesystemErrno, type ProjectErrorCode } from './errors.js';
import {
  applyProjectInitializationWithRuntime,
  type InitializationResult,
  type InitializationRuntime,
} from './initialize.js';
import type { IsolatedInstaller } from './install.js';
import { assertSupportedNodeVersion } from './node-version.js';
import { type PlanProjectInitializationOptions, parseAdapterArgument } from './options.js';
import { type InitializationPlan, planProjectInitialization } from './plan.js';
import {
  type CliExecution,
  executionFromApply,
  executionFromError,
  executionFromPlan,
} from './render.js';

export type ParsedProjectCli =
  | {
      readonly kind: 'help';
      readonly json: boolean;
    }
  | {
      readonly kind: 'init';
      readonly json: boolean;
      readonly dryRun: boolean;
      readonly options: PlanProjectInitializationOptions;
    };

const USAGE = `Usage:
  wizloft-harness-project init --root <dir> --project-id <id> [--adapters agents,claude] [--dry-run] [--json]
`;

export function parseProjectCliArgv(argv: readonly string[]): ParsedProjectCli {
  if (!Array.isArray(argv) || argv.some((argument) => typeof argument !== 'string')) {
    fail('INVALID_ARGV', 'argv must be an array of strings');
  }

  let json = false;
  let help = false;
  let dryRun = false;
  let root: string | undefined;
  let projectId: string | undefined;
  let adaptersText: string | undefined;
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      if (json) fail('INVALID_ARGV', 'Duplicate --json option');
      json = true;
    } else if (argument === '--help') {
      if (help) fail('INVALID_ARGV', 'Duplicate --help option');
      help = true;
    } else if (argument === '--dry-run') {
      if (dryRun) fail('INVALID_ARGV', 'Duplicate --dry-run option');
      dryRun = true;
    } else if (argument === '--root') {
      if (root !== undefined) fail('INVALID_ARGV', 'Duplicate --root option');
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        fail('INVALID_ARGV', '--root requires a directory');
      }
      root = value;
      index += 1;
    } else if (argument === '--project-id') {
      if (projectId !== undefined) fail('INVALID_ARGV', 'Duplicate --project-id option');
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        fail('INVALID_ARGV', '--project-id requires a value');
      }
      projectId = value;
      index += 1;
    } else if (argument === '--adapters') {
      if (adaptersText !== undefined) fail('INVALID_ARGV', 'Duplicate --adapters option');
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        fail('INVALID_ARGV', '--adapters requires agents, claude, or none');
      }
      adaptersText = value;
      index += 1;
    } else if (argument?.startsWith('--')) {
      fail('INVALID_ARGV', `Unknown option: ${argument}`);
    } else if (argument !== undefined) {
      positional.push(argument);
    }
  }

  if (help || argv.length === 0) {
    return Object.freeze({ kind: 'help', json });
  }
  if (positional.length === 0) {
    fail('INVALID_ARGV', `Expected init command.\n${USAGE}`);
  }
  if (positional.length !== 1 || positional[0] !== 'init') {
    fail('INVALID_ARGV', `Unknown command: ${positional.join(' ')}\n${USAGE}`);
  }
  if (root === undefined) fail('INVALID_ARGV', '--root is required');
  if (projectId === undefined) fail('INVALID_ARGV', '--project-id is required');

  const options: PlanProjectInitializationOptions = { root, projectId };
  if (adaptersText !== undefined) {
    Object.assign(options, { adapters: parseAdapterArgument(adaptersText) });
  }
  return Object.freeze({ kind: 'init', json, dryRun, options: Object.freeze(options) });
}

export type ProjectCliRuntime = {
  readonly applier?: (options: PlanProjectInitializationOptions) => Promise<InitializationResult>;
  readonly cwd?: string;
  readonly installRuntime?: IsolatedInstaller;
  readonly nodeVersion?: string;
  readonly planner?: (
    options: PlanProjectInitializationOptions,
  ) => Promise<InitializationPlan> | InitializationPlan;
};

export async function runProjectCli(
  argv: readonly string[],
  runtime: ProjectCliRuntime = {},
): Promise<CliExecution> {
  const jsonHint = argv.includes('--json');
  let parsed: ParsedProjectCli;
  try {
    parsed = parseProjectCliArgv(argv);
  } catch (error) {
    return executionFromError(toProjectError(error), jsonHint);
  }

  if (parsed.kind === 'help') {
    if (parsed.json) {
      return Object.freeze({
        exitCode: 0,
        stdout: `${JSON.stringify({ ok: true, help: USAGE })}\n`,
        stderr: '',
      });
    }
    return Object.freeze({ exitCode: 0, stdout: USAGE, stderr: '' });
  }

  try {
    const nodeVersion = runtime.nodeVersion ?? process.versions.node;
    assertSupportedNodeVersion(nodeVersion);
    const request: PlanProjectInitializationOptions = {
      ...parsed.options,
      nodeVersion,
    };
    if (runtime.cwd !== undefined) {
      Object.assign(request, { cwd: runtime.cwd });
    }
    if (parsed.dryRun) {
      const planner = runtime.planner ?? planProjectInitialization;
      const plan = await planner(request);
      return executionFromPlan(plan, parsed.json);
    }
    const apply =
      runtime.applier ??
      ((options: PlanProjectInitializationOptions) => {
        const applyRuntime: InitializationRuntime = {};
        if (runtime.installRuntime !== undefined) {
          Object.assign(applyRuntime, { installRuntime: runtime.installRuntime });
        }
        return applyProjectInitializationWithRuntime(options, applyRuntime);
      });
    const result = await apply(request);
    return executionFromApply(result, parsed.json);
  } catch (error) {
    return executionFromError(toProjectError(error), parsed.json);
  }
}

export function toProjectError(error: unknown): HarnessProjectError {
  if (error instanceof HarnessProjectError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (isFilesystemErrno(error) && error.code !== undefined) {
    return new HarnessProjectError('IO_FAILURE', message, { errno: error.code }, error);
  }
  const code: ProjectErrorCode = 'INTERNAL_ERROR';
  return new HarnessProjectError(code, message, undefined, error);
}
