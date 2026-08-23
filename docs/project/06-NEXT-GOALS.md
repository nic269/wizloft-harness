# Next Goals

## Goal 1 — close Phase 4C

Owner: Coordinator
Writer: Worker only if the WIP proof needs proof-only corrections
Auditor: required after green because this is the last pre-release runtime gate

Allowed final dirty paths after a green proof:

- `packages/project/tests/project-packed-runtime.test.mjs`
- `docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`

Production and release files are forbidden in this packet.

## Goal 2 — freeze the proof

Suggested commit:

```text
test: prove Harness project packaged runtime
```

Required evidence:

- focused Phase 4C 1/1;
- expected total project test count;
- Phase 4A/4B remain green;
- `pnpm verify`;
- `pnpm release:check` still 13 alpha.2;
- clean worktree/index after commit.

## Goal 3 — prepare a Phase 5 decision packet

Do not implement Phase 5 in the Phase 4C packet.

Coordinator should create a new exact packet that identifies:

- all fourteen package manifests;
- release scripts and tests;
- version source of truth;
- public allowlist and DAG;
- root and workspace lockfile changes;
- docs that must change;
- publication explicitly excluded.

## Goal 4 — release alpha.3

Publication is a distinct owner-authorized operation. It must not be mixed with source implementation.

## Goal 5 — real-project dogfood

Use the released initializer on:

1. a fresh temporary repository;
2. an existing brownfield repository;
3. Wizloft CLI;
4. Meldmark;
5. one OMP + Orca managed packet.

## Goal 6 — extract a reusable project starter

After dogfood, produce a minimal starter that contains:

- Harness initializer command;
- `.omp` team profiles;
- work-packet templates;
- Orca worktree conventions;
- project-specific `PROJECT.md` content;
- no copied generated Harness runtime.
