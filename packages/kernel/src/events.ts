import { AsyncLocalStorage } from 'node:async_hooks';

import { HarnessKernelError, type KernelDiagnostic } from './diagnostics.js';
import { snapshotJson } from './profiles.js';
import type {
  AnyEventListener,
  Disposer,
  EventAccess,
  EventEnvelope,
  EventListener,
  EventPublisher,
  EventType,
  JsonValue,
} from './types.js';

export type RuntimeState = 'active' | 'booting' | 'disposed' | 'shutting-down';

interface EventRegistration {
  readonly eventType?: string;
  readonly listener: AnyEventListener;
  readonly pluginName: string;
  active: boolean;
}

interface DeliveryScope {
  active: boolean;
}

interface EventDispatcherOptions {
  readonly clock: () => Date;
  readonly emit: (diagnostic: KernelDiagnostic) => void;
  readonly runtimeId: string;
  readonly state: () => RuntimeState;
}

export interface EventDispatcher {
  readonly publisher: EventPublisher;
  accessFor(pluginName: string, trackEffect: (disposer: Disposer) => void): EventAccess;
  drain(): Promise<void>;
}

const EVENT_TYPE_PATTERN = /^\S+$/u;

function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function eventDiagnostic(
  code: KernelDiagnostic['code'],
  message: string,
  pluginName?: string,
  eventType?: string,
  eventSequence?: number,
  cause?: unknown,
): KernelDiagnostic {
  return {
    code,
    severity: 'error',
    message,
    ...(pluginName === undefined ? {} : { pluginName }),
    ...(eventType === undefined ? {} : { eventType }),
    ...(eventSequence === undefined ? {} : { eventSequence }),
    ...(cause === undefined ? {} : { cause: describeCause(cause) }),
  };
}

function invalidEventType(id: string): KernelDiagnostic {
  return eventDiagnostic('INVALID_EVENT_TYPE', `Invalid event type id: ${id}`, undefined, id);
}

export function assertEventTypeId(id: string): void {
  if (typeof id !== 'string' || !EVENT_TYPE_PATTERN.test(id)) {
    const diagnostic = invalidEventType(String(id));
    throw new HarnessKernelError(diagnostic.message, [diagnostic]);
  }
}

export function createEventType<TPayload extends JsonValue>(id: string): EventType<TPayload> {
  assertEventTypeId(id);
  return Object.freeze({ id }) as EventType<TPayload>;
}

function readEventType(type: unknown, pluginName?: string): string {
  const id = type !== null && typeof type === 'object' && 'id' in type ? type.id : undefined;
  if (typeof id !== 'string') {
    const diagnostic = eventDiagnostic(
      'INVALID_EVENT_TYPE',
      'Event tokens must expose a non-empty stable string id',
      pluginName,
      String(id),
    );
    throw new HarnessKernelError(diagnostic.message, [diagnostic]);
  }

  try {
    assertEventTypeId(id);
  } catch (error) {
    if (error instanceof HarnessKernelError && pluginName !== undefined) {
      const diagnostics = error.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        pluginName,
      }));
      throw new HarnessKernelError(error.message, diagnostics, error);
    }
    throw error;
  }
  return id;
}

function readOccurredAt(clock: () => Date): string {
  let value: Date;
  try {
    value = clock();
  } catch (error) {
    const diagnostic = eventDiagnostic(
      'INVALID_CLOCK',
      'Harness runtime clock failed while creating an event envelope',
      undefined,
      undefined,
      undefined,
      error,
    );
    throw new HarnessKernelError(diagnostic.message, [diagnostic], error);
  }
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    const diagnostic = eventDiagnostic(
      'INVALID_CLOCK',
      'Harness runtime clock must return a valid Date',
    );
    throw new HarnessKernelError(diagnostic.message, [diagnostic]);
  }
  return value.toISOString();
}

export function createEventDispatcher(options: EventDispatcherOptions): EventDispatcher {
  const deliveryContext = new AsyncLocalStorage<DeliveryScope>();
  const registrations: EventRegistration[] = [];
  let publishTail: Promise<void> = Promise.resolve();
  let sequence = 0;

  const fail = (diagnostic: KernelDiagnostic): never => {
    options.emit(diagnostic);
    throw new HarnessKernelError(diagnostic.message, [diagnostic]);
  };

  const ensureCanPublish = (pluginName?: string): void => {
    if (deliveryContext.getStore()?.active === true) {
      fail(
        eventDiagnostic(
          'EVENT_PUBLISH_REENTRANT',
          'Event publication is non-reentrant while a listener is delivering an event',
          pluginName,
        ),
      );
    }

    const state = options.state();
    if (state === 'booting') {
      fail(
        eventDiagnostic(
          'EVENT_PUBLISH_NOT_ACTIVE',
          'Events cannot be published before the Harness runtime becomes active',
          pluginName,
        ),
      );
    }
    if (state === 'shutting-down' || state === 'disposed') {
      fail(
        eventDiagnostic(
          'RUNTIME_DISPOSED',
          'Events cannot be published after Harness runtime shutdown begins',
          pluginName,
        ),
      );
    }
  };

  const publish = async <TPayload extends JsonValue>(
    type: EventType<TPayload>,
    payload: TPayload,
    pluginName?: string,
  ): Promise<EventEnvelope<TPayload>> => {
    ensureCanPublish(pluginName);

    let eventType: string;
    try {
      eventType = readEventType(type, pluginName);
    } catch (error) {
      if (error instanceof HarnessKernelError) {
        for (const diagnostic of error.diagnostics) options.emit(diagnostic);
      }
      throw error;
    }

    let immutablePayload: TPayload;
    try {
      immutablePayload = snapshotJson(payload);
    } catch (error) {
      fail(
        eventDiagnostic(
          'INVALID_EVENT_PAYLOAD',
          `Event ${eventType} payload must be JSON-compatible`,
          pluginName,
          eventType,
          undefined,
          error,
        ),
      );
    }

    const operation = publishTail.then(async (): Promise<EventEnvelope<TPayload>> => {
      let occurredAt: string;
      try {
        occurredAt = readOccurredAt(options.clock);
      } catch (error) {
        if (error instanceof HarnessKernelError) {
          for (const diagnostic of error.diagnostics) options.emit(diagnostic);
        }
        throw error;
      }

      const eventSequence = sequence + 1;
      sequence = eventSequence;
      const envelope = Object.freeze({
        runtimeId: options.runtimeId,
        type: eventType,
        sequence: eventSequence,
        occurredAt,
        payload: immutablePayload,
      }) as EventEnvelope<TPayload>;
      const listeners = registrations
        .filter(
          (registration) =>
            registration.active &&
            (registration.eventType === undefined || registration.eventType === eventType),
        )
        .map((registration) => ({
          listener: registration.listener,
          pluginName: registration.pluginName,
        }));
      const failures: KernelDiagnostic[] = [];

      for (const registration of listeners) {
        const deliveryScope: DeliveryScope = { active: true };
        try {
          await deliveryContext.run(deliveryScope, () => registration.listener(envelope));
        } catch (error) {
          const diagnostic = eventDiagnostic(
            'EVENT_LISTENER_FAILED',
            `Plugin ${registration.pluginName} listener failed for event ${eventType}#${eventSequence}`,
            registration.pluginName,
            eventType,
            eventSequence,
            error,
          );
          failures.push(diagnostic);
          options.emit(diagnostic);
        } finally {
          deliveryScope.active = false;
        }
      }

      if (failures.length > 0) {
        throw new HarnessKernelError(
          `Event ${eventType}#${eventSequence} delivery completed with errors`,
          failures,
        );
      }
      return envelope;
    });

    publishTail = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  };

  const subscribe = (
    eventType: string | undefined,
    listener: unknown,
    pluginName: string,
    trackEffect: (disposer: Disposer) => void,
  ): Disposer => {
    const state = options.state();
    if (state === 'shutting-down' || state === 'disposed') {
      return fail(
        eventDiagnostic(
          'RUNTIME_DISPOSED',
          `Plugin ${pluginName} cannot subscribe after Harness runtime shutdown begins`,
          pluginName,
          eventType,
        ),
      );
    }
    if (typeof listener !== 'function') {
      return fail(
        eventDiagnostic(
          'INVALID_EVENT_LISTENER',
          `Plugin ${pluginName} event listener must be a function`,
          pluginName,
          eventType,
        ),
      );
    }

    const registration: EventRegistration = {
      ...(eventType === undefined ? {} : { eventType }),
      listener: listener as AnyEventListener,
      pluginName,
      active: true,
    };
    registrations.push(registration);
    const dispose = (): void => {
      registration.active = false;
    };
    trackEffect(dispose);
    return dispose;
  };

  return {
    publisher: Object.freeze({
      publish<TPayload extends JsonValue>(
        type: EventType<TPayload>,
        payload: TPayload,
      ): Promise<EventEnvelope<TPayload>> {
        return publish(type, payload);
      },
    }),
    accessFor(pluginName, trackEffect): EventAccess {
      return Object.freeze({
        publish<TPayload extends JsonValue>(
          type: EventType<TPayload>,
          payload: TPayload,
        ): Promise<EventEnvelope<TPayload>> {
          return publish(type, payload, pluginName);
        },
        subscribe<TPayload extends JsonValue>(
          type: EventType<TPayload>,
          listener: EventListener<TPayload>,
        ): Disposer {
          let eventType: string;
          try {
            eventType = readEventType(type, pluginName);
          } catch (error) {
            if (error instanceof HarnessKernelError) {
              for (const diagnostic of error.diagnostics) options.emit(diagnostic);
            }
            throw error;
          }
          return subscribe(eventType, listener, pluginName, trackEffect);
        },
        subscribeAll(listener: AnyEventListener): Disposer {
          return subscribe(undefined, listener, pluginName, trackEffect);
        },
      });
    },
    drain(): Promise<void> {
      return publishTail;
    },
  };
}
