import { assertCapabilityId } from './capabilities.js';
import {
  type Diagnostic,
  DiagnosticCollector,
  type DiagnosticSink,
  HarnessKernelError,
  type KernelDiagnostic,
} from './diagnostics.js';
import type {
  CapabilityId,
  CapabilityToken,
  CreateHarnessRuntimeOptions,
  Disposer,
  HarnessRuntime,
  PluginContext,
  WizloftPlugin,
} from './types.js';

interface PluginRecord {
  readonly name: string;
  readonly version: string;
  readonly setup: WizloftPlugin['setup'];
  readonly requires: Set<CapabilityId>;
  readonly provides: Set<CapabilityId>;
  readonly effects: Disposer[];
}

interface ActiveService {
  readonly owner: PluginRecord;
  readonly value: unknown;
}

interface Composition {
  readonly order: PluginRecord[];
}

function compareNames(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function pluginDiagnostic(
  code: KernelDiagnostic['code'],
  message: string,
  pluginName: string,
  capabilityId?: string,
  cause?: unknown,
): KernelDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    pluginName,
    ...(capabilityId === undefined ? {} : { capabilityId }),
    ...(cause === undefined ? {} : { cause: describeCause(cause) }),
  };
}

function capabilityIds(
  declarations: unknown,
  pluginName: string,
  field: string,
): Set<CapabilityId> {
  const ids = new Set<CapabilityId>();

  if (declarations === undefined) return ids;
  if (!Array.isArray(declarations)) {
    const diagnostic = pluginDiagnostic(
      'INVALID_PLUGIN',
      `Plugin ${pluginName} ${field} must be an array`,
      pluginName,
    );
    throw new HarnessKernelError(diagnostic.message, [diagnostic]);
  }

  for (const declaration of declarations) {
    const token =
      declaration !== null && typeof declaration === 'object' && 'token' in declaration
        ? declaration.token
        : undefined;
    const id = token !== null && typeof token === 'object' && 'id' in token ? token.id : undefined;

    if (typeof id !== 'string') {
      const diagnostic = pluginDiagnostic(
        'INVALID_CAPABILITY_ID',
        `Plugin ${pluginName} ${field} contains a capability without a valid id`,
        pluginName,
        String(id),
      );
      throw new HarnessKernelError(diagnostic.message, [diagnostic]);
    }

    try {
      assertCapabilityId(id);
    } catch (error) {
      if (error instanceof HarnessKernelError) {
        const diagnostics = error.diagnostics.map((diagnostic) => ({
          ...diagnostic,
          pluginName,
        }));
        throw new HarnessKernelError(error.message, diagnostics, error);
      }
      throw error;
    }

    ids.add(id);
  }

  return ids;
}

function findCycle(
  records: readonly PluginRecord[],
  dependencies: ReadonlyMap<PluginRecord, ReadonlyMap<PluginRecord, readonly CapabilityId[]>>,
): PluginRecord[] {
  const state = new Map<PluginRecord, 'visiting' | 'visited'>();
  const stack: PluginRecord[] = [];

  const visit = (record: PluginRecord): PluginRecord[] | undefined => {
    state.set(record, 'visiting');
    stack.push(record);

    const providers = [...(dependencies.get(record)?.keys() ?? [])].sort((left, right) =>
      compareNames(left.name, right.name),
    );

    for (const provider of providers) {
      if (state.get(provider) === 'visiting') {
        const cycleStart = stack.indexOf(provider);
        return [...stack.slice(cycleStart), provider];
      }

      if (state.get(provider) !== 'visited') {
        const cycle = visit(provider);
        if (cycle) return cycle;
      }
    }

    stack.pop();
    state.set(record, 'visited');
    return undefined;
  };

  for (const record of [...records].sort((left, right) => compareNames(left.name, right.name))) {
    if (!state.has(record)) {
      const cycle = visit(record);
      if (cycle) return cycle;
    }
  }

  return [];
}

function resolveComposition(
  plugins: readonly unknown[],
  emit: (d: KernelDiagnostic) => void,
): Composition {
  const diagnostics: KernelDiagnostic[] = [];
  const names = new Set<string>();
  const records: PluginRecord[] = [];

  for (const plugin of plugins) {
    if (plugin === null || typeof plugin !== 'object') {
      diagnostics.push(
        pluginDiagnostic(
          'INVALID_PLUGIN',
          'Plugins must be objects with name, version, and setup fields',
          '<unknown>',
        ),
      );
      continue;
    }

    const candidate = plugin as Partial<WizloftPlugin>;
    if (
      typeof candidate.name !== 'string' ||
      candidate.name.trim().length === 0 ||
      typeof candidate.version !== 'string' ||
      candidate.version.trim().length === 0 ||
      typeof candidate.setup !== 'function'
    ) {
      diagnostics.push(
        pluginDiagnostic(
          'INVALID_PLUGIN',
          'Plugins must declare non-empty name and version values plus a setup function',
          typeof candidate.name === 'string' ? candidate.name : '<unknown>',
        ),
      );
      continue;
    }

    const name = candidate.name;
    const version = candidate.version;
    if (names.has(name)) {
      diagnostics.push(
        pluginDiagnostic(
          'DUPLICATE_PLUGIN_NAME',
          `Duplicate plugin name in resolved runtime: ${name}`,
          name,
        ),
      );
      continue;
    }

    names.add(name);

    try {
      records.push({
        name,
        version,
        setup: candidate.setup.bind(plugin),
        requires: capabilityIds(candidate.requires, name, 'requires'),
        provides: capabilityIds(candidate.provides, name, 'provides'),
        effects: [],
      });
    } catch (error) {
      if (error instanceof HarnessKernelError) diagnostics.push(...error.diagnostics);
      else throw error;
    }
  }

  const providers = new Map<CapabilityId, PluginRecord>();

  for (const record of records) {
    for (const capabilityId of record.provides) {
      const existing = providers.get(capabilityId);
      if (existing) {
        diagnostics.push(
          pluginDiagnostic(
            'DUPLICATE_CAPABILITY_SERVICE',
            `Capability ${capabilityId} is declared by both ${existing.name} and ${record.name}`,
            record.name,
            capabilityId,
          ),
        );
      } else {
        providers.set(capabilityId, record);
      }
    }
  }

  for (const record of records) {
    for (const capabilityId of record.requires) {
      if (!providers.has(capabilityId)) {
        diagnostics.push(
          pluginDiagnostic(
            'MISSING_CAPABILITY',
            `Plugin ${record.name} requires missing capability ${capabilityId}`,
            record.name,
            capabilityId,
          ),
        );
      }
    }
  }

  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) emit(diagnostic);
    throw new HarnessKernelError('Plugin composition failed', diagnostics);
  }

  const dependencies = new Map<PluginRecord, Map<PluginRecord, CapabilityId[]>>();
  const dependents = new Map<PluginRecord, Set<PluginRecord>>();
  const indegree = new Map<PluginRecord, number>();

  for (const record of records) {
    dependencies.set(record, new Map());
    dependents.set(record, new Set());
    indegree.set(record, 0);
  }

  for (const consumer of records) {
    for (const capabilityId of consumer.requires) {
      const provider = providers.get(capabilityId);
      if (!provider) continue;

      const dependencyCapabilities = dependencies.get(consumer)?.get(provider) ?? [];
      dependencyCapabilities.push(capabilityId);
      dependencies.get(consumer)?.set(provider, dependencyCapabilities);

      const providerDependents = dependents.get(provider);
      if (providerDependents && !providerDependents.has(consumer)) {
        providerDependents.add(consumer);
        indegree.set(consumer, (indegree.get(consumer) ?? 0) + 1);
      }
    }
  }

  const ready = records
    .filter((record) => indegree.get(record) === 0)
    .sort((left, right) => compareNames(left.name, right.name));
  const order: PluginRecord[] = [];

  while (ready.length > 0) {
    const record = ready.shift();
    if (!record) break;
    order.push(record);

    const nextRecords = [...(dependents.get(record) ?? [])].sort((left, right) =>
      compareNames(left.name, right.name),
    );

    for (const next of nextRecords) {
      const nextIndegree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextIndegree);
      if (nextIndegree === 0) {
        ready.push(next);
        ready.sort((left, right) => compareNames(left.name, right.name));
      }
    }
  }

  if (order.length !== records.length) {
    const cycle = findCycle(records, dependencies);
    const edges = cycle.slice(0, -1).map((consumer, index) => {
      const provider = cycle[index + 1];
      const ids = provider ? (dependencies.get(consumer)?.get(provider) ?? []) : [];
      return `${consumer.name} --[${ids.join(', ')}]--> ${provider?.name ?? '?'}`;
    });
    const diagnostic: KernelDiagnostic = {
      code: 'CAPABILITY_CYCLE',
      severity: 'error',
      message: `Capability dependency cycle: ${edges.join('; ')}`,
    };
    emit(diagnostic);
    throw new HarnessKernelError('Plugin composition contains a capability cycle', [diagnostic]);
  }

  return { order };
}

export async function createHarnessRuntime(
  options: CreateHarnessRuntimeOptions,
): Promise<HarnessRuntime> {
  const collector = new DiagnosticCollector();
  const runtimeOptions: unknown = options;
  if (
    runtimeOptions === null ||
    typeof runtimeOptions !== 'object' ||
    !('plugins' in runtimeOptions) ||
    !Array.isArray(runtimeOptions.plugins)
  ) {
    const diagnostic = pluginDiagnostic(
      'INVALID_PLUGIN',
      'Harness runtime options must contain a plugins array',
      '<runtime>',
    );
    collector.report(diagnostic);
    throw new HarnessKernelError(diagnostic.message, [diagnostic]);
  }

  const diagnosticsOption =
    'diagnostics' in runtimeOptions ? runtimeOptions.diagnostics : undefined;
  if (
    diagnosticsOption !== undefined &&
    (diagnosticsOption === null ||
      typeof diagnosticsOption !== 'object' ||
      !('report' in diagnosticsOption) ||
      typeof diagnosticsOption.report !== 'function')
  ) {
    const diagnostic = pluginDiagnostic(
      'INVALID_PLUGIN',
      'Harness runtime diagnostics must implement report(diagnostic)',
      '<runtime>',
    );
    collector.report(diagnostic);
    throw new HarnessKernelError(diagnostic.message, [diagnostic]);
  }

  const externalSink = diagnosticsOption as DiagnosticSink | undefined;
  const emit = (diagnostic: Diagnostic): void => {
    const immutableDiagnostic = Object.freeze({ ...diagnostic });
    collector.report(immutableDiagnostic);
    try {
      externalSink?.report(immutableDiagnostic);
    } catch {
      // Diagnostic observers must not compromise kernel cleanup invariants.
    }
  };

  const composition = resolveComposition(runtimeOptions.plugins, emit);
  const services = new Map<CapabilityId, ActiveService>();
  const initialized: PluginRecord[] = [];
  let state: 'booting' | 'active' | 'shutting-down' | 'disposed' = 'booting';
  let shutdownPromise: Promise<void> | undefined;

  const fail = (diagnostic: KernelDiagnostic): never => {
    emit(diagnostic);
    throw new HarnessKernelError(diagnostic.message, [diagnostic]);
  };

  const readCapabilityId = (token: unknown, pluginName?: string): CapabilityId => {
    const id = token !== null && typeof token === 'object' && 'id' in token ? token.id : undefined;

    if (typeof id !== 'string') {
      return fail({
        code: 'INVALID_CAPABILITY_ID',
        severity: 'error',
        message: 'Capability tokens must expose a valid exact-major id',
        ...(pluginName === undefined ? {} : { pluginName }),
        capabilityId: String(id),
      });
    }

    try {
      assertCapabilityId(id);
    } catch (error) {
      if (error instanceof HarnessKernelError) {
        const diagnostic = {
          ...error.diagnostics[0],
          ...(pluginName === undefined ? {} : { pluginName }),
        } as KernelDiagnostic;
        return fail(diagnostic);
      }
      throw error;
    }

    return id;
  };

  const cleanupRecord = async (
    record: PluginRecord,
    phase: 'rollback' | 'shutdown',
  ): Promise<KernelDiagnostic[]> => {
    const failures: KernelDiagnostic[] = [];

    for (const dispose of [...record.effects].reverse()) {
      try {
        await dispose();
      } catch (error) {
        const diagnostic = pluginDiagnostic(
          'DISPOSER_FAILED',
          `Plugin ${record.name} disposer failed during ${phase}`,
          record.name,
          undefined,
          error,
        );
        failures.push(diagnostic);
        emit(diagnostic);
      }
    }

    record.effects.length = 0;
    return failures;
  };

  const contextFor = (record: PluginRecord): PluginContext => ({
    capabilities: {
      get<T>(token: CapabilityToken<T>): T {
        const capabilityId = readCapabilityId(token, record.name);
        if (state === 'disposed') {
          return fail(
            pluginDiagnostic(
              'RUNTIME_DISPOSED',
              `Plugin ${record.name} cannot access ${capabilityId} after shutdown completes`,
              record.name,
              capabilityId,
            ),
          );
        }

        if (!record.requires.has(capabilityId)) {
          return fail(
            pluginDiagnostic(
              'UNDECLARED_CAPABILITY_ACCESS',
              `Plugin ${record.name} accessed undeclared capability ${capabilityId}`,
              record.name,
              capabilityId,
            ),
          );
        }

        const active = services.get(capabilityId);
        if (!active) {
          return fail(
            pluginDiagnostic(
              'MISSING_CAPABILITY_SERVICE',
              `Capability ${capabilityId} is not active for plugin ${record.name}`,
              record.name,
              capabilityId,
            ),
          );
        }

        return active.value as T;
      },
      provide<T>(token: CapabilityToken<T>, service: T): Disposer {
        const capabilityId = readCapabilityId(token, record.name);
        if (state === 'shutting-down' || state === 'disposed') {
          return fail(
            pluginDiagnostic(
              'RUNTIME_DISPOSED',
              `Plugin ${record.name} cannot provide ${capabilityId} after shutdown begins`,
              record.name,
              capabilityId,
            ),
          );
        }

        if (!record.provides.has(capabilityId)) {
          return fail(
            pluginDiagnostic(
              'UNDECLARED_CAPABILITY_PROVISION',
              `Plugin ${record.name} provided undeclared capability ${capabilityId}`,
              record.name,
              capabilityId,
            ),
          );
        }

        if (services.has(capabilityId)) {
          return fail(
            pluginDiagnostic(
              'DUPLICATE_CAPABILITY_SERVICE',
              `Capability ${capabilityId} already has an active service`,
              record.name,
              capabilityId,
            ),
          );
        }

        const registration: ActiveService = { owner: record, value: service };
        services.set(capabilityId, registration);
        let registered = true;
        const dispose = (): void => {
          if (!registered) return;
          registered = false;
          if (services.get(capabilityId) === registration) services.delete(capabilityId);
        };
        record.effects.push(dispose);
        return dispose;
      },
    },
    diagnostics: {
      report(diagnostic): void {
        emit({
          ...diagnostic,
          pluginName: diagnostic.pluginName ?? record.name,
        });
      },
    },
  });

  try {
    for (const record of composition.order) {
      try {
        const setupDisposer = await record.setup(contextFor(record));
        if (setupDisposer !== undefined) {
          if (typeof setupDisposer !== 'function') {
            throw new TypeError('Plugin setup must return void or a disposer function');
          }
          record.effects.push(setupDisposer);
        }

        for (const capabilityId of record.provides) {
          if (services.get(capabilityId)?.owner !== record) {
            fail(
              pluginDiagnostic(
                'MISSING_CAPABILITY_SERVICE',
                `Plugin ${record.name} declared ${capabilityId} but did not provide its service`,
                record.name,
                capabilityId,
              ),
            );
          }
        }

        initialized.push(record);
      } catch (error) {
        const setupDiagnostic = pluginDiagnostic(
          'PLUGIN_SETUP_FAILED',
          `Plugin ${record.name} setup failed`,
          record.name,
          undefined,
          error,
        );
        emit(setupDiagnostic);
        const cleanupDiagnostics = await cleanupRecord(record, 'rollback');

        for (const initializedRecord of [...initialized].reverse()) {
          cleanupDiagnostics.push(...(await cleanupRecord(initializedRecord, 'rollback')));
        }

        const originalDiagnostics = error instanceof HarnessKernelError ? error.diagnostics : [];
        throw new HarnessKernelError(
          setupDiagnostic.message,
          [...originalDiagnostics, setupDiagnostic, ...cleanupDiagnostics],
          error,
        );
      }
    }
  } catch (error) {
    state = 'disposed';
    throw error;
  }

  state = 'active';

  return {
    get diagnostics(): readonly Diagnostic[] {
      return collector.diagnostics;
    },
    pluginOrder: Object.freeze(composition.order.map((record) => record.name)),
    getCapability<T>(token: CapabilityToken<T>): T {
      const capabilityId = readCapabilityId(token);
      if (state !== 'active') {
        return fail({
          code: 'RUNTIME_DISPOSED',
          severity: 'error',
          message: `Cannot access capability ${capabilityId} after shutdown begins`,
          capabilityId,
        });
      }

      const active = services.get(capabilityId);
      if (!active) {
        return fail({
          code: 'MISSING_CAPABILITY_SERVICE',
          severity: 'error',
          message: `Capability ${capabilityId} does not have an active service`,
          capabilityId,
        });
      }

      return active.value as T;
    },
    shutdown(): Promise<void> {
      shutdownPromise ??= (async () => {
        state = 'shutting-down';
        const failures: KernelDiagnostic[] = [];

        for (const record of [...initialized].reverse()) {
          failures.push(...(await cleanupRecord(record, 'shutdown')));
        }

        state = 'disposed';
        if (failures.length > 0) {
          throw new HarnessKernelError('Harness runtime shutdown completed with errors', failures);
        }
      })();

      return shutdownPromise;
    },
  };
}
