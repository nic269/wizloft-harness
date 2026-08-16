# Codex Slice Prompts

Use these after the initial architecture proposal is accepted. Run one slice at a time.

## Slice 0

Implement Slice 0 from `docs/plans/active/0001-build-muh.md` only. Keep dependencies minimal. Establish root install/typecheck/test/build/verify. Do not implement capability behavior yet. Update the active plan and report proof.

## Slice 1

Implement the deterministic kernel/plugin host slice only. Prioritize capability dependency resolution, cycle/missing dependency diagnostics, lifecycle/disposer correctness, and tests. Do not add project knowledge or dynamic plugin loading.

## Slice 2

Implement typed config/profile composition plus event bus/file event persistence. Preserve deterministic ordering. Do not add workflow orchestration.

## Slice 3

Implement Context and Authority contracts/providers sufficient for repository/file-based examples. Provenance must be explicit. Authority ambiguity/conflict must not be silently resolved by memory or defaults.

## Slice 4

Implement Validation and Evidence. Selection and normalized result ordering must be deterministic. No task-state database.

## Slice 5

Implement first-class Memory with file/JSONL persistence, scope, provenance, lifecycle, keyword/metadata recall, and conflict handling with authority. No embeddings/vector DB/LLM extraction.

## Slice 6

Implement SDK + command API + CLI adapter contract. Do not expose a global executable binary from this repository. The adapter must support both human-readable and structured/JSON-friendly results so `wizloft-cli`, agents, and CI can consume the same command semantics.

## MUH gate

Stop feature implementation and run the MUH acceptance suite. Do not continue to speculative features.
