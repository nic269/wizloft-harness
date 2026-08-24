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

Status: candidate publication complete; external consumer sequence not started.

### C1. Separately authorized publication

Completed as `ALPHA3-CANDIDATE-PUBLICATION-001` from `main @ 4b3d5b9d2aa7adb5274b644ce022ad5bbfaf9fa7`:

- published all fourteen frozen artifacts with `--tag candidate`;
- recorded registry versions/tags/hashes;
- ran clean exact-version and `@wizloft/harness-project` registry consumers;
- owner accepted automatic `@wizloft/harness-project latest=0.1.0-alpha.3`;
- no explicit latest/next mutation, no next promotion, no Git tag/push, no unpublish.

### C2. Consumer sequence

Status: not started. Requires a separately authorized Owner decision.

1. Upgrade Wizloft CLI exact Harness pins from alpha.2 to alpha.3.
2. Run CLI Harness/package regression.
3. Run fresh-project initialization smoke.
4. Run existing-project initialization smoke.
5. Initialize Meldmark with the released initializer.

Do not start C2 from a status or implementation packet.

## Stage D — OMP interoperability dogfood

Status: not started. Local OMP portability (`4997897`, `5c966c4`) is not this stage.

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
