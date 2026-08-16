import {
  AuthorityError,
  type AuthorityRequest,
  ContextError,
  type ContextRequest,
  EvidenceError,
  type Harness,
  HarnessError,
  type JsonValue,
  MemoryError,
  type RecallMemoryQuery,
  type RememberMemoryInput,
  type TransitionMemoryInput,
  ValidationError,
  ValidationInfrastructureError,
  type ValidationRequest,
} from '@wizloft/harness';

export const COMMAND_IDS = Object.freeze([
  'harness.inspect',
  'context.resolve',
  'authority.resolve',
  'memory.remember',
  'memory.recall',
  'memory.transition',
  'validation.select',
  'validation.run',
  'evidence.list',
  'events.read',
] as const);

export type CommandId = (typeof COMMAND_IDS)[number];

export type CommandRequest =
  | { readonly commandId: 'harness.inspect' }
  | { readonly commandId: 'context.resolve'; readonly input: ContextRequest }
  | { readonly commandId: 'authority.resolve'; readonly input: AuthorityRequest }
  | { readonly commandId: 'memory.remember'; readonly input: RememberMemoryInput }
  | { readonly commandId: 'memory.recall'; readonly input: RecallMemoryQuery }
  | { readonly commandId: 'memory.transition'; readonly input: TransitionMemoryInput }
  | { readonly commandId: 'validation.select'; readonly input: ValidationRequest }
  | { readonly commandId: 'validation.run'; readonly input: ValidationRequest }
  | { readonly commandId: 'evidence.list' }
  | { readonly commandId: 'events.read' };

export type CommandError = {
  readonly code: string;
  readonly message: string;
  readonly details?: JsonValue;
};

export type CommandResultEnvelope = {
  readonly kind: 'result';
  readonly commandId: string;
  readonly value: JsonValue;
};

export type CommandErrorEnvelope = {
  readonly kind: 'error';
  readonly commandId: string;
  readonly error: CommandError;
};

export type CommandEnvelope = CommandErrorEnvelope | CommandResultEnvelope;

export interface CommandExecutor {
  execute(request: unknown): Promise<CommandEnvelope>;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function snapshotJson(
  value: unknown,
  path = 'command value',
  ancestors = new Set<object>(),
): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path} must contain finite JSON numbers`);
    return value;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new TypeError(`${path} must not contain cycles`);
    ancestors.add(value);
    const result = Object.freeze(
      value.map((item, index) => snapshotJson(item, `${path}[${index}]`, ancestors)),
    );
    ancestors.delete(value);
    return result;
  }
  if (!isPlainObject(value) || ancestors.has(value)) {
    throw new TypeError(`${path} must contain only JSON-compatible plain data`);
  }
  ancestors.add(value);
  const result: Record<string, JsonValue> = {};
  for (const [key, child] of Object.entries(value)) {
    if (child === undefined) throw new TypeError(`${path}.${key} must not be undefined`);
    result[key] = snapshotJson(child, `${path}.${key}`, ancestors);
  }
  ancestors.delete(value);
  return Object.freeze(result);
}

function result(commandId: string, value: unknown): CommandResultEnvelope {
  return Object.freeze({ kind: 'result', commandId, value: snapshotJson(value) });
}

function failure(
  commandId: string,
  code: string,
  message: string,
  details?: unknown,
): CommandErrorEnvelope {
  const error = Object.freeze({
    code,
    message,
    ...(details === undefined ? {} : { details: snapshotJson(details, 'command error details') }),
  });
  return Object.freeze({ kind: 'error', commandId, error });
}

function invalid(commandId: string, message: string): CommandErrorEnvelope {
  return failure(commandId, 'INVALID_COMMAND_INPUT', message);
}

function hasOnlyNoInput(request: Record<string, unknown>): boolean {
  return !Object.hasOwn(request, 'input');
}

function validSubjectInput(value: unknown): value is ContextRequest | AuthorityRequest {
  return isPlainObject(value) && nonEmptyString(value.subject);
}

function validValidationInput(value: unknown): value is ValidationRequest {
  return (
    isPlainObject(value) &&
    nonEmptyString(value.correlationId) &&
    Array.isArray(value.changedPaths) &&
    value.changedPaths.every((path) => typeof path === 'string') &&
    (value.sourceRevision === undefined || nonEmptyString(value.sourceRevision))
  );
}

function validRememberInput(value: unknown): value is RememberMemoryInput {
  return (
    isPlainObject(value) &&
    nonEmptyString(value.content) &&
    ['episodic', 'semantic'].includes(String(value.kind)) &&
    nonEmptyString(value.scope) &&
    isPlainObject(value.provenance) &&
    nonEmptyString(value.provenance.sourceType) &&
    nonEmptyString(value.provenance.sourceId)
  );
}

function validRecallInput(value: unknown): value is RecallMemoryQuery {
  return isPlainObject(value) && nonEmptyString(value.scope);
}

function validTransitionInput(value: unknown): value is TransitionMemoryInput {
  return (
    isPlainObject(value) &&
    nonEmptyString(value.id) &&
    ['active', 'archived', 'candidate', 'stale', 'superseded'].includes(String(value.state))
  );
}

function knownCommandError(error: unknown): boolean {
  return (
    error instanceof HarnessError ||
    error instanceof ContextError ||
    error instanceof AuthorityError ||
    error instanceof MemoryError ||
    error instanceof EvidenceError ||
    error instanceof ValidationError ||
    error instanceof ValidationInfrastructureError ||
    (error instanceof Error &&
      'code' in error &&
      nonEmptyString((error as { readonly code?: unknown }).code))
  );
}

function structuredErrorDetails(error: Error): JsonValue | undefined {
  const candidate = error as Error & Record<string, unknown>;
  const details: Record<string, JsonValue> = {};
  for (const field of [
    'capabilityId',
    'evidenceId',
    'lineNumber',
    'recordId',
    'sourcePath',
    'state',
    'validatorId',
  ]) {
    const value = candidate[field];
    if (
      typeof value === 'string' ||
      (typeof value === 'number' && Number.isFinite(value)) ||
      typeof value === 'boolean' ||
      value === null
    ) {
      details[field] = value;
    }
  }
  return Object.keys(details).length === 0 ? undefined : Object.freeze(details);
}

function normalizedError(commandId: string, error: unknown): CommandErrorEnvelope {
  if (error instanceof ValidationInfrastructureError) {
    return failure(commandId, error.code, error.message, {
      report: error.report,
      failures: error.failures.map(({ cause: _cause, ...summary }) => summary),
    });
  }
  if (error instanceof HarnessError) {
    return failure(commandId, error.code, error.message, {
      ...(error.capabilityId === undefined ? {} : { capabilityId: error.capabilityId }),
      ...(error.state === undefined ? {} : { state: error.state }),
    });
  }
  if (error instanceof MemoryError) {
    return failure(
      commandId,
      error.code,
      error.message,
      error.recordId === undefined ? undefined : { recordId: error.recordId },
    );
  }
  if (error instanceof EvidenceError) {
    return failure(
      commandId,
      error.code,
      error.message,
      error.record === undefined ? undefined : { record: error.record },
    );
  }
  if (
    error instanceof ContextError ||
    error instanceof AuthorityError ||
    error instanceof ValidationError
  ) {
    return failure(commandId, error.code, error.message);
  }
  if (
    error instanceof Error &&
    'code' in error &&
    nonEmptyString((error as { readonly code?: unknown }).code)
  ) {
    return failure(
      commandId,
      (error as Error & { readonly code: string }).code,
      error.message,
      structuredErrorDetails(error),
    );
  }
  throw error;
}

export function createCommandExecutor(harness: Harness): CommandExecutor {
  if (harness === null || typeof harness !== 'object') {
    throw new TypeError('createCommandExecutor() requires a Harness facade');
  }

  return Object.freeze({
    async execute(rawRequest: unknown): Promise<CommandEnvelope> {
      if (!isPlainObject(rawRequest)) {
        return invalid('<unknown>', 'Command request must be a plain object');
      }
      const commandId = nonEmptyString(rawRequest.commandId) ? rawRequest.commandId : '<unknown>';
      if (!COMMAND_IDS.includes(commandId as CommandId)) {
        return failure(commandId, 'UNKNOWN_COMMAND', `Unknown command: ${commandId}`);
      }

      let request: Record<string, JsonValue>;
      try {
        request = snapshotJson(rawRequest, 'command request') as Record<string, JsonValue>;
      } catch {
        return invalid(commandId, 'Command request must contain only JSON-compatible data');
      }

      try {
        switch (commandId as CommandId) {
          case 'harness.inspect':
            if (!hasOnlyNoInput(request)) return invalid(commandId, 'Command takes no input');
            return result(commandId, harness.inspect());
          case 'context.resolve':
            if (!validSubjectInput(request.input)) {
              return invalid(commandId, 'context.resolve requires a non-empty input.subject');
            }
            return result(commandId, await harness.context.resolve(request.input));
          case 'authority.resolve':
            if (!validSubjectInput(request.input)) {
              return invalid(commandId, 'authority.resolve requires a non-empty input.subject');
            }
            return result(commandId, await harness.authority.resolve(request.input));
          case 'memory.remember':
            if (!validRememberInput(request.input)) {
              return invalid(commandId, 'memory.remember requires a valid Memory input');
            }
            return result(commandId, await harness.memory.remember(request.input));
          case 'memory.recall':
            if (!validRecallInput(request.input)) {
              return invalid(commandId, 'memory.recall requires a non-empty input.scope');
            }
            return result(commandId, harness.memory.recall(request.input));
          case 'memory.transition':
            if (!validTransitionInput(request.input)) {
              return invalid(commandId, 'memory.transition requires id and a valid state');
            }
            return result(commandId, await harness.memory.transition(request.input));
          case 'validation.select':
            if (!validValidationInput(request.input)) {
              return invalid(commandId, 'validation.select requires a valid Validation request');
            }
            return result(commandId, await harness.validation.select(request.input));
          case 'validation.run':
            if (!validValidationInput(request.input)) {
              return invalid(commandId, 'validation.run requires a valid Validation request');
            }
            return result(commandId, await harness.validation.run(request.input));
          case 'evidence.list':
            if (!hasOnlyNoInput(request)) return invalid(commandId, 'Command takes no input');
            return result(commandId, harness.evidence.list());
          case 'events.read':
            if (!hasOnlyNoInput(request)) return invalid(commandId, 'Command takes no input');
            return result(commandId, await harness.events.read());
        }
      } catch (error) {
        if (knownCommandError(error)) return normalizedError(commandId, error);
        throw error;
      }
    },
  });
}
