import { HarnessKernelError, type KernelDiagnostic } from './diagnostics.js';
import type {
  HarnessProfile,
  JsonObject,
  JsonOverride,
  JsonValue,
  ProfileLayer,
  ResolvedProfile,
  ResolvedProfilePlugin,
  WizloftPlugin,
} from './types.js';

interface MutableResolvedPlugin {
  readonly name: string;
  readonly plugin: WizloftPlugin;
  config: JsonValue;
}

function profileDiagnostic(
  code: KernelDiagnostic['code'],
  message: string,
  layerName?: string,
  pluginName?: string,
): KernelDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    ...(layerName === undefined ? {} : { layerName }),
    ...(pluginName === undefined ? {} : { pluginName }),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function defineValue(target: Record<string, JsonValue>, key: string, value: JsonValue): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function invalidData(path: string): never {
  throw new TypeError(`${path} must contain only JSON-compatible data`);
}

function cloneJson(value: unknown, path: string, ancestors: Set<object>): JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return invalidData(path);
    return value;
  }

  if (Array.isArray(value)) {
    if (ancestors.has(value)) return invalidData(path);
    ancestors.add(value);
    const cloned = value.map((item, index) => cloneJson(item, `${path}[${index}]`, ancestors));
    ancestors.delete(value);
    return cloned;
  }

  if (!isPlainObject(value)) return invalidData(path);
  if (ancestors.has(value)) return invalidData(path);
  if (Reflect.ownKeys(value).some((key) => typeof key !== 'string')) return invalidData(path);

  ancestors.add(value);
  const cloned: Record<string, JsonValue> = {};
  for (const key of Object.keys(value)) {
    const item = value[key];
    if (item === undefined) return invalidData(`${path}.${key}`);
    defineValue(cloned, key, cloneJson(item, `${path}.${key}`, ancestors));
  }
  ancestors.delete(value);
  return cloned;
}

function cloneOverride(
  value: unknown,
  path: string,
  ancestors: Set<object>,
): JsonOverride | undefined {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) return cloneJson(value, path, ancestors) as JsonOverride;
  if (ancestors.has(value)) return invalidData(path);
  if (Reflect.ownKeys(value).some((key) => typeof key !== 'string')) return invalidData(path);

  ancestors.add(value);
  const cloned: Record<string, JsonOverride | undefined> = {};
  for (const key of Object.keys(value)) {
    const item = value[key];
    Object.defineProperty(cloned, key, {
      configurable: true,
      enumerable: true,
      value: cloneOverride(item, `${path}.${key}`, ancestors),
      writable: true,
    });
  }
  ancestors.delete(value);
  return cloned;
}

function mergeConfig(current: JsonValue, override: JsonOverride | undefined): JsonValue {
  if (override === undefined) return current;
  if (!isPlainObject(current) || !isPlainObject(override)) {
    return cloneJson(override, 'config override', new Set());
  }

  const merged = cloneJson(current, 'current config', new Set()) as Record<string, JsonValue>;
  for (const key of Object.keys(override)) {
    const next = override[key];
    if (next === undefined) continue;
    const previous = merged[key];
    defineValue(
      merged,
      key,
      previous === undefined
        ? cloneJson(next, `config override.${key}`, new Set())
        : mergeConfig(previous, next),
    );
  }
  return merged;
}

export function deepFreezeJson<T extends JsonValue>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Array.isArray(value) ? value : Object.values(value)) {
      deepFreezeJson(child);
    }
    Object.freeze(value);
  }
  return value;
}

export function snapshotJson<T extends JsonValue>(value: T): T {
  return deepFreezeJson(cloneJson(value, 'value', new Set()) as T);
}

function readLayer(value: unknown, index: number): ProfileLayer {
  if (value === null || typeof value !== 'object') {
    const diagnostic = profileDiagnostic(
      'INVALID_PROFILE',
      `Profile layer at index ${index} must be an object`,
    );
    throw new HarnessKernelError(diagnostic.message, [diagnostic]);
  }

  const layer = value as Partial<ProfileLayer>;
  if (typeof layer.name !== 'string' || layer.name.trim().length === 0) {
    const diagnostic = profileDiagnostic(
      'INVALID_PROFILE',
      `Profile layer at index ${index} must have a non-empty name`,
    );
    throw new HarnessKernelError(diagnostic.message, [diagnostic]);
  }
  if (layer.plugins !== undefined && !Array.isArray(layer.plugins)) {
    const diagnostic = profileDiagnostic(
      'INVALID_PROFILE',
      `Profile layer ${layer.name} plugins must be an array`,
      layer.name,
    );
    throw new HarnessKernelError(diagnostic.message, [diagnostic]);
  }
  if (layer.config !== undefined && !isPlainObject(layer.config)) {
    const diagnostic = profileDiagnostic(
      'INVALID_PROFILE',
      `Profile layer ${layer.name} config must be a plain object`,
      layer.name,
    );
    throw new HarnessKernelError(diagnostic.message, [diagnostic]);
  }
  return layer as ProfileLayer;
}

function pluginName(plugin: unknown): string | undefined {
  if (plugin === null || typeof plugin !== 'object' || !('name' in plugin)) return undefined;
  return typeof plugin.name === 'string' && plugin.name.trim().length > 0 ? plugin.name : undefined;
}

export function defineProfile(profile: HarnessProfile): HarnessProfile {
  return profile;
}

export function composeProfile(profile: HarnessProfile): ResolvedProfile {
  const candidate: unknown = profile;
  if (
    candidate === null ||
    typeof candidate !== 'object' ||
    !('layers' in candidate) ||
    !Array.isArray(candidate.layers)
  ) {
    const diagnostic = profileDiagnostic(
      'INVALID_PROFILE',
      'Harness profile must contain a layers array',
    );
    throw new HarnessKernelError(diagnostic.message, [diagnostic]);
  }

  const resolved = new Map<string, MutableResolvedPlugin>();
  const diagnostics: KernelDiagnostic[] = [];

  for (const [index, value] of candidate.layers.entries()) {
    let layer: ProfileLayer;
    try {
      layer = readLayer(value, index);
    } catch (error) {
      if (error instanceof HarnessKernelError) diagnostics.push(...error.diagnostics);
      else throw error;
      continue;
    }

    for (const plugin of layer.plugins ?? []) {
      const name = pluginName(plugin);
      if (!name) {
        diagnostics.push(
          profileDiagnostic(
            'INVALID_PLUGIN',
            `Profile layer ${layer.name} contains a plugin without a valid name`,
            layer.name,
            '<unknown>',
          ),
        );
        continue;
      }
      if (resolved.has(name)) {
        diagnostics.push(
          profileDiagnostic(
            'DUPLICATE_PLUGIN_NAME',
            `Profile layer ${layer.name} adds duplicate plugin ${name}`,
            layer.name,
            name,
          ),
        );
        continue;
      }
      resolved.set(name, { name, plugin, config: {} });
    }

    for (const [name, rawOverride] of Object.entries(layer.config ?? {})) {
      const target = resolved.get(name);
      if (!target) {
        diagnostics.push(
          profileDiagnostic(
            'UNKNOWN_PLUGIN_CONFIG',
            `Profile layer ${layer.name} config targets plugin ${name} before it is added`,
            layer.name,
            name,
          ),
        );
        continue;
      }

      try {
        const override = cloneOverride(
          rawOverride,
          `Profile layer ${layer.name} config for ${name}`,
          new Set(),
        );
        target.config = mergeConfig(target.config, override);
      } catch (error) {
        diagnostics.push(
          profileDiagnostic(
            'INVALID_CONFIG',
            `Profile layer ${layer.name} has invalid config for plugin ${name}: ${error instanceof Error ? error.message : String(error)}`,
            layer.name,
            name,
          ),
        );
      }
    }
  }

  if (diagnostics.length > 0) {
    throw new HarnessKernelError('Profile composition failed', diagnostics);
  }

  const plugins: ResolvedProfilePlugin[] = [...resolved.values()].map((entry) =>
    Object.freeze({
      name: entry.name,
      plugin: entry.plugin,
      config: deepFreezeJson(entry.config),
    }),
  );

  return Object.freeze({ plugins: Object.freeze(plugins) });
}

export function profileFromPlugins(plugins: readonly WizloftPlugin[]): ResolvedProfile {
  return composeProfile({ layers: [{ name: 'runtime', plugins }] });
}

export function emptyPluginConfig(): JsonObject {
  return Object.freeze({});
}
