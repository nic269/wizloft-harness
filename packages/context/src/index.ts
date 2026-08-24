import {
  createCapabilityToken,
  type Disposer,
  declareCapability,
  type JsonValue,
  type MaybePromise,
  type WizloftPlugin,
} from '@wizloft/harness-kernel';

export const CONTEXT_CAPABILITY_ID = 'context@1';
export const CONTEXT_PLUGIN_NAME = '@wizloft/context';

export type ContextRole = 'authority' | 'historical' | 'supporting';

export interface ContextRequest {
  readonly subject: string;
}

export interface ContextProvenance {
  readonly contributorId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly path?: string;
}

export interface ContextItem<TContent extends JsonValue = JsonValue> {
  readonly id: string;
  readonly content: TContent;
  readonly provenance: ContextProvenance;
  readonly role: ContextRole;
}

export interface ContextContributor {
  readonly id: string;
  contribute(request: ContextRequest): MaybePromise<readonly ContextItem[] | ContextItem[]>;
}

export interface ContextResolution {
  readonly subject: string;
  readonly authority: readonly ContextItem[];
  readonly supporting: readonly ContextItem[];
  readonly historical: readonly ContextItem[];
}

export interface ContextService {
  registerContributor(contributor: ContextContributor): Disposer;
  resolve(request: ContextRequest): Promise<ContextResolution>;
}

export type ContextErrorCode =
  | 'DUPLICATE_CONTEXT_CONTRIBUTOR'
  | 'INVALID_CONTEXT_CONTRIBUTOR'
  | 'INVALID_CONTEXT_ITEM'
  | 'INVALID_CONTEXT_REQUEST';

export class ContextError extends Error {
  readonly code: ContextErrorCode;

  constructor(code: ContextErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ContextError';
    this.code = code;
  }
}

interface ContributorRegistration {
  readonly contribute: ContextContributor['contribute'];
  readonly id: string;
  active: boolean;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function cloneJson(value: unknown, field: string): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new ContextError('INVALID_CONTEXT_ITEM', `${field} must be finite JSON data`);
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
  throw new ContextError('INVALID_CONTEXT_ITEM', `${field} must contain only JSON-compatible data`);
}

function snapshotProvenance(
  value: unknown,
  contributorId: string,
  itemId: string,
): ContextProvenance {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ContextError(
      'INVALID_CONTEXT_ITEM',
      `Context item ${itemId} must include provenance`,
    );
  }
  const provenance = value as Partial<ContextProvenance>;
  if (
    provenance.contributorId !== contributorId ||
    !nonEmptyString(provenance.sourceId) ||
    !nonEmptyString(provenance.sourceType) ||
    (provenance.path !== undefined && !nonEmptyString(provenance.path))
  ) {
    throw new ContextError('INVALID_CONTEXT_ITEM', `Context item ${itemId} has invalid provenance`);
  }
  return Object.freeze({
    contributorId,
    sourceId: provenance.sourceId,
    sourceType: provenance.sourceType,
    ...(provenance.path === undefined ? {} : { path: provenance.path }),
  });
}

function snapshotItem(value: unknown, contributorId: string): ContextItem {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ContextError(
      'INVALID_CONTEXT_ITEM',
      `Context contributor ${contributorId} returned a non-object item`,
    );
  }
  const item = value as Partial<ContextItem>;
  if (
    !nonEmptyString(item.id) ||
    !Object.hasOwn(item, 'content') ||
    !['authority', 'supporting', 'historical'].includes(item.role ?? '')
  ) {
    throw new ContextError(
      'INVALID_CONTEXT_ITEM',
      `Context contributor ${contributorId} returned an invalid item`,
    );
  }
  return Object.freeze({
    id: item.id,
    content: cloneJson(item.content, `Context item ${item.id}.content`),
    provenance: snapshotProvenance(item.provenance, contributorId, item.id),
    role: item.role as ContextRole,
  });
}

function validateRequest(request: unknown): ContextRequest {
  if (
    request === null ||
    typeof request !== 'object' ||
    Array.isArray(request) ||
    !nonEmptyString((request as Partial<ContextRequest>).subject)
  ) {
    throw new ContextError(
      'INVALID_CONTEXT_REQUEST',
      'Context requests must include a non-empty subject',
    );
  }
  return Object.freeze({ subject: (request as ContextRequest).subject });
}

export function createContextService(): ContextService {
  const registrations: ContributorRegistration[] = [];

  return {
    registerContributor(contributor: ContextContributor): Disposer {
      if (
        contributor === null ||
        typeof contributor !== 'object' ||
        !nonEmptyString(contributor.id) ||
        typeof contributor.contribute !== 'function'
      ) {
        throw new ContextError(
          'INVALID_CONTEXT_CONTRIBUTOR',
          'Context contributors must declare a non-empty id and contribute(request)',
        );
      }
      const id = contributor.id;
      const contribute = contributor.contribute.bind(contributor);
      if (registrations.some((registration) => registration.active && registration.id === id)) {
        throw new ContextError(
          'DUPLICATE_CONTEXT_CONTRIBUTOR',
          `Context contributor ${id} is already registered`,
        );
      }

      const registration: ContributorRegistration = {
        id,
        contribute,
        active: true,
      };
      registrations.push(registration);
      return (): void => {
        registration.active = false;
      };
    },

    async resolve(request: ContextRequest): Promise<ContextResolution> {
      const normalizedRequest = validateRequest(request);
      const authority: ContextItem[] = [];
      const supporting: ContextItem[] = [];
      const historical: ContextItem[] = [];
      const activeRegistrations = registrations.filter((registration) => registration.active);

      for (const registration of activeRegistrations) {
        const contributed = await registration.contribute(normalizedRequest);
        if (!Array.isArray(contributed)) {
          throw new ContextError(
            'INVALID_CONTEXT_ITEM',
            `Context contributor ${registration.id} must return an array`,
          );
        }
        for (const value of contributed) {
          const item = snapshotItem(value, registration.id);
          if (item.role === 'authority') authority.push(item);
          else if (item.role === 'supporting') supporting.push(item);
          else historical.push(item);
        }
      }

      return Object.freeze({
        subject: normalizedRequest.subject,
        authority: Object.freeze(authority),
        supporting: Object.freeze(supporting),
        historical: Object.freeze(historical),
      });
    },
  };
}

export const CONTEXT_CAPABILITY = createCapabilityToken<ContextService>(CONTEXT_CAPABILITY_ID);

export const contextPlugin: WizloftPlugin = {
  name: CONTEXT_PLUGIN_NAME,
  version: '0.1.0-alpha.3',
  provides: [declareCapability(CONTEXT_CAPABILITY)],
  setup(context) {
    context.capabilities.provide(CONTEXT_CAPABILITY, createContextService());
  },
};
