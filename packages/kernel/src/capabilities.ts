import { HarnessKernelError, type KernelDiagnostic } from './diagnostics.js';
import type {
  CapabilityDeclaration,
  CapabilityId,
  CapabilityRequirement,
  CapabilityToken,
} from './types.js';

const CAPABILITY_ID_PATTERN = /^\S+@(0|[1-9]\d*)$/u;

function invalidCapabilityDiagnostic(id: string): KernelDiagnostic {
  return {
    code: 'INVALID_CAPABILITY_ID',
    severity: 'error',
    message: `Invalid exact-major capability id: ${id}`,
    capabilityId: id,
  };
}

export function assertCapabilityId(id: string): asserts id is CapabilityId {
  if (typeof id !== 'string' || !CAPABILITY_ID_PATTERN.test(id)) {
    const diagnostic = invalidCapabilityDiagnostic(String(id));
    throw new HarnessKernelError(diagnostic.message, [diagnostic]);
  }
}

export function createCapabilityToken<T>(id: CapabilityId): CapabilityToken<T> {
  assertCapabilityId(id);
  return Object.freeze({ id }) as CapabilityToken<T>;
}

export function requireCapability<T>(token: CapabilityToken<T>): CapabilityRequirement<T> {
  return Object.freeze({ token });
}

export function declareCapability<T>(token: CapabilityToken<T>): CapabilityDeclaration<T> {
  return Object.freeze({ token });
}
