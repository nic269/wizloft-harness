# Current Handoff — Phase 4C Clean Rerun

## Packet identity

- Classification: proof-only
- Repository: `wizloft-harness`
- Branch: `main`
- Baseline HEAD: `19946c7a2f07844bc15aab2380837f8f57be8e92`
- Expected index: empty
- Expected initial worktree item:
  - `?? packages/project/tests/project-packed-runtime.test.mjs`
- Owning plan: `docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`

## Goal

Rerun and finish the real packaged-runtime Phase 4C proof after the ESM-resolution and portable-lock
corrections. If green, update only the active plan and leave the proof uncommitted for independent
external/Auditor review.

## Allowed paths

After a successful proof:

- `packages/project/tests/project-packed-runtime.test.mjs`
- `docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`

## Forbidden paths

- `packages/project/src/**`
- package manifests and lockfiles
- release scripts/tests
- root version/public allowlist
- ADRs/architecture
- Wizloft CLI and Meldmark repositories

## Required sequence

1. Verify HEAD/status/index.
2. Read the WIP proof completely.
3. Confirm dependency-context-aware ESM traversal; no top-level-hoisting assumption.
4. Build `@wizloft/harness-project`.
5. Run focused test:

   ```bash
   node --test packages/project/tests/project-packed-runtime.test.mjs
   ```

6. If it fails because of a real product/package defect, stop without production changes.
7. If green, update the active plan with the clean rerun facts.
8. Run full package tests, `pnpm verify`, `pnpm release:check`, and `git diff --check`.
9. Leave unstaged/uncommitted for Auditor review.

## Proof obligations

- fourteen real tarballs;
- loopback-only source and isolated caches/config;
- packed bootstrap;
- dry-run zero mutation/no requests;
- production real npm install;
- portable real package-lock;
- full dependency-context ESM graph;
- no source/bootstrap escape;
- wrapper help/inspect/Authority/Context/Validation;
- runtime produces no package-source requests;
- real Git clone;
- exact recovery error before `npm ci`;
- exact public recovery command succeeds;
- marker and lockfile bytes unchanged;
- clone runtime succeeds;
- current re-init/dry-run zero-diff and no npm;
- original and clone run after registry shutdown;
- registry audit contains only known artifacts/methods.

## Stop gates

Stop immediately if:

- HEAD/status differs;
- any production/release path must change;
- a package resolves outside the generated isolated runtime;
- `npm ci` modifies marker or lockfile;
- current re-init contacts the package source;
- external registry or normal global cache can explain success;
- a new architecture/release decision is needed.

## Expected green state

```text
 M docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md
?? packages/project/tests/project-packed-runtime.test.mjs
```

No staging or commit until independent review.
