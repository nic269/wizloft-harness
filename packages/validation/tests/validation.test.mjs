import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEvidenceService,
  EVIDENCE_CAPABILITY,
  EvidenceError,
  evidencePlugin,
} from '../../evidence/dist/index.js';
import { createHarnessRuntime } from '../../kernel/dist/index.js';
import {
  createValidationService,
  normalizeValidationRequest,
  VALIDATION_CAPABILITY,
  ValidationError,
  ValidationInfrastructureError,
  validationPlugin,
} from '../dist/index.js';

function createEventPublisher(publish = async () => undefined) {
  let sequence = 0;
  return {
    async publish(type, payload) {
      sequence += 1;
      await publish(type, payload, sequence);
      return {
        occurredAt: '2026-08-16T00:00:00.000Z',
        payload,
        runtimeId: 'validation-test',
        sequence,
        type: type.id,
      };
    },
  };
}

function createServices({ publish, timer } = {}) {
  let evidenceSequence = 0;
  const evidence = createEvidenceService({
    clock: () => new Date('2026-08-16T01:02:03.004Z'),
    events: createEventPublisher(publish),
    idFactory: () => `evidence-${++evidenceSequence}`,
  });
  return {
    evidence,
    validation: createValidationService({ evidence, ...(timer === undefined ? {} : { timer }) }),
  };
}

const request = {
  correlationId: 'work-1',
  changedPaths: ['src/index.ts'],
  sourceRevision: 'abc123',
  metadata: { target: 'unit' },
};

test('validation normalizes, deduplicates, and freezes project-relative changed paths', () => {
  const metadata = { nested: ['before'] };
  const normalized = normalizeValidationRequest({
    correlationId: 'work-paths',
    changedPaths: ['./src\\index.ts', 'src/index.ts', 'src/../README.md'],
    metadata,
  });
  metadata.nested[0] = 'after';

  assert.deepEqual(normalized.changedPaths, ['src/index.ts', 'README.md']);
  assert.deepEqual(normalized.metadata, { nested: ['before'] });
  assert.ok(Object.isFrozen(normalized));
  assert.ok(Object.isFrozen(normalized.changedPaths));
  assert.ok(Object.isFrozen(normalized.metadata));
  assert.ok(Object.isFrozen(normalized.metadata.nested));

  for (const changedPath of ['', '.', '../outside', '/absolute', 'C:\\absolute']) {
    assert.throws(
      () => normalizeValidationRequest({ correlationId: 'work', changedPaths: [changedPath] }),
      (error) => error instanceof ValidationError && error.code === 'INVALID_VALIDATION_REQUEST',
    );
  }
});

test('select exposes deterministic proof without executing validators', async () => {
  const { validation } = createServices();
  const calls = [];
  validation.registerValidator({
    id: 'focused.selected',
    kind: 'focused',
    applicable(value) {
      calls.push(`applicable:${value.changedPaths[0]}`);
      return true;
    },
    execute() {
      calls.push('execute:focused');
      return { status: 'passed', summary: 'focused passed' };
    },
  });
  validation.registerValidator({
    id: 'root.always',
    kind: 'root-required',
    execute() {
      calls.push('execute:root');
      return { status: 'passed', summary: 'root passed' };
    },
  });
  validation.registerValidator({
    id: 'focused.skipped',
    kind: 'focused',
    applicable() {
      calls.push('applicable:skipped');
      return false;
    },
    execute() {
      calls.push('execute:skipped');
      return { status: 'passed', summary: 'not reached' };
    },
  });

  const selection = await validation.select({
    correlationId: 'work-select',
    changedPaths: ['./src\\index.ts', 'src/index.ts'],
  });

  assert.deepEqual(
    selection.entries.map(({ validatorId, status }) => ({ validatorId, status })),
    [
      { validatorId: 'focused.selected', status: 'selected' },
      { validatorId: 'root.always', status: 'selected' },
      { validatorId: 'focused.skipped', status: 'not-applicable' },
    ],
  );
  assert.deepEqual(selection.request.changedPaths, ['src/index.ts']);
  assert.deepEqual(calls, ['applicable:src/index.ts', 'applicable:skipped']);
  assert.ok(Object.isFrozen(selection));
  assert.ok(Object.isFrozen(selection.entries));
});

test('run uses selection order and continues after applicability, failed, and execution outcomes', async () => {
  const timerValues = [10, 15, 20, 29, 30, 34];
  const { validation } = createServices({ timer: () => timerValues.shift() });
  const calls = [];
  validation.registerValidator({
    id: 'focused.applicability-error',
    kind: 'focused',
    applicable() {
      calls.push('applicable-error');
      throw new Error('cannot inspect change');
    },
    execute() {
      throw new Error('not reached');
    },
  });
  validation.registerValidator({
    id: 'root.failed',
    kind: 'root-required',
    execute() {
      calls.push('failed');
      return { status: 'failed', summary: 'proof failed', metadata: { count: 1 } };
    },
  });
  validation.registerValidator({
    id: 'focused.execution-error',
    kind: 'focused',
    applicable() {
      calls.push('applicable-execution');
      return true;
    },
    execute() {
      calls.push('execution-error');
      throw new Error('tool crashed');
    },
  });
  validation.registerValidator({
    id: 'root.passed',
    kind: 'root-required',
    execute() {
      calls.push('passed');
      return { status: 'passed', summary: 'proof passed' };
    },
  });

  const report = await validation.run(request);

  assert.equal(report.ok, false);
  assert.deepEqual(calls, [
    'applicable-error',
    'applicable-execution',
    'failed',
    'execution-error',
    'passed',
  ]);
  assert.deepEqual(
    report.outcomes.map(({ validatorId, status, errorPhase, durationMs, evidenceId }) => ({
      validatorId,
      status,
      errorPhase,
      durationMs,
      evidenceId,
    })),
    [
      {
        validatorId: 'focused.applicability-error',
        status: 'error',
        errorPhase: 'applicability',
        durationMs: 0,
        evidenceId: 'evidence-1',
      },
      {
        validatorId: 'root.failed',
        status: 'failed',
        errorPhase: undefined,
        durationMs: 5,
        evidenceId: 'evidence-2',
      },
      {
        validatorId: 'focused.execution-error',
        status: 'error',
        errorPhase: 'execution',
        durationMs: 9,
        evidenceId: 'evidence-3',
      },
      {
        validatorId: 'root.passed',
        status: 'passed',
        errorPhase: undefined,
        durationMs: 4,
        evidenceId: 'evidence-4',
      },
    ],
  );
  assert.ok(Object.isFrozen(report));
  assert.ok(Object.isFrozen(report.outcomes));
});

test('validator registration snapshots identity, callbacks, and this binding until disposal', async () => {
  const { validation } = createServices();
  const validator = {
    id: 'stable.validator',
    kind: 'focused',
    label: 'registered behavior',
    applicable() {
      return this.label === 'registered behavior';
    },
    execute() {
      return { status: 'passed', summary: this.label };
    },
  };
  const dispose = validation.registerValidator(validator);

  validator.id = 'mutated.validator';
  validator.kind = 'root-required';
  validator.applicable = () => false;
  validator.execute = () => ({ status: 'failed', summary: 'replacement behavior' });

  assert.throws(
    () =>
      validation.registerValidator({
        id: 'stable.validator',
        kind: 'root-required',
        execute: () => ({ status: 'passed', summary: 'duplicate' }),
      }),
    (error) => error instanceof ValidationError && error.code === 'DUPLICATE_VALIDATOR_ID',
  );
  const report = await validation.run(request);
  assert.equal(report.outcomes[0].validatorId, 'stable.validator');
  assert.equal(report.outcomes[0].status, 'passed');
  assert.equal(report.outcomes[0].summary, 'registered behavior');

  await dispose();
  validation.registerValidator({
    id: 'stable.validator',
    kind: 'root-required',
    execute: () => ({ status: 'passed', summary: 'reused' }),
  });
});

test('invalid applicability return becomes an applicability error and later proof still runs', async () => {
  const { validation } = createServices();
  validation.registerValidator({
    id: 'focused.invalid-applicability',
    kind: 'focused',
    applicable: () => 'yes',
    execute: () => ({ status: 'passed', summary: 'not reached' }),
  });
  validation.registerValidator({
    id: 'root.after-invalid',
    kind: 'root-required',
    execute: () => ({ status: 'passed', summary: 'still ran' }),
  });

  const report = await validation.run(request);

  assert.equal(report.ok, false);
  assert.deepEqual(
    report.outcomes.map(({ validatorId, status, errorPhase }) => ({
      validatorId,
      status,
      errorPhase,
    })),
    [
      {
        validatorId: 'focused.invalid-applicability',
        status: 'error',
        errorPhase: 'applicability',
      },
      { validatorId: 'root.after-invalid', status: 'passed', errorPhase: undefined },
    ],
  );
});

test('validator duration excludes evidence recording and event publication time', async () => {
  const timerValues = [100, 112];
  let publicationCompleted = false;
  const { validation } = createServices({
    publish: async () => {
      publicationCompleted = true;
    },
    timer: () => timerValues.shift(),
  });
  validation.registerValidator({
    id: 'root.duration',
    kind: 'root-required',
    execute() {
      assert.equal(publicationCompleted, false);
      return { status: 'passed', summary: 'timed' };
    },
  });

  const report = await validation.run(request);

  assert.equal(report.outcomes[0].durationMs, 12);
  assert.equal(publicationCompleted, true);
  assert.equal(timerValues.length, 0);
});

test('validation evidence preserves outcome order and trace links', async () => {
  const { evidence, validation } = createServices();
  validation.registerValidator({
    id: 'root.first',
    kind: 'root-required',
    execute: () => ({ status: 'passed', summary: 'first' }),
  });
  validation.registerValidator({
    id: 'root.second',
    kind: 'root-required',
    execute: () => ({ status: 'failed', summary: 'second', metadata: { reason: 'expected' } }),
  });

  const report = await validation.run(request);
  const records = evidence.list();

  assert.deepEqual(
    records.map(({ payload }) => payload.validatorId),
    ['root.first', 'root.second'],
  );
  assert.deepEqual(
    report.outcomes.map(({ evidenceId }) => evidenceId),
    records.map(({ id }) => id),
  );
  assert.deepEqual(records[1].payload, {
    validatorId: 'root.second',
    status: 'failed',
    durationMs: records[1].payload.durationMs,
    summary: 'second',
    sourceRevision: 'abc123',
    metadata: { reason: 'expected' },
  });
});

test('validation snapshots the validated Evidence record callback at construction', async () => {
  const evidence = {
    records: [],
    async record(input) {
      const record = {
        id: `stable-evidence-${this.records.length + 1}`,
        correlationId: input.correlationId,
        kind: input.kind,
        recordedAt: '2026-08-16T00:00:00.000Z',
        payload: input.payload,
      };
      this.records.push(record);
      return record;
    },
    list() {
      return this.records;
    },
  };
  const validation = createValidationService({ evidence });
  evidence.record = async () => {
    throw new Error('replacement Evidence recorder must not run');
  };
  validation.registerValidator({
    id: 'root.stable-evidence',
    kind: 'root-required',
    execute: () => ({ status: 'passed', summary: 'stable dependency passed' }),
  });

  const report = await validation.run(request);

  assert.equal(report.ok, true);
  assert.equal(report.outcomes[0].evidenceId, 'stable-evidence-1');
  assert.equal(evidence.records.length, 1);
});

test('evidence infrastructure failures reject after all proof with completed report', async () => {
  const executed = [];
  const eventFailure = new Error('file-events unavailable');
  const { evidence, validation } = createServices({
    publish: async (_type, _payload, sequence) => {
      if (sequence === 1) throw eventFailure;
    },
  });
  validation.registerValidator({
    id: 'root.first',
    kind: 'root-required',
    execute() {
      executed.push('first');
      return { status: 'passed', summary: 'first passed' };
    },
  });
  validation.registerValidator({
    id: 'root.second',
    kind: 'root-required',
    execute() {
      executed.push('second');
      return { status: 'failed', summary: 'second failed' };
    },
  });

  await assert.rejects(validation.run(request), (error) => {
    assert.ok(error instanceof ValidationInfrastructureError);
    assert.equal(error.code, 'VALIDATION_INFRASTRUCTURE_FAILED');
    assert.deepEqual(executed, ['first', 'second']);
    assert.equal(error.report.ok, false);
    assert.deepEqual(
      error.report.outcomes.map(({ validatorId, evidenceId }) => ({ validatorId, evidenceId })),
      [
        { validatorId: 'root.first', evidenceId: 'evidence-1' },
        { validatorId: 'root.second', evidenceId: 'evidence-2' },
      ],
    );
    assert.equal(error.failures.length, 1);
    const [{ cause, ...failure }] = error.failures;
    assert.deepEqual(failure, {
      code: 'EVIDENCE_EVENT_PUBLISH_FAILED',
      evidenceId: 'evidence-1',
      message: 'Evidence evidence-1 was accepted but its recorded event failed',
      validatorId: 'root.first',
    });
    assert.ok(cause instanceof EvidenceError);
    assert.strictEqual(cause.cause, eventFailure);
    return true;
  });
  assert.equal(evidence.list().length, 2);
});

test('default plugins compose evidence and validation as runtime-scoped capabilities', async () => {
  const runtime = await createHarnessRuntime({ plugins: [validationPlugin, evidencePlugin] });
  const validation = runtime.getCapability(VALIDATION_CAPABILITY);
  const evidence = runtime.getCapability(EVIDENCE_CAPABILITY);
  validation.registerValidator({
    id: 'root.runtime',
    kind: 'root-required',
    execute: () => ({ status: 'passed', summary: 'runtime proof passed' }),
  });

  const report = await validation.run({
    correlationId: 'runtime-work',
    changedPaths: ['README.md'],
  });

  assert.deepEqual(runtime.pluginOrder, ['@wizloft/evidence', '@wizloft/validation']);
  assert.equal(report.ok, true);
  assert.equal(report.outcomes[0].evidenceId, evidence.list()[0].id);
  await runtime.shutdown();
});
