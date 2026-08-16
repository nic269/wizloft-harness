# Minimum Useful Harness (MUH)

Status: Passed (2026-08-17)

MUH is the stop condition for initial Harness implementation. Once these pass, stop adding platform features and move to self-hosting / Wizloft CLI rebuild.

## Required capabilities

### Kernel

- deterministic plugin host;
- capability registry/requirements;
- dependency graph with missing/cycle diagnostics;
- lifecycle/disposer seam;
- diagnostics.

### Configuration/profiles/events

- typed project/profile composition;
- deterministic layering;
- event bus;
- append-only file event persistence.

### Context + Authority

- repository/file contributors;
- explicit provenance;
- authority precedence/statuses;
- context composition that distinguishes authority/history/memory.

### Validation + Evidence

- validator registration/applicability;
- execution/result contract;
- deterministic normalized evidence;
- event/evidence integration.

### Memory

- episodic + semantic records;
- org/project/workspace/session scope;
- provenance;
- candidate/active/stale/superseded/archived lifecycle;
- file/JSONL persistence across restart;
- basic keyword/metadata recall;
- repository authority wins over conflicting memory.

### SDK/command seam

- define/compose/run profile;
- inspect plugin/capability graph;
- resolve context/authority;
- remember/recall memory;
- run validation/read evidence;
- inspect events;
- structured command API and reusable CLI adapter;
- no global CLI binary owned by Harness.

## Explicitly not required for MUH

- Codex native adapter;
- DeepSeek integration;
- workflow engine;
- subagents/jobs;
- web UI;
- vector/embedding search;
- SQLite/Postgres memory provider;
- autonomous memory extraction;
- remote execution;
- plugin marketplace.

## Exit statement

MUH is achieved when Harness is reliable enough to help rebuild Wizloft CLI with itself. It does not mean feature complete.

## Observed evaluation

- all required capability categories have focused package regressions;
- `tests/muh.test.mjs` composes real first-party providers and exercises the public facade, command,
  CLI adapter, inspection, durability reads, and shutdown as one executable flow;
- repository and fresh exact-minimum Node 22.13.0 verification pass with 114 tests and no Harness
  executable ownership.
