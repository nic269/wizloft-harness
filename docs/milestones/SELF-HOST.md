# Self-Host Gate

Status: Passed (2026-08-17)

After MUH, run Wizloft Harness against the `wizloft-harness` repository itself.

The gate passes when Harness can:

1. discover accepted decisions and architecture as authority;
2. identify the active implementation plan and current code/tests without treating references as authority;
3. build bounded context for a real Harness maintenance task;
4. select focused validators plus root-required validation;
5. persist/retrieve project memory with provenance;
6. surface a deliberately conflicting/stale memory without overriding repository authority;
7. record deterministic events/evidence;
8. restart and retain durable memory/events;
9. produce understandable diagnostics for at least one missing capability and one dependency cycle fixture.

Do not use self-hosting as an excuse to add new platform features. Fix only reliability/ergonomics required for the next consumer.

## Established profile

`@wizloft/harness-profile-self-host` composes the existing Authority, Context, Evidence,
Validation, Memory, file-events, file-memory, memory-context, and repository-files implementations.
It adds only project-owned validation registrations for accepted authority documents and the root
workspace verification contract. It does not add a base profile, loader, executable, shell runner,
workflow engine, registry, or other platform feature.

The profile exposes eighteen exact Authority subjects covering all accepted decisions, all current
architecture documents, `AGENTS.md`, this milestone, and the active plan. The bounded maintenance
Context contains only the relevant governance/architecture/plan documents, public facade source,
self-host profile source, self-host acceptance test, and supporting Memory. `.references` content is
not mapped as Authority or Context.

## Observed evaluation

`tests/self-host.test.mjs` operates on this repository through `@wizloft/harness`, the structured
command executor, and the CLI adapter. It proves:

1. every configured decision/architecture/governance subject resolves from immutable repository-file
   provenance;
2. the active plan and current facade/profile/test sources compose into bounded deterministic
   maintenance Context without reference snapshots;
3. project Memory is captured as candidate, activated, made stale, superseded by active replacement
   knowledge, recalled by exact scope, and presented only as supporting Context;
4. deliberately stale/conflicting Memory claiming the facade is deferred or should be bypassed does
   not alter repository Authority;
5. focused authority-document validation and root-required workspace validation are selected and
   executed through CLI JSON commands;
6. both validation outcomes create Evidence and deterministic `wizloft.evidence.recorded` events;
7. file Memory and event history survive shutdown and a second Harness runtime, retaining first-seen
   Memory order, lifecycle state, provenance, and persisted event identity;
8. command/runtime inspection exposes the expected five capabilities and self-host plugin, while
   shutdown disposes capabilities and later operations return `HARNESS_NOT_ACTIVE`;
9. separate fixtures boot through `createHarness()` and return understandable `MISSING_CAPABILITY`
   and `CAPABILITY_CYCLE` diagnostics.

## Finding classification

- **BLOCKER:** none observed.
- **RELIABILITY:** none observed; no kernel, capability, provider, facade, command, or CLI adapter
  behavior required correction during Gate B.
- **ENHANCEMENT (deferred):** invoking the complete repository toolchain as an in-Harness validator
  would require a deliberately designed process-backed integration. External `pnpm verify` remains
  the repository proof for this gate; no shell/process runner abstraction was added.
- **ENHANCEMENT (deferred):** profile loading/discovery and automatic Memory source watching remain
  deferred until a consumer demonstrates concrete need.

## Proof

- repository `pnpm verify` passes on Node.js 22.13.1 with pnpm 11.10.0;
- `pnpm install --frozen-lockfile` followed by `pnpm verify` passes in a fresh temporary copy on exact
  Node.js 22.13.0 with pnpm 11.10.0;
- all fourteen workspace packages/plugins/profiles typecheck, test, and build without relying on
  repository `dist/` output in the fresh copy;
- self-host profile tests pass: 2 passed, 0 failed;
- executable Gate B scenarios pass: 2 passed, 0 failed;
- total automated tests pass: 118 passed, 0 failed;
- Biome, workspace ownership, frozen-lockfile, and no-Harness-executable checks pass.

Gate B is complete. Stop for review before beginning the Wizloft CLI rewrite.
