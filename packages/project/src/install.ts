import { execFile } from 'node:child_process';
import path from 'node:path';

import { errorCode, fail } from './errors.js';
import { HARNESS_DIR } from './paths.js';
import type { InstallMethod } from './plan.js';

export type IsolatedInstallRequest = {
  readonly method: InstallMethod;
  readonly root: string;
};

export type IsolatedInstaller = (request: IsolatedInstallRequest) => Promise<void>;

export type IsolatedNpmInvocation = {
  readonly argv: readonly string[];
  readonly cwd: string;
};

export function isolatedNpmInvocation(root: string, method: InstallMethod): IsolatedNpmInvocation {
  if (method !== 'install' && method !== 'ci') {
    fail('INTERNAL_ERROR', `Unsupported isolated install method: ${String(method)}`);
  }
  return Object.freeze({
    argv: Object.freeze([method, '--ignore-scripts', '--no-audit', '--no-fund']),
    cwd: path.resolve(root, HARNESS_DIR),
  });
}

export async function executeIsolatedNpmInstall(request: IsolatedInstallRequest): Promise<void> {
  if (request === null || typeof request !== 'object') {
    fail('INTERNAL_ERROR', 'Isolated install requires a request');
  }
  if (typeof request.root !== 'string' || request.root.length === 0) {
    fail('INTERNAL_ERROR', 'Isolated install requires a repository root');
  }
  const invocation = isolatedNpmInvocation(request.root, request.method);
  await new Promise<void>((resolve, reject) => {
    execFile('npm', [...invocation.argv], { cwd: invocation.cwd, shell: false }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  }).catch((error: unknown) => {
    const code = errorCode(error);
    if (code === 'ENOENT') {
      fail(
        'INSTALL_FAILED',
        'Cannot execute npm for isolated Harness materialization',
        { method: request.method, path: HARNESS_DIR },
        error,
      );
    }
    const exitCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    fail(
      'INSTALL_FAILED',
      'Isolated npm materialization failed',
      {
        method: request.method,
        path: HARNESS_DIR,
        ...(typeof exitCode === 'number' ? { exitCode } : {}),
      },
      error,
    );
  });
}
