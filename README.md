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

Slices 0–6, MUH, Self-host, External Package Release Readiness, alpha.3 recovery, and the alpha.4
coherent publication are retained as completed history.

The repository now implements the unpublished `0.2.0` four-package stable release:
`@wizloft/harness-kernel`, `@wizloft/harness`, `@wizloft/harness-file-providers`, and
`@wizloft/harness-project`. Capability, command, CLI-adapter, and first-party provider APIs remain
separate modules exposed through explicit subpaths; runtime plugin and capability ids are unchanged.

Published alpha versions and their dist-tags remain immutable historical state. Publication,
registry tag promotion, and legacy-package retirement follow the separately gated stable-release
plan.

## Package topology and migration

New consumers install only the packages required by their boundary:

- plugin authors can depend on lightweight `@wizloft/harness-kernel`;
- facade and command consumers use `@wizloft/harness` plus its explicit subpaths;
- first-party file integrations use explicit `@wizloft/harness-file-providers/*` subpaths;
- repository onboarding installs exact `@wizloft/harness-project`, which owns the three-package
  internal closure.

The clean-cutover import map is:

| Former package | `0.2.0` import |
|---|---|
| `@wizloft/harness-authority` | `@wizloft/harness/authority` |
| `@wizloft/harness-context` | `@wizloft/harness/context` |
| `@wizloft/harness-evidence` | `@wizloft/harness/evidence` |
| `@wizloft/harness-memory` | `@wizloft/harness/memory` |
| `@wizloft/harness-validation` | `@wizloft/harness/validation` |
| `@wizloft/harness-commands` | `@wizloft/harness/commands` |
| `@wizloft/harness-cli-adapter` | `@wizloft/harness/cli` |
| `@wizloft/harness-plugin-file-events` | `@wizloft/harness-file-providers/events` |
| `@wizloft/harness-plugin-file-memory` | `@wizloft/harness-file-providers/memory` |
| `@wizloft/harness-plugin-memory-context` | `@wizloft/harness-file-providers/memory-context` |
| `@wizloft/harness-plugin-repository-files` | `@wizloft/harness-file-providers/repository` |

There are no legacy aliases or compatibility packages. Deprecating former npm package names is a
separate registry operation allowed only after the consolidated release is published and
consumer-proven.

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
