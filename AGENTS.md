# Agent Instructions — Wizloft Harness

## Mission

Build a generic, agent-agnostic engineering harness for multiple Wizloft projects.
Meldmark is a major future consumer, but Harness must not become Meldmark-shaped.
The existing Wizloft CLI is the first external brownfield consumer and the first rebuild/dogfood project.

## Read order

For architecture or implementation work, read the smallest relevant set in this order:

1. accepted decisions in `docs/decisions/`;
2. `docs/architecture/`;
3. current active plan under `docs/plans/active/`;
4. relevant milestone/consumer documents;
5. code and tests;
6. upstream/local references only when needed.

References are advisory. Wizloft repository decisions are authority.

## Invariants

- Repository authority outranks memory.
- Events record what happened; memory records what was learned; repository artifacts record what is accepted as true.
- The kernel contains composition mechanics and invariants, not project knowledge.
- Everything project-specific belongs in plugins/profiles/project configuration.
- Harness is not an LLM runtime, coding agent, shell runtime, or sandbox in v0.
- Do not introduce a task/story database as project authority.
- Do not introduce SQLite/vector DB merely because memory exists; v0 memory is file-backed and provider-driven.
- Plugin composition must be deterministic and diagnosable.
- Plugins receive public APIs, not kernel private state.
- `wizloft-cli` owns the `wizloft` and shortcut executable UX. Harness owns reusable command semantics/adapters, not the global `wizharness` binary.

## Upstream references

Use `.references/deepseek-harness` to study plugin/capability/event/lifecycle seams without copying its full agent-runtime scope.
Use `.references/repository-harness-current` for repository authority/workflow patterns.
Use `.references/repository-harness-v1` as archaeology only.

Do not copy upstream code unless there is a deliberate decision, attribution/license review, and a simpler local implementation is not preferable.

## Work shape

For bounded work, use an ephemeral plan in the current Codex session.
For work spanning slices/sessions, maintain the active plan.
Do not create story packets, matrices, or parallel planning artifacts without independent long-term value.

## Subagent Discipline

- Review, audit, and debug-analysis subagents are read-only unless explicitly granted write ownership.
- Read-only subagents report findings only.
- Unexpected subagent modifications are unauthorized proposals, not accepted work.
- The main agent must inspect the worktree after each read-only subagent completes.
- The main agent explicitly implements or adopts accepted findings.

## Decision gate

If a material public contract or architecture decision is genuinely unspecified, stop before encoding an arbitrary choice and surface the smallest decision needed.
Implementation details that fit accepted architecture should be decided in code/tests/active plan without creating unnecessary ADRs.

## Completion

Claim a slice complete only with executable/observable evidence. Keep docs synchronized with implemented contracts.
