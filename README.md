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

Slices 0–6, MUH, Self-host, External Package Release Readiness, and the alpha.3
onboarding/release graph are complete. All fourteen `0.1.0-alpha.3` artifacts are published to
npmjs.org with `candidate=next=0.1.0-alpha.3`. The thirteen previously published packages retain
`latest=0.1.0-alpha.2`; `@wizloft/harness-project` accepted automatic
`latest=0.1.0-alpha.3` from its first publication. The audited Git-to-binary provenance is pushed
through Harness
`main @ 16fe83ca9c7eee9060487869966c1802677de9ed`; annotated tag
`harness-v0.1.0-alpha.3` peels to the publication baseline
`4b3d5b9d2aa7adb5274b644ce022ad5bbfaf9fa7`.

Phase 6 P2 stages 1–5 are proof-closed. Their external repository candidates are committed locally
but unpushed: Wizloft CLI `rewrite/typescript @ b2b2af52df2bd337a341888c2512e74ac2b64c0c`
and Meldmark `main @ a35cf34a2e2418eaacda6cef39218235d50566b8`. External pushes and OMP
interoperability dogfood remain separate, open gates.

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
