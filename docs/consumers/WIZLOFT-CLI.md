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

Wizloft CLI's original Gate H0 / product Harness layout is historical. Formal
generic project onboarding was committed locally as
`5edb36c6e7f5601d0b50dab047c3d9cb38eda1d8` on `rewrite/typescript`. Its
tracked marker names `@wizloft/harness-project@0.1.0-alpha.4` and its generated
portable runner makes the repository independently operable without Wizloft CLI
installed.

This does not change the executable ownership boundary. `wizloft harness` and
`wizharness` remain Wizloft CLI product UX, while ordinary generic project
commands use the repository-pinned runtime through
`node .wizloft/harness/run.mjs`. A future host convenience adapter may load
that same project-local runtime directly; it must not replace it with a
host-bundled version.

External repository pushes require their own authority. Selective Module
Distribution, if pursued, remains a separate Wizloft CLI initiative rather
than a Harness Cycle 1 deliverable or Harness architecture.

