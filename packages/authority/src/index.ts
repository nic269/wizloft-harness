import {
  createCapabilityToken,
  type Disposer,
  declareCapability,
  type JsonValue,
  type MaybePromise,
  type WizloftPlugin,
} from '@wizloft/harness-kernel';

export const AUTHORITY_CAPABILITY_ID = 'authority@1';
export const AUTHORITY_PLUGIN_NAME = '@wizloft/authority';

export type AuthorityStatus = 'ambiguous' | 'conflict' | 'missing' | 'resolved';

export interface AuthorityRequest {
  readonly subject: string;
}

export interface AuthorityProvenance {
  readonly contributorId: string;
  readonly sourceId: string;
  readonly sourceType: string;
  readonly path?: string;
}

export interface AuthorityCandidate<TContent extends JsonValue = JsonValue> {
  readonly id: string;
  readonly content: TContent;
  readonly precedence: number;
  readonly provenance: AuthorityProvenance;
  readonly resolutionKey?: string;
}

export interface AuthorityContributor {
  readonly id: string;
  contribute(
    request: AuthorityRequest,
  ): MaybePromise<readonly AuthorityCandidate[] | AuthorityCandidate[]>;
}

export interface AuthorityResolution {
  readonly status: AuthorityStatus;
  readonly subject: string;
  readonly contenders: readonly AuthorityCandidate[];
  readonly shadowed: readonly AuthorityCandidate[];
}

export interface AuthorityService {
  registerContributor(contributor: AuthorityContributor): Disposer;
  resolve(request: AuthorityRequest): Promise<AuthorityResolution>;
}

export type AuthorityErrorCode =
  | 'DUPLICATE_AUTHORITY_CONTRIBUTOR'
  | 'INVALID_AUTHORITY_CANDIDATE'
  | 'INVALID_AUTHORITY_CONTRIBUTOR'
  | 'INVALID_AUTHORITY_REQUEST';

export class AuthorityError extends Error {
  readonly code: AuthorityErrorCode;

  constructor(code: AuthorityErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'AuthorityError';
    this.code = code;
  }
}

interface ContributorRegistration {
  readonly contribute: AuthorityContributor['contribute'];
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
      throw new AuthorityError('INVALID_AUTHORITY_CANDIDATE', `${field} must be finite JSON data`);
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
  throw new AuthorityError(
    'INVALID_AUTHORITY_CANDIDATE',
    `${field} must contain only JSON-compatible data`,
  );
}

function snapshotProvenance(
  value: unknown,
  contributorId: string,
  candidateId: string,
): AuthorityProvenance {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new AuthorityError(
      'INVALID_AUTHORITY_CANDIDATE',
      `Authority candidate ${candidateId} must include provenance`,
    );
  }
  const provenance = value as Partial<AuthorityProvenance>;
  if (
    provenance.contributorId !== contributorId ||
    !nonEmptyString(provenance.sourceId) ||
    !nonEmptyString(provenance.sourceType) ||
    (provenance.path !== undefined && !nonEmptyString(provenance.path))
  ) {
    throw new AuthorityError(
      'INVALID_AUTHORITY_CANDIDATE',
      `Authority candidate ${candidateId} has invalid provenance`,
    );
  }
  return Object.freeze({
    contributorId,
    sourceId: provenance.sourceId,
    sourceType: provenance.sourceType,
    ...(provenance.path === undefined ? {} : { path: provenance.path }),
  });
}

function snapshotCandidate(value: unknown, contributorId: string): AuthorityCandidate {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new AuthorityError(
      'INVALID_AUTHORITY_CANDIDATE',
      `Authority contributor ${contributorId} returned a non-object candidate`,
    );
  }
  const candidate = value as Partial<AuthorityCandidate>;
  if (
    !nonEmptyString(candidate.id) ||
    typeof candidate.precedence !== 'number' ||
    !Number.isFinite(candidate.precedence) ||
    !Object.hasOwn(candidate, 'content') ||
    (candidate.resolutionKey !== undefined && !nonEmptyString(candidate.resolutionKey))
  ) {
    throw new AuthorityError(
      'INVALID_AUTHORITY_CANDIDATE',
      `Authority contributor ${contributorId} returned an invalid candidate`,
    );
  }

  return Object.freeze({
    id: candidate.id,
    content: cloneJson(candidate.content, `Authority candidate ${candidate.id}.content`),
    precedence: candidate.precedence,
    provenance: snapshotProvenance(candidate.provenance, contributorId, candidate.id),
    ...(candidate.resolutionKey === undefined ? {} : { resolutionKey: candidate.resolutionKey }),
  });
}

function validateRequest(request: unknown): AuthorityRequest {
  if (
    request === null ||
    typeof request !== 'object' ||
    Array.isArray(request) ||
    !nonEmptyString((request as Partial<AuthorityRequest>).subject)
  ) {
    throw new AuthorityError(
      'INVALID_AUTHORITY_REQUEST',
      'Authority requests must include a non-empty subject',
    );
  }
  return Object.freeze({ subject: (request as AuthorityRequest).subject });
}

function resolveStatus(contenders: readonly AuthorityCandidate[]): AuthorityStatus {
  if (contenders.length === 0) return 'missing';
  if (contenders.length === 1) return 'resolved';

  const keys = contenders.map((candidate) => candidate.resolutionKey);
  if (keys.some((key) => key === undefined)) return 'ambiguous';
  return new Set(keys).size === 1 ? 'resolved' : 'conflict';
}

export function createAuthorityService(): AuthorityService {
  const registrations: ContributorRegistration[] = [];

  return {
    registerContributor(contributor: AuthorityContributor): Disposer {
      if (
        contributor === null ||
        typeof contributor !== 'object' ||
        !nonEmptyString(contributor.id) ||
        typeof contributor.contribute !== 'function'
      ) {
        throw new AuthorityError(
          'INVALID_AUTHORITY_CONTRIBUTOR',
          'Authority contributors must declare a non-empty id and contribute(request)',
        );
      }
      const id = contributor.id;
      const contribute = contributor.contribute.bind(contributor);
      if (registrations.some((registration) => registration.active && registration.id === id)) {
        throw new AuthorityError(
          'DUPLICATE_AUTHORITY_CONTRIBUTOR',
          `Authority contributor ${id} is already registered`,
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

    async resolve(request: AuthorityRequest): Promise<AuthorityResolution> {
      const normalizedRequest = validateRequest(request);
      const candidates: AuthorityCandidate[] = [];
      const activeRegistrations = registrations.filter((registration) => registration.active);

      for (const registration of activeRegistrations) {
        const contributed = await registration.contribute(normalizedRequest);
        if (!Array.isArray(contributed)) {
          throw new AuthorityError(
            'INVALID_AUTHORITY_CANDIDATE',
            `Authority contributor ${registration.id} must return an array`,
          );
        }
        for (const candidate of contributed) {
          candidates.push(snapshotCandidate(candidate, registration.id));
        }
      }

      if (candidates.length === 0) {
        return Object.freeze({
          status: 'missing',
          subject: normalizedRequest.subject,
          contenders: Object.freeze([]),
          shadowed: Object.freeze([]),
        });
      }

      const highestPrecedence = Math.max(...candidates.map(({ precedence }) => precedence));
      const contenders = Object.freeze(
        candidates.filter(({ precedence }) => precedence === highestPrecedence),
      );
      const shadowed = Object.freeze(
        candidates.filter(({ precedence }) => precedence !== highestPrecedence),
      );

      return Object.freeze({
        status: resolveStatus(contenders),
        subject: normalizedRequest.subject,
        contenders,
        shadowed,
      });
    },
  };
}

export const AUTHORITY_CAPABILITY =
  createCapabilityToken<AuthorityService>(AUTHORITY_CAPABILITY_ID);

export const authorityPlugin: WizloftPlugin = {
  name: AUTHORITY_PLUGIN_NAME,
  version: '0.1.2-alpha.3',
  provides: [declareCapability(AUTHORITY_CAPABILITY)],
  setup(context) {
    context.capabilities.provide(AUTHORITY_CAPABILITY, createAuthorityService());
  },
};
