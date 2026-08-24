# OMP Setup for the Three-Role Team

## Recommended model

Use OMP in two complementary ways:

1. **Main interactive Coordinator session** — launched with no file-writing tools.
2. **Project task agents** — `worker` and `auditor` definitions from your OMP user or bundled configuration, or from an optional local `.omp/agents/` overlay.

For Orca-managed independent worktrees, the provided wrapper scripts can also launch Worker and
Auditor as separate main OMP processes with role-specific tool surfaces. A readable local role
prompt under `.omp/prompts/` is an optional customization and is appended only when present.

## Install OMP

Follow OMP's official installation, then verify:

```bash
omp --version
omp config path
omp models
```

Do not put API keys in a local `.omp/` overlay.

## Configure model roles

Use your OMP user or bundled configuration (`omp config path`). A repository `.omp/` tree is an
optional ignored per-developer or per-worktree overlay, not a supplied asset. Fresh clones do not
need one.

If you want a local overlay, create `.omp/config.yml` yourself from your OMP configuration and
edit the selectors after checking `omp models` or using `/model`.

Recommended intent mapping:

| OMP role | Team role | Suggested provider/model intent |
|---|---|---|
| `default` | Coordinator | Codex/OpenAI high-reasoning model |
| `task` | Worker | Grok coding model |
| `slow` | Auditor | Codex/OpenAI strongest review model |
| `advisor` | optional continuous review | alias or selector matching Auditor |

Do not hardcode credentials or account-specific tokens in a local overlay.

## Project agent discovery

Optional local task-agent definitions, if you create them, live at:

```text
.omp/agents/*.md
```

Without a local overlay, OMP uses your user and bundled agents. Overlay definitions, if you create
them, override user and bundled agents with the same name. The three-role team uses:

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

The wrapper exposes only:

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

Recommended local overlay baseline (optional; otherwise use user or bundled configuration):

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

A local `.omp/WATCHDOG.md` and `.omp/WATCHDOG.yml` overlay, if you create one, can keep it
read-only. Enable only when desired:

```text
/advisor on
```

Keep final audit as a separate Auditor packet against a frozen snapshot.

## OMP context files

These paths are optional ignored overlay files, not repository-supplied assets:

- `.omp/AGENTS.md` — project-native context entry; includes pointers to repository governance.
- `.omp/RULES.md` — small hard constraints that must survive long sessions.
- `.omp/prompts/*.md` — optional main-session role prompts; wrappers append a prompt only when that file is readable.
- `.omp/agents/*.md` — optional task-agent definitions.

Do not duplicate the entire Harness contract into every agent file. Once alpha.3 initializes the
repository, the canonical Harness instructions live under `.wizloft/harness/INSTRUCTIONS.md`.
