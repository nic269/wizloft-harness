# Memory Model

## Core distinction

```text
Events     = what happened
Memory     = what we learned
Repository = what we have decided is true
```

Memory is first-class, persistent, queryable, and useful across sessions/projects, but it never
becomes hidden product authority.

## Slice 5 package boundary

`@wizloft/harness-memory` owns the exact-major `memory@1` capability token, public record/query/
service/store contracts, and the generic runtime-scoped Memory service implementation.

`@wizloft/harness-plugin-file-memory` owns the JSONL store, runtime plugin id
`@wizloft/file-memory`, and the first-party plugin that provides `memory@1` without requiring
Context.

`@wizloft/harness-plugin-memory-context` owns runtime plugin id `@wizloft/memory-context` and the
optional exact-subject Memory-to-Context mappings. It requires `memory@1` and `context@1` but has no
file/JSONL responsibility. There is one MemoryStore seam in v0 and no competing default in-memory
plugin.

## Kinds, scopes, and provenance

Durable memory kinds are:

- `episodic`: previous work episodes, approaches, failures, migrations, debugging outcomes, and
  successful implementation patterns;
- `semantic`: learned reusable facts, conventions, gotchas, or patterns.

Working task state should normally be reconstructed from the active plan, events, repository state,
and the agent session. Stable procedure should graduate from Memory into repository-owned docs,
skills, policies, validators, workflows, or plugins.

```ts
type MemoryScope =
  | 'organization'
  | `project:${string}`
  | `workspace:${string}`
  | `session:${string}`;
```

Scope suffixes must be non-empty. Recall always targets one exact scope; v0 does not implicitly
inherit or combine organization/project/workspace/session scopes.

Every record has immutable, explicit provenance with non-empty `sourceType` and `sourceId`, plus an
optional `sourceRevision` and optional root-relative/path-like `path` when applicable. Memory does
not assume every source is a repository file, and provenance is not hidden in generic metadata.

## Record and creation contract

```ts
interface MemoryRecord {
  readonly id: string;
  readonly kind: 'episodic' | 'semantic';
  readonly scope: MemoryScope;
  readonly content: string;
  readonly tags: readonly string[];
  readonly metadata: JsonObject;
  readonly provenance: MemoryProvenance;
  readonly state: 'candidate' | 'active' | 'stale' | 'superseded' | 'archived';
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly supersededBy?: string;
  readonly promotion?: MemoryPromotion;
}
```

The exact exported types may refine this shape while preserving these semantics.

`remember()` creates a new immutable identity. Callers do not supply `id`, `createdAt`, or
`updatedAt`; the service uses snapshotted injectable id-factory and wall-clock callbacks with
suitable defaults. Initial state defaults to `candidate`, with explicit `active` also accepted.
There are no kind-specific implicit defaults.

Tags are trimmed, lowercased, emptied values are dropped, and duplicates are removed while
preserving first occurrence. Content, metadata, provenance, tags, and returned records are immutable
snapshots.

## Lifecycle

Only these v0 transitions are valid:

```text
candidate  -> active | archived
active     -> stale | superseded | archived
stale      -> active | superseded | archived
superseded -> archived
archived   -> terminal
```

A transition to `superseded` requires `supersededBy`. The replacement must already exist, differ
from the source, have the same exact scope, and currently be `active`; it need not share the same
kind.

`transition()` is not a generic update API. It may change only lifecycle state, `updatedAt`, the
required `supersededBy`, and optional accepted promotion metadata. Identity, kind, scope, content,
tags, generic metadata, provenance, and `createdAt` never change. Materially changed knowledge is a
new memory that may supersede the old one.

`provenance.sourceRevision` plus an explicit transition to `stale` is the v0 source-change seam.
Slice 5 adds no watchers, hashing, Git integration, or autonomous invalidation.

## Recall

Recall requires one exact scope and defaults to `active` records only. Explicit filters may select
kinds, states, keywords, tags, and metadata.

- every keyword must match `content` using case-insensitive substring matching;
- every requested normalized tag must match using case-insensitive exact matching;
- metadata queries are JSON-object recursive subsets: each queried object key must exist and match,
  primitive values use exact equality, and arrays use exact deep equality;
- keywords never implicitly search metadata;
- results preserve first-seen creation order, and transitions never reorder them.

There is no tokenization, stemming, fuzzy matching, semantic ranking, implicit scope inheritance,
generic deduplication, array-contains semantics, ranges, OR, regex, wildcard, or general query
language in v0.

## Mutation and storage

MemoryService serializes `remember()` and `transition()` independently of the store. Each mutation
validates current committed state, creates the next immutable snapshot, persists it, then commits it
to the in-memory current state. Persistence failure leaves in-memory state unchanged. Recall reads
the committed state without waiting behind future queued mutations.

The file-memory store appends the complete immutable MemoryRecord snapshot for every creation and
transition. On restart, the last valid snapshot for each id is current and first-seen id order is
recall order. A missing file means an empty store; writes are serialized.

History reconstruction rejects malformed JSON, invalid record data, transitions for unknown ids,
illegal lifecycle transitions, mutation of immutable fields, and invalid `supersededBy`
relationships. It does not form a general event-sourcing/replay framework.

JSONL is an explicit v0 durability choice, not a claim of transactional, WAL, fsync, or crash-safe
durability.

## Context and authority

memory-context registers exact-subject Context contributors configured with an exact Memory query
and role. Allowed roles are only `supporting` and `historical`; `authority` is rejected. Supporting
mappings use normal active-only recall unless states are explicitly configured, so candidate memory
is not injected by default. Contributor registration and cleanup belong to memory-context rather
than to the durable provider.

Memory never registers with Authority, never produces an AuthorityCandidate, and cannot manufacture
authority. Repository Authority remains unchanged even when supporting/historical Memory conflicts
with it. Authority precedence and Context trust-role ordering remain independent.

## Promotion

Optional promotion metadata contains a non-empty target and optional reference. It records only an
explicit intention/link to a durable artifact. It does not create that target, alter Authority,
change Memory lifecycle automatically, or execute docs/skill/policy/validator/plugin generation.

## Deferred

- confidence and expiration automation;
- autonomous extraction or promotion;
- embeddings, vector search, or semantic relevance scoring;
- SQLite/Postgres providers or store multibinding/fallback/tiering;
- memory events and Evidence coupling;
- workflows and profile/base;
- source watchers, source hashing, and autonomous invalidation;
- generic update/delete APIs.
