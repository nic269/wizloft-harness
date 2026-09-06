import { randomUUID } from 'node:crypto';
import { posix, win32 } from 'node:path';

import {
  createCapabilityToken,
  type JsonObject,
  type JsonValue,
  type MaybePromise,
} from '@wizloft/harness-kernel';

export const MEMORY_CAPABILITY_ID = 'memory@1';

export type MemoryKind = 'episodic' | 'semantic';
export type MemoryState = 'active' | 'archived' | 'candidate' | 'stale' | 'superseded';
export type MemoryScope =
  | 'organization'
  | `project:${string}`
  | `session:${string}`
  | `workspace:${string}`;

export interface MemoryProvenance {
  readonly path?: string;
  readonly sourceId: string;
  readonly sourceRevision?: string;
  readonly sourceType: string;
}

export interface MemoryPromotion {
  readonly reference?: string;
  readonly target: string;
}

export interface MemoryRecord {
  readonly content: string;
  readonly createdAt: string;
  readonly id: string;
  readonly kind: MemoryKind;
  readonly metadata: JsonObject;
  readonly promotion?: MemoryPromotion;
  readonly provenance: MemoryProvenance;
  readonly scope: MemoryScope;
  readonly state: MemoryState;
  readonly supersededBy?: string;
  readonly tags: readonly string[];
  readonly updatedAt: string;
}

export interface RememberMemoryInput {
  readonly content: string;
  readonly kind: MemoryKind;
  readonly metadata?: JsonObject;
  readonly promotion?: MemoryPromotion;
  readonly provenance: MemoryProvenance;
  readonly scope: MemoryScope;
  readonly state?: 'active' | 'candidate';
  readonly tags?: readonly string[];
}

export type RecallMemoryQuery = JsonObject & {
  readonly keywords?: readonly string[];
  readonly kinds?: readonly MemoryKind[];
  readonly metadata?: JsonObject;
  readonly scope: MemoryScope;
  readonly states?: readonly MemoryState[];
  readonly tags?: readonly string[];
};

export interface TransitionMemoryInput {
  readonly id: string;
  readonly promotion?: MemoryPromotion;
  readonly state: MemoryState;
  readonly supersededBy?: string;
}

export interface MemoryStore {
  appendSnapshot(record: MemoryRecord): MaybePromise<void>;
  loadSnapshots(): MaybePromise<readonly unknown[]>;
}

export interface MemoryService {
  recall(query: RecallMemoryQuery): readonly MemoryRecord[];
  remember(input: RememberMemoryInput): Promise<MemoryRecord>;
  transition(input: TransitionMemoryInput): Promise<MemoryRecord>;
}

export type MemoryIdFactory = () => string;
export type MemoryClock = () => string;

export interface CreateMemoryServiceOptions {
  readonly clock?: MemoryClock;
  readonly idFactory?: MemoryIdFactory;
  readonly store: MemoryStore;
}

export type MemoryErrorCode =
  | 'CORRUPT_MEMORY_HISTORY'
  | 'DUPLICATE_MEMORY_ID'
  | 'INVALID_MEMORY_CLOCK'
  | 'INVALID_MEMORY_DEPENDENCY'
  | 'INVALID_MEMORY_ID'
  | 'INVALID_MEMORY_INPUT'
  | 'INVALID_MEMORY_QUERY'
  | 'INVALID_MEMORY_TRANSITION'
  | 'MEMORY_NOT_FOUND'
  | 'MEMORY_STORE_LOAD_FAILED'
  | 'MEMORY_STORE_PERSIST_FAILED';

export class MemoryError extends Error {
  readonly code: MemoryErrorCode;
  readonly recordId?: string;

  constructor(code: MemoryErrorCode, message: string, recordId?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'MemoryError';
    this.code = code;
    if (recordId !== undefined) this.recordId = recordId;
  }
}

interface NormalizedRecallQuery {
  readonly keywords: readonly string[];
  readonly kinds?: ReadonlySet<MemoryKind>;
  readonly metadata?: JsonObject;
  readonly scope: MemoryScope;
  readonly states: ReadonlySet<MemoryState>;
  readonly tags: readonly string[];
}

const MEMORY_KINDS: readonly MemoryKind[] = ['episodic', 'semantic'];
const MEMORY_STATES: readonly MemoryState[] = [
  'candidate',
  'active',
  'stale',
  'superseded',
  'archived',
];

const ALLOWED_TRANSITIONS: Readonly<Record<MemoryState, readonly MemoryState[]>> = {
  candidate: ['active', 'archived'],
  active: ['stale', 'superseded', 'archived'],
  stale: ['active', 'superseded', 'archived'],
  superseded: ['archived'],
  archived: [],
};

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

function inputError(message: string, recordId?: string): never {
  throw new MemoryError('INVALID_MEMORY_INPUT', message, recordId);
}

function historyError(message: string, recordId?: string, cause?: unknown): never {
  throw new MemoryError('CORRUPT_MEMORY_HISTORY', message, recordId, cause);
}

function cloneJson(value: unknown, field: string, error: (message: string) => never): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return error(`${field} must contain finite JSON numbers`);
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item, index) => cloneJson(item, `${field}[${index}]`, error)));
  }
  if (isPlainObject(value)) {
    const clone: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) {
      clone[key] = cloneJson(child, `${field}.${key}`, error);
    }
    return Object.freeze(clone);
  }
  return error(`${field} must contain only JSON-compatible data`);
}

function cloneJsonObject(
  value: unknown,
  field: string,
  error: (message: string) => never,
): JsonObject {
  if (!isPlainObject(value)) return error(`${field} must be a plain JSON object`);
  return cloneJson(value, field, error) as JsonObject;
}

function validateScope(value: unknown, error: (message: string) => never): MemoryScope {
  if (value === 'organization') return value;
  if (typeof value !== 'string') return error('Memory scope must be organization or a scoped id');
  for (const prefix of ['project:', 'workspace:', 'session:'] as const) {
    if (value.startsWith(prefix) && value.slice(prefix.length).trim().length > 0) {
      return value as MemoryScope;
    }
  }
  return error(`Invalid Memory scope: ${value}`);
}

function validateTimestamp(
  value: unknown,
  field: string,
  error: (message: string) => never,
): string {
  if (!nonEmptyString(value)) return error(`${field} must be an ISO-8601 UTC timestamp`);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString() !== value) {
    return error(`${field} must be an ISO-8601 UTC timestamp`);
  }
  return value;
}

function normalizePath(value: unknown, error: (message: string) => never): string | undefined {
  if (value === undefined) return undefined;
  if (!nonEmptyString(value) || value.includes('\0')) {
    return error('Memory provenance.path must be a non-empty root-relative path');
  }
  if (posix.isAbsolute(value) || win32.isAbsolute(value) || /^[A-Za-z]:/u.test(value)) {
    return error('Memory provenance.path must be root-relative');
  }
  const normalized = posix.normalize(value.replaceAll('\\', '/'));
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    return error('Memory provenance.path must not escape its logical root');
  }
  return normalized;
}

function snapshotProvenance(
  value: unknown,
  error: (message: string) => never,
  requireNormalized = false,
): MemoryProvenance {
  if (!isPlainObject(value)) return error('Memory provenance must be an object');
  if (!nonEmptyString(value.sourceType) || !nonEmptyString(value.sourceId)) {
    return error('Memory provenance requires non-empty sourceType and sourceId');
  }
  if (value.sourceRevision !== undefined && !nonEmptyString(value.sourceRevision)) {
    return error('Memory provenance.sourceRevision must be non-empty when supplied');
  }
  const path = normalizePath(value.path, error);
  if (requireNormalized && value.path !== undefined && value.path !== path) {
    return error('Persisted Memory provenance.path must already be normalized');
  }
  return Object.freeze({
    sourceType: value.sourceType,
    sourceId: value.sourceId,
    ...(value.sourceRevision === undefined ? {} : { sourceRevision: value.sourceRevision }),
    ...(path === undefined ? {} : { path }),
  });
}

function snapshotPromotion(
  value: unknown,
  error: (message: string) => never,
): MemoryPromotion | undefined {
  if (value === undefined) return undefined;
  if (!isPlainObject(value) || !nonEmptyString(value.target)) {
    return error('Memory promotion requires a non-empty target');
  }
  if (value.reference !== undefined && !nonEmptyString(value.reference)) {
    return error('Memory promotion.reference must be non-empty when supplied');
  }
  return Object.freeze({
    target: value.target,
    ...(value.reference === undefined ? {} : { reference: value.reference }),
  });
}

function normalizeTags(value: unknown, error: (message: string) => never): readonly string[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) return error('Memory tags must be an array of strings');
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const tag of value) {
    if (typeof tag !== 'string') return error('Memory tags must contain only strings');
    const normalized = tag.trim().toLowerCase();
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    tags.push(normalized);
  }
  return Object.freeze(tags);
}

function validatePersistedTags(
  value: unknown,
  error: (message: string) => never,
): readonly string[] {
  if (!Array.isArray(value)) return error('Persisted Memory tags must be an array');
  const normalized = normalizeTags(value, error);
  if (normalized.length !== value.length || normalized.some((tag, index) => tag !== value[index])) {
    return error('Persisted Memory tags must already be normalized and unique');
  }
  return normalized;
}

function snapshotRememberInput(
  input: unknown,
): Omit<MemoryRecord, 'createdAt' | 'id' | 'updatedAt'> {
  const fail = (message: string): never => inputError(message);
  if (!isPlainObject(input)) return fail('remember() input must be an object');
  if (!MEMORY_KINDS.includes(input.kind as MemoryKind)) return fail('Memory kind is invalid');
  if (!nonEmptyString(input.content)) return fail('Memory content must be non-empty');
  if (input.state !== undefined && !['candidate', 'active'].includes(input.state as string)) {
    return fail('Initial Memory state must be candidate or active');
  }
  return Object.freeze({
    kind: input.kind as MemoryKind,
    scope: validateScope(input.scope, fail),
    content: input.content,
    tags: normalizeTags(input.tags, fail),
    metadata: cloneJsonObject(input.metadata ?? {}, 'Memory metadata', fail),
    provenance: snapshotProvenance(input.provenance, fail),
    state: (input.state ?? 'candidate') as 'active' | 'candidate',
    ...(input.promotion === undefined
      ? {}
      : { promotion: snapshotPromotion(input.promotion, fail) as MemoryPromotion }),
  });
}

function snapshotTransitionInput(input: unknown): TransitionMemoryInput {
  const fail = (message: string, recordId?: string): never => {
    throw new MemoryError('INVALID_MEMORY_TRANSITION', message, recordId);
  };
  if (!isPlainObject(input) || !nonEmptyString(input.id)) {
    return fail('transition() requires a non-empty id');
  }
  const id = input.id;
  if (!MEMORY_STATES.includes(input.state as MemoryState)) {
    return fail('transition() requires a valid target state', id);
  }
  if (input.supersededBy !== undefined && !nonEmptyString(input.supersededBy)) {
    return fail('supersededBy must be non-empty when supplied', id);
  }
  return Object.freeze({
    id,
    state: input.state as MemoryState,
    ...(input.supersededBy === undefined ? {} : { supersededBy: input.supersededBy }),
    ...(input.promotion === undefined
      ? {}
      : {
          promotion: snapshotPromotion(input.promotion, (message) =>
            fail(message, id),
          ) as MemoryPromotion,
        }),
  });
}

function snapshotPersistedRecord(value: unknown, line: number): MemoryRecord {
  let recordId: string | undefined;
  const fail = (message: string): never =>
    historyError(`Memory history entry ${line}: ${message}`, recordId);
  if (!isPlainObject(value)) return fail('record must be an object');
  if (!nonEmptyString(value.id)) return fail('id must be non-empty');
  recordId = value.id;
  if (!MEMORY_KINDS.includes(value.kind as MemoryKind)) return fail('kind is invalid');
  if (!MEMORY_STATES.includes(value.state as MemoryState)) return fail('state is invalid');
  if (!nonEmptyString(value.content)) return fail('content must be non-empty');
  if (value.supersededBy !== undefined && !nonEmptyString(value.supersededBy)) {
    return fail('supersededBy must be non-empty when supplied');
  }
  return Object.freeze({
    id: value.id,
    kind: value.kind as MemoryKind,
    scope: validateScope(value.scope, fail),
    content: value.content,
    tags: validatePersistedTags(value.tags, fail),
    metadata: cloneJsonObject(value.metadata, 'Memory metadata', fail),
    provenance: snapshotProvenance(value.provenance, fail, true),
    state: value.state as MemoryState,
    createdAt: validateTimestamp(value.createdAt, 'createdAt', fail),
    updatedAt: validateTimestamp(value.updatedAt, 'updatedAt', fail),
    ...(value.supersededBy === undefined ? {} : { supersededBy: value.supersededBy }),
    ...(value.promotion === undefined
      ? {}
      : { promotion: snapshotPromotion(value.promotion, fail) as MemoryPromotion }),
  });
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length && left.every((value, index) => deepEqual(value, right[index]))
    );
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => Object.hasOwn(right, key) && deepEqual(left[key], right[key]))
    );
  }
  return false;
}

function immutableFieldsMatch(previous: MemoryRecord, next: MemoryRecord): boolean {
  return (
    previous.id === next.id &&
    previous.kind === next.kind &&
    previous.scope === next.scope &&
    previous.content === next.content &&
    previous.createdAt === next.createdAt &&
    deepEqual(previous.tags, next.tags) &&
    deepEqual(previous.metadata, next.metadata) &&
    deepEqual(previous.provenance, next.provenance)
  );
}

function validateTransitionSnapshot(
  previous: MemoryRecord,
  next: MemoryRecord,
  current: ReadonlyMap<string, MemoryRecord>,
  error: (message: string) => never,
): void {
  if (!immutableFieldsMatch(previous, next)) {
    error('transition mutated immutable identity/content fields');
  }
  if (!ALLOWED_TRANSITIONS[previous.state].includes(next.state)) {
    error(`illegal lifecycle transition ${previous.state} -> ${next.state}`);
  }
  if (next.state === 'superseded') {
    if (!nonEmptyString(next.supersededBy)) {
      error('superseded transition requires supersededBy');
    }
    const replacement = current.get(next.supersededBy);
    if (
      replacement === undefined ||
      replacement.id === next.id ||
      replacement.scope !== next.scope ||
      replacement.state !== 'active'
    ) {
      error('supersededBy must reference a different active Memory in the same scope');
    }
  } else if (next.supersededBy !== previous.supersededBy) {
    error('supersededBy may change only during a superseded transition');
  }
  if (previous.promotion !== undefined && next.promotion === undefined) {
    error('promotion metadata cannot be removed by a lifecycle transition');
  }
}

function normalizeStringFilter(
  value: unknown,
  field: string,
  error: (message: string) => never,
): readonly string[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return error(`${field} must be an array of strings`);
  }
  return normalizeTags(value, error);
}

function normalizeRecallQuery(query: unknown): NormalizedRecallQuery {
  const fail = (message: string): never => {
    throw new MemoryError('INVALID_MEMORY_QUERY', message);
  };
  if (!isPlainObject(query)) return fail('recall() query must be an object');
  let kinds: ReadonlySet<MemoryKind> | undefined;
  if (query.kinds !== undefined) {
    if (
      !Array.isArray(query.kinds) ||
      query.kinds.some((kind) => !MEMORY_KINDS.includes(kind as MemoryKind))
    ) {
      return fail('Recall kinds are invalid');
    }
    kinds = new Set(query.kinds as MemoryKind[]);
  }
  let states: ReadonlySet<MemoryState> = new Set(['active']);
  if (query.states !== undefined) {
    if (
      !Array.isArray(query.states) ||
      query.states.some((state) => !MEMORY_STATES.includes(state as MemoryState))
    ) {
      return fail('Recall states are invalid');
    }
    states = new Set(query.states as MemoryState[]);
  }
  return Object.freeze({
    scope: validateScope(query.scope, fail),
    ...(kinds === undefined ? {} : { kinds }),
    states,
    keywords: normalizeStringFilter(query.keywords, 'Recall keywords', fail),
    tags: normalizeStringFilter(query.tags, 'Recall tags', fail),
    ...(query.metadata === undefined
      ? {}
      : { metadata: cloneJsonObject(query.metadata, 'Recall metadata', fail) }),
  });
}

function jsonSubset(query: JsonValue, value: JsonValue): boolean {
  if (Array.isArray(query)) return Array.isArray(value) && deepEqual(query, value);
  if (isPlainObject(query)) {
    if (!isPlainObject(value)) return false;
    return Object.entries(query).every(
      ([key, child]) =>
        Object.hasOwn(value, key) && jsonSubset(child as JsonValue, value[key] as JsonValue),
    );
  }
  return Object.is(query, value);
}

function matchesQuery(record: MemoryRecord, query: NormalizedRecallQuery): boolean {
  if (record.scope !== query.scope || !query.states.has(record.state)) return false;
  if (query.kinds !== undefined && !query.kinds.has(record.kind)) return false;
  const content = record.content.toLowerCase();
  if (!query.keywords.every((keyword) => content.includes(keyword))) return false;
  if (!query.tags.every((tag) => record.tags.includes(tag))) return false;
  return query.metadata === undefined || jsonSubset(query.metadata, record.metadata);
}

function defaultClock(): string {
  return new Date().toISOString();
}

function readMemoryId(idFactory: MemoryIdFactory): string {
  let value: unknown;
  try {
    value = idFactory();
  } catch (error) {
    throw new MemoryError(
      'INVALID_MEMORY_ID',
      'Memory idFactory failed while creating an id',
      undefined,
      error,
    );
  }
  if (!nonEmptyString(value)) {
    throw new MemoryError('INVALID_MEMORY_ID', 'Memory idFactory must return a non-empty id');
  }
  return value;
}

function readMemoryTimestamp(clock: MemoryClock, recordId?: string): string {
  let value: unknown;
  try {
    value = clock();
  } catch (error) {
    throw new MemoryError(
      'INVALID_MEMORY_CLOCK',
      'Memory clock failed while creating a timestamp',
      recordId,
      error,
    );
  }
  return validateTimestamp(value, 'Memory clock result', (message) => {
    throw new MemoryError('INVALID_MEMORY_CLOCK', message, recordId);
  });
}

export async function createMemoryService(
  options: CreateMemoryServiceOptions,
): Promise<MemoryService> {
  if (
    options === null ||
    typeof options !== 'object' ||
    options.store === null ||
    typeof options.store !== 'object' ||
    typeof options.store.loadSnapshots !== 'function' ||
    typeof options.store.appendSnapshot !== 'function' ||
    (options.idFactory !== undefined && typeof options.idFactory !== 'function') ||
    (options.clock !== undefined && typeof options.clock !== 'function')
  ) {
    throw new MemoryError(
      'INVALID_MEMORY_DEPENDENCY',
      'MemoryService requires a store plus optional idFactory and clock callbacks',
    );
  }

  const loadSnapshots = options.store.loadSnapshots.bind(options.store);
  const appendSnapshot = options.store.appendSnapshot.bind(options.store);
  const idFactory = options.idFactory ?? randomUUID;
  const clock = options.clock ?? defaultClock;

  let loaded: readonly unknown[];
  try {
    loaded = await loadSnapshots();
  } catch (error) {
    if (error instanceof MemoryError) throw error;
    throw new MemoryError(
      'MEMORY_STORE_LOAD_FAILED',
      'MemoryStore failed to load history',
      undefined,
      error,
    );
  }
  if (!Array.isArray(loaded)) {
    throw new MemoryError(
      'MEMORY_STORE_LOAD_FAILED',
      'MemoryStore.loadSnapshots() must return an array',
    );
  }

  const current = new Map<string, MemoryRecord>();
  const creationOrder: string[] = [];
  for (const [index, value] of loaded.entries()) {
    const next = snapshotPersistedRecord(value, index + 1);
    const previous = current.get(next.id);
    if (previous === undefined) {
      if (!['candidate', 'active'].includes(next.state) || next.supersededBy !== undefined) {
        historyError(
          `Memory history entry ${index + 1}: initial snapshot must be candidate or active`,
          next.id,
        );
      }
      creationOrder.push(next.id);
    } else {
      validateTransitionSnapshot(previous, next, current, (message) =>
        historyError(`Memory history entry ${index + 1}: ${message}`, next.id),
      );
    }
    current.set(next.id, next);
  }

  let mutationTail: Promise<void> = Promise.resolve();
  const serializeMutation = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = mutationTail.then(operation);
    mutationTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const persist = async (record: MemoryRecord): Promise<void> => {
    try {
      await appendSnapshot(record);
    } catch (error) {
      throw new MemoryError(
        'MEMORY_STORE_PERSIST_FAILED',
        `MemoryStore failed to persist record ${record.id}`,
        record.id,
        error,
      );
    }
  };

  return Object.freeze({
    remember(input: RememberMemoryInput): Promise<MemoryRecord> {
      const normalized = snapshotRememberInput(input);
      return serializeMutation(async () => {
        const id = readMemoryId(idFactory);
        if (current.has(id)) {
          throw new MemoryError('DUPLICATE_MEMORY_ID', `Memory id ${id} already exists`, id);
        }
        const timestamp = readMemoryTimestamp(clock, id);
        const record = Object.freeze({
          id,
          ...normalized,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        await persist(record);
        current.set(id, record);
        creationOrder.push(id);
        return record;
      });
    },

    recall(query: RecallMemoryQuery): readonly MemoryRecord[] {
      const normalized = normalizeRecallQuery(query);
      const matches: MemoryRecord[] = [];
      for (const id of creationOrder) {
        const record = current.get(id);
        if (record !== undefined && matchesQuery(record, normalized)) matches.push(record);
      }
      return Object.freeze(matches);
    },

    transition(input: TransitionMemoryInput): Promise<MemoryRecord> {
      const normalized = snapshotTransitionInput(input);
      return serializeMutation(async () => {
        const previous = current.get(normalized.id);
        if (previous === undefined) {
          throw new MemoryError(
            'MEMORY_NOT_FOUND',
            `Memory ${normalized.id} does not exist`,
            normalized.id,
          );
        }
        if (!ALLOWED_TRANSITIONS[previous.state].includes(normalized.state)) {
          throw new MemoryError(
            'INVALID_MEMORY_TRANSITION',
            `Memory ${normalized.id} cannot transition ${previous.state} -> ${normalized.state}`,
            normalized.id,
          );
        }
        const nextState = normalized.state;
        let supersededBy = previous.supersededBy;
        if (nextState === 'superseded') {
          if (!nonEmptyString(normalized.supersededBy)) {
            throw new MemoryError(
              'INVALID_MEMORY_TRANSITION',
              'superseded transition requires supersededBy',
              normalized.id,
            );
          }
          const replacement = current.get(normalized.supersededBy);
          if (
            replacement === undefined ||
            replacement.id === previous.id ||
            replacement.scope !== previous.scope ||
            replacement.state !== 'active'
          ) {
            throw new MemoryError(
              'INVALID_MEMORY_TRANSITION',
              'supersededBy must reference a different active Memory in the same scope',
              normalized.id,
            );
          }
          supersededBy = replacement.id;
        } else if (normalized.supersededBy !== undefined) {
          throw new MemoryError(
            'INVALID_MEMORY_TRANSITION',
            'supersededBy is accepted only for a superseded transition',
            normalized.id,
          );
        }
        const promotion =
          normalized.promotion === undefined ? previous.promotion : normalized.promotion;
        const timestamp = readMemoryTimestamp(clock, normalized.id);
        const next = Object.freeze({
          ...previous,
          state: nextState,
          updatedAt: timestamp,
          ...(supersededBy === undefined ? {} : { supersededBy }),
          ...(promotion === undefined ? {} : { promotion }),
        });
        await persist(next);
        current.set(next.id, next);
        return next;
      });
    },
  });
}

export const MEMORY_CAPABILITY = createCapabilityToken<MemoryService>(MEMORY_CAPABILITY_ID);
