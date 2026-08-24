# OMP + Orca Troubleshooting

## OMP does not discover project agents

Check:

```bash
pwd
ls -la .omp/agents
omp config path
```

A repository `.omp/` tree is an optional ignored overlay. OMP uses your user or bundled
configuration when no local overlay exists. If you created an overlay, start OMP from the
worktree root so it can discover that directory.

## Worker uses the wrong model

- Verify user/bundled model roles (`omp config path`, `/model`, or `omp config get modelRoles`).
- If you created a local overlay, verify `.omp/config.yml` role mappings.
- Verify the agent frontmatter uses `model: "@task"` or `model: "@slow"`.
- Do not pass an unnecessary per-task model override; it may supersede the agent profile mapping.
- Use `/model` Roles view or `omp config get modelRoles`.

## Worker subagent cannot run bash

OMP subagents run headless. A user-level `tools.approval.bash: prompt` cannot be answered by a
subagent and rejects the call.

Choose one:

- launch Worker as an independent Orca/OMP session with an appropriate config overlay;
- set a deliberate user policy that permits Worker bash;
- avoid bash in that task and use dedicated tools.

Do not weaken Coordinator/Auditor role boundaries just to make one Worker packet pass.

## Coordinator edits a file

This indicates a role/tool-surface failure.

- Stop immediately.
- Release/cancel the packet.
- Inspect how the session was launched.
- Ensure Coordinator tools exclude edit/write/AST-edit.
- Move the change to a Worker packet; do not normalize coordinator writes as acceptable.

## Auditor starts fixing findings

Stop the Auditor and discard its changes. The Auditor must report findings only. A separate Worker
correction packet owns fixes.

## Orca launches OMP with unexpected config

Run:

```bash
env | grep -E 'PI_CODING_AGENT_DIR|ORCA_OMP_CODING_AGENT_DIR'
omp config path
```

Prefer Orca's OMP picker. If manually launching, remove or override accidental config-directory
relocation.

## Worktree setup hook is too slow

Use a guarded repository setup script instead of unconditional full installation. Keep setup
idempotent and avoid hidden mutations.

## Two orchestration layers create conflicting worktrees

Use one owner:

- Orca owns write worktrees in the recommended model.
- OMP internal task agents may be read-only helpers or operate inside the assigned worktree.
- Do not let OMP and Orca independently isolate the same write packet unless an explicit integration
  design says how branches and results merge.

## Phase 4C proof fails again

Do not patch production in the proof packet.

Capture:

- exact command;
- exit status/stdout/stderr;
- packed artifact versions and paths;
- generated repository state;
- lockfile/marker state;
- registry request log;
- whether failure is proof-only or production.

Then open a bounded correction decision.
