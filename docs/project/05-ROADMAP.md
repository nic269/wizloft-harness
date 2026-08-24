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

Status: open.

### C1. Coherent publication, promotion, and Git provenance

Current public state:

- only `@wizloft/harness-project@0.1.0-alpha.3` is published;
- the other Harness packages remain published at `0.1.0-alpha.2`;
- no coherent fourteen-package alpha.3 `candidate`/`next` graph, registry proof, or Git-to-binary
  provenance is complete.

Exit gates under a later separately authorized release packet:

- prove the already-published project artifact is byte/provenance-identical to the frozen candidate;
- stop for an Owner decision and new coherent version if it differs;
- if it matches, publish the remaining thirteen exact frozen artifacts;
- independently prove all fourteen in the registry, the intended dist-tags, and matching Git
  provenance.

### C2. Phase 6 P2 consumer sequence

Status: open and blocked on C1.

After C1 closes, prove in order: an exact-version registry consumer, Wizloft CLI pin
upgrade/regression, fresh/CLEAN initializer smoke, existing-project initializer smoke, and
Meldmark initialization/target validation. External repository changes and pushes require
separate authority.

## Stage D — OMP interoperability dogfood

Status: open and blocked on a coherent release plus separate exact authority.

A historical temp-only no-remote exercise kept `.omp/` ignored/local-only and made no Harness
source or registry action. Because its publication premise was invalid, it is not Stage D
completion evidence. Rerun and independently audit Stage D only after Stage C establishes the
coherent release.

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
