# Wizloft Harness — Starter Repository

Wizloft Harness is a generic, agent-agnostic engineering harness for Wizloft projects.
It is not a coding agent runtime. It makes repositories easier for humans and agents to understand, govern, validate, remember, and evolve.

## Core principles

```text
Events     = what happened
Memory     = what we learned
Repository = what we have decided is true
```

- The repository is the source of truth.
- Memory is first-class but never outranks repository authority.
- The kernel is small; project-specific behavior composes through plugins.
- Harness is agent-agnostic. Codex, Claude Code, DeepSeek Harness, and future runtimes are integrations/adapters, not kernel assumptions.
- Wizloft Harness owns command semantics; Wizloft CLI owns command names and executable UX.
- DeepSeek Harness is an architecture reference and future interoperability target, not a v0 dependency.

## Development strategy

```text
1. Build Minimum Useful Harness (MUH)
2. Use Harness on itself
3. Use Harness to rebuild wizloft-cli in TypeScript
4. Harden Harness from real friction
5. Use the hardened Harness to implement Meldmark
```

Start with [`START-HERE.md`](START-HERE.md), then [`AGENTS.md`](AGENTS.md).

## Current status

Slices 0–6, MUH, Self-host, External Package Release Readiness, and the local alpha.3
implementation are complete. Phase 4C historically proved the fourteen packed artifacts and
Phase 5 produced a fourteen-package `0.1.0-alpha.3` release-ready candidate.

The public release is incomplete. Only `@wizloft/harness-project@0.1.0-alpha.3` is published; the
other Harness packages remain published at `0.1.0-alpha.2`. There is therefore no coherent public
fourteen-package alpha.3 graph, no valid `candidate`/`next` promotion or Git-to-binary provenance
proof, and no completed Phase 6 consumer or OMP Stage D release proof.

The active plan remains open for a later, separately authorized coherent release. First prove the
already-published project artifact is byte-for-byte and provenance-identical to the frozen
candidate; a mismatch stops for an Owner decision and a new coherent version. If it matches,
publish the remaining thirteen exact artifacts, prove all fourteen in registry state and matching
Git provenance, then rerun the Phase 6 external consumer sequence and Stage D. No publish, tag,
push, external-consumer, or local OMP action is authorized by this status correction.

## Development

The current workspace baseline requires Node.js 22.13 or newer and pnpm 11.10 or newer.

```bash
npm install --global pnpm@11.10.0 # skip when a compatible pnpm is already installed
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` is the CI-ready root contract for Biome checks, TypeScript type checking, tests,
and builds. Use `pnpm check:fix` to apply safe formatting, lint, and import-organization fixes.

Release-readiness commands are intentionally separate from registry publication:

```bash
pnpm release:check          # read-only source release-contract validation
pnpm release:sync           # derive public identities/metadata from the root version
pnpm release:prove:packed   # build, pack, and exercise a fresh offline npm consumer
pnpm release:verify         # full workspace verification plus packed-consumer proof
```

None of these commands publishes, changes npm access/dist-tags, or creates a Git tag.
