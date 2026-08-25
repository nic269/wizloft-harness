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

Slices 0–6, MUH, Self-host, External Package Release Readiness, the local alpha.3
implementation, and the selected alpha.4 coherent recovery are complete as recorded here.

Alpha.3 remains immutable partial history: only `@wizloft/harness-project@0.1.0-alpha.3` was
published for that version, and `latest` still points at thirteen packages on `0.1.0-alpha.2` plus
that project artifact. Do not repair, move, delete, unpublish, or retag alpha.3.

The current public prerelease graph is fourteen packages at lockstep `0.1.0-alpha.4` on both
`candidate` and `next`. Source commit `R` is `f662a454216d90c61c443c55a83165618d5e9843` (tree
`68d5bb37d506b49301e2d3c433979b0c7fa64f2f`). The frozen artifact-manifest SHA-256 is
`553c0e4ee510b3087360b0e2e7910aa07adf6c8140b4fbff798049e703a482bd`. Annotated tag
`harness-v0.1.0-alpha.4` object `7c70e518458eb4923d42353dcba7d2069adb7b04` is remote-pushed and
peels to `R`. Ordered downstream proofs A4-10 through A4-14 are independently accepted. Wizloft CLI
and Meldmark have local durable commits that are not pushed; OMP Stage D passed as a temp-only
no-remote fixture with `.omp/` ignored. Committed-profile discoverability, external pushes, formal
docs commit/push, and broader readiness remain separate.

This status record authorizes no publish, tag, push, registry mutation, external-repository push,
or OMP profile commit.

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
