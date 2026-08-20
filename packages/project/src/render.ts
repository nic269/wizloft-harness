import { type HarnessProjectError, isUsageErrorCode } from './errors.js';
import type { InitializationPlan, PlannedOperation } from './plan.js';

export type CliExecution = {
  readonly exitCode: 0 | 1 | 2;
  readonly stdout: string;
  readonly stderr: string;
};

export type PublicOperation = {
  readonly kind: PlannedOperation['kind'];
  readonly path: string;
};

function publicOperations(operations: readonly PlannedOperation[]): readonly PublicOperation[] {
  return Object.freeze(
    operations.map((operation) => Object.freeze({ kind: operation.kind, path: operation.path })),
  );
}

export function renderDryRunJson(plan: InitializationPlan): string {
  return `${JSON.stringify({
    ok: true,
    mode: plan.mode,
    state: plan.state,
    root: plan.root,
    projectId: plan.projectId,
    subjects: plan.subjects,
    command: plan.command,
    adapters: plan.adapters,
    operations: publicOperations(plan.operations),
  })}\n`;
}

function padKind(kind: string): string {
  return kind.padEnd(12, ' ');
}

export function renderDryRunHuman(plan: InitializationPlan): string {
  const adapters = plan.adapters.length === 0 ? 'none' : plan.adapters.join(',');
  const lines = [
    'Wizloft Harness project init (dry-run)',
    `root: ${plan.root}`,
    `projectId: ${plan.projectId}`,
    `state: ${plan.state}`,
    `adapters: ${adapters}`,
    `command: ${plan.command.argv.join(' ')}`,
    '',
  ];
  if (plan.operations.length === 0) {
    lines.push('operations: []');
  } else {
    lines.push('operations:');
    for (const operation of plan.operations) {
      lines.push(`  ${padKind(operation.kind)}${operation.path}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

export function renderErrorJson(error: HarnessProjectError): string {
  const envelope: {
    ok: false;
    code: string;
    message: string;
    details?: HarnessProjectError['details'];
  } = {
    ok: false,
    code: error.code,
    message: error.message,
  };
  if (error.details !== undefined) envelope.details = error.details;
  return `${JSON.stringify(envelope)}\n`;
}

export function renderErrorHuman(error: HarnessProjectError): string {
  return `${error.code}: ${error.message}\n`;
}

export function executionFromError(error: HarnessProjectError, json: boolean): CliExecution {
  const exitCode = isUsageErrorCode(error.code) ? 2 : 1;
  if (json) {
    return Object.freeze({ exitCode, stdout: renderErrorJson(error), stderr: '' });
  }
  return Object.freeze({ exitCode, stdout: '', stderr: renderErrorHuman(error) });
}

export function executionFromPlan(plan: InitializationPlan, json: boolean): CliExecution {
  return Object.freeze({
    exitCode: 0,
    stdout: json ? renderDryRunJson(plan) : renderDryRunHuman(plan),
    stderr: '',
  });
}
