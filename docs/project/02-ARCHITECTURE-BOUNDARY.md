# Architecture Boundary: Harness, OMP, and Orca

## The three layers

```text
OWNER / ENGINEERING TEAM
        |
        v
ORCA — outer ADE and worktree/process/review orchestration
        |
        v
OMP / CODEX / GROK — execution agents, models, tools, subagents, sessions
        |
        v
WIZLOFT HARNESS — repository control plane and durable project contract
        |
        v
REPOSITORY — code, docs, decisions, plans, tests, state
```

## Ownership table

| Concern | OMP / coding agent | Orca | Wizloft Harness |
|---|---:|---:|---:|
| Model/provider routing | Owns | No | No |
| Interactive coding loop | Owns | Hosts | No |
| Read/edit/bash/LSP/debug/browser | Owns | Hosts terminal/UI | No |
| Subagents | Owns | Displays/orchestrates sessions | No |
| Git worktrees | May use internally | **Outer owner for this team model** | No |
| Diff review UI | Partial | Owns | No |
| Project identity | Consumes | No | **Owns** |
| Authority | Consumes | No | **Owns** |
| Deterministic Context | Consumes | No | **Owns** |
| Durable project Memory | May have session memory | No | **Owns project plane** |
| Validation contract | Executes/integrates | Displays result | **Owns** |
| Evidence and Events | May emit | No | **Owns** |
| Safe project onboarding | No | No | **Owns** |
| Agent-specific bootstrap files | Reads | Surfaces | **Owns managed block** |

## Explicit non-goals for Wizloft Harness

Do not add these without new concrete evidence and a separate architecture decision:

- model router or provider abstraction competing with OMP;
- generic coding tools;
- subagent scheduler or swarm runtime;
- LSP, debugger, browser, terminal, or session UI;
- generic workflow/job engine;
- shell execution capability in the kernel;
- Git writer or automatic staging/committing;
- agent-specific hidden project truth.

## Integration rule

A host integration is valid only if it converges on the repository-pinned project runtime:

```text
OMP extension / Orca terminal / Wizloft CLI
        -> resolve project-local @wizloft/harness-project
        -> runProjectHarness(...)
        -> same generated profile, state, and command adapter
```

A host must not replace the project runtime with a globally bundled version merely because it can.

## Why the project is not redundant

OMP is an excellent execution harness. Orca is an excellent ADE. Neither should be asked to define
what this repository considers authoritative, what project context survives switching tools, or
what proof closes a change. Those are the durable, agent-independent responsibilities of Wizloft
Harness.
