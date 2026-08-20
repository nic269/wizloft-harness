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

export function isolatedNpmArgv(root: string, method: InstallMethod): readonly string[] {
  if (method !== 'install' && method !== 'ci') {
    fail('INTERNAL_ERROR', `Unsupported isolated install method: ${String(method)}`);
  }
  const prefix = path.resolve(root, HARNESS_DIR);
  if (method === 'ci') {
    return Object.freeze(['--prefix', prefix, 'ci', '--ignore-scripts', '--no-audit', '--no-fund']);
  }
  return Object.freeze([
    'install',
    '--prefix',
    prefix,
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
  ]);
}

export async function executeIsolatedNpmInstall(request: IsolatedInstallRequest): Promise<void> {
  if (request === null || typeof request !== 'object') {
    fail('INTERNAL_ERROR', 'Isolated install requires a request');
  }
  if (typeof request.root !== 'string' || request.root.length === 0) {
    fail('INTERNAL_ERROR', 'Isolated install requires a repository root');
  }
  const argv = isolatedNpmArgv(request.root, request.method);
  await new Promise<void>((resolve, reject) => {
    execFile('npm', [...argv], { shell: false }, (error) => {
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
