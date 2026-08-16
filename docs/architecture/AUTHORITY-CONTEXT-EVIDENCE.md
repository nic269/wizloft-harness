# Authority, Context, Validation, and Evidence

## Authority

Authority answers: **what has this repository accepted as true?**

Sources may include decisions, architecture, product docs, module instructions, code/tests, configuration, or other repository-defined truth. A provider must preserve provenance and precedence rather than flattening every document into equal text.

Authority resolution must support semantics equivalent to:

- resolved;
- missing;
- ambiguous;
- conflict.

Authority contributors return immutable candidates with explicit provenance and a numeric
precedence. Higher numeric precedence means stronger authority. Only candidates at the highest
observed precedence determine the resolution status; lower-precedence candidates remain visible
as `shadowed` evidence and cannot change that status. Results expose the highest-precedence
`contenders` separately from `shadowed` candidates.

Contributors may attach an explicit `resolutionKey` when structured source information genuinely
identifies the resolution represented by a candidate. Authority core never derives this identity
from prose, file-content equality, semantic parsing, or LLM interpretation. Over the contender set:

- no candidates produces `missing`;
- one contender produces `resolved`;
- multiple contenders whose explicit `resolutionKey` values are all present and equal produce
  `resolved` as corroborating authority;
- multiple contenders whose explicit `resolutionKey` values are all present and include distinct
  values produce `conflict`;
- multiple contenders with missing or otherwise insufficient resolution identity produce
  `ambiguous`.

Configurable defaults and memory do not manufacture authority.

## Context

Context answers: **what is the smallest useful set of material for this work?**

Contributors may supply:

- relevant authority;
- affected code/tests;
- recent work/evidence;
- stack/domain guidance;
- supporting memory.

Context composition must be deterministic and retain source labels. Historical evidence should not outrank current authority merely because it is textually similar.

Context items use only these Slice 3 trust roles:

1. `authority`;
2. `supporting`;
3. `historical`.

Composition presents roles in that order. Within each role it preserves contributor registration
order and then each contributor's item order. This is a trust/presentation invariant, not semantic
relevance ranking. Context does not generically deduplicate or re-rank items, and contributor
registration order never implies Authority precedence.

Memory may later contribute only through the supporting/historical seam and cannot manufacture an
authority item. Slice 3 documents that boundary without defining a Memory capability or beginning
Memory integration.

## Repository files

The first-party repository-files provider registers capability-specific contributors with both
Authority and Context. Configured source paths are normalized root-relative paths. Reads resolve
through the canonical repository root and refuse absolute paths, traversal outside the root,
resolved paths outside the root, and symlinks that escape it. This is repository-boundary
correctness, not a security sandbox claim.

Repository-file contributions snapshot immutable file content with normalized root-relative
provenance. They do not parse semantics, inspect Git history, derive resolution identities from
text, or perform AST/schema/LLM interpretation. A repository mapping may leave `resolutionKey`
undefined unless accepted structured configuration genuinely supplies one.

## Validation

Validation answers: **what executable/observable proof is required for this work?**

Validators should declare applicability so a change can select focused proof rather than always running every possible command.

## Evidence

Evidence is normalized proof produced by work/validation. It may reference command, validator, status, duration, output metadata, source revision, and correlation/work id.

Evidence is not a task database and does not become product authority by itself.

## Critical invariant

```text
Authority says Y
Memory says X
        |
        v
Context presents Y as authority and X only as conflicting/stale supporting memory.
```
