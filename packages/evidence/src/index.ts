import { randomUUID } from 'node:crypto';

import {
  createCapabilityToken,
  createEventType,
  type DeepReadonly,
  declareCapability,
  type EventPublisher,
  type JsonValue,
  type WizloftPlugin,
} from '@wizloft/harness-kernel';

export const EVIDENCE_CAPABILITY_ID = 'evidence@1';
export const EVIDENCE_PLUGIN_NAME = '@wizloft/evidence';
export const EVIDENCE_RECORDED_EVENT_ID = 'wizloft.evidence.recorded';

export type EvidenceInput<TPayload extends JsonValue = JsonValue> = {
  readonly correlationId: string;
  readonly kind: string;
  readonly payload: TPayload;
};

export type EvidenceRecord<TPayload extends JsonValue = JsonValue> = {
  readonly id: string;
  readonly correlationId: string;
  readonly kind: string;
  readonly recordedAt: string;
  readonly payload: DeepReadonly<TPayload>;
};

export interface EvidenceService {
  record<TPayload extends JsonValue>(
    input: EvidenceInput<TPayload>,
  ): Promise<EvidenceRecord<TPayload>>;
  list(): readonly EvidenceRecord[];
}

export type EvidenceErrorCode =
  | 'DUPLICATE_EVIDENCE_ID'
  | 'EVIDENCE_EVENT_PUBLISH_FAILED'
  | 'INVALID_EVIDENCE_CLOCK'
  | 'INVALID_EVIDENCE_ID'
  | 'INVALID_EVIDENCE_INPUT';

export class EvidenceError extends Error {
  readonly code: EvidenceErrorCode;
  readonly record?: EvidenceRecord;

  constructor(
    code: EvidenceErrorCode,
    message: string,
    options?: { readonly cause?: unknown; readonly record?: EvidenceRecord },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'EvidenceError';
    this.code = code;
    if (options?.record !== undefined) this.record = options.record;
  }
}

export interface CreateEvidenceServiceOptions {
  readonly clock?: () => Date;
  readonly events: EventPublisher;
  readonly idFactory?: () => string;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function cloneJson(value: unknown, field: string): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new EvidenceError('INVALID_EVIDENCE_INPUT', `${field} must be finite JSON data`);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item, index) => cloneJson(item, `${field}[${index}]`)));
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const clone: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) {
      clone[key] = cloneJson(child, `${field}.${key}`);
    }
    return Object.freeze(clone);
  }
  throw new EvidenceError(
    'INVALID_EVIDENCE_INPUT',
    `${field} must contain only JSON-compatible data`,
  );
}

function snapshotInput<TPayload extends JsonValue>(
  input: EvidenceInput<TPayload>,
): EvidenceInput<TPayload> {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    !nonEmptyString(input.correlationId) ||
    !nonEmptyString(input.kind) ||
    !Object.hasOwn(input, 'payload')
  ) {
    throw new EvidenceError(
      'INVALID_EVIDENCE_INPUT',
      'Evidence input requires non-empty correlationId and kind plus JSON-compatible payload',
    );
  }
  return Object.freeze({
    correlationId: input.correlationId,
    kind: input.kind,
    payload: cloneJson(input.payload, 'Evidence input payload') as TPayload,
  });
}

function createEvidenceId(idFactory: () => string): string {
  let id: unknown;
  try {
    id = idFactory();
  } catch (error) {
    throw new EvidenceError('INVALID_EVIDENCE_ID', 'Evidence id factory failed', { cause: error });
  }
  if (!nonEmptyString(id)) {
    throw new EvidenceError(
      'INVALID_EVIDENCE_ID',
      'Evidence id factory must return a non-empty id',
    );
  }
  return id;
}

function readRecordedAt(clock: () => Date): string {
  let value: unknown;
  try {
    value = clock();
  } catch (error) {
    throw new EvidenceError('INVALID_EVIDENCE_CLOCK', 'Evidence clock failed', { cause: error });
  }
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new EvidenceError('INVALID_EVIDENCE_CLOCK', 'Evidence clock must return a valid Date');
  }
  return value.toISOString();
}

export const EVIDENCE_RECORDED_EVENT = createEventType<EvidenceRecord>(EVIDENCE_RECORDED_EVENT_ID);

export function createEvidenceService(options: CreateEvidenceServiceOptions): EvidenceService {
  if (
    options === null ||
    typeof options !== 'object' ||
    options.events === null ||
    typeof options.events !== 'object' ||
    typeof options.events.publish !== 'function' ||
    (options.clock !== undefined && typeof options.clock !== 'function') ||
    (options.idFactory !== undefined && typeof options.idFactory !== 'function')
  ) {
    throw new EvidenceError(
      'INVALID_EVIDENCE_INPUT',
      'Evidence service requires an event publisher and valid optional clock/idFactory seams',
    );
  }

  const clock = options.clock ?? (() => new Date());
  const idFactory = options.idFactory ?? randomUUID;
  const publishEvent = options.events.publish.bind(options.events);
  const records: EvidenceRecord[] = [];
  const ids = new Set<string>();

  return {
    async record<TPayload extends JsonValue>(
      input: EvidenceInput<TPayload>,
    ): Promise<EvidenceRecord<TPayload>> {
      const snapshot = snapshotInput(input);
      const id = createEvidenceId(idFactory);
      if (ids.has(id)) {
        throw new EvidenceError('DUPLICATE_EVIDENCE_ID', `Evidence id ${id} already exists`);
      }
      const record = Object.freeze({
        id,
        correlationId: snapshot.correlationId,
        kind: snapshot.kind,
        recordedAt: readRecordedAt(clock),
        payload: snapshot.payload,
      }) as EvidenceRecord<TPayload>;

      ids.add(id);
      records.push(record);
      try {
        await publishEvent(EVIDENCE_RECORDED_EVENT, record);
      } catch (error) {
        throw new EvidenceError(
          'EVIDENCE_EVENT_PUBLISH_FAILED',
          `Evidence ${id} was accepted but its recorded event failed`,
          { cause: error, record },
        );
      }
      return record;
    },

    list(): readonly EvidenceRecord[] {
      return Object.freeze([...records]);
    },
  };
}

export const EVIDENCE_CAPABILITY = createCapabilityToken<EvidenceService>(EVIDENCE_CAPABILITY_ID);

export const evidencePlugin: WizloftPlugin = {
  name: EVIDENCE_PLUGIN_NAME,
  version: '0.1.2-alpha.2',
  provides: [declareCapability(EVIDENCE_CAPABILITY)],
  setup(context) {
    context.capabilities.provide(
      EVIDENCE_CAPABILITY,
      createEvidenceService({ events: context.events }),
    );
  },
};
