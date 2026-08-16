# Memory Model

## Core distinction

```text
Events     = what happened
Memory     = what we learned
Repository = what we have decided is true
```

Memory is first-class, persistent, queryable, and useful across sessions/projects, but it never becomes hidden product authority.

## Memory kinds

### Working memory

Current task/plan/context state. Prefer reconstruction from active plan, events, repository state, and agent session rather than durable semantic records by default.

### Episodic memory

Previous work episodes: approaches tried, failures, migrations, debugging outcomes, successful implementation patterns.

### Semantic memory

Learned reusable facts, conventions, gotchas, or patterns.

### Procedural knowledge

Stable procedure should graduate from memory into docs, skill, policy, validator, workflow, or plugin.

## Scope

```ts
type MemoryScope =
  'organization' | `project:${string}` | `workspace:${string}` | `session:${string}`;
```

Cross-project memory must preserve applicability/scope so a lesson from one stack is not promoted into an invalid organization-wide rule.

## Lifecycle

```text
candidate -> active -> stale/superseded -> archived
```

Every durable memory has provenance. Repository-backed memory should become potentially stale when its source revision/content changes.

## Conceptual record

```ts
interface MemoryRecord {
  id: string;
  kind: 'episodic' | 'semantic';
  scope: MemoryScope;
  content: string;
  tags: string[];
  provenance: MemoryProvenance;
  confidence?: number;
  state: 'candidate' | 'active' | 'stale' | 'superseded' | 'archived';
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  supersededBy?: string;
}
```

Semantics outrank this exact draft type shape.

## v0 storage

Implement a file/JSONL provider.

```text
canonical memory records -> durable files/JSONL
search/index             -> disposable/rebuildable
```

No required SQLite, embeddings, vector DB, or LLM memory extraction in v0.

## Capture policy

Be conservative:

- explicit remember operations;
- deterministic event-derived records when clearly justified;
- manual/explicit promotion;
- no automatic extraction of every conversation.

## Promotion

```text
Episode -> Semantic candidate -> validated reusable knowledge
                                  |
                                  +-> docs
                                  +-> skill
                                  +-> policy
                                  +-> validator
                                  +-> plugin
```
