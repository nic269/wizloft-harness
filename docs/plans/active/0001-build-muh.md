# Execution Plan — Build Minimum Useful Harness

Status: Active

## Outcome

Build the smallest tested Wizloft Harness that satisfies MUH, self-hosts reliably, and is ready to be used for the Wizloft CLI TypeScript rebuild without implementing a coding-agent runtime.

## Slice 0 — Repository/tooling bootstrap

Status: Complete (2026-08-16)

- initialize strict TypeScript pnpm workspace;
- record the approved target package topology without scaffolding empty packages;
- create a package only when its implementation slice gives it real responsibility;
- root check/typecheck/test/build/verify/workspace:check contract;
- CI-ready validation command;
- minimal dependencies.

Implemented:

- private pnpm workspace with `packages/*`, `plugins/*`, and `profiles/*` discovery;
- strict shared TypeScript configuration without product/runtime code;
- exact-pinned Biome check/check:fix tooling plus TypeScript typecheck/test/build/verify commands;
- Node.js 22.13+ and pnpm 11.10+ tooling contract;
- workspace contract checks that reject symlinked packages, require non-empty non-recursive build/typecheck/test scripts, and reject Wizloft CLI executable ownership;
- bootstrap tests for private/no-binary ownership, the Biome-era root verification contract, workspace discovery, and invalid-package rejection;
- architecture and plugin-model clarifications approved before implementation.

Proof:

- `pnpm install --frozen-lockfile` succeeds from a fresh temporary checkout;
- the documented npm-installed pnpm 11.10 bootstrap succeeds from a fresh temporary checkout;
- `pnpm verify` succeeds on the exact minimum Node.js 22.13.0;
- `pnpm verify` succeeds;
- `pnpm check` succeeds with formatter, recommended lint rules, and import organization enabled;
- bootstrap tests pass: 5 passed, 0 failed;
- at Slice 0 completion, `packages/`, `plugins/`, and `profiles/` contained only their `.gitkeep` placeholders;
- at Slice 0 completion, no plugin-host or capability behavior was implemented.

## Slice 1 — Kernel/plugin host

Status: Complete (2026-08-16)

Implemented:

- `@wizloft/harness-kernel` package with public kernel contracts and runtime surface;
- stable serializable exact-major capability ids and declarations/requirements;
- one runtime-scoped active capability service per capability token;
- deterministic dependency graph/topological composition with reproducible tie-breaking;
- declared-requirement-only capability access and declared-provides-only capability service registration;
- plugin-name uniqueness within one resolved runtime;
- capability-specific diagnostics, missing-capability diagnostics, and capability-cycle diagnostics;
- rollback of partial setup effects plus reverse-order lifecycle/disposer cleanup that continues after disposer failures;
- runtime-scoped diagnostics collection;
- kernel exports for capability tokens, declarations, requirements, runtime creation, and diagnostic primitives;
- no generic kernel multibinding; capability-specific multiplicity remains inside capability services;
- no empty `@wizloft/harness` facade package was scaffolded ahead of a slice that needs it.

Proof:

- `pnpm verify` succeeds in the repo workspace;
- `pnpm install --frozen-lockfile` + `pnpm verify` succeeds in a fresh temporary copy;
- the fresh proof succeeds on exact Node.js 22.13.0 with pnpm 11.10.0;
- kernel tests pass: 19 passed, 0 failed;
- `packages/kernel` builds to `dist/` and emits declaration files cleanly;
- the target `@wizloft/harness` facade remains intentionally deferred;
- no Slice 2 packages/code were scaffolded.

No project-specific knowledge.

Slice 1 implements only the capability/lifecycle/diagnostic plugin-context surface. Typed profile config and the event bus join the public context in Slice 2.

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
