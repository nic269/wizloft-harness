import type { Diagnostic, DiagnosticSink } from './diagnostics.js';

declare const capabilityServiceType: unique symbol;
declare const eventPayloadType: unique symbol;

export type CapabilityId = `${string}@${number}`;
export type MaybePromise<T> = T | PromiseLike<T>;
export type Disposer = () => MaybePromise<void>;
export type JsonPrimitive = boolean | null | number | string;
export type JsonArray = readonly JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };
export type JsonValue = JsonArray | JsonObject | JsonPrimitive;
export type JsonObjectOverride = {
  readonly [key: string]: JsonOverride | undefined;
};
export type JsonOverride = JsonObjectOverride | JsonPrimitive | readonly JsonValue[];

export type DeepReadonly<T> = T extends JsonPrimitive
  ? T
  : T extends readonly (infer TItem)[]
    ? readonly DeepReadonly<TItem>[]
    : T extends object
      ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
      : never;

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

export interface EventType<TPayload extends JsonValue> {
  readonly id: string;
  readonly [eventPayloadType]?: TPayload;
}

export interface EventEnvelope<TPayload extends JsonValue = JsonValue> {
  readonly runtimeId: string;
  readonly type: string;
  readonly sequence: number;
  readonly occurredAt: string;
  readonly payload: DeepReadonly<TPayload>;
}

export type EventListener<TPayload extends JsonValue> = (
  event: EventEnvelope<TPayload>,
) => MaybePromise<void>;

export type AnyEventListener = (event: EventEnvelope) => MaybePromise<void>;

export interface EventPublisher {
  publish<TPayload extends JsonValue>(
    type: EventType<TPayload>,
    payload: TPayload,
  ): Promise<EventEnvelope<TPayload>>;
}

export interface EventAccess extends EventPublisher {
  subscribe<TPayload extends JsonValue>(
    type: EventType<TPayload>,
    listener: EventListener<TPayload>,
  ): Disposer;
  subscribeAll(listener: AnyEventListener): Disposer;
}

export interface PluginContext<TConfig extends JsonValue = JsonObject> {
  readonly config: DeepReadonly<TConfig>;
  readonly capabilities: CapabilityAccess;
  readonly events: EventAccess;
  readonly diagnostics: DiagnosticSink;
}

export interface WizloftPlugin<TConfig extends JsonValue = JsonObject> {
  readonly name: string;
  readonly version: string;
  readonly requires?: readonly CapabilityRequirement[];
  readonly provides?: readonly CapabilityDeclaration[];
  // biome-ignore lint/suspicious/noConfusingVoidType: setup may intentionally omit a disposer.
  setup(context: PluginContext<TConfig>): MaybePromise<void | Disposer>;
}

export interface ProfileLayer {
  readonly name: string;
  readonly plugins?: readonly WizloftPlugin[];
  readonly config?: Readonly<Record<string, JsonOverride | undefined>>;
}

export interface HarnessProfile {
  readonly layers: readonly ProfileLayer[];
}

export interface ResolvedProfilePlugin {
  readonly name: string;
  readonly plugin: WizloftPlugin;
  readonly config: JsonValue;
}

export interface ResolvedProfile {
  readonly plugins: readonly ResolvedProfilePlugin[];
}

export type HarnessRuntimeState = 'active' | 'booting' | 'disposed' | 'shutting-down';

export interface HarnessRuntimePluginInspection {
  readonly name: string;
  readonly version: string;
  readonly requires: readonly CapabilityId[];
  readonly provides: readonly CapabilityId[];
}

export interface HarnessRuntimeCapabilityInspection {
  readonly id: CapabilityId;
  readonly provider: {
    readonly name: string;
    readonly version: string;
  };
}

export interface HarnessRuntimeInspection {
  readonly runtimeId: string;
  readonly state: HarnessRuntimeState;
  readonly plugins: readonly HarnessRuntimePluginInspection[];
  readonly capabilities: readonly HarnessRuntimeCapabilityInspection[];
  readonly diagnostics: readonly Diagnostic[];
}

export interface HarnessRuntime {
  readonly diagnostics: readonly Diagnostic[];
  readonly events: EventPublisher;
  readonly pluginOrder: readonly string[];
  readonly runtimeId: string;
  getCapability<T>(token: CapabilityToken<T>): T;
  inspect(): HarnessRuntimeInspection;
  shutdown(): Promise<void>;
}

interface HarnessRuntimeEnvironmentOptions {
  readonly clock?: () => Date;
  readonly diagnostics?: DiagnosticSink;
  readonly runtimeIdGenerator?: () => string;
}

export type CreateHarnessRuntimeOptions = HarnessRuntimeEnvironmentOptions &
  (
    | {
        readonly plugins: readonly WizloftPlugin[];
        readonly profile?: never;
      }
    | {
        readonly plugins?: never;
        readonly profile: HarnessProfile;
      }
  );
