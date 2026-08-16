import {
  AUTHORITY_CAPABILITY,
  AuthorityError,
  type AuthorityRequest,
  type AuthorityResolution,
  type AuthorityService,
} from '@wizloft/harness-authority';
import {
  CONTEXT_CAPABILITY,
  ContextError,
  type ContextRequest,
  type ContextResolution,
  type ContextService,
} from '@wizloft/harness-context';
import {
  EVIDENCE_CAPABILITY,
  EvidenceError,
  type EvidenceRecord,
  type EvidenceService,
} from '@wizloft/harness-evidence';
import {
  assertEventTypeId,
  type CapabilityToken,
  composeProfile,
  createHarnessRuntime,
  type DiagnosticSink,
  defineProfile,
  type EventEnvelope,
  type HarnessProfile,
  type HarnessRuntime,
  type HarnessRuntimeInspection,
  type HarnessRuntimeState,
  type JsonValue,
  type MaybePromise,
} from '@wizloft/harness-kernel';
import {
  MEMORY_CAPABILITY,
  MemoryError,
  type MemoryRecord,
  type MemoryService,
  type RecallMemoryQuery,
  type RememberMemoryInput,
  type TransitionMemoryInput,
} from '@wizloft/harness-memory';
import {
  VALIDATION_CAPABILITY,
  ValidationError,
  ValidationInfrastructureError,
  type ValidationReport,
  type ValidationRequest,
  type ValidationSelection,
  type ValidationService,
} from '@wizloft/harness-validation';

export type {
  JsonArray,
  JsonObject,
  JsonObjectOverride,
  JsonOverride,
  JsonPrimitive,
  JsonValue,
  ProfileLayer,
  WizloftPlugin,
} from '@wizloft/harness-kernel';
export type {
  AuthorityRequest,
  AuthorityResolution,
  ContextRequest,
  ContextResolution,
  EventEnvelope,
  EvidenceRecord,
  HarnessProfile,
  HarnessRuntimeInspection,
  MemoryRecord,
  RecallMemoryQuery,
  RememberMemoryInput,
  TransitionMemoryInput,
  ValidationReport,
  ValidationRequest,
  ValidationSelection,
};
export {
  AuthorityError,
  ContextError,
  composeProfile,
  defineProfile,
  EvidenceError,
  MemoryError,
  ValidationError,
  ValidationInfrastructureError,
};

export interface EventHistoryReader {
  read(): MaybePromise<readonly EventEnvelope[]>;
}

export interface CreateHarnessOptions {
  readonly profile: HarnessProfile;
  readonly clock?: () => Date;
  readonly diagnostics?: DiagnosticSink;
  readonly eventHistoryReader?: EventHistoryReader;
  readonly runtimeIdGenerator?: () => string;
}

export type HarnessErrorCode =
  | 'CAPABILITY_UNAVAILABLE'
  | 'EVENT_HISTORY_READ_FAILED'
  | 'EVENT_HISTORY_UNAVAILABLE'
  | 'HARNESS_NOT_ACTIVE'
  | 'INVALID_EVENT_HISTORY_READER';

export class HarnessError extends Error {
  readonly code: HarnessErrorCode;
  readonly capabilityId?: string;
  readonly state?: HarnessRuntimeState;

  constructor(
    code: HarnessErrorCode,
    message: string,
    options?: {
      readonly capabilityId?: string;
      readonly cause?: unknown;
      readonly state?: HarnessRuntimeState;
    },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'HarnessError';
    this.code = code;
    if (options?.capabilityId !== undefined) this.capabilityId = options.capabilityId;
    if (options?.state !== undefined) this.state = options.state;
  }
}

export interface Harness {
  readonly runtimeId: string;
  readonly context: {
    resolve(request: ContextRequest): Promise<ContextResolution>;
  };
  readonly authority: {
    resolve(request: AuthorityRequest): Promise<AuthorityResolution>;
  };
  readonly memory: {
    recall(query: RecallMemoryQuery): readonly MemoryRecord[];
    remember(input: RememberMemoryInput): Promise<MemoryRecord>;
    transition(input: TransitionMemoryInput): Promise<MemoryRecord>;
  };
  readonly validation: {
    run(request: ValidationRequest): Promise<ValidationReport>;
    select(request: ValidationRequest): Promise<ValidationSelection>;
  };
  readonly evidence: {
    list(): readonly EvidenceRecord[];
  };
  readonly events: {
    read(): Promise<readonly EventEnvelope[]>;
  };
  inspect(): HarnessRuntimeInspection;
  shutdown(): Promise<void>;
}

function requireActive(runtime: HarnessRuntime): HarnessRuntimeInspection {
  const inspection = runtime.inspect();
  if (inspection.state !== 'active') {
    throw new HarnessError(
      'HARNESS_NOT_ACTIVE',
      `Harness runtime is ${inspection.state} and cannot execute capability operations`,
      { state: inspection.state },
    );
  }
  return inspection;
}

function capability<T>(runtime: HarnessRuntime, id: string, token: CapabilityToken<T>): T {
  const inspection = requireActive(runtime);
  if (!inspection.capabilities.some((entry) => entry.id === id)) {
    throw new HarnessError('CAPABILITY_UNAVAILABLE', `Capability ${id} was not composed`, {
      capabilityId: id,
      state: inspection.state,
    });
  }
  return runtime.getCapability(token) as T;
}

function invalidEventHistory(message: string, cause?: unknown): never {
  throw new HarnessError('INVALID_EVENT_HISTORY_READER', message, { cause });
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function snapshotHistoryJson(value: unknown, path: string, ancestors: Set<object>): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) invalidEventHistory(`${path} must contain finite JSON numbers`);
    return value;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) invalidEventHistory(`${path} must not contain cycles`);
    ancestors.add(value);
    const snapshot = Object.freeze(
      value.map((item, index) => snapshotHistoryJson(item, `${path}[${index}]`, ancestors)),
    );
    ancestors.delete(value);
    return snapshot;
  }
  if (!isPlainJsonObject(value) || ancestors.has(value)) {
    invalidEventHistory(`${path} must contain only JSON-compatible plain data`);
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== 'string')) {
    invalidEventHistory(`${path} must not contain symbol keys`);
  }

  ancestors.add(value);
  const snapshot: Record<string, JsonValue> = {};
  for (const [key, child] of Object.entries(value)) {
    if (child === undefined) invalidEventHistory(`${path}.${key} must not be undefined`);
    Object.defineProperty(snapshot, key, {
      enumerable: true,
      value: snapshotHistoryJson(child, `${path}.${key}`, ancestors),
    });
  }
  ancestors.delete(value);
  return Object.freeze(snapshot);
}

function snapshotEventHistoryEntry(value: unknown, index: number): EventEnvelope {
  if (!isPlainJsonObject(value)) {
    invalidEventHistory(`Event history entry ${index} must be an object`);
  }
  if (typeof value.runtimeId !== 'string' || value.runtimeId.trim().length === 0) {
    invalidEventHistory(`Event history entry ${index} runtimeId must be a non-empty string`);
  }
  if (typeof value.type !== 'string') {
    invalidEventHistory(`Event history entry ${index} type must be a valid event type id`);
  }
  try {
    assertEventTypeId(value.type);
  } catch (error) {
    invalidEventHistory(`Event history entry ${index} type must be a valid event type id`, error);
  }
  if (
    typeof value.sequence !== 'number' ||
    !Number.isSafeInteger(value.sequence) ||
    value.sequence <= 0
  ) {
    invalidEventHistory(`Event history entry ${index} sequence must be a positive safe integer`);
  }
  if (typeof value.occurredAt !== 'string') {
    invalidEventHistory(`Event history entry ${index} occurredAt must be an ISO-8601 UTC string`);
  }
  const timestamp = Date.parse(value.occurredAt);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value.occurredAt) {
    invalidEventHistory(`Event history entry ${index} occurredAt must be canonical ISO-8601 UTC`);
  }
  if (!Object.hasOwn(value, 'payload')) {
    invalidEventHistory(`Event history entry ${index} must include payload`);
  }

  return Object.freeze({
    runtimeId: value.runtimeId,
    type: value.type,
    sequence: value.sequence,
    occurredAt: value.occurredAt,
    payload: snapshotHistoryJson(value.payload, `Event history entry ${index} payload`, new Set()),
  });
}

export async function createHarness(options: CreateHarnessOptions): Promise<Harness> {
  if (options === null || typeof options !== 'object' || !('profile' in options)) {
    throw new TypeError('createHarness() requires an explicit HarnessProfile');
  }

  let readEventHistory: EventHistoryReader['read'] | undefined;
  if (options.eventHistoryReader !== undefined) {
    if (
      options.eventHistoryReader === null ||
      typeof options.eventHistoryReader !== 'object' ||
      typeof options.eventHistoryReader.read !== 'function'
    ) {
      throw new HarnessError(
        'INVALID_EVENT_HISTORY_READER',
        'eventHistoryReader must implement read()',
      );
    }
    readEventHistory = options.eventHistoryReader.read.bind(options.eventHistoryReader);
  }

  const runtime = await createHarnessRuntime({
    profile: options.profile,
    ...(options.clock === undefined ? {} : { clock: options.clock }),
    ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
    ...(options.runtimeIdGenerator === undefined
      ? {}
      : { runtimeIdGenerator: options.runtimeIdGenerator }),
  });

  const facade: Harness = {
    runtimeId: runtime.runtimeId,
    context: Object.freeze({
      resolve(request) {
        return capability<ContextService>(
          runtime,
          CONTEXT_CAPABILITY.id,
          CONTEXT_CAPABILITY,
        ).resolve(request);
      },
    }),
    authority: Object.freeze({
      resolve(request) {
        return capability<AuthorityService>(
          runtime,
          AUTHORITY_CAPABILITY.id,
          AUTHORITY_CAPABILITY,
        ).resolve(request);
      },
    }),
    memory: Object.freeze({
      recall(query) {
        return capability<MemoryService>(runtime, MEMORY_CAPABILITY.id, MEMORY_CAPABILITY).recall(
          query,
        );
      },
      remember(input) {
        return capability<MemoryService>(runtime, MEMORY_CAPABILITY.id, MEMORY_CAPABILITY).remember(
          input,
        );
      },
      transition(input) {
        return capability<MemoryService>(
          runtime,
          MEMORY_CAPABILITY.id,
          MEMORY_CAPABILITY,
        ).transition(input);
      },
    }),
    validation: Object.freeze({
      select(request) {
        return capability<ValidationService>(
          runtime,
          VALIDATION_CAPABILITY.id,
          VALIDATION_CAPABILITY,
        ).select(request);
      },
      run(request) {
        return capability<ValidationService>(
          runtime,
          VALIDATION_CAPABILITY.id,
          VALIDATION_CAPABILITY,
        ).run(request);
      },
    }),
    evidence: Object.freeze({
      list() {
        return capability<EvidenceService>(
          runtime,
          EVIDENCE_CAPABILITY.id,
          EVIDENCE_CAPABILITY,
        ).list();
      },
    }),
    events: Object.freeze({
      async read() {
        const inspection = requireActive(runtime);
        if (readEventHistory === undefined) {
          throw new HarnessError(
            'EVENT_HISTORY_UNAVAILABLE',
            'No event-history reader was configured',
            { state: inspection.state },
          );
        }
        let events: readonly EventEnvelope[];
        try {
          events = await readEventHistory();
        } catch (error) {
          throw new HarnessError('EVENT_HISTORY_READ_FAILED', 'Event-history reader failed', {
            cause: error,
            state: inspection.state,
          });
        }
        const history: unknown = events;
        if (!Array.isArray(history)) {
          throw new HarnessError(
            'INVALID_EVENT_HISTORY_READER',
            'eventHistoryReader.read() must return an array of event envelopes',
          );
        }
        return Object.freeze(history.map(snapshotEventHistoryEntry));
      },
    }),
    inspect: runtime.inspect.bind(runtime),
    shutdown: runtime.shutdown.bind(runtime),
  };

  return Object.freeze(facade);
}
