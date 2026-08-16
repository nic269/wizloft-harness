export type KernelDiagnosticCode =
  | 'CAPABILITY_CYCLE'
  | 'DISPOSER_FAILED'
  | 'DUPLICATE_CAPABILITY_SERVICE'
  | 'DUPLICATE_PLUGIN_NAME'
  | 'INVALID_CAPABILITY_ID'
  | 'INVALID_PLUGIN'
  | 'MISSING_CAPABILITY'
  | 'MISSING_CAPABILITY_SERVICE'
  | 'PLUGIN_SETUP_FAILED'
  | 'RUNTIME_DISPOSED'
  | 'UNDECLARED_CAPABILITY_ACCESS'
  | 'UNDECLARED_CAPABILITY_PROVISION';

export interface Diagnostic {
  readonly code: string;
  readonly severity: 'error' | 'info' | 'warning';
  readonly message: string;
  readonly pluginName?: string;
  readonly capabilityId?: string;
  readonly cause?: string;
}

export interface KernelDiagnostic extends Diagnostic {
  readonly code: KernelDiagnosticCode;
  readonly severity: 'error';
}

export interface DiagnosticSink {
  report(diagnostic: Diagnostic): void;
}

export class DiagnosticCollector implements DiagnosticSink {
  readonly #diagnostics: Diagnostic[] = [];

  get diagnostics(): readonly Diagnostic[] {
    return Object.freeze([...this.#diagnostics]);
  }

  report(diagnostic: Diagnostic): void {
    this.#diagnostics.push(Object.freeze({ ...diagnostic }));
  }
}

export class HarnessKernelError extends Error {
  readonly diagnostics: readonly KernelDiagnostic[];

  constructor(message: string, diagnostics: readonly KernelDiagnostic[], cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'HarnessKernelError';
    this.diagnostics = Object.freeze(
      diagnostics.map((diagnostic) => Object.freeze({ ...diagnostic })),
    );
  }
}
