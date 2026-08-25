import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { declareCapability, type WizloftPlugin } from '@wizloft/harness-kernel';
import {
  createMemoryService,
  MEMORY_CAPABILITY,
  type MemoryRecord,
  type MemoryStore,
} from '@wizloft/harness-memory';

export const FILE_MEMORY_PLUGIN_NAME = '@wizloft/file-memory';

export type FileMemoryConfig = {
  readonly path: string;
};

export type FileMemoryErrorCode =
  | 'FILE_MEMORY_READ_FAILED'
  | 'FILE_MEMORY_WRITE_FAILED'
  | 'INVALID_FILE_MEMORY_CONFIG'
  | 'INVALID_FILE_MEMORY_HISTORY';

export class FileMemoryError extends Error {
  readonly code: FileMemoryErrorCode;
  readonly lineNumber?: number;

  constructor(code: FileMemoryErrorCode, message: string, lineNumber?: number, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'FileMemoryError';
    this.code = code;
    if (lineNumber !== undefined) this.lineNumber = lineNumber;
  }
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

function configError(message: string): never {
  throw new FileMemoryError('INVALID_FILE_MEMORY_CONFIG', message);
}

function normalizeConfig(value: unknown): FileMemoryConfig {
  if (!isPlainObject(value) || !nonEmptyString(value.path)) {
    return configError('file-memory config requires a non-empty path');
  }
  if (Object.hasOwn(value, 'context')) {
    return configError('Memory Context mappings belong to @wizloft/memory-context');
  }
  return Object.freeze({ path: value.path });
}

export function createFileMemoryStore(filePath: string): MemoryStore {
  if (!nonEmptyString(filePath)) {
    throw new FileMemoryError('INVALID_FILE_MEMORY_CONFIG', 'file-memory path must be non-empty');
  }
  let writeTail: Promise<void> = Promise.resolve();

  return Object.freeze({
    async loadSnapshots(): Promise<readonly unknown[]> {
      let content: string;
      try {
        content = await readFile(filePath, 'utf8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return Object.freeze([]);
        throw new FileMemoryError(
          'FILE_MEMORY_READ_FAILED',
          `Cannot read Memory history: ${filePath}`,
          undefined,
          error,
        );
      }
      if (content.length === 0) return Object.freeze([]);
      const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
      const snapshots: unknown[] = [];
      for (const [index, line] of lines.entries()) {
        const lineNumber = index + 1;
        if (line.trim().length === 0) {
          throw new FileMemoryError(
            'INVALID_FILE_MEMORY_HISTORY',
            `Memory history line ${lineNumber} is empty`,
            lineNumber,
          );
        }
        try {
          snapshots.push(JSON.parse(line));
        } catch (error) {
          throw new FileMemoryError(
            'INVALID_FILE_MEMORY_HISTORY',
            `Memory history line ${lineNumber} is malformed JSON`,
            lineNumber,
            error,
          );
        }
      }
      return Object.freeze(snapshots);
    },

    appendSnapshot(record: MemoryRecord): Promise<void> {
      const write = writeTail.then(async () => {
        try {
          await mkdir(dirname(filePath), { recursive: true });
          await appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8');
        } catch (error) {
          throw new FileMemoryError(
            'FILE_MEMORY_WRITE_FAILED',
            `Cannot append Memory history: ${filePath}`,
            undefined,
            error,
          );
        }
      });
      writeTail = write.then(
        () => undefined,
        () => undefined,
      );
      return write;
    },
  });
}

export const fileMemoryPlugin: WizloftPlugin<FileMemoryConfig> = {
  name: FILE_MEMORY_PLUGIN_NAME,
  version: '0.1.0-alpha.4',
  provides: [declareCapability(MEMORY_CAPABILITY)],
  async setup(context) {
    const config = normalizeConfig(context.config);
    const memory = await createMemoryService({ store: createFileMemoryStore(config.path) });
    context.capabilities.provide(MEMORY_CAPABILITY, memory);
  },
};
