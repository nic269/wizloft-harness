# How to Place This Documentation in the Repository

## Recommended destination tree

Copy the package into the Wizloft Harness repo using this target structure:

```text
docs/
  project/
    00-START-HERE.md
    01-PROJECT-OVERVIEW.md
    02-ARCHITECTURE-BOUNDARY.md
    03-WHAT-WE-DONE.md
    04-CURRENT-STATUS.md
    05-ROADMAP.md
    06-NEXT-GOALS.md
    07-DOCS-PLACEMENT.md
    08-READY-FOR-OTHER-PROJECTS.md
  workflow/
    AGENT-OPERATING-MODEL.md
    WORK-PACKET-PROTOCOL.md
    REVIEW-AND-CLOSEOUT.md
  integrations/
    OMP-SETUP.md
    ORCA-OMP-SETUP.md
    TROUBLESHOOTING.md
  handoff/
    CURRENT-HANDOFF.md
  templates/
    WORK-PACKET.md
    WRITE-LEASE.md
    HANDOFF.md
    AUDIT-REPORT.md
    OWNER-DECISION-REQUEST.md

scripts/agents/
  omp-coordinator.sh
  omp-worker.sh
  omp-auditor.sh
```

A repository `.omp/` tree is an optional ignored per-developer or per-worktree overlay, not a
supplied asset. Do not copy or commit it.

## What is authoritative versus convenience

### Existing authoritative files remain authoritative

Do not replace or duplicate:

- `AGENTS.md`;
- accepted ADRs;
- active execution plan;
- package manifests;
- code/tests;
- generated Harness marker/runtime files.

The new docs are navigation, status, operating protocol, and handoff material. They should link to
accepted decisions and plans rather than restating every detailed invariant.

### Do not manually create generated Harness runtime files

Do not copy these from the template package into a repository:

```text
.wizloft/harness/project.json
.wizloft/harness/run.mjs
.wizloft/harness/profile.mjs
.wizloft/harness/package.json
.wizloft/harness/package-lock.json
.wizloft/harness/INSTRUCTIONS.md
```

They are generated and reconciled by `@wizloft/harness-project init`.

## Installation sequence for the current Harness repository

1. Copy `docs/project`, `docs/workflow`, `docs/integrations`, `docs/handoff`, and `docs/templates`.
2. Do not copy or commit a repository `.omp/` tree; it is an optional ignored overlay. Use your OMP user or bundled configuration unless you create a local overlay yourself.
3. Copy `scripts/agents` and keep executable mode.
4. Update the repository docs index with links to `docs/project/00-START-HERE.md` and
   `docs/handoff/CURRENT-HANDOFF.md`.
5. Review `git diff --check`.
6. Commit the documentation/team setup as a separate governance/tooling commit; do not mix it into
   Phase 4C proof changes.

## Installation sequence for future projects

After alpha.3 is released:

1. Run the released Harness initializer.
2. Confirm `project.json`, tracked runtime files, and `npm ci` recovery.
3. Optionally create a local ignored `.omp/` overlay for per-worktree customization; otherwise use OMP user or bundled configuration. Do not add a tracked `.omp` bootstrap or template.
4. Replace project-specific content in `docs/project/*` and `.wizloft/PROJECT.md`.
5. Keep Coordinator/Worker/Auditor role invariants unchanged.
6. Configure Orca worktree hooks for the project's package manager and test commands.

## Root AGENTS and OMP AGENTS

If you create a local `.omp/AGENTS.md` overlay, give it higher project specificity than generic
cross-agent files and point it back to the repository's root `AGENTS.md` instead of silently
replacing it.

After the repository is initialized with released Harness, add the canonical Harness instructions
as a project import if desired:

```markdown
@../.wizloft/harness/INSTRUCTIONS.md
```

Only do this after the generated file exists.
