# Orca + OMP Operating Setup

## Recommended division of responsibility

- **Orca is the outer worktree/process/review owner.**
- **OMP is the agent runtime inside a worktree.**
- **Wizloft Harness is the repository contract used by every worktree.**

Avoid making both Orca and OMP independently create write worktrees for the same packet. For the
strict single-writer model, let Orca create the Worker worktree and run one Worker OMP process there.

## Orca settings

### Agents

In Settings → Agents:

1. Enable OMP, Codex, and Grok.
2. Set **Agent Permissions = Manual**, not the default bypass/Yolo behavior, for governance-sensitive
   sessions.
3. Enable Agent status hooks.
4. Keep terminal sessions as the operational source of truth; treat any higher-level chat surface as
   convenience until you trust its behavior.

### Repository hooks

Under Settings → Repository → Hooks, use a small deterministic setup hook. Example:

```bash
corepack enable
pnpm install --frozen-lockfile
```

Do not automatically run destructive cleanup, reset, or migration commands. If install cost is high,
replace the hook with a repository script that checks whether setup is necessary.

## Worktree topology

### Coordinator worktree

```text
branch: coord/<packet-id>
agent: OMP Coordinator
writes: forbidden
purpose: Authority/status/packet routing and closeout
```

The Coordinator may also operate from the base worktree if repository policy allows, but it must not
modify artifacts.

### Worker worktree

```text
branch: work/<packet-id>
agent: OMP Worker, Codex, or Grok
writes: exact leased allowlist only
purpose: one implementation/correction/proof packet
```

### Auditor worktree

Preferred high-risk flow:

```text
branch: audit/<packet-id>
base: frozen candidate commit
agent: OMP Auditor or Codex review session
writes: forbidden
```

For a pre-commit candidate, pause the Worker, release the lease, record a diff hash, and launch the
Auditor read-only against the same worktree. Do not allow concurrent writes during audit.

## Typical packet flow in Orca

1. Owner opens Coordinator worktree/session.
2. Coordinator reads Harness status/Authority/Context and issues a packet.
3. Owner/Coordinator creates Worker worktree in Orca.
4. Launch Worker with the packet and write lease.
5. Worker stops and posts a handoff; Orca diff view shows the candidate.
6. Coordinator decides whether to create an Auditor worktree or run a read-only Auditor.
7. Use Orca diff annotations to batch concrete findings back to the Worker.
8. Worker applies a bounded correction packet.
9. Auditor verifies findings against the new frozen snapshot.
10. Coordinator closes evidence and prepares the next packet.

## Orca status and comments

Use worktree comments/status checkpoints to record short state transitions:

```text
PLANNED
LEASED_TO_WORKER
IMPLEMENTING
STOPPED_FOR_REVIEW
AUDITING
CORRECTION_REQUIRED
READY_TO_COMMIT
CLOSED
```

Keep detailed evidence in repository handoff files or the active plan, not only in Orca UI state.

## OMP launch inside Orca

Prefer Orca's built-in OMP picker so its environment overlay and status integration are applied.
If launching manually in an Orca terminal, verify:

```bash
omp config path
pwd
git worktree list
```

Be alert to relocated agent configuration via `PI_CODING_AGENT_DIR`; the OMP process should use your
intended `~/.omp/agent` or named profile, not an unrelated Pi-only config directory.

## Model allocation

A practical starting allocation:

- Coordinator: Codex/OpenAI reasoning model.
- Worker: Grok coding model for implementation speed.
- Auditor: Codex/OpenAI strongest review model.
- Optional OMP advisor: a second read-only reviewer, never a replacement for final Auditor.

Model choice remains a host/runtime concern. Do not encode provider-specific model IDs in Harness
project semantics.

## Safety note

Orca commonly treats disposable worktrees as justification for permission-bypass flags. That is useful
for experimentation but conflicts with this team's explicit write-lease model. Use Manual permissions
for Coordinator/Auditor and deliberate permission settings for Worker sessions.
