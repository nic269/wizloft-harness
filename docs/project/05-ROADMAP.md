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

That unpublished alpha.3 candidate later produced only a partial public publication, preserved
below as immutable history.

## Stage C — publication and external consumers

Status: complete for the selected alpha.4 coherent recovery and ordered Phase 6 P2 proofs.
External CLI/Meldmark pushes remain separate.

### C1. Coherent publication, promotion, and Git provenance

Immutable alpha.3 public history:

- only `@wizloft/harness-project@0.1.0-alpha.3` was published for that version;
- the other Harness packages remain `latest` `0.1.0-alpha.2`;
- that partial graph was not repaired, unpublished, or retagged.

Completed alpha.4 identities:

- source `R` `f662a454216d90c61c443c55a83165618d5e9843` / tree
  `68d5bb37d506b49301e2d3c433979b0c7fa64f2f`;
- frozen artifact-manifest SHA-256
  `553c0e4ee510b3087360b0e2e7910aa07adf6c8140b4fbff798049e703a482bd`;
- annotated tag `harness-v0.1.0-alpha.4` object `7c70e518458eb4923d42353dcba7d2069adb7b04`
  remote-pushed and peeled to `R`;
- all fourteen packages `0.1.0-alpha.4` on `candidate` and `next`;
- `latest` unchanged: thirteen packages `0.1.0-alpha.2`, project `0.1.0-alpha.3`.

### C2. Phase 6 P2 consumer sequence

Status: independently accepted as proof. Local external commits are not remote adoption.

Completed in order:

- A4-10 exact-version registry consumer;
- A4-11 Wizloft CLI exact-pin upgrade at local commit
  `c5e011383fd6b056d271517580b8cfd7d59bb7c3` on `rewrite/typescript` (parent
  `b2b2af52df2bd337a341888c2512e74ac2b64c0c`); not pushed;
- A4-12 released CLEAN and EXISTING initializer smokes;
- A4-13 Meldmark initialization/target validation at local commit
  `3f4ab1a6b29b90e82112ffbf64a853183cb0de30` on `main` (parent
  `a35cf34a2e2418eaacda6cef39218235d50566b8`); no remote, not pushed.

External repository pushes require separate authority.

## Stage D — OMP interoperability dogfood

Status: complete as temp-only no-remote proof (A4-14). Committed-profile discoverability remains
open.

The independently accepted fixture lineage is `f662a454216d90c61c443c55a83165618d5e9843` →
`431efa300230663a565fd23cc897a39e01a2a29b` → `21ca6a67e8c73546eef5f8f91c4a7380a8066ef8`. `.omp/`
stayed ignored/local-only. Do not copy that overlay into Harness source or treat it as committed
discoverability.

A historical alpha.3-premise temp-only exercise from `bfbad5cde7979d28b80ef98d10fc29949bec0a3b`
remains non-closure history.

## Stage E — ready for other projects

The project is ready for general internal use only when the remaining committed-profile,
external-push, and adoption boundaries in `08-READY-FOR-OTHER-PROJECTS.md` are complete. Those
gates remain open.

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
