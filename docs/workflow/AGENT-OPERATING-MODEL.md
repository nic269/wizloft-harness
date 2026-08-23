# Agent Operating Model

## Roles

### Coordinator

The Coordinator owns orchestration, not code changes.

Responsibilities:

- read status, plans, Authority, baseline/hash, and exact path allowlists;
- choose the minimum profile required for each work packet;
- issue packets and route handoffs;
- check stop gates, leases, and expiration;
- decide whether an Auditor is required;
- present `OWNER_DECISION_REQUEST` for product, architecture, release, security, or scope decisions;
- close work only after required proof is present.

Prohibitions:

- no edit/write/AST-edit tools;
- no physical project artifact changes;
- no self-delegated product decisions;
- no direct coding merely because a packet seems small;
- no declaring a finding closed without Worker correction and, when required, Auditor confirmation.

### Worker

The Worker is the only role allowed to write physical project files.

A Worker may write only when the packet includes:

- exact path allowlist;
- exact baseline SHA/hash;
- owner authority or valid delegated authority;
- exclusive write lease;
- explicit stop gates;
- expiry/lease-release condition;
- required verification commands;
- commit/staging policy.

Worker rules:

- smallest byte delta inside the allowed paths;
- no product decision creation;
- no changes to another lease holder's path set;
- no staging/commit unless packet explicitly authorizes it;
- stop on unexpected path expansion or architecture contradiction;
- may not audit its own candidate.

### Auditor

The Auditor is an independent read-only reviewer.

Responsibilities:

- inspect an exact frozen snapshot;
- verify baseline, candidate hash, diff, path drift, findings, and evidence integrity;
- classify concrete findings by severity;
- distinguish proof weakness from production defect;
- report residual uncertainty.

Prohibitions:

- no co-authoring;
- no file edits or fixes;
- no closing its own finding;
- no audit of a candidate it wrote;
- no silent scope expansion.

The Auditor is routed when complexity, risk, or residual uncertainty justifies it. Small low-risk
proof-only work may close without an Auditor if the packet says so.

## Owner interaction rule

The Owner should operate primarily through the Coordinator session. The Coordinator controls when
Worker and Auditor roles enter the chain.

For the strictest interpretation, do not start a Worker or Auditor from an ad hoc Owner chat. Start
or authorize the Coordinator, let it issue the packet, then launch the corresponding role in Orca.

## Single-writer rule

At any moment, one write lease owns a given path set. Multiple Workers may operate in separate Orca
worktrees only when their allowed path sets and integration plans are non-overlapping and explicitly
approved.

## Candidate freeze

A candidate is reviewable only when the Worker has stopped writing and produced:

- baseline SHA;
- candidate commit SHA, or exact diff hash if uncommitted;
- `git status --porcelain=v2`;
- changed-path list;
- verification results;
- unresolved issues;
- lease release status.

For high-risk work, prefer a local candidate checkpoint commit and a separate Auditor worktree.
