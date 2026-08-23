# OMP Setup for the Three-Role Team

## Recommended model

Use OMP in two complementary ways:

1. **Main interactive Coordinator session** — launched with no file-writing tools.
2. **Project task agents** — `worker` and `auditor` definitions discovered from `.omp/agents/`.

For Orca-managed independent worktrees, the provided wrapper scripts can also launch Worker and
Auditor as separate main OMP processes with role-specific prompts and tool surfaces.

## Install OMP

Follow OMP's official installation, then verify:

```bash
omp --version
omp config path
omp models
```

Do not put API keys in committed `.omp/config.yml`.

## Configure model roles

Copy:

```bash
cp .omp/config.yml.example .omp/config.yml
```

Edit the selectors after checking `omp models` or using `/model`.

Recommended intent mapping:

| OMP role | Team role | Suggested provider/model intent |
|---|---|---|
| `default` | Coordinator | Codex/OpenAI high-reasoning model |
| `task` | Worker | Grok coding model |
| `slow` | Auditor | Codex/OpenAI strongest review model |
| `advisor` | optional continuous review | alias or selector matching Auditor |

Do not hardcode credentials or account-specific tokens in the project file.

## Project agent discovery

OMP project task agents live at:

```text
.omp/agents/*.md
```

Project definitions override user and bundled agents with the same name. The supplied files define:

- `coordinator` — may spawn Worker/Auditor but has no edit/write tools;
- `worker` — only role with edit/write/AST tools;
- `auditor` — read-only reviewer with no spawn authority.

The model selector is owned by frontmatter role aliases (`@default`, `@task`, `@slow`). When a
Coordinator dispatches a task agent, set the agent name and task; do not override the worker model
per task unless there is a deliberate exception.

## Launch the Coordinator

```bash
./scripts/agents/omp-coordinator.sh
```

The wrapper appends the Coordinator prompt and exposes only:

```text
read, grep, glob, bash, task, hub, todo
```

No edit, write, or AST-edit tools are available.

## Launch independent Worker/Auditor sessions

In separate Orca worktrees:

```bash
./scripts/agents/omp-worker.sh
./scripts/agents/omp-auditor.sh
```

Optional model overrides can be supplied without committing selectors:

```bash
WIZLOFT_OMP_WORKER_MODEL='x-ai/<your-grok-selector>:high' \
  ./scripts/agents/omp-worker.sh

WIZLOFT_OMP_AUDITOR_MODEL='openai/<your-codex-selector>:high' \
  ./scripts/agents/omp-auditor.sh
```

Use the selectors shown by your own `omp models`; provider/model IDs change over time.

## Approval behavior and subagents

Recommended committed project baseline:

```yaml
tools:
  approvalMode: write
```

The role wrappers then apply process-local overrides:

- Coordinator: `--approval-mode always-ask`;
- Worker: `--approval-mode write`;
- Auditor: `--approval-mode always-ask`.

OMP task subagents run headless in yolo mode; the parent task call is the authorization boundary.
A user-level per-tool `prompt` cannot be satisfied by a headless subagent and rejects that call, so
do not set a global or project `tools.approval.bash: prompt` when the Worker is spawned as a task
agent and needs bash. The task-agent Auditor definition intentionally has no bash or write tools; the
independent Orca Auditor wrapper may use bash under interactive approval for tests and Git inspection.

Two safe operating modes are therefore supported:

### Mode A — Orca worktrees, independent OMP sessions (recommended for write work)

- Coordinator: project config with bash prompt.
- Worker: separate Orca worktree/session; use an untracked CLI config overlay or wrapper with the
  needed permissions.
- Auditor: separate read-only role/session.

### Mode B — Coordinator spawns OMP task agents

- Treat approval of the parent `task` call as granting the packet.
- Restrict tools in each agent definition.
- Do not set user-level `prompt` on a Worker-required tool.
- Use OMP Agent Hub to inspect and steer subagents.

## Advisor / watchdog

The optional OMP advisor is not the independent final Auditor. It is a continuous second-model
reviewer that can inject concerns after turns.

The supplied `WATCHDOG.md` and `WATCHDOG.yml` keep it read-only. Enable only when desired:

```text
/advisor on
```

Keep final audit as a separate Auditor packet against a frozen snapshot.

## OMP context files

- `.omp/AGENTS.md` — project-native context entry; includes pointers to repository governance.
- `.omp/RULES.md` — small hard constraints that must survive long sessions.
- `.omp/prompts/*.md` — main-session role prompts.
- `.omp/agents/*.md` — task-agent definitions.

Do not duplicate the entire Harness contract into every agent file. Once alpha.3 initializes the
repository, the canonical Harness instructions live under `.wizloft/harness/INSTRUCTIONS.md`.
