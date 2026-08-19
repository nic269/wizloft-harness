# Consumer 1 — Wizloft CLI Rewrite

## Why this consumer comes first

Wizloft CLI is a compact but real brownfield project. It tests different Harness dimensions than Meldmark:

- existing repository-harness-style `AGENTS.md`, decisions, plans, and workflow;
- multi-module CLI architecture;
- current CommonJS implementation moving to TypeScript;
- root/module authority boundaries;
- behavior-preserving rewrite;
- validation routing;
- CLI integration with Harness itself.

## Current contracts to preserve

The current CLI exposes:

```text
wizloft anh ...      <-> wizanh ...
wizloft shopify ...  <-> wizshopify ...
```

Both entry forms call the same module implementation. Root dispatch must not duplicate module business logic.

The rewrite will add:

```text
wizloft harness ...  <-> wizharness ...
```

The executable names are owned by `wizloft-cli`; Harness supplies the reusable command/CLI adapter.

## Shopify safety behavior to preserve

Treat the current repository implementation/docs/tests as the behavior oracle for at least:

- isolated per-profile HOME/XDG state;
- no Shopify session-file copying/parsing;
- path containment and symlink safety;
- private directories/files where supported;
- atomic metadata/config writes;
- lock/lease/target-lock semantics;
- environment allowlisting/secret stripping;
- `shell: false` process execution;
- argument redaction in dry-run output;
- theme dev port reservation/concurrency semantics;
- fake executable tests unless real account interaction is explicitly authorized.

Do not silently weaken these during the rewrite.

## Rewrite strategy

1. tag current state `pre-typescript-rewrite`;
2. use current code/docs/tests as read-only reference and acceptance oracle;
3. build a clean strict-TypeScript architecture rather than line-by-line translation;
4. preserve external behavior first;
5. add `harness` as an external module backed by the Harness package;
6. prefer a small deterministic module registry over growing root `if/else` dispatch;
7. keep root CLI a composition shell, not the owner of module business logic.

## Harness acceptance scenarios

While rebuilding, Harness should prove it can:

- rank root decisions/workflow above installed `.harness-core` provenance copies;
- respect module-local Shopify authority and de-prioritize historical research/journals/reports;
- route validation based on affected module/path;
- recall historical lessons without converting them into current authority;
- provide structured command results suitable for `wizloft-cli` human output and `--json`/agent use.

## Suggested TypeScript direction

Exact layout is not locked before the rewrite, but expected responsibilities are:

```text
src/
  cli/           root registry/dispatcher/help
  modules/
    anh/
    shopify/
    harness/     thin adapter to @wizloft/harness
bin/
  wizloft
  wizanh
  wizshopify
  wizharness
```

The consumer may evolve this structure if tests/clarity justify a better shape.

## Hardening Cycle 1 posture

Wizloft CLI remains the `0.1.0-alpha.2` dogfood consumer. Its Gate H0 / product Harness layout is
CLI-owned.

Generic alpha.3 project onboarding remains independent of Wizloft CLI. A Harness-initialized
repository is operable through `node .wizloft/harness/run.mjs` without the CLI installed.

A future `wizloft harness` / `wizharness` convenience may detect the repository marker and invoke
the project-local `@wizloft/harness-project` (`runProjectHarness`) directly. Ordinary project
commands must use the repository-pinned runtime, not a host-bundled Harness version.

Generic `@wizloft/harness-project` initialization does not retroactively migrate the current CLI
layout. A later CLI upgrade to exact `0.1.0-alpha.3` pins is package-regression only unless a
separate authorization requires generic init or layout migration.

Selective Module Distribution, if pursued, is a separate Wizloft CLI initiative. It is not a
Harness Cycle 1 deliverable and is not Harness architecture.
