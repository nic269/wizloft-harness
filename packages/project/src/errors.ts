export type ProjectErrorCode =
  | 'APPLY_UNAVAILABLE'
  | 'APPLY_FORBIDDEN'
  | 'GIT_INVALID'
  | 'GIT_MISSING'
  | 'INTERNAL_ERROR'
  | 'INVALID_ARGV'
  | 'INVALID_OVERLAY'
  | 'INVALID_PROFILE'
  | 'INVALID_PROJECT_ID'
  | 'IO_FAILURE'
  | 'LOCAL_RUNTIME_INVALID'
  | 'MANAGED_BLOCK_CONFLICT'
  | 'MANAGED_PATH_OUTSIDE_ROOT'
  | 'MANAGED_PATH_SYMLINK'
  | 'MANAGED_PATH_WRONG_TYPE'
  | 'MARKER_CONFLICT'
  | 'PROJECT_ID_CONFLICT'
  | 'ROOT_MISSING'
  | 'ROOT_NOT_DIRECTORY'
  | 'STALE_PLAN'
  | 'UNSUPPORTED_NODE';

export type ProjectErrorDetails = {
  readonly [key: string]: boolean | number | string | readonly string[] | undefined;
};

export class HarnessProjectError extends Error {
  readonly code: ProjectErrorCode;
  readonly details?: ProjectErrorDetails;

  constructor(
    code: ProjectErrorCode,
    message: string,
    details?: ProjectErrorDetails,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'HarnessProjectError';
    this.code = code;
    if (details !== undefined) {
      this.details = Object.freeze({ ...details });
    }
  }
}

export function isUsageErrorCode(code: ProjectErrorCode): boolean {
  return code === 'INVALID_ARGV' || code === 'INVALID_PROJECT_ID';
}

export function errorCode(error: unknown): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }
  return undefined;
}

export function isFilesystemErrno(error: unknown): error is NodeJS.ErrnoException {
  const code = errorCode(error);
  return code !== undefined && /^E[A-Z]+$/u.test(code);
}

export function fail(
  code: ProjectErrorCode,
  message: string,
  details?: ProjectErrorDetails,
  cause?: unknown,
): never {
  throw new HarnessProjectError(code, message, details, cause);
}
