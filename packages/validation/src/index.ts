import { posix, win32 } from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  EVIDENCE_CAPABILITY,
  EvidenceError,
  type EvidenceService,
} from '@wizloft/harness-evidence';
import {
  createCapabilityToken,
  type DeepReadonly,
  type Disposer,
  declareCapability,
  type JsonValue,
  type MaybePromise,
  requireCapability,
  type WizloftPlugin,
} from '@wizloft/harness-kernel';

export const VALIDATION_CAPABILITY_ID = 'validation@1';
export const VALIDATION_PLUGIN_NAME = '@wizloft/validation';
export const VALIDATION_EVIDENCE_KIND = 'wizloft.validation.outcome';

export type ValidatorKind = 'focused' | 'root-required';
export type ValidationOutcomeStatus = 'error' | 'failed' | 'passed';
export type ValidationErrorPhase = 'applicability' | 'execution';

export type ValidationRequest = {
  readonly correlationId: string;
  readonly changedPaths: readonly string[];
  readonly metadata?: JsonValue;
  readonly sourceRevision?: string;
};

export type ValidatorExecutionResult = {
  readonly metadata?: JsonValue;
  readonly status: 'failed' | 'passed';
  readonly summary: string;
};

interface ValidatorBase {
  readonly id: string;
  execute(request: ValidationRequest): MaybePromise<ValidatorExecutionResult>;
}

export interface FocusedValidator extends ValidatorBase {
  readonly kind: 'focused';
  applicable(request: ValidationRequest): MaybePromise<boolean>;
}

export interface RootRequiredValidator extends ValidatorBase {
  readonly kind: 'root-required';
  readonly applicable?: never;
}

export type Validator = FocusedValidator | RootRequiredValidator;

export type ValidationSelectionEntry = {
  readonly errorPhase?: 'applicability';
  readonly kind: ValidatorKind;
  readonly status: 'error' | 'not-applicable' | 'selected';
  readonly summary?: string;
  readonly validatorId: string;
};

export type ValidationSelection = {
  readonly entries: readonly ValidationSelectionEntry[];
  readonly request: ValidationRequest;
};

export type ValidationOutcome = {
  readonly durationMs: number;
  readonly errorPhase?: ValidationErrorPhase;
  readonly evidenceId?: string;
  readonly kind: ValidatorKind;
  readonly metadata?: DeepReadonly<JsonValue>;
  readonly status: ValidationOutcomeStatus;
  readonly summary: string;
  readonly validatorId: string;
};

export type ValidationReport = {
  readonly ok: boolean;
  readonly outcomes: readonly ValidationOutcome[];
  readonly request: ValidationRequest;
  readonly selection: ValidationSelection;
};

export type ValidationInfrastructureFailure = {
  readonly code?: string;
  readonly cause: unknown;
  readonly evidenceId?: string;
  readonly message: string;
  readonly validatorId: string;
};

export interface ValidationService {
  registerValidator(validator: Validator): Disposer;
  run(request: ValidationRequest): Promise<ValidationReport>;
  select(request: ValidationRequest): Promise<ValidationSelection>;
}

export type ValidationErrorCode =
  | 'DUPLICATE_VALIDATOR_ID'
  | 'INVALID_VALIDATION_REQUEST'
  | 'INVALID_VALIDATION_TIMER'
  | 'INVALID_VALIDATOR'
  | 'INVALID_VALIDATOR_RESULT';

export class ValidationError extends Error {
  readonly code: ValidationErrorCode;

  constructor(code: ValidationErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ValidationError';
    this.code = code;
  }
}

export class ValidationInfrastructureError extends Error {
  readonly code = 'VALIDATION_INFRASTRUCTURE_FAILED';
  readonly failures: readonly ValidationInfrastructureFailure[];
  readonly report: ValidationReport;

  constructor(report: ValidationReport, failures: readonly ValidationInfrastructureFailure[]) {
    super('Validation completed with Evidence infrastructure failures');
    this.name = 'ValidationInfrastructureError';
    this.report = report;
    this.failures = Object.freeze(failures.map((failure) => Object.freeze({ ...failure })));
  }
}

export interface CreateValidationServiceOptions {
  readonly evidence: EvidenceService;
  readonly timer?: () => number;
}

interface ValidatorRegistration {
  readonly applicable?: FocusedValidator['applicable'];
  readonly execute: Validator['execute'];
  readonly id: string;
  readonly kind: ValidatorKind;
  active: boolean;
}

interface InternalSelectionEntry {
  readonly publicEntry: ValidationSelectionEntry;
  readonly registration: ValidatorRegistration;
}

interface InternalSelection {
  readonly entries: readonly InternalSelectionEntry[];
  readonly publicSelection: ValidationSelection;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function cloneJson(value: unknown, field: string, code: ValidationErrorCode): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new ValidationError(code, `${field} must be finite JSON data`);
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item, index) => cloneJson(item, `${field}[${index}]`, code)));
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const clone: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) {
      clone[key] = cloneJson(child, `${field}.${key}`, code);
    }
    return Object.freeze(clone);
  }
  throw new ValidationError(code, `${field} must contain only JSON-compatible data`);
}

export function normalizeValidationChangedPath(path: string): string {
  if (!nonEmptyString(path) || path.includes('\0')) {
    throw new ValidationError(
      'INVALID_VALIDATION_REQUEST',
      'Validation changed paths must be non-empty project-relative paths',
    );
  }
  if (posix.isAbsolute(path) || win32.isAbsolute(path) || /^[A-Za-z]:/u.test(path)) {
    throw new ValidationError(
      'INVALID_VALIDATION_REQUEST',
      `Validation changed path must be project-relative: ${path}`,
    );
  }

  const normalized = posix.normalize(path.replaceAll('\\', '/')).replace(/\/+$/u, '');
  if (
    normalized === '' ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../')
  ) {
    throw new ValidationError(
      'INVALID_VALIDATION_REQUEST',
      `Validation changed path escapes the project: ${path}`,
    );
  }
  return normalized;
}

export function normalizeValidationRequest(request: ValidationRequest): ValidationRequest {
  if (
    request === null ||
    typeof request !== 'object' ||
    Array.isArray(request) ||
    !nonEmptyString(request.correlationId) ||
    !Array.isArray(request.changedPaths) ||
    (request.sourceRevision !== undefined && !nonEmptyString(request.sourceRevision))
  ) {
    throw new ValidationError(
      'INVALID_VALIDATION_REQUEST',
      'Validation requests require correlationId, changedPaths, and valid optional sourceRevision',
    );
  }

  const seen = new Set<string>();
  const changedPaths: string[] = [];
  for (const path of request.changedPaths) {
    if (typeof path !== 'string') {
      throw new ValidationError(
        'INVALID_VALIDATION_REQUEST',
        'Validation changed paths must contain only strings',
      );
    }
    const normalized = normalizeValidationChangedPath(path);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      changedPaths.push(normalized);
    }
  }

  return Object.freeze({
    correlationId: request.correlationId,
    changedPaths: Object.freeze(changedPaths),
    ...(request.sourceRevision === undefined ? {} : { sourceRevision: request.sourceRevision }),
    ...(request.metadata === undefined
      ? {}
      : {
          metadata: cloneJson(
            request.metadata,
            'Validation request metadata',
            'INVALID_VALIDATION_REQUEST',
          ),
        }),
  });
}

function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function snapshotValidatorResult(value: unknown): ValidatorExecutionResult {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(
      'INVALID_VALIDATOR_RESULT',
      'Validator execute() must return a structured result',
    );
  }
  const result = value as Partial<ValidatorExecutionResult>;
  if (!['passed', 'failed'].includes(result.status ?? '') || !nonEmptyString(result.summary)) {
    throw new ValidationError(
      'INVALID_VALIDATOR_RESULT',
      'Validator result requires passed/failed status and non-empty summary',
    );
  }
  return Object.freeze({
    status: result.status as 'failed' | 'passed',
    summary: result.summary,
    ...(result.metadata === undefined
      ? {}
      : {
          metadata: cloneJson(
            result.metadata,
            'Validator result metadata',
            'INVALID_VALIDATOR_RESULT',
          ),
        }),
  });
}

function readTimer(timer: () => number): number {
  let value: unknown;
  try {
    value = timer();
  } catch (error) {
    throw new ValidationError('INVALID_VALIDATION_TIMER', 'Validation timer failed', error);
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(
      'INVALID_VALIDATION_TIMER',
      'Validation timer must return a finite number',
    );
  }
  return value;
}

function outcomeWithEvidenceId(
  outcome: ValidationOutcome,
  evidenceId: string | undefined,
): ValidationOutcome {
  if (evidenceId === undefined) return outcome;
  return Object.freeze({ ...outcome, evidenceId });
}

export function createValidationService(
  options: CreateValidationServiceOptions,
): ValidationService {
  if (
    options === null ||
    typeof options !== 'object' ||
    options.evidence === null ||
    typeof options.evidence !== 'object' ||
    typeof options.evidence.record !== 'function' ||
    typeof options.evidence.list !== 'function' ||
    (options.timer !== undefined && typeof options.timer !== 'function')
  ) {
    throw new ValidationError(
      'INVALID_VALIDATOR',
      'Validation service requires an Evidence service and valid optional timer seam',
    );
  }

  const timer = options.timer ?? (() => performance.now());
  const recordEvidence = options.evidence.record.bind(options.evidence);
  const registrations: ValidatorRegistration[] = [];

  const selectInternal = async (request: ValidationRequest): Promise<InternalSelection> => {
    const normalizedRequest = normalizeValidationRequest(request);
    const entries: InternalSelectionEntry[] = [];
    const activeRegistrations = registrations.filter((registration) => registration.active);

    for (const registration of activeRegistrations) {
      let publicEntry: ValidationSelectionEntry;
      if (registration.kind === 'root-required') {
        publicEntry = Object.freeze({
          kind: registration.kind,
          status: 'selected',
          validatorId: registration.id,
        });
      } else {
        try {
          const applicable = await registration.applicable?.(normalizedRequest);
          if (typeof applicable !== 'boolean') {
            throw new ValidationError(
              'INVALID_VALIDATOR_RESULT',
              `Validator ${registration.id} applicable() must return a boolean`,
            );
          }
          publicEntry = Object.freeze({
            kind: registration.kind,
            status: applicable ? 'selected' : 'not-applicable',
            validatorId: registration.id,
          });
        } catch (error) {
          publicEntry = Object.freeze({
            errorPhase: 'applicability',
            kind: registration.kind,
            status: 'error',
            summary: describeCause(error),
            validatorId: registration.id,
          });
        }
      }
      entries.push(Object.freeze({ publicEntry, registration }));
    }

    const publicSelection = Object.freeze({
      entries: Object.freeze(entries.map(({ publicEntry }) => publicEntry)),
      request: normalizedRequest,
    });
    return Object.freeze({ entries: Object.freeze(entries), publicSelection });
  };

  const recordOutcome = async (
    request: ValidationRequest,
    outcome: ValidationOutcome,
  ): Promise<{
    readonly failure?: ValidationInfrastructureFailure;
    readonly outcome: ValidationOutcome;
  }> => {
    const payload = Object.freeze({
      validatorId: outcome.validatorId,
      status: outcome.status,
      durationMs: outcome.durationMs,
      summary: outcome.summary,
      ...(outcome.errorPhase === undefined ? {} : { errorPhase: outcome.errorPhase }),
      ...(request.sourceRevision === undefined ? {} : { sourceRevision: request.sourceRevision }),
      ...(outcome.metadata === undefined ? {} : { metadata: outcome.metadata }),
    });

    try {
      const record = await recordEvidence({
        correlationId: request.correlationId,
        kind: VALIDATION_EVIDENCE_KIND,
        payload,
      });
      return Object.freeze({ outcome: outcomeWithEvidenceId(outcome, record.id) });
    } catch (error) {
      const evidenceId = error instanceof EvidenceError ? error.record?.id : undefined;
      return Object.freeze({
        outcome: outcomeWithEvidenceId(outcome, evidenceId),
        failure: Object.freeze({
          validatorId: outcome.validatorId,
          message: describeCause(error),
          cause: error,
          ...(error instanceof EvidenceError ? { code: error.code } : {}),
          ...(evidenceId === undefined ? {} : { evidenceId }),
        }),
      });
    }
  };

  return {
    registerValidator(validator: Validator): Disposer {
      if (
        validator === null ||
        typeof validator !== 'object' ||
        !nonEmptyString(validator.id) ||
        !['focused', 'root-required'].includes(validator.kind) ||
        typeof validator.execute !== 'function' ||
        (validator.kind === 'focused' && typeof validator.applicable !== 'function') ||
        (validator.kind === 'root-required' && validator.applicable !== undefined)
      ) {
        throw new ValidationError(
          'INVALID_VALIDATOR',
          'Validators require a stable id, valid kind/callbacks, and execute(request)',
        );
      }

      const id = validator.id;
      const kind = validator.kind;
      const execute = validator.execute.bind(validator);
      const applicable =
        validator.kind === 'focused' ? validator.applicable.bind(validator) : undefined;
      if (registrations.some((registration) => registration.active && registration.id === id)) {
        throw new ValidationError(
          'DUPLICATE_VALIDATOR_ID',
          `Validator ${id} is already registered`,
        );
      }

      const registration: ValidatorRegistration = {
        id,
        kind,
        execute,
        ...(applicable === undefined ? {} : { applicable }),
        active: true,
      };
      registrations.push(registration);
      return (): void => {
        registration.active = false;
      };
    },

    async select(request: ValidationRequest): Promise<ValidationSelection> {
      return (await selectInternal(request)).publicSelection;
    },

    async run(request: ValidationRequest): Promise<ValidationReport> {
      const selection = await selectInternal(request);
      const outcomes: ValidationOutcome[] = [];
      const failures: ValidationInfrastructureFailure[] = [];

      for (const entry of selection.entries) {
        let outcome: ValidationOutcome | undefined;
        if (entry.publicEntry.status === 'error') {
          outcome = Object.freeze({
            validatorId: entry.registration.id,
            kind: entry.registration.kind,
            status: 'error',
            errorPhase: 'applicability',
            durationMs: 0,
            summary: entry.publicEntry.summary ?? 'Validator applicability failed',
          });
        } else if (entry.publicEntry.status === 'selected') {
          const startedAt = readTimer(timer);
          let executionError: unknown;
          let result: ValidatorExecutionResult | undefined;
          try {
            result = snapshotValidatorResult(
              await entry.registration.execute(selection.publicSelection.request),
            );
          } catch (error) {
            executionError = error;
          }

          const finishedAt = readTimer(timer);
          if (finishedAt < startedAt) {
            throw new ValidationError(
              'INVALID_VALIDATION_TIMER',
              'Validation timer moved backwards during validator execution',
            );
          }

          if (executionError === undefined && result !== undefined) {
            outcome = Object.freeze({
              validatorId: entry.registration.id,
              kind: entry.registration.kind,
              status: result.status,
              durationMs: finishedAt - startedAt,
              summary: result.summary,
              ...(result.metadata === undefined ? {} : { metadata: result.metadata }),
            });
          } else {
            outcome = Object.freeze({
              validatorId: entry.registration.id,
              kind: entry.registration.kind,
              status: 'error',
              errorPhase: 'execution',
              durationMs: finishedAt - startedAt,
              summary: describeCause(executionError),
            });
          }
        }

        if (outcome !== undefined) {
          const recorded = await recordOutcome(selection.publicSelection.request, outcome);
          outcomes.push(recorded.outcome);
          if (recorded.failure !== undefined) failures.push(recorded.failure);
        }
      }

      const report = Object.freeze({
        ok: outcomes.every(({ status }) => status === 'passed'),
        outcomes: Object.freeze(outcomes),
        request: selection.publicSelection.request,
        selection: selection.publicSelection,
      });
      if (failures.length > 0) throw new ValidationInfrastructureError(report, failures);
      return report;
    },
  };
}

export const VALIDATION_CAPABILITY =
  createCapabilityToken<ValidationService>(VALIDATION_CAPABILITY_ID);

export const validationPlugin: WizloftPlugin = {
  name: VALIDATION_PLUGIN_NAME,
  version: '0.0.0',
  requires: [requireCapability(EVIDENCE_CAPABILITY)],
  provides: [declareCapability(VALIDATION_CAPABILITY)],
  setup(context) {
    context.capabilities.provide(
      VALIDATION_CAPABILITY,
      createValidationService({ evidence: context.capabilities.get(EVIDENCE_CAPABILITY) }),
    );
  },
};
