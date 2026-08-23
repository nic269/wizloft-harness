# Project Roadmap

## Stage A — finish alpha.3 proof

### A1. Phase 4C clean rerun

Deliverable: committed proof file and active-plan evidence.

Exit gate:

- real packaged-runtime proof passes 1/1;
- full project tests pass;
- no production changes in the proof commit;
- release graph remains 13 / alpha.2;
- commit suggested: `test: prove Harness project packaged runtime`.

## Stage B — release graph transition

### B1. Phase 5 implementation

Transition the implemented graph from thirteen alpha.2 packages to fourteen alpha.3 packages.

Scope:

- lockstep `0.1.0-alpha.3` identity;
- `@wizloft/harness-project` becomes public/release-allowlisted;
- project package metadata/private flag synchronized;
- release contract, pack proof, publish DAG, lockfile, root/package docs updated;
- fourteen-package packed consumer proof rerun.

Exit gate:

- all fourteen packed manifests exact and release-safe;
- `pnpm verify` and exact-minimum Node proofs pass;
- no publication yet.

## Stage C — publication and external consumers

### C1. Separately authorized publication

- publish all fourteen coherent packages with prerelease tag;
- record registry versions/tags/hashes;
- run clean exact-version and `@next` consumers;
- do not unpublish or reuse a failed version; fix forward.

### C2. Consumer sequence

1. Upgrade Wizloft CLI exact Harness pins from alpha.2 to alpha.3.
2. Run CLI Harness/package regression.
3. Run fresh-project initialization smoke.
4. Run existing-project initialization smoke.
5. Initialize Meldmark with the released initializer.

## Stage D — OMP interoperability dogfood

Before starting the next broad hardening cycle:

- install this OMP team profile in the Harness repo;
- run one complete proof/correction packet through Coordinator → Worker → Auditor;
- prove OMP reads the repository bootstrap and can invoke project-local Harness;
- prove Harness Validation/Evidence closes work without OMP-specific logic in Harness core;
- document any OMP overlap and remove redundant roadmap items.

## Stage E — ready for other projects

The project is ready for general internal use when the readiness checklist in
`08-READY-FOR-OTHER-PROJECTS.md` is complete.

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
