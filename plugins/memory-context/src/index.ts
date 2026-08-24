import {
  CONTEXT_CAPABILITY,
  type ContextContributor,
  type ContextItem,
  type ContextRequest,
} from '@wizloft/harness-context';
import {
  type Disposer,
  type JsonObject,
  requireCapability,
  type WizloftPlugin,
} from '@wizloft/harness-kernel';
import {
  MEMORY_CAPABILITY,
  type MemoryScope,
  type MemoryService,
  type RecallMemoryQuery,
} from '@wizloft/harness-memory';

export const MEMORY_CONTEXT_PLUGIN_NAME = '@wizloft/memory-context';
export const MEMORY_CONTEXT_CONTRIBUTOR_ID = '@wizloft/memory-context:context';

export type MemoryContextMappingConfig = {
  readonly query: RecallMemoryQuery;
  readonly role: 'historical' | 'supporting';
  readonly subject: string;
};

export type MemoryContextConfig = {
  readonly mappings?: readonly MemoryContextMappingConfig[];
};

export type MemoryContextErrorCode = 'INVALID_MEMORY_CONTEXT_CONFIG';

export class MemoryContextError extends Error {
  readonly code: MemoryContextErrorCode;

  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'MemoryContextError';
    this.code = 'INVALID_MEMORY_CONTEXT_CONFIG';
  }
}

interface NormalizedMapping {
  readonly query: RecallMemoryQuery;
  readonly role: 'historical' | 'supporting';
  readonly subject: string;
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

function configError(message: string, cause?: unknown): never {
  throw new MemoryContextError(message, cause);
}

function snapshotStringArray(value: unknown, field: string): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return configError(`${field} must be an array of strings`);
  }
  return Object.freeze([...value]);
}

function snapshotEnumArray<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): readonly T[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => !allowed.includes(item as T))) {
    return configError(`${field} contains an invalid value`);
  }
  return Object.freeze([...(value as T[])]);
}

function snapshotJsonObject(value: unknown, field: string): JsonObject | undefined {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) return configError(`${field} must be a JSON object`);
  const clone = (input: unknown, path: string): unknown => {
    if (input === null || typeof input === 'boolean' || typeof input === 'string') return input;
    if (typeof input === 'number') {
      if (!Number.isFinite(input)) return configError(`${path} must contain finite JSON numbers`);
      return input;
    }
    if (Array.isArray(input)) {
      return Object.freeze(input.map((item, index) => clone(item, `${path}[${index}]`)));
    }
    if (isPlainObject(input)) {
      const object: Record<string, ReturnType<typeof clone>> = {};
      for (const [key, child] of Object.entries(input)) {
        object[key] = clone(child, `${path}.${key}`);
      }
      return Object.freeze(object);
    }
    return configError(`${path} must contain only JSON-compatible data`);
  };
  return clone(value, field) as JsonObject;
}

function normalizeConfig(value: unknown): readonly NormalizedMapping[] {
  if (!isPlainObject(value)) return configError('memory-context config must be an object');
  if (value.mappings !== undefined && !Array.isArray(value.mappings)) {
    return configError('memory-context config.mappings must be an array');
  }
  return Object.freeze(
    (value.mappings ?? []).map((entry, index) => {
      if (!isPlainObject(entry) || !nonEmptyString(entry.subject)) {
        return configError(`memory-context config.mappings[${index}] requires a non-empty subject`);
      }
      if (!['supporting', 'historical'].includes(entry.role as string)) {
        return configError(
          `memory-context config.mappings[${index}].role must be supporting or historical`,
        );
      }
      if (!isPlainObject(entry.query)) {
        return configError(`memory-context config.mappings[${index}].query must be an object`);
      }
      const kinds = snapshotEnumArray(
        entry.query.kinds,
        ['episodic', 'semantic'],
        `mappings[${index}].query.kinds`,
      );
      const states = snapshotEnumArray(
        entry.query.states,
        ['candidate', 'active', 'stale', 'superseded', 'archived'],
        `mappings[${index}].query.states`,
      );
      const keywords = snapshotStringArray(
        entry.query.keywords,
        `mappings[${index}].query.keywords`,
      );
      const tags = snapshotStringArray(entry.query.tags, `mappings[${index}].query.tags`);
      const metadata = snapshotJsonObject(
        entry.query.metadata,
        `mappings[${index}].query.metadata`,
      );
      const query = Object.freeze({
        scope: entry.query.scope as MemoryScope,
        ...(kinds === undefined ? {} : { kinds }),
        ...(states === undefined ? {} : { states }),
        ...(keywords === undefined ? {} : { keywords }),
        ...(tags === undefined ? {} : { tags }),
        ...(metadata === undefined ? {} : { metadata }),
      }) as RecallMemoryQuery;
      return Object.freeze({
        subject: entry.subject,
        role: entry.role as 'historical' | 'supporting',
        query,
      });
    }),
  );
}

function createContributor(
  memory: MemoryService,
  mappings: readonly NormalizedMapping[],
): ContextContributor {
  const recall = memory.recall.bind(memory);
  return Object.freeze({
    id: MEMORY_CONTEXT_CONTRIBUTOR_ID,
    contribute(request: ContextRequest) {
      const items: ContextItem[] = [];
      for (const [mappingIndex, mapping] of mappings.entries()) {
        if (mapping.subject !== request.subject) continue;
        for (const record of recall(mapping.query)) {
          items.push(
            Object.freeze({
              id: `memory-context:${request.subject}:${mappingIndex}:${record.id}`,
              content: record.content,
              provenance: Object.freeze({
                contributorId: MEMORY_CONTEXT_CONTRIBUTOR_ID,
                sourceType: 'memory',
                sourceId: record.id,
                ...(record.provenance.path === undefined ? {} : { path: record.provenance.path }),
              }),
              role: mapping.role,
            }),
          );
        }
      }
      return Object.freeze(items);
    },
  });
}

export const memoryContextPlugin: WizloftPlugin<MemoryContextConfig> = {
  name: MEMORY_CONTEXT_PLUGIN_NAME,
  version: '0.1.0-alpha.3',
  requires: [requireCapability(MEMORY_CAPABILITY), requireCapability(CONTEXT_CAPABILITY)],
  setup(context) {
    const mappings = normalizeConfig(context.config);
    const memory = context.capabilities.get(MEMORY_CAPABILITY);
    const contextService = context.capabilities.get(CONTEXT_CAPABILITY);
    const registerContributor = contextService.registerContributor.bind(contextService);
    for (const mapping of mappings) memory.recall(mapping.query);
    if (mappings.length === 0) return;
    const disposeContext: Disposer = registerContributor(createContributor(memory, mappings));
    return async (): Promise<void> => {
      await disposeContext();
    };
  },
};
