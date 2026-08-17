# Execution Plan — Build Minimum Useful Harness

Status: Complete

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

Status: Complete (2026-08-16)

Accepted scope:

- create `packages/authority`, `packages/context`, and `plugins/repository-files` only;
- let each capability package own its exact-major token, public service contract, default service
  implementation, and default runtime plugin;
- keep contributor multiplicity inside each capability service with no generic kernel multibinding;
- resolve Authority from the highest numeric precedence candidate set and expose that set as
  `contenders` separately from lower-precedence `shadowed` candidates;
- use contributor-supplied optional `resolutionKey` identity rather than prose or raw-content
  comparison: one contender resolves, matching explicit identities corroborate/resolved, distinct
  fully explicit identities conflict, and missing/mixed identity is ambiguous;
- use the public status strings `resolved`, `missing`, `ambiguous`, and `conflict`;
- compose Context in `authority`, `supporting`, `historical` trust-role order while preserving
  contributor registration order and contributor item order within each role;
- keep Authority precedence independent from Context registration ordering;
- retain explicit immutable provenance and content snapshots without semantic ranking or generic
  deduplication;
- document that Memory cannot manufacture authority without adding Memory capability/types or
  beginning Slice 5 integration;
- make repository-files require both capabilities and register capability-specific contributors;
- normalize repository source paths as root-relative and refuse absolute paths, escaping traversal,
  resolved paths outside the root, and symlinks that escape the canonical repository root;
- cover missing/resolved/corroborated/ambiguous/conflict Authority outcomes, precedence grouping,
  deterministic Context role ordering, lifecycle cleanup, immutable snapshots, repository reads,
  normalized provenance, and containment regressions.

Explicitly deferred:

- semantic parsing, content-equality inference, AST/schema extraction, LLM interpretation, and Git
  history analysis;
- Validation, Evidence, Memory, replay, projections, workflows, commands, and the public Harness
  facade.

Implemented:

- `@wizloft/harness-authority` with the `authority@1` token, default runtime plugin/service,
  capability-specific contributor registration, immutable candidate snapshots, structured service
  errors, highest-precedence contender/shadowed grouping, and explicit `resolutionKey` status
  semantics;
- `@wizloft/harness-context` with the `context@1` token, default runtime plugin/service,
  capability-specific contributor registration, immutable item snapshots, structured service
  errors, and deterministic authority/supporting/historical buckets;
- unique active contributor ids within each capability service plus disposable registrations that
  participate in plugin shutdown cleanup;
- `@wizloft/harness-plugin-repository-files` with runtime plugin id
  `@wizloft/repository-files`, exact-subject authority/context mappings, immutable file-content
  snapshots, normalized root-relative provenance, and optional configured resolution identity;
- canonical repository-root containment checks that reject absolute/drive paths, escaping traversal,
  resolved paths outside the root, and symlink escapes without claiming security sandboxing;
- no kernel multibinding, generic context dedupe/ranking, content-equality inference, semantic
  parsing, Git history analysis, or later-slice capability implementation.

Proof:

- `pnpm verify` succeeds in the repository workspace on Node.js 22.13.1 with pnpm 11.10.0;
- `pnpm install --frozen-lockfile` followed by `pnpm verify` succeeds in a fresh temporary copy on
  exact Node.js 22.13.0 with pnpm 11.10.0;
- bootstrap tests pass: 5 passed, 0 failed;
- kernel tests pass: 30 passed, 0 failed;
- file-events tests pass: 9 passed, 0 failed;
- Authority tests pass: 8 passed, 0 failed;
- Context tests pass: 5 passed, 0 failed;
- repository-files tests pass: 6 passed, 0 failed;
- total automated tests pass: 63 passed, 0 failed;
- all five workspace packages typecheck and build from the fresh copy without relying on repository
  `dist/` output;
- Biome and workspace ownership checks pass, and no Slice 4 package or implementation was created.

## Slice 4 — Validation + Evidence

Status: Complete (2026-08-16)

Accepted scope:

- create only `packages/evidence` and `packages/validation` with dependency direction
  `kernel <- evidence <- validation`;
- let each package own its exact-major capability token, public service contract, default service
  implementation, and default runtime plugin;
- normalize Validation requests from non-empty correlation id, project-relative changed paths,
  optional source revision, and optional immutable JSON metadata;
- expose `select()` independently from `run()`, with `run()` using the same selection semantics;
- register stable unique focused/root-required validators inside ValidationService and snapshot
  validated ids/kinds/bound callbacks at registration time;
- always select root-required validators; select focused validators only when applicable;
- preserve registration order and execute sequentially without priorities, dependencies, or
  parallelism;
- normalize false applicability as not selected, applicability/execute throws as phase-specific
  `error`, and normal execution as `passed` or `failed`;
- continue remaining validators after failed/error outcomes and return a normal report with
  `ok: false`;
- measure validator execution only with an injectable monotonic timer;
- keep Evidence generic with immutable correlation/kind/payload records, injectable unique ids and
  wall clock, runtime-local acceptance ordering, and `record()`/`list()` semantics;
- emit `wizloft.evidence.recorded` for every accepted EvidenceRecord and retain accepted records if
  event delivery later fails;
- record each Validation outcome as generic evidence and retain accepted evidence ids on report
  outcomes;
- continue validation/evidence attempts after Evidence infrastructure failure, then reject with a
  structured infrastructure error retaining the completed immutable report and causes.

Explicitly deferred:

- command/shell runners and stdout/stderr/exit-code contracts;
- evidence database/update/delete/query behavior, replay, projections, and file-evidence providers;
- workflow/task state, validator priorities/dependencies, parallel validation, Memory, commands,
  CLI adapter, and the public Harness facade.

Implemented:

- `@wizloft/harness-evidence` with the `evidence@1` token, default runtime plugin/service,
  immutable generic records, injectable id/wall-clock seams, unique runtime-local ids, and
  acceptance-order `record()`/`list()` behavior;
- `wizloft.evidence.recorded` publication with the full accepted record and explicit retention of
  accepted evidence when later event delivery fails;
- `@wizloft/harness-validation` with the `validation@1` token and default plugin requiring
  `evidence@1`;
- immutable Validation request normalization with `/` path separators, benign `./` cleanup,
  traversal/absolute-path rejection, first-occurrence deduplication, and JSON metadata snapshots;
- first-class `select()` plus `run()` sharing the same deterministic sequential applicability
  implementation;
- focused and root-required validator registrations with unique active ids and snapshotted bound
  callbacks that remain stable after caller-owned validator mutation;
- registration-order applicability/execution, phase-specific applicability/execution errors,
  continue-after-failure behavior, and immutable completed reports;
- injectable monotonic execution timing that excludes Evidence recording/event publication time;
- one generic validation-outcome Evidence record per outcome, Evidence id trace links, and delayed
  structured infrastructure rejection retaining the completed report and all observed Evidence
  failures;
- construction-time snapshots of the validated event-publish and Evidence-record callbacks so
  caller-owned dependency mutation cannot change already-created services;
- per-failure retention of the original Evidence/event infrastructure cause alongside the existing
  structured failure summary;
- no shell runner, evidence database, workflow/task state, parallel validation, Memory, commands,
  CLI facade, replay, or projections.

Proof:

- `pnpm verify` succeeds in the repository workspace on Node.js 22.13.1 with pnpm 11.10.0;
- `pnpm install --frozen-lockfile` followed by `pnpm verify` succeeds in a fresh temporary copy on
  exact Node.js 22.13.0 with pnpm 11.10.0;
- bootstrap tests pass: 5 passed, 0 failed;
- kernel tests pass: 30 passed, 0 failed;
- file-events tests pass: 9 passed, 0 failed;
- Authority tests pass: 8 passed, 0 failed;
- Context tests pass: 5 passed, 0 failed;
- repository-files tests pass: 6 passed, 0 failed;
- Evidence tests pass: 6 passed, 0 failed;
- Validation tests pass: 10 passed, 0 failed;
- total automated tests pass: 79 passed, 0 failed;
- all seven workspace packages/plugins typecheck and build from the fresh copy without relying on
  repository `dist/` output;
- Biome and workspace ownership checks pass, and no Slice 5 implementation was created.

## Slice 5 — Memory

Status: Complete (2026-08-17)

Accepted scope:

- create only `packages/memory`, `plugins/file-memory`, and `plugins/memory-context`; do not create
  `profiles/base` or a competing default in-memory capability plugin;
- let `@wizloft/harness-memory` own `memory@1`, public record/query/service/store contracts, and the
  generic MemoryService implementation/factory;
- let `@wizloft/harness-plugin-file-memory` own the JSONL store, runtime plugin id
  `@wizloft/file-memory`, and the standalone first-party capability plugin without requiring
  Context;
- let `@wizloft/harness-plugin-memory-context` own runtime plugin id `@wizloft/memory-context`,
  require `memory@1` plus `context@1`, and own optional exact-subject Context mappings and cleanup;
- support only episodic/semantic kinds, candidate/active/stale/superseded/archived states, and exact
  organization/project/workspace/session scopes with non-empty suffixes;
- retain explicit immutable provenance with non-empty source type/id plus optional source revision
  and root-relative/path-like reference;
- make `remember()` generate identity/timestamps through snapshotted injectable seams, default to
  candidate, and optionally accept initial active state;
- normalize immutable tags by trim/lowercase/drop-empty/first-occurrence deduplication;
- enforce only the accepted lifecycle graph and require an existing distinct same-scope active
  replacement when superseding;
- keep `transition()` lifecycle-only: no mutation of identity, knowledge, tags, metadata,
  provenance, or creation time;
- recall one exact scope, default to active state, support deterministic kind/state/content-keyword/
  all-tags/metadata-subset filters, and preserve first-seen creation order;
- serialize service-level mutations as validate -> immutable snapshot -> persist -> in-memory
  commit, leaving committed memory unchanged after persistence failure;
- use one MemoryStore seam and append full snapshots to JSONL, reconstructing current state and
  first-seen order on restart;
- reject malformed or logically impossible persisted history, including unknown-id transitions,
  immutable-field mutation, illegal lifecycle movement, and invalid supersession relationships;
- expose explicit stale transition as the source-change seam without watchers or autonomous
  invalidation;
- allow exact-subject Context mappings only as supporting/historical and prove conflicting memory
  cannot alter Repository Authority;
- keep promotion as optional target/reference metadata only, with no autonomous side effects;
- snapshot validated store/id/clock/Context dependency callbacks at construction/setup boundaries,
  and normalize thrown/invalid id-factory and clock results into structured Memory errors retaining
  runtime causes.

Explicitly deferred:

- confidence/expiration automation, autonomous extraction/promotion, embeddings/vector search,
  semantic ranking, and generic deduplication;
- SQLite/Postgres, store multibinding/fallback/tiering, transactional/WAL/fsync/crash durability,
  and general event-sourcing/replay infrastructure;
- memory events, Evidence coupling, workflows, commands, SDK/public facade, profile/base, source
  watchers/hashing, and generic update/delete APIs;
- any Memory registration with Authority or production of AuthorityCandidate values.

Implemented:

- `@wizloft/harness-memory` with the `memory@1` token, public Memory record/query/service/store
  contracts, and one generic runtime-scoped service factory;
- immutable episodic/semantic records with exact scopes, explicit provenance, normalized tags,
  JSON-object metadata, optional promotion links, generated ids, and injectable UTC wall-clock
  seams;
- candidate-by-default creation plus explicit active creation, accepted lifecycle transitions, and
  same-scope active replacement validation for supersession without kind coupling;
- lifecycle-only transition snapshots that preserve identity, content, tags, metadata, provenance,
  and creation order;
- exact-scope active-only recall by default with deterministic kind/state, all-keyword content,
  all-tag, and recursive metadata-subset filters;
- service-level serialized mutations with persist-before-commit behavior and committed in-memory
  state retained after persistence failure;
- construction-time snapshots of validated store, id-factory, and clock callbacks so later
  caller-owned dependency mutation cannot change an existing service;
- dedicated `INVALID_MEMORY_ID` and `INVALID_MEMORY_CLOCK` boundaries for thrown or invalid
  callback results, with original runtime causes retained and shared clock handling for remember and
  transition;
- full-snapshot history reconstruction with first-seen ordering and rejection of malformed records,
  unknown-id/non-initial starts, illegal transitions, immutable-field mutation, invalid
  supersession, and impossible promotion removal;
- `@wizloft/harness-plugin-file-memory` with runtime plugin id `@wizloft/file-memory`, missing-file
  empty startup, serialized JSONL appends, structured malformed-history/read/write errors, and no
  Context capability requirement;
- `@wizloft/harness-plugin-memory-context` with exact-subject `subject + query + role` mappings
  restricted to supporting/historical, active-only by default unless states are explicit, and
  plugin-owned contributor registration cleanup;
- integration proof that conflicting supporting Memory cannot alter repository Authority or enter
  the Context authority bucket;
- no competing default in-memory plugin, profile/base, Memory events, Evidence coupling, Authority
  registration, autonomous behavior, command surface, or Slice 6 facade implementation.

Proof:

- `pnpm verify` succeeds in the repository workspace on Node.js 22.13.1 with pnpm 11.10.0;
- `pnpm install --frozen-lockfile` followed by `pnpm verify` succeeds in a fresh temporary copy on
  exact Node.js 22.13.0 with pnpm 11.10.0;
- bootstrap tests pass: 5 passed, 0 failed;
- kernel tests pass: 30 passed, 0 failed;
- Authority tests pass: 8 passed, 0 failed;
- Context tests pass: 5 passed, 0 failed;
- Evidence tests pass: 6 passed, 0 failed;
- Memory tests pass: 9 passed, 0 failed;
- file-events tests pass: 9 passed, 0 failed;
- repository-files tests pass: 6 passed, 0 failed;
- Validation tests pass: 10 passed, 0 failed;
- file-memory tests pass: 5 passed, 0 failed;
- memory-context tests pass: 3 passed, 0 failed;
- total automated tests pass: 96 passed, 0 failed;
- all ten workspace packages/plugins typecheck and build from the fresh copy without relying on
  repository `dist/` output;
- Biome and workspace ownership checks pass, and no Slice 6 implementation was created.

## Slice 6 — SDK + Command API + CLI Adapter

Status: Complete (2026-08-17)

Accepted scope:

- create `packages/harness`, `packages/commands`, and `packages/cli-adapter` plus only the minimal
  immutable kernel runtime-inspection seam needed by the facade;
- make `createHarness()` require an explicit `HarnessProfile`, own exactly one runtime, pass through
  the existing runtime-id/event-clock/diagnostic seams, and expose grouped Context, Authority,
  Memory, Validation, Evidence, event-history, inspection, and shutdown operations;
- curate stable profile contracts/helpers such as `defineProfile` and `composeProfile` without
  blind cross-package barrels, implicit providers, JSON profile loading, or `profiles/base`;
- use structured facade errors for unavailable capabilities, missing event-history configuration,
  and non-active runtime state while preserving existing capability-domain error types;
- keep runtime inspection deterministic and available through disposal with resolved plugin
  identity/requirements/provisions, active capability providers, and recorded diagnostics but no
  config, service, listener, disposer, or mutable registry access;
- accept one optional structural event-history reader on the facade, snapshot/bind it at
  construction, and keep history/replay out of the kernel;
- implement only the stable command ids `harness.inspect`, `context.resolve`, `authority.resolve`,
  `memory.remember`, `memory.recall`, `memory.transition`, `validation.select`, `validation.run`,
  `evidence.list`, and `events.read` through the public facade;
- export a typed command-request union while handwritten runtime validation protects untyped
  CLI/agent/CI input; normalize expected operational/domain/infrastructure failures into deeply
  immutable JSON-compatible result/error envelopes and reserve throws for unexpected bugs;
- preserve completed negative domain results as results, including Authority ambiguity/conflict and
  Validation reports with `ok: false`; retain Validation infrastructure report/failure summaries in
  command error details without raw causes;
- build an IO-free CLI adapter over the command executor with module-local `--json`, `--help`, and
  Harness grammar, deterministic rendering, one-envelope JSON output, and exit codes `0` completed,
  `1` operational/negative proof, and `2` usage/unknown CLI command;
- delegate facade shutdown directly to the kernel's idempotent shutdown contract and do not expose
  shutdown as a command.

Explicitly deferred:

- `profiles/base`, global executable/bin ownership, executable branding/version/root options, and
  profile selection/loading in the adapter;
- generic command/plugin registries, multibinding, priority, middleware, discovery, and policy
  engines;
- event replay/history kernel capability, workflows/jobs/subagents, shell/process runners, remote
  execution, UI, self-hosting changes, and Wizloft CLI migration;
- any change to completed Context, Authority, Memory, Validation, Evidence, event, or plugin
  composition semantics.

Implemented:

- immutable kernel inspection snapshots with runtime lifecycle state, deterministic resolved plugin
  metadata, sorted active capability providers, and diagnostics retained through disposal;
- `@wizloft/harness` as an explicit-profile facade over one owned runtime with curated profile
  exports, grouped capability delegation, structured lifecycle/availability errors, a snapshotted
  optional event-history reader, inspectable disposal state, and direct idempotent shutdown;
- `@wizloft/harness-commands` as a fixed command switch over the facade with the ten accepted ids,
  typed requests, cloned/frozen JSON request and envelope boundaries, handwritten validation, and
  structured expected-error normalization, including coded provider errors without provider-package
  coupling, that preserves negative domain results as results;
- JSON-safe Validation infrastructure summaries retaining completed reports while omitting raw
  runtime causes from command output;
- `@wizloft/harness-cli-adapter` with module-local help/JSON options, nested Harness grammar,
  deterministic human/JSON rendering, stable exit codes, snapshotted executor callback, and no
  process IO, shell execution, profile loading, version, branding, or binary ownership;
- an end-to-end MUH smoke proof composing real first-party providers through an explicit profile,
  then exercising Authority, Context, Memory, Validation, Evidence, event history, commands, CLI
  JSON output, inspection, and shutdown.

Proof:

- `pnpm verify` succeeds in the repository workspace on Node.js 22.13.1 with pnpm 11.10.0;
- `pnpm install --frozen-lockfile` followed by `pnpm verify` succeeds in a fresh temporary copy on
  exact Node.js 22.13.0 with pnpm 11.10.0;
- bootstrap tests pass: 5 passed, 0 failed;
- kernel tests pass: 31 passed, 0 failed;
- Authority tests pass: 8 passed, 0 failed;
- Context tests pass: 5 passed, 0 failed;
- Evidence tests pass: 6 passed, 0 failed;
- Memory tests pass: 9 passed, 0 failed;
- file-events tests pass: 9 passed, 0 failed;
- repository-files tests pass: 6 passed, 0 failed;
- Validation tests pass: 10 passed, 0 failed;
- file-memory tests pass: 5 passed, 0 failed;
- memory-context tests pass: 3 passed, 0 failed;
- Harness facade tests pass: 5 passed, 0 failed;
- command tests pass: 6 passed, 0 failed;
- CLI adapter tests pass: 5 passed, 0 failed;
- end-to-end MUH smoke test passes: 1 passed, 0 failed;
- total automated tests pass: 114 passed, 0 failed;
- all thirteen workspace packages/plugins typecheck and build from the fresh copy without relying on
  repository `dist/` output;
- Biome and workspace ownership checks pass; no global CLI binary, `profiles/base`, self-hosting
  implementation, or Wizloft CLI migration was added.

## Gate A — MUH

Status: Complete (2026-08-17)

The executable package regressions plus `tests/muh.test.mjs` satisfy every required category in
`docs/milestones/MUH.md`. The stop condition is reached; no additional platform features should be
added before the separately gated self-hosting evaluation.

## Gate B — Self-host

Status: Complete (2026-08-17)

Implemented:

- `@wizloft/harness-profile-self-host` as a real repository-specific profile using only existing
  first-party capabilities/providers plus project-owned validation registrations;
- exact repository Authority mappings for all accepted decisions, current architecture documents,
  `AGENTS.md`, the active plan, and the Self-host milestone without mapping `.references` content;
- bounded maintenance Context combining relevant repository authority/current code/tests with
  Memory restricted to supporting evidence;
- focused authority-document validation and root-required root-workspace validation without a shell
  runner or workflow abstraction;
- an executable Gate B scenario through the public facade, structured command API, and CLI adapter;
- candidate activation, stale and superseded Memory lifecycle, exact-scope recall, Context
  integration, JSONL persistence/restart, and proof that conflicting Memory cannot alter Authority;
- Validation selection/run, Evidence creation, persisted event inspection, deterministic runtime
  inspection, shutdown, and post-disposal command behavior;
- missing-capability and dependency-cycle fixtures composed through `createHarness()` with
  understandable structured diagnostics.

Findings:

- BLOCKER: none observed;
- RELIABILITY: none observed, so no existing kernel/capability/provider/facade/command/adapter
  implementation was changed;
- ENHANCEMENT (deferred): a process-backed validator for invoking the full repository toolchain,
  profile loading/discovery, and automatic Memory source watching remain outside Gate B.

Proof:

- repository `pnpm verify` succeeds on Node.js 22.13.1 with pnpm 11.10.0;
- fresh `pnpm install --frozen-lockfile` plus `pnpm verify` succeeds on exact Node.js 22.13.0 with
  pnpm 11.10.0;
- self-host profile tests pass: 2 passed, 0 failed;
- executable Self-host scenarios pass: 2 passed, 0 failed;
- total automated tests pass: 118 passed, 0 failed;
- all fourteen workspace packages/plugins/profiles typecheck and build from the fresh copy without
  repository `dist/` output;
- Biome and workspace ownership checks pass; no global binary, base profile, workflow engine,
  shell/process runner, self-host agent runtime, or Wizloft CLI rewrite was added.

The checklist in `docs/milestones/SELF-HOST.md` is complete. Stop for review before the Wizloft CLI
handoff.

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
