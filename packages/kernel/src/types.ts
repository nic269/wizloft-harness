import type { Diagnostic, DiagnosticSink } from './diagnostics.js';

declare const capabilityServiceType: unique symbol;

export type CapabilityId = `${string}@${number}`;
export type MaybePromise<T> = T | PromiseLike<T>;
export type Disposer = () => MaybePromise<void>;

export interface CapabilityToken<T> {
  readonly id: CapabilityId;
  readonly [capabilityServiceType]?: T;
}

export interface CapabilityRequirement<T = unknown> {
  readonly token: CapabilityToken<T>;
}

export interface CapabilityDeclaration<T = unknown> {
  readonly token: CapabilityToken<T>;
}

export interface CapabilityAccess {
  get<T>(token: CapabilityToken<T>): T;
  provide<T>(token: CapabilityToken<T>, service: T): Disposer;
}

export interface PluginContext {
  readonly capabilities: CapabilityAccess;
  readonly diagnostics: DiagnosticSink;
}

export interface WizloftPlugin {
  readonly name: string;
  readonly version: string;
  readonly requires?: readonly CapabilityRequirement[];
  readonly provides?: readonly CapabilityDeclaration[];
  // biome-ignore lint/suspicious/noConfusingVoidType: setup may intentionally omit a disposer.
  setup(context: PluginContext): MaybePromise<void | Disposer>;
}

export interface HarnessRuntime {
  readonly diagnostics: readonly Diagnostic[];
  readonly pluginOrder: readonly string[];
  getCapability<T>(token: CapabilityToken<T>): T;
  shutdown(): Promise<void>;
}

export interface CreateHarnessRuntimeOptions {
  readonly plugins: readonly WizloftPlugin[];
  readonly diagnostics?: DiagnosticSink;
}
