# Project Roadmap

## Stage A — finish alpha.3 proof

Status: complete.

### A1. Phase 4C clean rerun

Deliverable: committed proof file and active-plan evidence at
`aa6234f832dc2fb0b04bf5039ee2cf81b5772630`.

Exit gate met:

- real packaged-runtime proof passed and was independently audited;
- no production changes in the proof commit;
- release graph at that commit remained 13 / alpha.2;
- commit: `test(project): prove packaged runtime`.

## Stage B — release graph transition

Status: complete. Phase 5 implemented the unpublished release-ready candidate graph.

### B1. Phase 5 implementation

Transitioned the implemented graph from thirteen alpha.2 packages to fourteen alpha.3 packages at
`f13d4d56e720336083764609f62fdd0a3341fa8b`.

Completed:

- lockstep `0.1.0-alpha.3` identity;
- `@wizloft/harness-project` public and release-allowlisted;
- project package metadata/private flag synchronized;
- release contract, pack proof, publish DAG, lockfile, root/package docs updated;
- fourteen-package packed consumer proof rerun;
- independent Auditor review passed.

At Phase 5 closeout:

- no publication, dist-tag, Git tag, or push had been performed;
- Phase 6 had not started.

## Stage C — publication and external consumers

Status: complete through Phase 6 P2 durable local commits.

### C1. Publication, promotion, and Git provenance

Completed:

- all fourteen frozen artifacts published under `candidate`;
- immediately after candidate publication, the project had accepted automatic
  `latest=0.1.0-alpha.3` and had no `next`;
- later authorized N1 promotion set `next=0.1.0-alpha.3` on all fourteen packages;
- the thirteen previously published packages retain `latest=0.1.0-alpha.2`;
- replacement `next` replay independently sealed;
- Harness `main` pushed through `16fe83ca9c7eee9060487869966c1802677de9ed`;
- annotated `harness-v0.1.0-alpha.3` pushed and verified to peel to `4b3d5b9`.

### C2. Phase 6 P2 consumer sequence

All five ordered stages are proof-closed: exact-version registry consumer, Wizloft CLI pin
upgrade/regression, fresh/CLEAN initializer smoke, existing-project initializer smoke, and
Meldmark initialization/target validation.

The two durable external candidates are local and unpushed:

- Wizloft CLI `rewrite/typescript @ b2b2af52df2bd337a341888c2512e74ac2b64c0c`;
- Meldmark `main @ a35cf34a2e2418eaacda6cef39218235d50566b8`.

Their pushes are separate adoption gates, not part of P2 proof closure.

## Stage D — OMP interoperability dogfood

Status: temp-only interoperability proof complete; independent Auditor PASS.

Completed from clean Harness source `bfbad5cde7979d28b80ef98d10fc29949bec0a3b`:

- Owner → Coordinator → Worker → Auditor executed through Orca;
- the no-remote fixture recorded generated bootstrap `222d7501` and Worker candidate `70bb4342`;
- generated bootstrap discovery and project-local Harness runner invocation passed;
- Harness Validation/Evidence events correlated across the exercised work;
- `.omp/` remained ignored/local-only, with no Harness source or registry action.

This closes Stage D's temp-only proof and the active alpha.3 plan's substantive/formal scope. It
does not close committed-profile discoverability, either external push, or broader readiness;
those are later non-plan gates.

## Stage E — ready for other projects

The project is ready for general internal use when the remaining committed-profile and adoption
boundaries in `08-READY-FOR-OTHER-PROJECTS.md` are complete.

## Later hardening candidates

### Scope integrity

Read-only observation of declared versus actual Git paths:

- create/modify/delete/rename/untracked model;
- exact authorized-path comparison;
- structured unavailable-Git result;
- no staging/reset/mutation.

### Evidence closeout

Only after concrete consumer friction justifies it:

- more concise closeout envelope;
- durable Evidence storage decision;
- avoid turning task lifecycle into a kernel feature.

### Additional agent adapters

Add only from real project demand. Alpha.3 intentionally supports AGENTS.md and CLAUDE.md only.
