# Execution Plan — CLI Dogfood Retrospective and Hardening Cycle 1

Status: Accepted contract; local implementation and packed delivery proof are complete, but the
public-release and downstream-consumer gates are open.
Phase 0 committed. Portable-wrapper versus host-CLI clarification committed. Phase 1 committed at
`fac903208236d59353a98e52158fe85b770fb8c2`. Phase 2 committed at
`feb372e62c295c43fe234282b9371e4e5e6af985`. Phase 3A committed at
`29dd040293419eba5bbc72195ac2eeec62b2a92c`. Phase 3B materialization + sentinel
committed at `a23f34ff885e88c9686a0523a7492b8da87fcd67`. Phase 4A repository acceptance
matrix committed at `4612359ba5d6204af140b6a4eb4cbf795d406ce4`. Phase 4B packed package closure
committed at `a116899ebcd20c5ee111f828f32cb412e5cd0af3`. Phase 4C real packed execution
exposed and corrected an ESM-resolution defect at
`cabe413e29adb30d56400cf8f6ed76b1ee476cf2`, then exposed a non-portable npm lockfile defect.
The dedicated Phase 4C rerun and proof-only correction are green and independently audited.
Phase 5 implemented the local fourteen-package `0.1.0-alpha.3` release-ready candidate.

The actual public graph is incomplete: only `@wizloft/harness-project@0.1.0-alpha.3` is published;
the other Harness packages remain published at `0.1.0-alpha.2`. Immutable-partial-publication
recovery, proof of all fourteen exact artifacts, `next` promotion, registry proof, G2B, Phase 6 P2,
the release-dependent Meldmark gates in section 26, OMP Stage D, and formal plan closure are open.
They require a later separately authorized coherent release.

This file owns the accepted alpha.3 onboarding contract.

This revision applies the approved Cycle 1 architecture plus the four bounded corrections:
dependency closure, marker-last initialization, runner lifecycle, and a source-only
`profile.local.mjs` overlay. `.npmrc` is removed from the required artifact set.

A later externally accepted clarification, recorded after the committed Phase 0 checkpoint,
makes the relationship between the repository-local portable wrapper and future host
integrations explicit. It does not replace
[0013](../../decisions/0013-project-onboarding-and-discovery.md) and does not reopen Phase 0.

## Outcome

Close the public onboarding contract for Harness `0.1.0-alpha.3` from the completed Wizloft CLI
dogfood, then implement only that contract after this plan is accepted.

Alpha.3 is onboarding and agent discovery only. It must make a clean or existing repository
discoverable, runnable, and re-init-safe without copying the CLI Gate H0 layout.

## Authority for this plan

- Harness checkpoint: `bc778ff85468452eb8dce2c9579652c17ee6b14e` on `main`.
- Released consumer baseline: `0.1.0-alpha.2`.
- CLI rewrite checkpoint, inspected read-only:
  `1a5ed8281944522751218103e1d01e52b7f817ce`.
- CLI product pins every consumed Harness package to exact `0.1.0-alpha.2`.
- Durable rules:
  [0002](../../decisions/0002-small-kernel-plugin-ecosystem.md),
  [0003](../../decisions/0003-agent-agnostic.md),
  [0009](../../decisions/0009-cli-ownership-boundary.md),
  [0010](../../decisions/0010-dogfood-order.md),
  [0012](../../decisions/0012-public-package-release-contract.md),
  [0013](../../decisions/0013-project-onboarding-and-discovery.md).
- Architecture:
  [ARCHITECTURE.md](../../architecture/ARCHITECTURE.md),
  [AUTHORITY-CONTEXT-EVIDENCE.md](../../architecture/AUTHORITY-CONTEXT-EVIDENCE.md).
- Consumers:
  [WIZLOFT-CLI.md](../../consumers/WIZLOFT-CLI.md),
  [MELDMARK.md](../../consumers/MELDMARK.md).
- Existing release DAG: `scripts/release-contract.mjs` `PUBLIC_PACKAGES`.
- Existing import oracles: `profiles/self-host/src/index.ts`, CLI
  `dev/harness/profile.mjs` + `dev/harness/run.mjs`.

Phase 0 wrote durable decisions only. It did not create packages, version packages, publish,
modify Wizloft CLI, or start Phase 1. The committed Phase 0 checkpoint is
`da3694890ae8921858070adcfa55e7d0e2651d81`. The post-Phase-0 wrapper/host clarification is
documentation only and does not reopen that checkpoint.

## Approved strategic decisions

These were accepted before this contract turn and remain binding:

- Hardening Cycle 1 owns project onboarding and agent discovery.
- Alpha.3 remains onboarding-only.
- Scope-integrity is the next hardening cycle, not alpha.3.
- Context lifecycle is documentation and init-pattern work, not a kernel API.
- Evidence closeout and subagent ownership remain deferred.
- No kernel capability, process framework, workflow engine, sandbox, or Git writer is added.
- This file is the owning active plan.
- `@wizloft/harness-project` remains the one new public package.

## Accepted implementation notes

These notes are accepted for the later ADR/implementation phase. They do not reopen architecture
and do not require another plan proposal round.

1. Node runtime floor. The initializer and the generated project runner must explicitly enforce
   the Harness Node `>=22.13.0` floor with actionable errors. Initializer enforcement is
   preflight and must happen before any repository mutation. Generated-runner enforcement happens
   before importing `@wizloft/harness-project`.
2. Marker-last is a successful-materialization sentinel, not a transactional rollback of
   already-updated Harness-owned non-marker tooling files. On a failed cross-release upgrade, the
   old valid marker keeps the identity of the last successfully materialized release. Retry is
   the alpha.3 recovery contract. A fresh clone with a valid tracked marker is initialized and
   needs local `npm ci`; it is not an upgrade failure.

## Current state

Verified 2026-08-18 at Phase 0 start:

| Surface | Observed |
|---|---|
| Harness branch | `main` |
| Harness HEAD | `ec5bfb046ec3a197bc315b95928839d154ca4d33` |
| Alpha.2 baseline parent | `bc778ff85468452eb8dce2c9579652c17ee6b14e` |
| Root identity | `0.1.0-alpha.2` |
| Public package set | thirteen allowlisted packages; no project-tooling package |
| CLI HEAD | `1a5ed8281944522751218103e1d01e52b7f817ce` |
| CLI Harness layout | consumer-owned `dev/harness/{profile,run,h0.test}.mjs` |
| CLI adapter block | `<!-- HARNESS:BEGIN -->` in `AGENTS.md` |
| CLI stable Context | `wizloft-cli:task:typescript-rewrite` retained after rewrite closeout |
| CLI execution | `npm run harness:dev -- <argv>` or product `wizloft harness` / `wizharness` |

The CLI Gate H0 layout is one consumer convention. It is not the generic alpha.3 standard.

Durable local alpha.3 implementation state and actual public state:

| Surface | Observed |
|---|---|
| Local root identity | `0.1.0-alpha.3` |
| Local package set | fourteen release-allowlisted packages including `@wizloft/harness-project` |
| Project privacy | public / non-private; Self-host remains private |
| Project layer | derived DAG layer 7 through `@wizloft/harness-cli-adapter` |
| Local proof | Phase 4C packed proof and Phase 5 release-readiness review complete |
| Registry | incomplete: only `@wizloft/harness-project@0.1.0-alpha.3` is published; the other Harness packages remain at `0.1.0-alpha.2` |
| Publication/provenance | no coherent fourteen-package alpha.3 graph, promotion proof, or G2B proof |
| Downstream gates | Phase 6 P2, release-dependent Meldmark readiness, and OMP Stage D open |


---

## 1. Friction matrix

| Rank | Friction | CLI evidence | Freq | Sev | Generic? | Workaround | Owner | Alpha.3 | Class |
|---|---|---|---|---|---|---|---|---|---|
| 1 | No released meaning of “this repo uses Harness” | Gate H0 hand-authored `dev/harness/*`, `docs/development/harness.md`, and an `AGENTS.md` block. Meldmark cannot copy a released initializer. | once per project, then permanent | high | yes | copy CLI files | Harness project-tooling | **MUST HAVE** | project initializer / onboarding |
| 2 | Discoverable but not runnable after init | Previous proposal allowed an optional runner while requiring inspect / Authority / Context proof. CLI only became usable after `run.mjs` plus resolved packages. | every command | high | yes | host-specific runner | Harness project-tooling | **MUST HAVE** | public command / facade concern |
| 3 | No durable post-npx runtime | H0 used sibling `npm link`. Product later pinned thirteen Harness packages in root `package.json`. Empty or non-Node repos cannot do that. | every new project | high | yes | mutate root deps or keep links | Harness project-tooling | **MUST HAVE** | provider / plugin + onboarding |
| 4 | No single instruction source | CLI put a summary in `AGENTS.md` and the full contract in `docs/development/harness.md`. Future `CLAUDE.md` would copy it again. | every agent | high | yes | duplicate prose | Harness-owned instructions + tiny adapters | **MUST HAVE** | workflow / documentation |
| 5 | Durable Context kept a finished task name | Profile still exports `wizloft-cli:task:typescript-rewrite` after the plan moved to `docs/plans/completed/`. | every start | med | yes | remember the stale name | init pattern + docs | **MUST HAVE** as init contract | documentation / init-pattern |
| 6 | Init would be unsafe on brownfield files | CLI already had user `AGENTS.md`. A whole-file rewrite would destroy it. | first existing-repo init | high | yes | manual merge | initializer writer | **MUST HAVE** | project initializer / onboarding |
| 7 | Declared vs observed Git paths | Agents edited extra technically-correct paths without approval. Validation trusts caller `changedPaths`. | repeated | high | yes | human review | next cycle | **DEFER** | Harness provider / plugin later |
| 8 | Validation closeout is verbose | Start/closeout requires report + Evidence IDs + persisted Events + plan summary. Runtime Evidence is not a bug. | every closeout | med | yes | follow CLI handoff | commands later | **DEFER** | public command / facade later |
| 9 | Shared-checkout subagent writes | CLI added “primary agent owns the checkout” rules after unauthorized mutation/commits. | repeated | high | yes | instruction + isolation | host runtime / workflow | **DOCUMENT ONLY** | agent-runtime outside Harness |
| 10 | Historical task Context vs current tree | Completed plan remains explicit Authority `wizloft-cli:plan:typescript-rewrite` and is not default Context. | query-time | low | yes | explicit subjects | docs / init pattern | **DOCUMENT ONLY** | documentation |
| 11 | Root dependency mutation | Slice 4 put thirteen Harness packages in CLI `dependencies` because CLI is a Node product host. That is not a generic project rule. | one consumer | med | no | isolated tooling tree | consumer policy vs generic init | **MUST HAVE** as non-mutation | consumer-owned policy |
| 12 | Extra agent adapters | Only AGENTS.md and Claude were needed. No Codex/DSH/Cursor files were required to finish the rewrite. | none | low | speculative | none | later adapters | **DEFER** | workflow / documentation |

Priority is consumer friction, not implementation attractiveness.

---

## 2. Alpha.3 scope

Alpha.3 contains only:

1. a released project-tooling package that can initialize a repository;
2. a machine-readable project marker written last as the success sentinel;
3. canonical project instructions;
4. required project runner plus isolated runtime resolution;
5. AGENTS.md and CLAUDE.md discovery adapters;
6. a stable project Context / Authority template plus a source-only overlay;
7. dry-run, idempotent re-init, and filesystem-safe apply;
8. executable CLEAN / EXISTING / CONFLICT / marker-commit / runner / overlay proofs;
9. ADR 0013 plus the [0012](../../decisions/0012-public-package-release-contract.md) allowlist
   amendment, written in Phase 0; release-script implementation waits for the package;
10. lockstep release-graph work so the fourteenth package publishes with `0.1.0-alpha.3`.

Alpha.3 does not contain:

- Git scope-integrity plugin;
- Validation closeout envelope;
- durable Evidence storage;
- Context snapshots / versioned trees;
- subagent, sandbox, or Git writer;
- extra agent adapters;
- CLI `PRODUCT_CONTEXT_SUBJECT` rename;
- kernel changes;
- process / workflow / job framework;
- interactive setup wizard;
- root `package.json` mutation;
- global `wizharness` / `wizloft` binaries;
- arbitrary plugin/profile composition through `profile.local.mjs`;
- a generated `.npmrc`.

If review must cut further, keep isolated runtime resolution and drop CLAUDE.md only. Do not ship
marker-only init. Discoverable-but-unrunnable is the defect this contract exists to close.

---

## 3. Execution bootstrap

### Required post-init chain

```text
agent opens repository
  -> reads AGENTS.md and/or CLAUDE.md managed block
  -> reads .wizloft/harness/INSTRUCTIONS.md
  -> runs EXACT command:
       node .wizloft/harness/run.mjs <Harness module argv>
  -> run.mjs enforces Node >=22.13.0 before any project-package import
  -> run.mjs dynamically imports @wizloft/harness-project from the isolated tree
  -> if that package is missing, run.mjs writes the exact npm ci recovery and exits 1
  -> run.mjs derives repositoryRoot from its known path
  -> run.mjs calls runProjectHarness(argv, options)
  -> runProjectHarness loads/validates .wizloft/harness/project.json
  -> runProjectHarness loads .wizloft/harness/profile.mjs
  -> createGeneratedProjectProfile composes the default profile
  -> createHarness(generated profile)
       -> createCommandExecutor
       -> createHarnessCliAdapter
  -> inspect / authority.resolve / context.resolve / validation.run
```

The runner is required as the canonical portable repository-local wrapper. A repository is
Harness-initialized when a schema-valid `project.json` exists with the required tracked
artifacts. A checkout is runnable only after the isolated `@wizloft/harness-project` matching
that marker is locally resolvable.

A future host such as `wizharness` / `wizloft harness` is optional convenience only. Both the
portable wrapper and any host adapter converge on the same project-local `runProjectHarness`
semantics. A host MAY load the repository-local harness-project package and invoke
`runProjectHarness` directly; it SHOULD NOT spawn `run.mjs` merely to reuse Harness semantics.
Ordinary project commands use the repository-pinned runtime, not a host-bundled Harness
runtime. Initialization is the exception because it occurs before the project runtime exists.
Implementing a Wizloft CLI Harness module is not part of alpha.3.

### Comparison

| Option | Empty git repo | Existing npm/pnpm/yarn | Non-Node repo | Offline after init | Reproducible | Root manifest | Verdict |
|---|---|---|---|---|---|---|---|
| A. Mutate root dependencies | must create `package.json` | invasive | forces Node project identity | only after root install | mixed with app deps | yes | rejected |
| B. Isolated `.wizloft` runtime only | works | works | works | works after materialize | needs a package identity | no | necessary runtime, not a package name |
| C. `npx` every later command | works | works | works | no | floating | no | rejected as post-init model |
| D. One project-tooling package for init + runner | works | works | works | works after isolated install | exact pin + lockfile | no | **accepted** |
| E. Host CLI owns init | no generic Meldmark path | host-specific | host-specific | host-specific | no | maybe | rejected for generic init |

Accepted contract: **D composed with B**.

- `npx @wizloft/harness-project@0.1.0-alpha.3` is only the initializer process.
- After that process exits, later commands do not use npx. They need network only to restore an
  ignored `node_modules/` after a fresh clone.
- Apply writes an isolated tooling manifest under `.wizloft/harness/` and materializes
  `@wizloft/harness-project` plus its lockstep closure there.
- The tracked runner dynamically imports that local install after Node preflight.
- Root `package.json` is never created or modified.
- Empty repos, npm/pnpm/yarn repos, and non-Node repos receive the same isolated Node island.
- Harness remains a Node `>=22.13.0` tool. The project language can be anything.
- Isolated install uses npm with frozen argv, never the host pnpm/yarn graph.

### Exact answers

| Question | Contract |
|---|---|
| What command does the agent run? | `node .wizloft/harness/run.mjs <Harness module argv>` |
| Is a tracked runner required? | Yes. `.wizloft/harness/run.mjs` is required. |
| Where do released packages resolve from? | `.wizloft/harness/node_modules` via the runner file’s module resolution |
| What remains after npx init exits? | tracked sentinel, generated files, isolated `package.json` and lockfile; `node_modules/` is present in that checkout but ignored |
| Does every later command need network/npx? | No, except one clone-local `npm ci` when ignored `node_modules/` is absent |
| How does an empty git repo work? | `git init`, then init with `--root` and `--project-id`; no root package manifest |
| How do npm/pnpm/yarn/non-Node repos work? | same isolated tree; root package manager is untouched |
| Does init modify a package manifest? | Yes, only `.wizloft/harness/package.json`. Never the root manifest. |
| Isolated tooling environment? | Yes. Private npm package at `.wizloft/harness/` |
| Does apply install? | Yes. Internal apply runs `npm install --ignore-scripts --no-audit --no-fund` with `cwd = <root>/.wizloft/harness`. Dry-run reports the planned install and writes nothing. |
| Is `.npmrc` generated? | No. Frozen argv is sufficient. |
| Offline/reproducibility after init? | Exact `0.1.0-alpha.3` pin + tracked lockfile. Fresh clone is initialized and needs `npm --prefix .wizloft/harness ci --ignore-scripts --no-audit --no-fund`. |

`npx` is not the post-init runner. Root dependency mutation is not the generic contract. The
CLI/product host may still depend on public packages itself; that remains consumer policy.

---

## 4. Package ownership and exact dependency closure

One new public package. No second package.

| Field | Decision |
|---|---|
| Name | `@wizloft/harness-project` |
| Workspace | `packages/project` |
| After init | remains the isolated tooling dependency; not a root app dependency |
| Bin | `wizloft-harness-project` |
| Bin syntax | `init --root <dir> --project-id <id> [--adapters agents,claude] [--dry-run] [--json]` |
| Bin does not run | `inspect`, `authority`, or other Harness module commands |
| Programmatic API | `planProjectInitialization(options)`, `applyProjectInitialization(options)`, `runProjectHarness(argv, options)`, `createGeneratedProjectProfile(options)` |
| Isolated generated manifest | depends directly on `@wizloft/harness-project@0.1.0-alpha.3` only |
| Kernel | consumed as a public dependency; no new kernel API |
| Commands package | no new command ids |
| CLI adapter | reused only by `runProjectHarness` for Harness module argv |
| Host-binary rule | bin is not `wizloft`, `wizharness`, `wizanh`, or `wizshopify` |

Rejected names/boundaries:

- `@wizloft/harness-init` — init-only name hides the required runner.
- Init subpath on `@wizloft/harness` — facade is a live-runtime SDK, not a repository writer.
- Init command on `@wizloft/harness-commands` — commands require an already-created runtime.
- Host-owned init — Meldmark would not get a released initializer.

Why this does not violate [0009](../../decisions/0009-cli-ownership-boundary.md):

- reusable init/run semantics live in Harness;
- the bin is a scaffolding/tooling executable, not the product `wizharness` UX;
- Wizloft CLI keeps `wizloft harness` / `wizharness` if and when it supplies them;
- the generic agent command is a repo-local `node .wizloft/harness/run.mjs`;
- a future host adapter is optional convenience over the same project-local
  `runProjectHarness`, not a second Harness implementation.

Spawn scope: apply may `execFile` only `npm` with the frozen install/ci argv, `shell: false`, and
`cwd = <root>/.wizloft/harness`. Internal production materialization does not use `--prefix`.
That is scaffolding, not a kernel process framework. The runner never spawns npm. The separate
repository-root recovery instruction remains
`npm --prefix .wizloft/harness ci --ignore-scripts --no-audit --no-fund`.

Tests inject the install function so CLEAN/EXISTING/CONFLICT proofs do not need the public
registry. Production CLI uses real npm.

### Derived direct runtime dependencies

Do not rely on `@wizloft/harness` accidentally exposing plugin constructors or kernel helpers.

Import derivation from the three required surfaces, matching the existing self-host and CLI
profile/runner oracles:

| Surface | Direct imports |
|---|---|
| `createGeneratedProjectProfile` | `defineProfile`, `requireCapability` from `@wizloft/harness-kernel`; `authorityPlugin` from `@wizloft/harness-authority`; `contextPlugin` from `@wizloft/harness-context`; `evidencePlugin` from `@wizloft/harness-evidence`; `validationPlugin`, `VALIDATION_CAPABILITY` from `@wizloft/harness-validation`; `fileEventsPlugin` from `@wizloft/harness-plugin-file-events`; `fileMemoryPlugin` from `@wizloft/harness-plugin-file-memory`; `memoryContextPlugin` from `@wizloft/harness-plugin-memory-context`; `repositoryFilesPlugin` from `@wizloft/harness-plugin-repository-files` |
| `runProjectHarness` | `createHarness` from `@wizloft/harness`; `createCommandExecutor` from `@wizloft/harness-commands`; `createHarnessCliAdapter` from `@wizloft/harness-cli-adapter`; `readFileEvents` from `@wizloft/harness-plugin-file-events` |
| project health validator | `requireCapability` from `@wizloft/harness-kernel`; `VALIDATION_CAPABILITY` from `@wizloft/harness-validation` |

Exact direct `dependencies` of `@wizloft/harness-project`, sorted:

```text
@wizloft/harness
@wizloft/harness-authority
@wizloft/harness-cli-adapter
@wizloft/harness-commands
@wizloft/harness-context
@wizloft/harness-evidence
@wizloft/harness-kernel
@wizloft/harness-plugin-file-events
@wizloft/harness-plugin-file-memory
@wizloft/harness-plugin-memory-context
@wizloft/harness-plugin-repository-files
@wizloft/harness-validation
```

`@wizloft/harness-memory` is **not** a direct dependency. It remains transitive through:

- `@wizloft/harness` (facade runtime dependency);
- `@wizloft/harness-plugin-file-memory`;
- `@wizloft/harness-plugin-memory-context`.

The generated isolated `.wizloft/harness/package.json` still depends directly on only
`@wizloft/harness-project@0.1.0-alpha.3`. The project package owns the reusable runtime closure.

No `optionalDependencies` or `peerDependencies`. Internal `devDependencies` remain empty unless a
later implementation proof needs a test-only public package already modeled by ADR 0012.

### Derived publish layer

Existing public runtime DAG from `scripts/release-contract.mjs`, with layer =
`1 + max(layer of modeled runtime dependencies)` and independent packages sharing a layer:

| Layer | Packages | Why |
|---|---|---|
| 1 | `@wizloft/harness-kernel` | no public runtime deps |
| 2 | `@wizloft/harness-authority`, `@wizloft/harness-context`, `@wizloft/harness-evidence`, `@wizloft/harness-memory`, `@wizloft/harness-plugin-file-events` | kernel only |
| 3 | `@wizloft/harness-validation`, `@wizloft/harness-plugin-file-memory`, `@wizloft/harness-plugin-memory-context`, `@wizloft/harness-plugin-repository-files` | kernel plus layer-2 capability packages |
| 4 | `@wizloft/harness` | facade over capability packages |
| 5 | `@wizloft/harness-commands` | facade |
| 6 | `@wizloft/harness-cli-adapter` | commands |

`@wizloft/harness-project` depends on layer 6 (`@wizloft/harness-cli-adapter`) and on earlier
layers. It therefore publishes in **layer 7**. That number is the DAG result, not “whatever comes
after the CLI adapter in a list.” The binding predecessor is `@wizloft/harness-cli-adapter`.

Updated dependency-first publication order:

```text
1. kernel
2. Authority, Context, Evidence, Memory, file-events
3. Validation, file-memory, memory-context, repository-files
4. Harness facade
5. commands
6. CLI adapter
7. harness-project
```

---

## 5. Path namespace

Chosen layout:

```text
.wizloft/                         org namespace, not Harness-owned as a whole
  PROJECT.md                      project-owned current-truth file
  harness/                        Harness-owned tooling namespace
    project.json                  completion sentinel / machine marker
    INSTRUCTIONS.md               canonical human/agent instructions
    profile.mjs                   generated profile entry
    profile.local.mjs             optional source-only overlay; never created by init
    run.mjs                       required tiny runner
    package.json                  isolated tooling manifest
    package-lock.json             isolated lockfile
    node_modules/                 install output; ignored
    local/                        Memory/Event state; ignored
      memory.jsonl
      events.jsonl
```

`.wizloft/harness/.npmrc` is **not** generated.

Rejected flat `.wizloft/harness.json` + `.wizloft/profile.mjs`. `.wizloft/` must stay available to
future non-Harness Wizloft tooling. Harness owns only `.wizloft/harness/` plus create-if-missing
`.wizloft/PROJECT.md`.

CLI `dev/harness/` and `.local/wizloft-harness/` stay CLI-owned. Alpha.3 does not migrate CLI.

---

## 6. Initialized-repository map

Classification key:

- `whole` — Harness-owned whole file; re-init may replace, except the marker which is last
- `sentinel` — Harness-owned whole file written only after successful materialization
- `block` — Harness-owned managed block only
- `create-once` — project-owned; create if missing; never overwrite
- `optional` — project-owned; never created by init; never overwritten
- `adapter` — created or block-updated only when selected
- `generated` — created by apply install, then tracked
- `runtime` — created at runtime; ignored
- `ignored` — must be gitignored

| Path | Class | Required after successful apply |
|---|---|---|
| `.wizloft/harness/project.json` | sentinel | yes |
| `.wizloft/harness/INSTRUCTIONS.md` | whole | yes |
| `.wizloft/harness/profile.mjs` | whole | yes |
| `.wizloft/harness/run.mjs` | whole | yes |
| `.wizloft/harness/package.json` | whole | yes |
| `.wizloft/harness/package-lock.json` | generated / tracked | yes after successful install |
| `.wizloft/PROJECT.md` | create-once | yes |
| `.gitignore` managed block | block | yes |
| `AGENTS.md` | adapter / block | default yes |
| `CLAUDE.md` | adapter / block | default yes |
| `.wizloft/harness/profile.local.mjs` | optional | no |
| `.wizloft/harness/node_modules/` | ignored | present after apply or clone `npm ci`; not tracked |
| `.wizloft/harness/local/` | runtime / ignored | created on first Memory/Event write |

No `.npmrc`. No runner is “candidate”. A valid sentinel certifies the last successful
materialization; it does not guarantee ignored `node_modules/` exists in every checkout.

---

## 7. Marker schema

File: `.wizloft/harness/project.json`

This file is the successful-initialization commit sentinel. A schema-valid marker may be written
only for a release that has already been materialized and resolved in that apply. Later clones may
lack ignored `node_modules/` while the marker remains valid.

Schema identity and versions are separate fields. There is no single `harnessVersion`.

```json
{
  "schema": "wizloft.harness.project",
  "schemaVersion": 1,
  "projectId": "example",
  "generatedBy": {
    "package": "@wizloft/harness-project",
    "version": "0.1.0-alpha.3"
  },
  "runtime": {
    "package": "@wizloft/harness-project",
    "release": "0.1.0-alpha.3"
  },
  "subjects": {
    "project": "example:project",
    "harness": "example:harness"
  },
  "memoryScope": "project:example",
  "paths": {
    "instructions": ".wizloft/harness/INSTRUCTIONS.md",
    "profile": ".wizloft/harness/profile.mjs",
    "runner": ".wizloft/harness/run.mjs",
    "projectTruth": ".wizloft/PROJECT.md",
    "localState": ".wizloft/harness/local"
  },
  "command": {
    "argv": ["node", ".wizloft/harness/run.mjs"]
  },
  "adapters": ["agents", "claude"]
}
```

Field meanings:

| Field | Meaning |
|---|---|
| `schema` | schema identity |
| `schemaVersion` | marker schema integer |
| `generatedBy.version` | initializer that last **successfully completed** apply |
| `runtime.release` | isolated `@wizloft/harness-project` release that was proven resolvable |
| `subjects.project` | stable Context and primary Authority subject |
| `paths.*` | exact artifact locations |
| `command.argv` | exact generated command prefix |
| `adapters` | installed discovery adapters |

Unsupported `schema` / `schemaVersion` is a conflict. This is a marker, not a configuration
framework. Source overlays, not the marker, add extra Authority/Context sources.

---

## 8. `projectId` contract

`--project-id` is required on every dry-run and apply, including re-init.

Directory basename and `package.json` `name` are help suggestions only. They are never applied.

Validation, no coercion:

- entire value must match `^[a-z][a-z0-9-]{0,62}$`
- lowercase ASCII only; uppercase fails
- no `_`, `.`, `/`, `:`, `@`, or consecutive `--`
- max 63 characters
- rejected values fail with usage exit `2` and no writes

Re-init:

- supplied `--project-id` must equal the marker `projectId` when a valid marker exists
- any other value is a conflict and writes nothing
- Memory scope `project:<projectId>` and subjects `<id>:project` / `<id>:harness` stay bound to
  that id
- alpha.3 has no rename/migration command

---

## 9. Default Authority and Context

Init does not create `<projectId>:task:*`.

| Kind | Value |
|---|---|
| Stable Context subject | `<projectId>:project` |
| Primary Authority subject | `<projectId>:project` |
| Harness instruction Authority | `<projectId>:harness` |
| Memory scope | `project:<projectId>` |

### CLEAN and EXISTING source lists

The same explicit lists are used. No filesystem discovery. README, docs, `package.json`, and
user AGENTS/CLAUDE bodies are not auto-ingested.

Authority, highest precedence first:

| Order | Subject | Path | Precedence |
|---|---|---|---|
| 1 | `<projectId>:project` | `.wizloft/PROJECT.md` | 100 |
| 2 | `<projectId>:harness` | `.wizloft/harness/INSTRUCTIONS.md` | 90 |

Context `<projectId>:project`, trust-role order:

| Order | Role | Source |
|---|---|---|
| 1 | `authority` | `.wizloft/PROJECT.md` |
| 2 | `authority` | `.wizloft/harness/INSTRUCTIONS.md` |
| 3 | `supporting` | Memory `project:<projectId>` states `active` |
| 4 | `historical` | Memory `project:<projectId>` states `stale`, `superseded` |

Humans add project truth by editing `.wizloft/PROJECT.md`.

Humans add more repository sources only through `.wizloft/harness/profile.local.mjs` using the
bounded overlay in section 12. Init never creates or overwrites that file.

Generated `.wizloft/PROJECT.md` is never overwritten after first creation.

Marker and `INSTRUCTIONS.md` both state the exact subjects and the exact command.

Historical plans, Evidence, and Events are not default Context. They remain queryable when a
consumer later adds explicit Authority subjects or reads Events.

Default Validation: `@wizloft/harness-project` registers one root-required health validator that
runs only after a valid profile and runtime exist. It checks marker schema, required paths,
`projectId` consistency, runner/command fields, and that the isolated install’s
`@wizloft/harness-project` version equals `runtime.release`. CLEAN proof runs that validator after
local materialization. It is not a Git scope checker, not a shell runner, and not a substitute for
bootstrap failures such as a malformed overlay or missing `node_modules/`.

---

## 10. Ownership and update table

| Artifact | First init | Re-init / upgrade | User edited | Failure |
|---|---|---|---|---|
| `project.json` | write **last**, only after install + portable lockfile certification + exact runtime proof | replace **last**, only after the same new-release proofs | invalid schema/id fails before writes | never written/replaced on failed apply |
| `INSTRUCTIONS.md` | create before install | replace before install | overwritten; file is Harness-owned | may remain as partial scaffolding |
| `profile.mjs` | create before install | replace before install | overwritten; customize via overlay | may remain as partial scaffolding |
| `run.mjs` | create before install | replace before install | overwritten | may remain as partial scaffolding |
| isolated `package.json` | create before install | replace before install | overwritten | may already show the target pin |
| `package-lock.json` | created by install | rewritten only when install runs | left alone if install is skipped | may be missing or stale; marker unchanged |
| `profile.local.mjs` | not created | never touched | preserved | n/a |
| `.wizloft/PROJECT.md` | create template if missing | preserve forever | preserved | never rolled back |
| `.gitignore` block | create file or insert block | update block interior | bytes outside block preserved | malformed/multiple blocks fail before writes |
| `AGENTS.md` / `CLAUDE.md` | create or insert block if selected | update selected block; `remove-block` if deselected | bytes outside block preserved; empty file may remain | malformed/multiple/legacy+new fail before writes |
| `node_modules/` | install before marker | install before marker | not owned | may be absent or mixed; marker unchanged |
| `local/` | not created by init | never deleted | preserved | n/a |

Re-init never stages, commits, resets, or cleans Git. It never deletes user files and never rolls
back unrelated user files.

### Legacy CLI blocks

Recognized legacy pair, markdown adapters only:

```html
<!-- HARNESS:BEGIN -->
...
<!-- HARNESS:END -->
```

Behavior:

- treat as the owned block;
- migrate in place to `<!-- wizloft-harness:start -->` / `<!-- wizloft-harness:end -->`;
- replace interior with the schema-1 bootstrap;
- do not insert a second Harness block;
- if legacy and schema-1 markers both exist, fail;
- unclosed, nested, or non-standalone marker lines fail.

CLI upgrade to alpha.3 does not have to run generic init. If it later does, this migration is the
rule.

---

## 11. Filesystem safety and marker-last apply

- `--root` is required and is the target. Resolve once against process cwd, then treat as
  absolute.
- No parent search. No `git rev-parse --show-toplevel`.
- `--root` must be an existing directory. `.git` must exist there as a non-symlink directory or
  file (plain repo or worktree). Missing `.git` fails.
- Every managed path must resolve inside `--root`. Absolute, escaping, or out-of-root realpaths
  fail.
- Reject symlinked managed files or directories, including `.wizloft`, `.wizloft/harness`, adapter
  files, `.gitignore`, and `PROJECT.md` when those paths exist as symlinks.
- Reject wrong types: file where a directory is required, directory where a file is required.
- Managed markers must be the entire line. Leading/trailing text on the marker line fails.
- Multiple, nested, or unclosed blocks fail.
- User bytes outside owned blocks are preserved exactly.
- Existing CRLF or LF is preserved for that file. New files use LF.
- Planner/preflight compute the complete operation set before any write or install.
- Dry-run uses the same planner/preflight path and writes nothing, including no lockfile and no
  `node_modules`.
- CREATE writes and fsyncs a sibling temp file, then publishes with an atomic no-clobber
  `link(temp, destination)`.
- REPLACE / `update-block` / `remove-block` and marker replacement write and fsync a sibling temp
  file, perform the final expected-state recheck, then publish with atomic `rename`.
- No `git add`, `commit`, `reset`, `restore`, `clean`, or index mutation.
- Tests mutate only temporary repositories. No real user project is used as a fixture.

### Required apply sequence

```text
complete planner / preflight
  ->
create/update non-marker Harness tracked files
  (INSTRUCTIONS.md, profile.mjs, run.mjs, isolated package.json)
  ->
create-if-missing .wizloft/PROJECT.md
  ->
create/update selected AGENTS.md / CLAUDE.md / .gitignore managed blocks
  and remove-block any now-deselected adapter block
  ->
materialize isolated npm runtime when this apply must prove a new or first release
  ->
certify the portable isolated package-lock:
  modern parseable format, exact root dependency, canonical exact project entry,
  no project link, and only portable node_modules/... package locations
  ->
prove @wizloft/harness-project resolves from .wizloft/harness/node_modules
  and its version equals the intended runtime.release
  ->
fresh planner / certification
  ->
atomically write/update project.json LAST when marker content changes
```

`project.json` is the completion sentinel.

Invariants:

```text
schema-valid project.json
  + required tracked Harness project artifacts consistent with that marker
    =>
Harness-initialized

initialized
  + exact @wizloft/harness-project matching runtime.release
    resolvable from .wizloft/harness/node_modules
    =>
runnable / locally materialized
```

### First-init failure

If install, portable lockfile certification, or runtime verification fails:

- no valid new `project.json` may claim successful initialization;
- already-applied non-marker files may remain as detectable partial state;
- `PROJECT.md` and user bytes outside managed blocks stay as written;
- re-init replans and may replace Harness-owned non-marker files, because they are uncommitted
  scaffolding until a sentinel exists;
- re-init then retries install, portable lockfile certification, exact runtime proof, and writes
  the marker last.

### Upgrade failure

If a previously valid initialized project is upgraded by a newer initializer:

- the existing valid marker continues to describe the last successfully materialized release;
- `generatedBy` and `runtime.release` are not switched early;
- non-marker Harness-owned files and isolated `package.json` may already show the target release;
- isolated `node_modules` may be missing, mixed, or still old;
- after the new install, portable lockfile certification, and exact runtime proof succeed,
  atomically replace the marker last;
- until that happens, the project is not “current” for the new release.

A failed upgrade may leave `node .wizloft/harness/run.mjs` unable to satisfy
marker-vs-install consistency. Retrying apply is the recovery. Do not invent rollback of user
files, and do not promise transactional rollback of already-updated Harness-owned non-marker
tooling files.

### Repository states

| State | Detection | Behavior |
|---|---|---|
| Clean | no `.wizloft/harness/` and no valid marker | create full contract; marker last |
| Existing, no Harness | user files present, no marker | create Harness files and adapter blocks; preserve user bytes; marker last |
| Partial first init | harness files exist without a valid schema-1 marker | replan; replace uncommitted Harness-owned non-marker files; preserve `PROJECT.md` and user bytes; install; certify portable lock; prove exact runtime; write marker last. Unexpected types/symlinks/malformed blocks fail |
| Needs local materialization | valid marker; tracked generated manifest/lock/files consistent with that marker; exact local `@wizloft/harness-project` absent or unresolvable | initialized, not runnable. Recovery is exact `npm --prefix .wizloft/harness ci --ignore-scripts --no-audit --no-fund`. Do not rewrite `project.json` when release identity is unchanged. Not first-init failure, upgrade, or conflict |
| Upgrade in progress | valid old marker present; generated tooling/manifest targets a newer release, or the local install is mixed against that target | keep old marker; rewrite non-marker harness files as needed; install; certify portable lock; prove exact new runtime; replace marker last |
| Reconciliation needed | same-release runtime is locally usable, but desired Harness-owned files, adapters, or marker content differ | plan file/block/marker reconciliation only; do not plan install |
| Current | valid marker, same project id, required tracked files present, isolated package version equals `runtime.release`, package resolvable, desired adapters and generated contract already match | `operations: []` |
| Conflict | bad schema, id mismatch, symlink, malformed blocks, both marker styles, escaped paths | fail before writes |

---

## 12. `profile.local.mjs` overlay

The optional local overlay exists because Harness-owned `profile.mjs` is replaceable on re-init
and projects need a durable customization seam.

Alpha.3 does **not** allow arbitrary plugin/profile composition through that file. A generic
plugin overlay would be a separate public architecture decision, not an alpha.3 slipstream.

### Allowed

Additional explicit repository Authority mappings and additional explicit repository Context
mappings.

### Forbidden

- plugins;
- capabilities;
- profile layers;
- durability providers;
- runtime lifecycle overrides;
- replacing or deleting the two generated defaults.

### Exact export

File, if present: `.wizloft/harness/profile.local.mjs`

```js
export function createProjectSourceOverlay() {
  return {
    authority: [
      { subject: 'example:decision:example', path: 'docs/decisions/0001.md', precedence: 80 },
    ],
    context: [
      { subject: 'example:project', path: 'docs/decisions/0001.md', role: 'authority' },
    ],
  };
}
```

`createGeneratedProjectProfile` loads this file. Missing file is a no-op.

### Validation

- `createProjectSourceOverlay` must be a function that returns a plain object.
- `authority` and `context` are optional arrays. Unknown keys fail.
- Authority item: non-empty `subject`, root-relative `path`, finite numeric `precedence`.
- Context item: non-empty `subject`, root-relative `path`, `role` one of `authority`,
  `supporting`, `historical`.
- Paths use `/` separators, reject empty/absolute/escaping paths, and must resolve inside the
  repository root. Symlinks that escape the root fail.
- Overlay Authority subjects must be unique within the overlay.
- Overlay Authority subjects must not be `<projectId>:project` or `<projectId>:harness`.
- Overlay `subject+path` pairs must be unique within the overlay and must not duplicate a
  generated default pair.
- Overlay Context may add more paths to `<projectId>:project`; that is additive, not a
  replacement of `PROJECT.md` / `INSTRUCTIONS.md`.
- Every overlay Context item with role `authority` must have its `path` present as an Authority
  source in the generated default Authority set or the same validated overlay Authority set.
- The Context subject does not have to equal the Authority subject. The path must be backed by
  Authority. Supporting and historical Context paths do not require an Authority mapping.

Valid:

```text
overlay authority: example:decision:foo -> docs/foo.md
overlay context:   example:project / docs/foo.md / authority
```

Invalid:

```text
overlay context: example:project / random.md / authority
with no Authority mapping for random.md
```

### Ordering

Generated defaults are always first, in the section 9 order. Overlay items append in array order
after those defaults. Contributor registration remains deterministic.

### Failure

Malformed overlay, out-of-root path, reserved-subject override, ungrounded `authority` Context
path, or duplicate pair is a bootstrap failure. `runProjectHarness` throws. `run.mjs` renders
once. The health validator does not run and must not fake a Validation report for a failure that
occurs before Harness exists.

---

## 13. Isolated tooling manifest and `.npmrc` decision

### `.npmrc`: removed

The internal production apply invocation is:

```text
cwd = <root>/.wizloft/harness
npm install --ignore-scripts --no-audit --no-fund
```

Internal `ci` uses the same cwd-bound execution model. The public fresh-clone recovery command
remains:

```text
npm --prefix .wizloft/harness ci --ignore-scripts --no-audit --no-fund
```

Those flags already own ignore-scripts, audit, and fund. A generated `.npmrc` would add a policy
file without a remaining invariant, and must not carry auth or registry credentials. Alpha.3 does
not write `.npmrc`.

### Isolated `package.json`

Harness-owned whole file. Exact shape:

```json
{
  "name": "wizloft-harness-project-tooling",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@wizloft/harness-project": "0.1.0-alpha.3"
  }
}
```

| Field | Rule |
|---|---|
| `name` | fixed tooling metadata, not `<projectId>` and not `@wizloft/harness-project` |
| `version` | fixed `0.0.0` tooling metadata; not the Harness release |
| `private` | `true` |
| `type` | `module` |
| `dependencies` | only `@wizloft/harness-project` at the exact lockstep version |
| scripts | omitted |
| engines / license / repository / description | omitted |
| root app dependencies | never mirrored |

`package-lock.json` is tracked. `node_modules/` is ignored.

---

## 14. `.gitignore` managed block

Exact schema-1 block:

```gitignore
# wizloft-harness:start
.wizloft/harness/node_modules/
.wizloft/harness/local/
# wizloft-harness:end
```

Do not ignore `project.json`, `INSTRUCTIONS.md`, `profile.mjs`, `run.mjs`, isolated
`package.json`, `package-lock.json`, or `.wizloft/PROJECT.md`.

If `.gitignore` is missing, create it with only this block. If it exists, insert or update this
block only. Preserve user bytes outside the block and the file’s existing LF/CRLF convention.

---

## 15. Generated `PROJECT.md` template

`.wizloft/PROJECT.md` is project-owned create-once. Re-init never overwrites it. An existing file
keeps its bytes.

Init does not infer content from `package.json`, README, or the directory name. The only
substituted token is the explicit `--project-id`.

```markdown
# example

## Purpose

Describe what this repository is for.

## Current Architecture

Describe the current system shape that agents should treat as true.

## Development Constraints

Record constraints that must not be silently changed.
```

That is enough for clean-repo Context to resolve a real, editable project-truth file immediately.

---

## 16. Runner lifecycle

### `run.mjs` owns

- `process.argv.slice(2)`
- `repositoryRoot` derived from its known location:
  `path.resolve(fileURLToPath(new URL('../..', import.meta.url)))`
- `process.env`, `process.stdin`, `process.stdout`, `process.stderr`
- Node `>=22.13.0` preflight from `process.versions.node` before any project-package import
- ESM `import.meta.resolve('@wizloft/harness-project')` after that preflight, naturally based at
  the runner's own location inside `.wizloft/harness`
- exact npm-ci recovery only when genuine package absence reports `ERR_MODULE_NOT_FOUND`
- actual bad-export, invalid-target, and other resolution errors rendered once with their own
  message
- `await import(resolved)` of the successfully resolved URL
- actual import/evaluation/bootstrap errors rendered once, not as a missing-`node_modules` message
- final `process.exitCode`
- rendering of **thrown** bootstrap errors: `stderr.write(message + '\n')`, then `exitCode = 1`

It must stay tiny. It must not parse Harness commands. It must not call `process.exit()`. It must
not use `createRequire` or `require.resolve`. It must not install packages, spawn npm, use npx, or
mutate the repository. It must not search parent directories.

Generated conceptual body:

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

const [major, minor] = process.versions.node.split('.').map((value) => Number(value));
if (!Number.isInteger(major) || !Number.isInteger(minor) || major < 22 || (major === 22 && minor < 13)) {
  fail(
    `Wizloft Harness requires Node.js >=22.13.0. This process is running Node.js ${process.versions.node}.`,
  );
} else {
  const repositoryRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
  let resolved;
  try {
    resolved = import.meta.resolve('@wizloft/harness-project');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND') {
      fail(
        'Cannot resolve @wizloft/harness-project from .wizloft/harness/node_modules. Restore the isolated runtime with:\n\nnpm --prefix .wizloft/harness ci --ignore-scripts --no-audit --no-fund',
      );
    } else {
      fail(error instanceof Error ? error.message : String(error));
    }
  }
  if (resolved) {
    try {
      const { runProjectHarness } = await import(resolved);
      try {
        process.exitCode = await runProjectHarness(process.argv.slice(2), {
          repositoryRoot,
          env: process.env,
          stdin: process.stdin,
          stdout: process.stdout,
          stderr: process.stderr,
        });
      } catch (error) {
        fail(error instanceof Error ? error.message : String(error));
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  }
}
```

### `runProjectHarness` owns

- marker loading and validation
- required release/path consistency against the isolated install
- generated profile loading (`profile.mjs` → `createProjectProfile` →
  `createGeneratedProjectProfile`)
- overlay load/validation
- Harness runtime creation
- command executor
- CLI adapter
- writing adapter `stdout` / `stderr` to the supplied streams
- returning the adapter numeric exit code
- `shutdown()` in `finally` after runtime creation

It must copy argv and treat it as readonly. It must not call `process.exit()`. It must not install
packages or mutate the repository. It must not search parent directories. It must not write thrown
bootstrap errors to stderr; it throws and lets `run.mjs` render once.

### Thrown-bootstrap owner

**Only `run.mjs` renders thrown bootstrap errors.** `runProjectHarness` throws without writing.
Adapter-completed help/usage/result output is already rendered by the CLI adapter and applied to
the supplied streams by `runProjectHarness`.

### Options contract

```ts
type RunProjectHarnessOptions = {
  readonly repositoryRoot: string;
  readonly env: Readonly<NodeJS.ProcessEnv>;
  readonly stdin: NodeJS.ReadableStream;
  readonly stdout: NodeJS.WritableStream;
  readonly stderr: NodeJS.WritableStream;
};
```

No additional options in alpha.3 unless a later proof shows a required seam. `stdin` is accepted
so the runner does not keep a hidden process global; the current CLI adapter does not read it.

### Clean-project observables

| Invocation | Result |
|---|---|
| `node .wizloft/harness/run.mjs --help` | adapter help on stdout, exit `0` |
| `node .wizloft/harness/run.mjs inspect --json` | inspect envelope, exit `0` |
| invalid Harness argv | adapter usage error, exit `2` |
| missing/invalid marker, malformed overlay | `runProjectHarness` throws; `run.mjs` writes one message to stderr; exit `1` |
| unsupported Node | `run.mjs` writes one actionable error; no project-package import; exit `1` |
| fresh clone / missing isolated package | `run.mjs` writes one actionable error containing the exact `npm ci` command; exit `1` |
| any of the above | no `process.exit()` |

---

## 17. Initializer API and CLI

```ts
planProjectInitialization(options): InitializationPlan
applyProjectInitialization(options): Promise<InitializationResult>
runProjectHarness(argv, options): Promise<number>
createGeneratedProjectProfile(options): Promise<HarnessProfile>
```

`applyProjectInitialization` always replans from current disk plus the supplied options. It never
applies a previously rendered operation list. Dry-run output is informational.

### CLI

```text
wizloft-harness-project init \
  --root <dir> \
  --project-id <id> \
  [--adapters agents,claude] \
  [--dry-run] \
  [--json]
```

No wizard. No prompts.

| Flag | Rule |
|---|---|
| `--root` | required |
| `--project-id` | required, even on re-init |
| `--adapters` | optional desired state. Default `agents,claude`. Allowed tokens: `agents`, `claude`. `none` selects zero adapters. Unknown token is usage error. Order in the marker is sorted `agents` then `claude`. Selected adapters get exactly one managed block. Previously installed but now deselected adapters receive `remove-block` only; surrounding user bytes stay; an empty leftover file is acceptable. Marker `adapters` updates only through marker-last when marker content changes. |
| `--dry-run` | plan only |
| `--json` | one JSON object on stdout |

Clean and existing repos both receive AGENTS.md and CLAUDE.md by default.

### Operation object

```json
{
  "kind": "create" | "replace" | "update-block" | "remove-block" | "install",
  "path": ".wizloft/harness/project.json"
}
```

Dry-run lists only mutating operations in apply order. `install` appears before the marker
create/replace when this apply must prove a new or first release. `remove-block` never deletes a
whole user file. Zero-diff means `operations: []`.

JSON success also includes `root`, `projectId`, `mode`, `subjects`, `command`, and `adapters`.

### Exit codes

| Code | When |
|---|---|
| 0 | dry-run or apply succeeded, including zero-diff |
| 1 | preflight/conflict/install/IO/resolve failure |
| 2 | invalid argv or failed `projectId` syntax |

Preflight/conflict failures write nothing.

---

## 18. Agent discovery

One canonical instruction file: `.wizloft/harness/INSTRUCTIONS.md`.

AGENTS.md and CLAUDE.md receive only a Harness-owned bootstrap block. They must not contain a
second copy of the full rules.

Bootstrap content, conceptually:

- this repository uses Wizloft Harness;
- read `.wizloft/harness/INSTRUCTIONS.md`;
- exact command `node .wizloft/harness/run.mjs`;
- stable Context `<projectId>:project`;
- Authority subjects `<projectId>:project` and `<projectId>:harness`;
- do not duplicate Harness rules in this file.

No other adapters in alpha.3.

---

## 19. Conceptual flows

### Agent work

```text
open repo
  -> adapter block says Harness is present
  -> canonical INSTRUCTIONS.md
  -> node .wizloft/harness/run.mjs inspect
  -> authority.resolve --input '{"subject":"<id>:project"}'
  -> context.resolve --input '{"subject":"<id>:project"}'
  -> bounded work
  -> validation.run
```

### Init

```text
wizloft-harness-project init --root <repo> --project-id <id> --dry-run
  -> same planner as apply, zero writes

wizloft-harness-project init --root <repo> --project-id <id>
  clean     -> non-marker files, blocks, install, portable-lock certification,
               exact runtime proof, marker last
  existing  -> same; preserve user bytes; one block per selected adapter
  re-init   -> update owned non-marker files if needed; remove-block deselected
               adapters; skip install if current; marker last only when marker
               content or a new release changes
  clone     -> valid marker + missing node_modules is not init work;
               recover with exact npm ci; do not rewrite marker
  partial   -> recover uncommitted harness files; install; portable-lock
               certification; exact runtime proof; marker last
  conflict  -> exit 1, no writes
```

---

## 20. Deferred work

Keep these out of alpha.3. Scope-integrity is the next hardening candidate.

| Item | Disposition |
|---|---|
| Repository-scope validator (`authorizedPaths` vs observed Git changes) | next hardening cycle; read-only provider/plugin or reusable consumer utility, not kernel |
| Validation closeout envelope | defer; runtime Evidence + durable Events are not a bug |
| Durable Evidence store | defer |
| Versioned Context / tree snapshots | not justified by CLI evidence |
| Subagent / sandbox / Git writer | host runtime and workflow instructions |
| Extra agent adapters | defer |
| CLI subject rename `wizloft-cli:task:typescript-rewrite` | CLI-owned |
| Arbitrary plugin overlay | not alpha.3; would need its own ADR |
| Kernel changes | none |

Scope-integrity notes for the next cycle, not implementation now:

- Git observation is a provider, not kernel;
- Validation should distinguish declared vs observed paths rather than trusting one field;
- CREATE/MODIFY/DELETE/RENAME and untracked files need an explicit observation model;
- unavailable Git is a structured miss, not silent success;
- the check must not stage, reset, or mutate files.

---

## 21. ADR 0013 contents

Phase 0 wrote [0013](../../decisions/0013-project-onboarding-and-discovery.md). Lasting rules:

1. Project initialization is pre-runtime scaffolding in `@wizloft/harness-project`, not a kernel
   capability and not a live-runtime command.
2. A Harness-initialized repository is defined by `.wizloft/harness/project.json` schema
   `wizloft.harness.project` version 1 plus required tracked artifacts. The marker is written last
   after isolated runtime proof. A checkout is runnable only after local materialization.
3. Canonical instructions live at `.wizloft/harness/INSTRUCTIONS.md`. Agent files may hold only a
   managed bootstrap. `--adapters` is desired state.
4. The required portable execution command is `node .wizloft/harness/run.mjs`, which preflights
   Node, then dynamically imports and delegates to `runProjectHarness`. A future host CLI is
   optional convenience over the same project-local function.
5. Runtime packages resolve from an isolated `.wizloft/harness` install, not from root dependency
   mutation and not from per-command npx. Fresh clones restore ignored `node_modules/` with
   exact `npm ci`.
6. `--project-id` is explicit. Init creates `<projectId>:project` and `<projectId>:harness`, never a
   task subject.
7. Default Authority/Context sources are exactly `PROJECT.md` and `INSTRUCTIONS.md`.
   `profile.local.mjs` may add explicit repository mappings only. Context role `authority` must
   be backed by an Authority path.
8. The initializer is a bounded repository writer with dry-run, preflight, and no Git mutation.
9. `@wizloft/harness-project` does not claim host product binaries.

ADR 0012 amendment, written in Phase 0 as documentation only:

- add `@wizloft/harness-project` as the fourteenth public lockstep package;
- directory `packages/project`;
- runtime dependencies exactly the twelve packages in section 4;
- publish after every direct dependency in the DAG, which is layer 7 after the CLI adapter;
- packed-consumer and registry proofs include the new package and a generated-repo install proof.

---

## 22. Implementation phases

This plan is accepted. Phase 0 durable decisions are committed. The post-Phase-0
portable-wrapper versus host-CLI clarification is accepted. Phase 1 planner/preflight follows
that clarification commit.

### Phase 0 — Durable decisions

Status: committed at `da3694890ae8921858070adcfa55e7d0e2651d81`. Not reopened.

Completed:

- write [ADR 0013](../../decisions/0013-project-onboarding-and-discovery.md);
- amend [ADR 0012](../../decisions/0012-public-package-release-contract.md) with the fourteenth
  package, exact twelve-package runtime dependency list, and DAG-derived layer rule;
- update architecture/consumer docs to match this contract;
- record Phase 0 on this plan.

Bounded clarification discovered while writing ADRs:

- Do **not** amend `scripts/release-contract.mjs`, packed-consumer proof, or release tests in
  Phase 0. `packages/project` does not exist yet. The implemented alpha.2 checker must remain
  thirteen packages at `0.1.0-alpha.2`. Release-script updates transition atomically with the
  package in a later implementation phase.

Phase 0 paths:

- CREATE `docs/decisions/0013-project-onboarding-and-discovery.md`
- MODIFY `docs/decisions/0012-public-package-release-contract.md`
- MODIFY `docs/decisions/README.md`
- MODIFY `docs/architecture/ARCHITECTURE.md`
- MODIFY `docs/architecture/AUTHORITY-CONTEXT-EVIDENCE.md`
- MODIFY `docs/consumers/WIZLOFT-CLI.md`
- MODIFY `docs/consumers/MELDMARK.md`
- MODIFY this plan

No package, source, test, lockfile, version, or release-script changes.

Phase 0 verification:

- start `pnpm verify` / `pnpm release:check`: pass; 13 packages at `0.1.0-alpha.2`
- after docs and after the external-review correction pass: `pnpm verify` /
  `pnpm release:check`: pass; still 13 packages at `0.1.0-alpha.2`
- 30 relative markdown links in touched docs resolve
- `git diff --check`: clean
- scripts, manifests, lockfile, and source/tests unchanged
- no `packages/project` directory

### Phase 1 — Planner and safety

Status: committed at `fac903208236d59353a98e52158fe85b770fb8c2`.

Starting proof after the clarification commit:

- branch `main`
- HEAD `c9fe35ee1140dc2ec899046fa0f6990559732357`
- parent `da3694890ae8921858070adcfa55e7d0e2651d81`
- clean worktree/index before this phase’s files were created

Implemented:

- package boundary `packages/project` for `@wizloft/harness-project`;
- options validation, `projectId` grammar, Node `>=22.13.0` predicate, repository inspection,
  state classification, managed-block parse/plan, filesystem preflight, deterministic
  `InitializationPlan`, and `init --dry-run` human/JSON CLI;
- non-dry-run requests fail with `APPLY_UNAVAILABLE` and write nothing;
- planned operations include future `run.mjs` bytes, but no generated runtime is applied.

External-review correction, still Phase 1:

- `current` now means the desired project contract already matches, so `operations: []`.
  Same-release local runtime with drifted generated files, adapters, or marker content is
  `reconciliation-needed` and does not plan install. `upgrade-in-progress` remains a
  cross-release/mixed-runtime state. `needs-local-materialization` remains missing local
  package recovery.
- root npm exports are only `planProjectInitialization` plus plan/options/state/operation
  and error types. CLI parsing, managed-block helpers, templates, and predicates stay
  internal.
- `project.json` parsing requires the schema-1 canonical paths and command argv, and
  accepts only `[]`, `["agents"]`, `["claude"]`, or `["agents","claude"]`.
- managed-block add/remove is byte-reversible for files with no final newline.
- unknown filesystem/runtime errors map to `IO_FAILURE` or `INTERNAL_ERROR` (exit 1),
  never `INVALID_ARGV`.
- unexpected symlinks on the isolated `node_modules/@wizloft/harness-project` path are
  conflicts, not `current`.
- planned `run.mjs` resolves the local package before import and only prints the npm-ci
  recovery when resolution fails with `MODULE_NOT_FOUND`.
- a `.git` file must be a `gitdir: <path>` worktree marker whose path exists as a
  non-symlink directory.

Not implemented, as required:

- apply writer / marker writer;
- `runProjectHarness`;
- generated on-disk `run.mjs` / `profile.mjs`;
- npm install execution;
- host adapter / `wizharness` / Wizloft CLI Harness module.

D11 release-contract decision:

The current checker treats any workspace outside `PUBLIC_PACKAGES` as private. Creating
`packages/project` as `private: true` therefore does **not** require expanding the public
allowlist or bumping to `0.1.0-alpha.3` in this phase. ADR 0012 still says the public set
becomes fourteen packages when the package is release-ready and the release implementation
transitions with it. Phase 1 keeps that transition for Phase 5.

Bounded Phase 1 release state:

- implemented public graph remains **13 packages at `0.1.0-alpha.2`**;
- `@wizloft/harness-project` exists as a **private, non-release-ready** implementation package;
- `scripts/release-contract.mjs`, packed-consumer proof, and release tests are unchanged;
- lockstep identity is unchanged;
- `pnpm-lock.yaml` only gains the empty `packages/project:` importer.

Phase 1 verification:

- `pnpm --filter @wizloft/harness-project test`: 37 passed;
- `current => operations.length === 0`;
- dry-run writes zero bytes, including no `project.json` and no npm install;
- no `process.exit()` or `child_process` in library source;
- `git diff --check`: clean.

Phase 1 is committed at `fac903208236d59353a98e52158fe85b770fb8c2`.

### Phase 2 — Apply writer

Status: committed at `feb372e62c295c43fe234282b9371e4e5e6af985`.

Internal seam (not a package-root export; CLI still dry-run only):

- `prepareProjectInitialization(options)` is the internal prepared plan (contents + expected bytes);
- public `planProjectInitialization(options)` returns kind/path(/install method) only;
- `applyProjectFilesystem(options)` internally prepares, then applies;
- `applyProjectFilesystemPlan(plan)` is the in-memory test/writer primitive over the prepared plan.

Phase 2 applies only allowlisted `create` / `replace` / `update-block` / `remove-block`
paths. `install` and marker create/replace remain `pending`. Unexpected paths are
`APPLY_FORBIDDEN`.

Stale-plan protection: each prepared file operation carries `expected` bytes
(`undefined` means absent). Expected state is checked before temp preparation
and, for replace/update/remove, checked again immediately before atomic
publication. Create publishes with `link(temp, destination)` so a destination
that appears after planning is `EEXIST` / `STALE_PLAN` rather than clobber.
Successful `link(temp, destination)` is the CREATE commit point; later
`unlink(temp)` is best-effort cleanup and must not fail, roll back, or un-apply
the already-published destination. An orphan `.wizloft-harness-*.tmp` hardlink
may remain; alpha.3 does not require an orphan-cleanup subsystem.

Temp writes use complete `FileHandle.writeFile` then fsync. Managed parents
`.wizloft` / `.wizloft/harness` are re-lstat'd before temp creation and before
publication. Recognizable Node fs errno values become `IO_FAILURE`.

There is no multi-file transaction: later failure reports `applied` / `failed` /
`pending` and never writes the marker.

Preservation proofs:

- `.wizloft/agents.yaml` remains byte-identical while `.wizloft/harness/` is created;
- `.agentkit/` is untouched;
- representative user/AgentKit `.gitignore` lines remain byte-identical outside
  the managed block;
- `.wizloft/PROJECT.md` is create-once; a concurrent create is `STALE_PLAN`.

CLI `init` without `--dry-run` remains `APPLY_UNAVAILABLE` because install and
marker-last are not implemented.

Phase 2 verification:

- `pnpm --filter @wizloft/harness-project test`: 57 passed;
- CLEAN apply leaves `project.json`, `package-lock.json`, and `node_modules` absent;
- concurrent PROJECT.md / AGENTS.md / run.mjs edits fail with `STALE_PLAN`;
- create publication uses no-clobber `link`; replace rechecks expected bytes before rename;
- CREATE remains applied if temp-name cleanup fails after successful `link`;
- no `child_process` / npm / npx in the writer.

Not implemented in Phase 2:

- npm / npx / `child_process`;
- `package-lock.json` generation;
- `node_modules` materialization;
- marker write;
- `runProjectHarness`;
- overlay / health validator.

### Phase 3 — Isolated runtime and sentinel

This is a review partition of the accepted Phase 3 work, not a new architecture
decision and not a reopening of ADR 0013.

#### Phase 3A — Project runtime composition

Status: committed at `29dd040293419eba5bbc72195ac2eeec62b2a92c`.

Owns the real private `@wizloft/harness-project` runtime dependency closure and the
generated-profile / overlay / health / `runProjectHarness` composition. Direct
dependencies, using the workspace source-manifest convention:

```text
@wizloft/harness
@wizloft/harness-authority
@wizloft/harness-cli-adapter
@wizloft/harness-commands
@wizloft/harness-context
@wizloft/harness-evidence
@wizloft/harness-kernel
@wizloft/harness-plugin-file-events
@wizloft/harness-plugin-file-memory
@wizloft/harness-plugin-memory-context
@wizloft/harness-plugin-repository-files
@wizloft/harness-validation
```

`@wizloft/harness-memory` remains transitive.

Implemented:

- optional `.wizloft/harness/profile.local.mjs` source overlay: missing is a no-op;
  present malformed overlay is a bootstrap `INVALID_OVERLAY` / symlink failure;
  Authority/Context additions append after generated defaults; Context `authority`
  role must be path-backed by generated or overlay Authority;
- `createGeneratedProjectProfile({ repositoryRoot, projectId })` is async
  (`Promise<HarnessProfile>`) because optional `.mjs` overlay/profile loading is
  async. It composes the accepted MUH providers plus one root-required health
  validator `@wizloft/harness-project:runtime-health` whose plugin version is
  `packageRelease()`;
- generated `profile.mjs` stays a tiny factory over that function;
- `runProjectHarness(argv, options)` validates Node/root/runtime parents/marker/
  local identity, loads overlay through the generated profile factory, creates
  Harness + command executor + CLI adapter, writes completed adapter streams,
  returns the adapter exit code, and makes one `shutdown()` attempt in a single
  `finally`;
- `.wizloft` and `.wizloft/harness` must exist as real in-repository directories
  before marker/profile/local runtime are read;
- overlay source containment walks existing ancestors so intermediate escaping
  symlinks fail as `INVALID_OVERLAY`; in-root source symlinks remain allowed;
- local runtime identity is `createRequire`-anchored to `.wizloft/harness/` and
  diagnoses `MODULE_NOT_FOUND` as inability to resolve
  `@wizloft/harness-project` from `.wizloft/harness/node_modules`;
- event history uses `readFileEvents(.wizloft/harness/local/events.jsonl)`;
- public root exports add `createGeneratedProjectProfile` and `runProjectHarness`
  only; `HarnessProfile` is not re-exported.

Phase 3A verification:

- `pnpm --filter @wizloft/harness-project test`: 92 passed;
- package remains `private: true` at `0.1.0-alpha.2`;
- public graph remains 13 packages at `0.1.0-alpha.2`;
- no `child_process` / npm install / marker write.

Not implemented in Phase 3A:

- npm / `child_process` / isolated materialization;
- `package-lock.json` generation;
- initializer `node_modules` creation;
- `project.json` write/replace;
- `applyProjectInitialization`;
- successful non-dry-run initializer CLI;
- public graph / alpha.3 transition.

Historical note: the CommonJS resolution details above accurately describe the frozen Phase 1
and Phase 3A checkpoints. The current runner and identity contract supersedes that implementation
detail through the bounded Phase-4C ESM-resolution correction.

#### Phase 3B — Isolated materialization + sentinel

Status: committed at `a23f34ff885e88c9686a0523a7492b8da87fcd67`.

Owns `applyProjectInitialization(options)` and non-dry-run `init`. Sequence:

1. prepare/replan current disk;
2. apply non-marker filesystem operations;
3. if planned, execute bounded isolated npm (`execFile`, `shell: false`);
4. prove lockfile + exact resolvable local `@wizloft/harness-project`, including current and
   reconciliation paths that do not run npm;
5. prepare/replan again from disk (certification plan);
6. certify the fresh plan against the initial repository-state matrix;
7. take zero or one marker operation from that fresh plan and publish it last.

At the frozen Phase 3B checkpoint, installer commands were derived from `method` plus the absolute
isolated directory:

- first-init / existing / partial / upgrade:
  `npm install --prefix <absolute isolated dir> --ignore-scripts --no-audit --no-fund`;
- needs-local-materialization:
  `npm --prefix <absolute isolated dir> ci --ignore-scripts --no-audit --no-fund`.

The Phase-4C portable-lock correction supersedes that internal invocation detail by executing npm
with `cwd = <root>/.wizloft/harness` and no internal `--prefix`. The repository-root public recovery
instruction remains `npm --prefix .wizloft/harness ci --ignore-scripts --no-audit --no-fund`.

Repository classification reuses the Phase-3A isolated runtime identity inspector. A valid tracked
contract with an absent or unresolvable local `@wizloft/harness-project` is
`needs-local-materialization` and plans `ci`; only a safely resolvable exact runtime may classify as
`current` / `reconciliation-needed`. Unsafe symlink, wrong-type, or escaped local runtime identity
remains an error and never invokes npm.

The public API is exactly `applyProjectInitialization(options): Promise<InitializationResult>`.
Tests and the internal CLI adapter use `applyProjectInitializationWithRuntime(...)`; installer and
marker hooks are not root exports and unit tests never hit the public registry.

An install operation becomes applied only after npm, isolated lockfile proof, and exact resolvable
runtime proof all succeed. If npm exits zero but proof fails, `failed` is the install operation and
that identity is absent from `applied`. Post-materialization planner/certification failures preserve
their specific safe error code and add compact `applied` / `failed` / `pending` context with cause
chaining.

Certification:

- current: no writes, no npm, no marker rewrite;
- reconciliation-needed: file/block ops, no npm, marker replace only if metadata changed;
- needs-local-materialization: `ci` and runtime proof, then accept only `current` / `[]` for pure
  materialization or `reconciliation-needed` / one marker `replace` when the caller also requested
  an intentional adapter desired-state metadata change; pure materialization preserves marker bytes;
- clean / existing / partial: scaffold, `install`, prove, `project.json` CREATE last;
- upgrade: keep old marker through files/install; replace marker last; install/resolve/certification failure leaves old marker bytes.

Marker publication reuses Phase-2 atomic create/replace. Successful `link`/`rename` is the sentinel commit point. `INSTALL_FAILED` does not write a new marker.

Phase 3B verification:

- `pnpm --filter @wizloft/harness-project typecheck`: passed;
- `pnpm --filter @wizloft/harness-project build`: passed;
- `pnpm --filter @wizloft/harness-project test`: 124 passed;
- `pnpm verify`: passed;
- `pnpm release:check`: 13 public packages at `0.1.0-alpha.2`;
- exactly one production `node:child_process` import, in `packages/project/src/install.ts`;
- no library `process.exit()` calls;
- host package-manager files, `.agentkit`, `.wizloft/agents.yaml`, Git index, and Git history remain
  unchanged by full apply fixtures.

No release-graph transition. Public graph remains 13 packages at `0.1.0-alpha.2`.

### Phase 4 — Proofs

Phase 4 is partitioned for proof bookkeeping only. This partition does not add architecture or
change the accepted alpha.3 contract.

#### Phase 4A — Repository acceptance matrix

Status: committed at `4612359ba5d6204af140b6a4eb4cbf795d406ce4`.

The dedicated `packages/project/tests/acceptance.test.mjs` suite contains 11 acceptance tests using
temporary Git repositories and the injected isolated-installer seam. It proves:

- CLEAN and EXISTING initialization, marker-last publication, host/Git byte preservation,
  in-root-path Validation, and top-level second dry-run/apply zero-diff;
- the full non-dry-run apply conflict matrix, proving no filesystem mutation or installer call;
- first-init failure/retry, upgrade failure/success with both sentinel identities and final current
  state, and marker create/replace race behavior;
- fresh-clone `ci` recovery, including desired adapter-state change;
- the adapter desired-state matrix, including canonical sorting from noncanonical request order;
- exact default Authority, Context, and Memory roles; no implicit repository ingestion; and the
  bounded overlay acceptance/rejection matrix;
- generated runner help, inspect, Authority, Context, Validation select/run, invalid argv,
  bootstrap rendering, missing-runtime recovery, no `process.exit()`, and shutdown behavior.

Phase 4A verification:

- dedicated acceptance suite: 11 passed;
- `pnpm --filter @wizloft/harness-project test`: 135 passed;
- no production source or release-graph change;
- no registry install or package packing.

#### Phase 4B — Packed package closure

Status: committed at `a116899ebcd20c5ee111f828f32cb412e5cd0af3`.

The dedicated `packages/project/tests/project-pack-contract.test.mjs` proof reuses the current
`PUBLIC_PACKAGES` release oracle and the established local `pnpm pack --pack-destination` plus
`tar -xzf` extraction convention. It packs actual `.tgz` artifacts into an operating-system
temporary directory for the current 13 public packages plus the still-private project package,
forming the intended temporary 14-artifact proof set without changing the public allowlist.

The extracted packed manifests prove:

- all 14 package names are unique and all versions equal the current lockstep identity
  `0.1.0-alpha.2`;
- the packed project remains `private: true` and has exactly the accepted 12 direct runtime
  dependencies, each rewritten from source `workspace:*` to exact `0.1.0-alpha.2`;
- no packed runtime dependency spec uses `workspace:`, `file:`, or `link:`;
- every internal runtime dependency targets an artifact in the proof set at its exact packed
  version; memory is transitively reachable but is not project-direct;
- the packed runtime graph is acyclic and dependency-derived layering places the project in
  layer 7 through the CLI adapter;
- the packed project export, declaration, top-level types, bin, README, and LICENSE surfaces
  exist, and its manifest contains no absolute checkout path.

Phase 4B performs no publish, registry access, install, generated-repository creation, or packed
runtime execution. It does not start Phase 4C or change release identity, package privacy, or the
13-package public graph.

#### Phase 4C — Generated-repository packaged runtime proof

Status: proof-only current apply/dry-run correction green at
`2b035e011f44da991543cbc24177985ccccd1084`; independent Auditor review passed; Phase 4C proof
is closed. Phase 5 subsequently implemented the local release-ready candidate without changing
this historical proof boundary; release/promotion provenance and Phase 6 P2 remain open.

Owns isolated packed-tarball resolution and generated-repository packaged-runtime proof only.

The first real packed execution reached isolated npm materialization, then exposed a mismatch
between the project package's ESM import-only root export and CommonJS
`createRequire(...).resolve()` preflight in local identity inspection and generated `run.mjs`.
The bounded correction preserves the import-only package contract: identity now performs
non-executing inspection of the owned root `import` entry with path/type/containment checks, and
the generated runner uses `import.meta.resolve()` before importing the resolved URL. The Node
floor remains `>=22.13.0`. That first correction is committed at
`cabe413e29adb30d56400cf8f6ed76b1ee476cf2` (`fix: align project runtime with ESM resolution`).

The resumed real proof used dependency-context-aware resolution for all fourteen packed packages,
reached a real fresh clone, and then exposed a second production defect: the generated
`package-lock.json` contained original-checkout-relative package keys rather than portable
package-root-relative `node_modules/...` keys. Real npm 11.17.0 `ci` in the clone consequently
reported all fourteen packages missing from the lockfile.

The bounded second correction is implemented and externally approved as a dedicated correction.
Production npm materialization now executes with `cwd = <root>/.wizloft/harness` and argv beginning
with only `install` or `ci`; it no longer relies on an absolute `--prefix` while inheriting the
initializer cwd. Before marker publication, lockfile certification now requires a modern JSON
lockfile, the exact isolated root dependency, the canonical exact project entry, no project-package
link, and only portable root-relative `node_modules/...` package locations while allowing nested
`node_modules`. Invalid lock output remains `LOCAL_RUNTIME_INVALID`, the install operation remains
unapplied, first-init markers remain absent, and upgrade markers remain unchanged. The public
recovery command remains
`npm --prefix .wizloft/harness ci --ignore-scripts --no-audit --no-fund`.

The dedicated clean rerun ran from `main @ 2b035e011f44da991543cbc24177985ccccd1084` against the
untracked proof `packages/project/tests/project-packed-runtime.test.mjs` (then SHA-256
`30159299e1c21862fe2a9d252e0cd791b5eddf579ee8865b16a7969293f4d84a`). The proof uses
dependency-context-aware ESM traversal: each packed package is resolved with `import.meta.resolve`
from that package's own installed root, then walks the declared Harness dependency graph. It does
not assume top-level hoisting.

That first clean-rerun current-state check established only JSON `current` / empty operations and
an unchanged loopback-registry request count. Independent Auditor review found that insufficient:
it did not compare generated-repository filesystem bytes and could not distinguish a skipped npm
invocation from an npm invocation satisfied by a warm cache.

The proof-only correction (`PHASE4C-PACKED-RUNTIME-PROOF-CORRECTION-001`, advisor verdict A) keeps
the accepted Phase 4C product/runtime contract unchanged. It adds, inside the existing packed
runtime proof and only around the already-current generated repository, a full-tree filesystem
snapshot of that repository immediately before current apply, immediately after current apply, and
after current dry-run, plus a test-local executable `npm` PATH sentinel that records any process
execution and exits 66. Real bootstrap `npm install` and fresh-clone `npm ci` still execute against
the loopback registry with isolated cache/config. Current calls continue to prove zero
package-source requests.

Corrected proof SHA-256
`5edeb6b71386bf950b31e9fde7c3becd1fa36dc577e9f71e4921199433457d5f`.
`pnpm --filter @wizloft/harness-project build` succeeded. Focused proof
`node --test packages/project/tests/project-packed-runtime.test.mjs` passed 1/1 in 6754.368625ms.
`pnpm --filter @wizloft/harness-project test` passed 153/153. `pnpm verify` and
`pnpm release:check` succeeded.

The clean rerun, after this correction, proved:

- fourteen actual packed artifacts (13 public + still-private `@wizloft/harness-project`);
- loopback-only npm source on 127.0.0.1 and isolated cache/config;
- packed initializer bootstrap;
- dry-run zero mutation and no package-source requests;
- production real npm install;
- portable generated lockfile with root-relative `node_modules/...` keys;
- dependency-context-aware ESM resolution of all fourteen packages without a top-level-hoisting
  assumption;
- no source/bootstrap escape;
- wrapper help, inspect, Authority, Context, Validation;
- runtime makes no package-source requests;
- real Git clone without `node_modules`;
- exact recovery error before `npm ci`;
- exact `npm --prefix .wizloft/harness ci --ignore-scripts --no-audit --no-fund` succeeds;
- marker and lockfile bytes preserved across `npm ci`;
- clone runtime succeeds;
- current apply and current dry-run: JSON `current` / empty operations; generated-repository
  filesystem snapshot equal before apply, after apply, and after dry-run; npm PATH sentinel
  recorded zero invocations; zero package-source requests;
- both runtimes work after local registry shutdown;
- registry audit contains only known artifacts and GET/HEAD.

Independent Auditor review passed. Phase 4C proof is closed. This turn does not start
Phase 5 and does not change release identity, package privacy, or the 13-package public graph.

### Phase 5 — Release graph

Status: implemented locally at `f13d4d56e720336083764609f62fdd0a3341fa8b`.

The fourteen-package lockstep `0.1.0-alpha.3` graph includes public
`@wizloft/harness-project` at derived layer 7. Phase 5 is a release-ready local implementation,
supported by the completed Phase 4C packed proof. It is not proof of a coherent public release.

Only `@wizloft/harness-project@0.1.0-alpha.3` is published. The other Harness packages remain
published at `0.1.0-alpha.2`. A later release packet must first prove the already-published project
artifact is byte/provenance-identical to the frozen candidate. Any mismatch stops for an Owner
decision and a new coherent version. If it matches, publish the remaining thirteen exact artifacts,
then prove all fourteen in the registry, the intended dist-tags, and matching Git provenance.
No publication, dist-tag, tag, or push is authorized by this plan correction.

### Phase 6 — External consumer sequence

Status: open; prior results based on a coherent alpha.3-publication premise are not closure proof.

After a later separately authorized coherent release and independent registry/Git-provenance proof:

1. Prove a clean exact-version public-registry consumer.
2. Prove the Wizloft CLI exact-pin upgrade and regression.
3. Prove a fresh/CLEAN released initializer smoke.
4. Prove a distinct existing-project released initializer smoke.
5. Prove Meldmark released initialization and target validation.

External repository changes and pushes require their own exact authority.

### OMP Stage D — interoperability dogfood

Status: open and release-dependent.

A historical temp-only exercise used clean Harness source
`bfbad5cde7979d28b80ef98d10fc29949bec0a3b`, a no-remote fixture, generated bootstrap
`222d7501`, and Worker candidate `70bb4342`. It made no Harness source, registry, push, or
publication change, and `.omp/` remained ignored/local-only. Because it relied on the invalid
coherent-publication premise, it does not close Stage D. Run Stage D only after a later coherent
release is proved and a separate exact packet authorizes the work.

---

## 23. Path family

### Completed / Phase 0

Do not treat these as future CREATE operations:

- `docs/decisions/0013-project-onboarding-and-discovery.md`
- `docs/decisions/0012-public-package-release-contract.md`
- `docs/decisions/README.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/architecture/AUTHORITY-CONTEXT-EVIDENCE.md`
- `docs/consumers/MELDMARK.md`
- `docs/consumers/WIZLOFT-CLI.md`
- this plan’s Phase 0 synchronization

### Remaining implementation family

- `packages/project/package.json`
- `packages/project/README.md`
- `packages/project/LICENSE`
- `packages/project/tsconfig.json`
- `packages/project/src/**`
- `packages/project/tests/**`
- temporary fixtures only under OS temp / test temp dirs
- `scripts/release-contract.mjs` when the package exists
- `scripts/prove-packed-consumer.mjs`
- `scripts/sync-release-identity.mjs` only if the new package needs the same derivation
- `tests/release-contract.test.mjs`
- `pnpm-lock.yaml`
- root `package.json` version when the lockstep bump is authorized
- `docs/README.md` if package/docs claims change again
- `README.md` current-status once alpha.3 exists
- this plan’s implementation progress

### DELETE

- none expected
- specifically do not create `.npmrc` templates

### Do not modify in alpha.3

- kernel / capability / plugin public APIs except consuming them;
- `@wizloft/harness-commands` command ids;
- Wizloft CLI repository;
- Meldmark repository;
- self-host profile Authority list, except a later docs-only follow-up if review wants the active
  plan pointer updated.

---

## 24. Release and consumer proof

Alpha.3 is one lockstep identity sourced from the private root manifest.

Public set becomes fourteen packages. Isolated generated `package.json` depends on exact
`@wizloft/harness-project@0.1.0-alpha.3` only.

Proof after implementation, before publish:

1. `pnpm verify`
2. `pnpm release:check`
3. packed fourteen-package consumer still proves facade → commands → CLI adapter
4. packed `@wizloft/harness-project` manifest contains exactly the twelve direct runtime
   dependencies at the lockstep version, with no workspace, file, or link specifiers
5. generated-repo proof: init a temp git repo against packed tarballs, then
   `node .wizloft/harness/run.mjs inspect` succeeds offline

After authorized publish:

1. clean registry consumer installs `@wizloft/harness-project@0.1.0-alpha.3`
2. Wizloft CLI exact pin upgrade, no generic-init requirement
3. CLI `harness:verify` / product Harness tests
4. fresh init smoke
5. existing init smoke
6. Meldmark

CLI alpha.3 upgrade proof is package-regression, not a layout migration.

---

## 25. Acceptance proofs

All fixtures are temporary git repositories. No real user project is mutated.

### CLEAN

1. `git init` empty directory
2. `init --dry-run --root <that dir> --project-id example` prints the mutating plan, with
   `install` before `project.json`, and writes nothing
3. `init --root ... --project-id example` creates the map in section 6, marker last
4. `node .wizloft/harness/run.mjs --help` exits `0`
5. `node .wizloft/harness/run.mjs inspect --json` succeeds
6. `authority resolve --input '{"subject":"example:project"}'` is `resolved` to
   `.wizloft/PROJECT.md`
7. `authority resolve --input '{"subject":"example:harness"}'` is `resolved` to
   `INSTRUCTIONS.md`
8. `context resolve --input '{"subject":"example:project"}'` returns the two default authority
   items
9. `validation run` with a correlation id and at least one in-root path executes the health
   validator
10. second dry-run and apply have `operations: []` and zero tracked diff

### EXISTING

Start with user `AGENTS.md`, `CLAUDE.md`, `README.md`, `.gitignore`, and a source file.

1. bytes outside managed blocks are unchanged
2. one schema-1 block per selected adapter
3. `.gitignore` user lines preserved; schema-1 block matches section 14
4. root `package.json` absent or unchanged
5. exact command works
6. existing `.wizloft/PROJECT.md`, if present, is unchanged
7. second init is zero-diff

### CONFLICT

Each case fails before mutation:

- unclosed / nested / duplicate managed blocks
- legacy and schema-1 blocks together
- symlinked managed path
- `--root` file, missing directory, or missing `.git`
- `.wizloft/harness` is a file
- marker schema mismatch
- `--project-id` disagrees with a valid marker
- escaped or absolute managed path

### DEPENDENCY CLOSURE

- packed `@wizloft/harness-project` manifest lists exactly the twelve direct runtime dependencies
  at the lockstep version
- no workspace, file, or link specifiers in that packed manifest
- isolated generated `package.json` depends only on `@wizloft/harness-project`
- `@wizloft/harness-memory` is absent from the project package’s direct dependencies and present
  transitively

### MARKER COMMIT

- injected install or resolve failure on first init leaves no schema-valid `project.json`
- re-init resumes that partial state, proves the runtime, then writes the marker last
- simulated upgrade failure keeps the previous valid marker `generatedBy` / `runtime.release`
- successful retry replaces the marker last and only then reports current

### FRESH CLONE

1. initialize successfully
2. recreate or copy only tracked files, with no `node_modules/`
3. marker remains valid and initialized
4. `node .wizloft/harness/run.mjs inspect` reports one actionable local-materialization recovery
   containing `npm --prefix .wizloft/harness ci --ignore-scripts --no-audit --no-fund`
5. run that exact `npm ci`
6. the same runner then works
7. marker bytes remain unchanged

### RUNNER

- generated `run.mjs` resolves from its own `.wizloft/harness` location with
  `import.meta.resolve()`, then dynamically imports one `runProjectHarness` implementation with
  `await import(resolved)` after Node preflight
- no duplicated Harness argv parser
- no `createRequire`, `require.resolve`, `process.exit()`, auto-install, npm spawn, npx, or parent
  search
- help exit `0`, inspect exit `0`, invalid argv exit `2`
- unsupported Node fails before attempting the project-package import
- only genuine package absence reported as `ERR_MODULE_NOT_FOUND` receives the actionable
  fresh-clone recovery message exactly once
- bad exports, invalid targets, other resolution errors, and import/evaluation/bootstrap throws
  retain their actual message and are rendered once by `run.mjs` as exit `1`
- runtime `shutdown()` runs after adapter execution

### OVERLAY

- missing overlay = generated defaults only
- valid additional Authority/Context mapping appears after the defaults
- Context role `authority` is valid only when its path is also an Authority source
- Context role `authority` for a path with no Authority mapping fails as bootstrap
- malformed overlay, out-of-root path, reserved-subject override, or duplicate pair is a
  bootstrap throw, not a Validation report
- arbitrary plugin injection is not part of the alpha.3 contract or tests

### RE-INIT

- after a successful current installation, second dry-run and apply are `operations: []`
- `--adapters agents,claude` then `--adapters agents` removes only the Claude managed block
- `--adapters agents` then `--adapters agents,claude` adds the Claude block
- `--adapters agents,claude` then `--adapters none` removes both owned blocks
- second apply of each desired adapter state is `operations: []`
- leftover empty adapter files are acceptable; whole user files are not deleted

### Package resolution

After a successful initializer exit, the generated repo resolves `@wizloft/harness-project` from
`.wizloft/harness/node_modules` with no network and no workspace/symlink back to the Harness
source checkout.

Proof layering is explicit:

- Phase 4A uses the injected installer seam to prove repository classification, mutation,
  marker-last, recovery, and idempotency behavior without registry npm or package packing.
- Phase 4C owns actual packed artifacts, the real production initializer, real npm install, real
  fresh-clone npm ci, and a loopback-only package source. The dedicated clean rerun from
  `2b035e011f44da991543cbc24177985ccccd1084`, including the proof-only current apply/dry-run
  filesystem-snapshot and npm-sentinel correction, is green. Independent Auditor review passed.
  Phase 4C proof is closed. Dependency-context-aware package resolution remains required and
  must not assume top-level hoisting.

---

## 26. Meldmark readiness

Six local implementation gates are complete; four release-dependent gates remain open:

- [x] CLEAN fixture is green — Phase 4A/4C local acceptance.
- [x] EXISTING fixture is green — Phase 4A/4C local acceptance.
- [x] Idempotent re-init is green — Phase 4A/4C local acceptance.
- [x] Marker/discovery/commit-sentinel proof is green — Phase 4A/4C local acceptance.
- [x] At least AGENTS.md adapter is installed by default — Phase 4A/4C local acceptance.
- [x] Stable Context `<projectId>:project` resolves as specified — Phase 4A/4C local acceptance.
- [ ] `0.1.0-alpha.3` is published and independently proved as one coherent fourteen-package graph.
- [ ] A clean external npm consumer proves that released graph.
- [ ] Wizloft CLI exact alpha.3 pin regression is green against that released graph.
- [ ] Meldmark is initialized and target-validated with the released command.

These gates require a later separately authorized coherent release. They do not authorize registry
mutation, Git provenance changes, either external push, or local OMP changes.

Required Meldmark command shape:

```text
npx --yes @wizloft/harness-project@0.1.0-alpha.3 init \
  --root <meldmark-checkout> \
  --project-id meldmark \
  --dry-run

npx --yes @wizloft/harness-project@0.1.0-alpha.3 init \
  --root <meldmark-checkout> \
  --project-id meldmark
```

Do not reproduce `dev/harness/profile.mjs` by hand.

---

## 27. Architecture boundary check

| Boundary | Alpha.3 status |
|---|---|
| Kernel = plugin host, registry, config, events, lifecycle, diagnostics | unchanged |
| No LLM runtime / agent loop / sandbox / workflow / UI / vector DB | held |
| No generic Git writer | held |
| No process-execution framework | held; one frozen npm spawn in scaffolding apply |
| Optional providers stay outside kernel | held |
| Host owns product binaries | held |
| Repository remains authority | held |
| Memory/Events remain file-backed local state | held |
| No generic plugin overlay | held |

---

## 28. Phase 0 closeout

Phase 0 durable decisions were written, reviewed, and committed as
`da3694890ae8921858070adcfa55e7d0e2651d81` (`docs: define project onboarding architecture`).

Done in Phase 0:

- [ADR 0013](../../decisions/0013-project-onboarding-and-discovery.md);
- [ADR 0012](../../decisions/0012-public-package-release-contract.md) future-graph amendment;
- architecture and consumer synchronization;
- this plan’s Phase 0 record.

Not done in Phase 0 and not part of that checkpoint:

- Phase 1 or later implementation;
- `packages/project`;
- release-script or release-test changes;
- version bump;
- publication;
- Wizloft CLI or Meldmark repository changes.

The Phase 0 correction pass recorded the external-review deltas: initialized vs locally
materialized, generated-runner Node/dynamic-import ownership, adapter desired-state /
`remove-block`, grounded Context `authority` paths, bootstrap-only malformed overlay, and
Phase 0 vs remaining path family.

Phase 0 is closed. It is not reopened by the later wrapper/host clarification.

## 29. Portable wrapper versus host convenience

Status: externally accepted after Phase 0. Does not reopen Phase 0. Does not replace
[0013](../../decisions/0013-project-onboarding-and-discovery.md).

Accepted execution model:

```text
PROJECT-LOCAL PORTABLE PATH

  node .wizloft/harness/run.mjs <Harness argv>
                       |
                       v
            project-local exact
            runProjectHarness()


OPTIONAL HOST CONVENIENCE PATH

  future wizharness / wizloft harness
                       |
                       v
            project-local exact
            runProjectHarness()
```

These are not two Harness implementations.

| Path | Role |
|---|---|
| `run.mjs` | canonical portable repository-local wrapper |
| future host integration | optional convenience execution path |
| both | same project-local `runProjectHarness` semantics |

A host MAY load and invoke the repository-local `@wizloft/harness-project` package directly. It
SHOULD NOT spawn `run.mjs` merely to reuse Harness semantics.

Normal project command precedence:

```text
repository-pinned runtime
  >
host-bundled Harness runtime
```

Initialization remains the exception because it necessarily occurs before the project runtime
exists. A future host may use a compatible initializer to materialize the repository-local
runtime; ordinary project commands then use that local runtime.

Implementing a Wizloft CLI Harness module is not part of alpha.3. That belongs to a separate
Wizloft CLI initiative. Alpha.3 still generates the portable `run.mjs` contract and still does
not claim `wizloft` or `wizharness`.
