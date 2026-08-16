# Execution Plan — Build Minimum Useful Harness

Status: Active

## Outcome

Build the smallest tested Wizloft Harness that satisfies MUH, self-hosts reliably, and is ready to be used for the Wizloft CLI TypeScript rebuild without implementing a coding-agent runtime.

## Slice 0 — Repository/tooling bootstrap

- initialize strict TypeScript pnpm workspace;
- create minimal package boundaries for kernel, SDK/commands, and first-party capabilities;
- root format/lint/typecheck/test/build/verify;
- CI-ready validation command;
- minimal dependencies.

Proof: clean install and root verify succeed.

## Slice 1 — Kernel/plugin host

- plugin identity;
- capability declarations/requirements;
- capability registry;
- deterministic dependency graph/topological composition;
- missing capability diagnostics;
- cycle diagnostics;
- lifecycle/disposer seam;
- diagnostics primitives.

No project-specific knowledge.

## Slice 2 — Config/profiles/events

- typed project/profile config;
- deterministic profile layering/overrides;
- event bus;
- append-only file event provider;
- repeatable boot/event ordering tests.

No workflow engine or dynamic remote plugin execution.

## Slice 3 — Context + Authority

- first-party contracts;
- repository/file contributors;
- deterministic merge;
- provenance;
- authority resolved/missing/ambiguous/conflict semantics;
- explicit historical/supporting source labels;
- memory cannot manufacture authority.

## Slice 4 — Validation + Evidence

- validator registration/applicability;
- execution/result contract;
- deterministic normalized evidence ordering;
- event/evidence integration;
- focused vs root-required validation examples.

No hidden task-state DB.

## Slice 5 — Memory

- episodic/semantic memory contract;
- scope and provenance;
- candidate/active/stale/superseded/archived lifecycle;
- file/JSONL provider;
- basic keyword/metadata recall;
- restart persistence;
- source-change/stale seam;
- authority-over-conflicting-memory tests;
- promotion metadata/seam without autonomous extraction.

## Slice 6 — SDK + Command API + CLI Adapter

Expose reusable programmatic operations for:

- profile composition/run/inspect;
- context resolution;
- authority resolution;
- memory remember/recall;
- validation/evidence;
- event inspection.

Add a CLI adapter library that maps argv/options to the same command semantics and can render human or structured/JSON-friendly output.

**Do not expose a global `wizharness` binary from this repository.**

## Gate A — MUH

Run `docs/milestones/MUH.md`. Stop feature work when it passes.

## Gate B — Self-host

Run `docs/milestones/SELF-HOST.md`. Fix only blocking/reliability issues.

## Handoff — Wizloft CLI

Once both gates pass, switch implementation work to the `wizloft-cli` repository and follow `docs/consumers/WIZLOFT-CLI.md`.

## Deferred until real consumer demand

- native Codex/Claude adapters;
- DeepSeek runtime integration;
- workflow/subagent/job engines;
- UI;
- embeddings/vector DB;
- SQLite/Postgres memory providers;
- autonomous memory extraction;
- remote/plugin marketplace/security sandbox claims.
