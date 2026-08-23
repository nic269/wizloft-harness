# Project Overview

## One-sentence positioning

**Wizloft Harness is an agent-agnostic repository control plane that gives any execution agent a
shared meaning of project identity, authoritative truth, working context, durable project memory,
validation, and evidence.**

## Problem it solves

Coding agents are increasingly capable execution environments, but each agent usually owns its own:

- session context;
- model routing;
- tool permissions;
- memory conventions;
- subagent behavior;
- prompt files and runtime UX.

A repository still needs a stable contract that survives switching between OMP, Codex, Grok,
Claude Code, CI, and a human terminal. Wizloft Harness supplies that stable project layer.

## Core capabilities

| Capability | Responsibility |
|---|---|
| Project identity | Stable project ID, marker, subjects, paths, and runtime release |
| Authority | Resolve which repository sources are authoritative and with what precedence |
| Context | Compose bounded, deterministic current-tree context for a subject |
| Memory | Persist supporting project knowledge with scope, provenance, and lifecycle |
| Validation | Select and run project-defined validators |
| Evidence | Normalize proof records and correlate them with work |
| Events | Persist execution facts and runtime history |
| Onboarding | Initialize clean or existing repositories safely and idempotently |
| Agent discovery | Add tiny bootstrap blocks to agent files without duplicating the full contract |

## Product principles

1. **Repository truth outranks learned memory.**
2. **Kernel stays small and semantic-free.** Capability semantics live in first-party packages.
3. **Project onboarding is safe on brownfield repositories.** User bytes outside managed blocks survive.
4. **The success marker is written last.** It certifies the last materialized, resolved release.
5. **A fresh clone is initialized but may need local materialization.** Tracked lock/marker remain valid;
   ignored `node_modules` is restored with exact `npm ci`.
6. **The project runtime is local and pinned.** Normal commands do not rely on a globally installed host.
7. **Agents are adapters, not owners of the project contract.**
8. **No generic workflow engine, sandbox, Git writer, or model router in Harness.**

## Portable execution boundary

```text
node .wizloft/harness/run.mjs <Harness argv>
```

This command is the lowest-common-denominator boundary for terminals, CI, and any agent host.
Native host integrations may resolve the same project-local package and call `runProjectHarness()`
directly, but must not substitute a host-bundled runtime for the repository-pinned runtime.

## Intended users

- Wizloft CLI and its modules;
- Meldmark;
- future Wizloft products;
- teams switching among multiple coding-agent runtimes;
- repositories that need explicit governance and proof without committing to one agent vendor.
