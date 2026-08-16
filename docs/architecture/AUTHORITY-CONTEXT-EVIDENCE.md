# Authority, Context, Validation, and Evidence

## Authority

Authority answers: **what has this repository accepted as true?**

Sources may include decisions, architecture, product docs, module instructions, code/tests, configuration, or other repository-defined truth. A provider must preserve provenance and precedence rather than flattening every document into equal text.

Authority resolution must support semantics equivalent to:

- resolved;
- missing;
- ambiguous;
- conflicting.

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
