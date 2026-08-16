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

Status: Complete (2026-08-16)

Accepted scope:

- keep profile/config composition in the kernel and accept only declarative JSON-compatible data;
- apply named layers in declaration order by adding the layer's plugins and then applying its config overrides;
- reject duplicate plugin additions and overrides for plugins that do not yet exist; do not add plugin replace/remove behavior;
- recursively merge plain objects, replace arrays/primitives/`null`, and treat `undefined` overrides as inherit/no override;
- clone and deeply freeze each plugin's resolved config, exposing only that config through typed `PluginContext<TConfig>.config`;
- add stable typed event tokens without a central/global augmented event map;
- emit immutable envelopes with injectable runtime id/clock, runtime-local sequence, ISO-8601 UTC timestamp, and immutable JSON-compatible payload snapshots;
- serialize publish calls and deliver snapshot listener sets in subscription registration order;
- continue delivery after listener failures, collect structured diagnostics, and reject publish after delivery completes;
- reject non-reentrant nested publication with a structured diagnostic;
- allow setup-time subscriptions but prohibit publication until runtime activation;
- own subscriptions through existing plugin rollback/shutdown lifecycle;
- create `plugins/file-events` to append envelopes as JSONL and read them in append order;
- treat file persistence as an ordinary listener effect and make no transactional/write-ahead/crash-durability claim;
- cover repeatable boot, config merge/immutability, event ordering/snapshot/failure/lifecycle, and persisted read-order behavior.

Explicitly deferred:

- `profiles/base` until a real profile has plugins/configuration;
- replay, projections, workflow orchestration, startup/lifecycle events, and dynamic remote plugin execution;
- Context, Authority, Validation, Evidence, Memory, commands, and the public `@wizloft/harness` facade.

Implemented:

- kernel-owned named profile layers with add-then-override composition semantics;
- JSON-compatible config validation, recursive object merge, replacement semantics, and `undefined` inheritance;
- cloned, deeply frozen, per-plugin typed config through `PluginContext<TConfig>.config`;
- runtime config validation remains plugin-owned because the string-keyed profile config map is not compile-time schema-correlated with each plugin's `TConfig`;
- stable typed event tokens and immutable runtime-scoped event envelopes;
- injectable runtime id generation and clock seams;
- serialized publish ordering, listener registration ordering, listener-set snapshots, and immutable payload snapshots;
- continue-on-listener-failure diagnostics with post-delivery publish rejection;
- structured non-reentrant publication rejection and active-runtime publication gating;
- plugin-owned event subscriptions integrated with rollback/shutdown, including draining accepted publications before cleanup;
- `@wizloft/harness-plugin-file-events` as an ordinary all-event subscriber with runtime plugin id `@wizloft/file-events` and JSONL append/read behavior;
- persisted envelope validation for non-empty runtime ids, event ids, positive safe sequences, writer-compatible UTC timestamps, and recursive `JsonValue` payloads;
- documented first-party and project/domain plugin/event namespacing conventions without kernel enforcement;
- no `profiles/base`, facade, capability packages, workflow behavior, replay, or projection implementation.

Proof:

- `pnpm verify` succeeds in the repository workspace on Node.js 22.13.1 with pnpm 11.10.0;
- `pnpm install --frozen-lockfile` followed by `pnpm verify` succeeds in a fresh temporary copy;
- the fresh proof succeeds on exact Node.js 22.13.0 with pnpm 11.10.0;
- bootstrap tests pass: 5 passed, 0 failed;
- kernel tests pass: 30 passed, 0 failed, including all 19 Slice 1 regressions and the listener delivery-scope lifetime regression;
- file-events tests pass: 9 passed, 0 failed, including 5 corrupted-history regressions;
- total automated tests pass: 44 passed, 0 failed;
- both workspace packages typecheck and build from the fresh copy without relying on stale `dist/` output;
- Biome check and workspace ownership/verification checks pass.
- the repository and fresh proof copy contain no generated Repomix/review snapshot; the legacy tracked snapshot is removed and future local snapshots are confined to the ignored `.local/review-snapshots/` path.

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
