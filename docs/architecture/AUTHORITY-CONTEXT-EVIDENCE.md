# Authority, Context, Validation, and Evidence

## Authority

Authority answers: **what has this repository accepted as true?**

Sources may include decisions, architecture, product docs, module instructions, code/tests, configuration, or other repository-defined truth. A provider must preserve provenance and precedence rather than flattening every document into equal text.

Authority resolution must support semantics equivalent to:

- resolved;
- missing;
- ambiguous;
- conflict.

Authority contributors return immutable candidates with explicit provenance and a numeric
precedence. Higher numeric precedence means stronger authority. Only candidates at the highest
observed precedence determine the resolution status; lower-precedence candidates remain visible
as `shadowed` evidence and cannot change that status. Results expose the highest-precedence
`contenders` separately from `shadowed` candidates.

Contributors may attach an explicit `resolutionKey` when structured source information genuinely
identifies the resolution represented by a candidate. Authority core never derives this identity
from prose, file-content equality, semantic parsing, or LLM interpretation. Over the contender set:

- no candidates produces `missing`;
- one contender produces `resolved`;
- multiple contenders whose explicit `resolutionKey` values are all present and equal produce
  `resolved` as corroborating authority;
- multiple contenders whose explicit `resolutionKey` values are all present and include distinct
  values produce `conflict`;
- multiple contenders with missing or otherwise insufficient resolution identity produce
  `ambiguous`.

Configurable defaults and memory do not manufacture authority.

## Context

Context answers: **what is the smallest useful set of material for this work?**

Contributors may supply:

- relevant authority;
- affected code/tests;
- recent work/evidence;
- stack/domain guidance;
- supporting memory.

Context composition must be deterministic and retain source labels. Historical evidence should not outrank current authority merely because it is textually similar.

Context items use only these Slice 3 trust roles:

1. `authority`;
2. `supporting`;
3. `historical`.

Composition presents roles in that order. Within each role it preserves contributor registration
order and then each contributor's item order. This is a trust/presentation invariant, not semantic
relevance ranking. Context does not generically deduplicate or re-rank items, and contributor
registration order never implies Authority precedence.

Memory may later contribute only through the supporting/historical seam and cannot manufacture an
authority item. Slice 3 documents that boundary without defining a Memory capability or beginning
Memory integration.

## Project Context lifecycle

Generic project initialization creates durable current-tree subjects, not a permanent task or
migration subject.

- Stable project Context is the current tree: the project-owned current-truth file and the
  Harness instruction file, plus any explicit local source mappings.
- Bounded task Context is active work. Init does not invent a task subject, and a finished task
  name is not default Context.
- Explicit plan Authority may survive completion when a repository still accepts that plan as
  truth. Survival is an explicit Authority mapping, not automatic ingestion of `docs/plans/`.
- History is not default Context. Git, completed plans, Events, Evidence provenance, and Memory
  lifecycle own history.

Default generated sources are only `.wizloft/PROJECT.md` and `.wizloft/harness/INSTRUCTIONS.md`.
README, docs trees, and package manifests are not auto-discovered. Optional
`.wizloft/harness/profile.local.mjs` may add explicit repository Authority/Context mappings only;
it is not a generic plugin overlay.

A local overlay must not manufacture Context role `authority` by assigning the role string. Every
overlay Context item with role `authority` must have its path present as an Authority source in
the generated defaults or the same overlay. The Context subject need not equal the Authority
subject. Supporting and historical Context paths do not require an Authority mapping. Authority
defines accepted truth; Context presents it.

## Repository files

The first-party repository-files provider registers capability-specific contributors with both
Authority and Context. Configured source paths are normalized root-relative paths. Reads resolve
through the canonical repository root and refuse absolute paths, traversal outside the root,
resolved paths outside the root, and symlinks that escape it. This is repository-boundary
correctness, not a security sandbox claim.

Repository-file contributions snapshot immutable file content with normalized root-relative
provenance. They do not parse semantics, inspect Git history, derive resolution identities from
text, or perform AST/schema/LLM interpretation. A repository mapping may leave `resolutionKey`
undefined unless accepted structured configuration genuinely supplies one.

## Validation

Validation answers: **what executable/observable proof is required for this work?**

Validation requests carry a non-empty correlation id, normalized immutable project-relative changed
paths, an optional non-empty source revision, and optional immutable JSON-compatible metadata. Path
normalization uses `/` separators, removes benign `./` segments, rejects empty/absolute/escaping
paths, and deduplicates while preserving first occurrence. Validation does not resolve a physical
repository root.

The capability exposes selection separately from execution so callers can inspect required proof:

- `select(request)` evaluates validator applicability without executing proof;
- `run(request)` uses the same selection semantics and executes selected validators.

Validators have stable unique ids and are either `focused` or `root-required`. Focused validators
declare applicability; root-required validators are always selected while registered. Selection
and execution are sequential and preserve validator registration order in v0. Registrations
snapshot the validated id, kind, applicability callback, and execution callback so later mutation of
caller-owned validator objects cannot change registered behavior.

A focused applicability result of false is not selected. Applicability failures become validator
`error` outcomes in the applicability phase, while execution failures become `error` outcomes in
the execution phase. A normal execution result is `passed` or `failed`. Validator failed/error
outcomes do not stop remaining validators and produce a normal report with `ok: false`.

Validator execution duration uses an injectable monotonic timer and excludes evidence recording or
event publication time. v0 adds no validator priorities, dependency graph, parallel execution,
shell runner, or workflow semantics.

Validation snapshots the validated Evidence `record` callback when its service is created. Later
mutation of the caller-owned Evidence service object cannot change an already-created Validation
service. Infrastructure failures retain both their structured summary and original runtime cause.

## Evidence

Evidence is generic normalized proof produced by work or capabilities such as Validation. The
dependency direction is `kernel <- evidence <- validation`; Evidence does not import or encode
Validation types.

The runtime-scoped Evidence service accepts a non-empty correlation id, stable non-empty kind, and
immutable JSON-compatible payload. Each accepted record adds a generated non-empty unique id and
ISO-8601 UTC `recordedAt` timestamp. Id generation and wall clock are injectable, records are deeply
immutable, and `list()` preserves acceptance order. v0 has no evidence update/delete/query database,
replay, projection, or task-state behavior.

Evidence snapshots the validated event publisher callback when its service is created. Later
mutation of the caller-owned publisher object cannot change an already-created Evidence service.

Every accepted record emits `wizloft.evidence.recorded` with the full immutable record. The record
remains accepted and visible even if event delivery or file-events persistence later fails; event
effects are non-transactional. Evidence publication failure is Harness infrastructure failure, not
a validator outcome.

Validation records one generic evidence item per validator outcome using a validation-specific
evidence kind/payload containing validator id, passed/failed/error status, error phase where
applicable, execution duration, summary, optional source revision, and optional JSON metadata. A
successfully accepted evidence id is linked from the corresponding Validation outcome.

Validation continues later selected validators and evidence attempts after an Evidence/event
failure. After all selected work completes, infrastructure failure rejects `run()` with a structured
error retaining the completed immutable Validation report and infrastructure causes. No
shell/stdout/stderr/exit-code contract is standardized in Slice 4.

Evidence is not a task database and does not become product authority by itself.

## Critical invariant

```text
Authority says Y
Memory says X
        |
        v
Context presents Y as authority and X only as conflicting/stale supporting memory.
```
