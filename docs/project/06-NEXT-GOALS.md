# Next Goals

The selected alpha.4 coherent recovery and ordered downstream proofs are complete. Remaining goals
are separately authorized push, profile, docs-closure, and broader-readiness decisions. Alpha.3
remains immutable partial history.

## Historical alpha.3 recovery goals

The alpha.3 goals below are retained as history. They were superseded by the completed alpha.4
path.

### Goal 1 — authorize and prove one coherent alpha.3 release

Only `@wizloft/harness-project@0.1.0-alpha.3` was published; the other Harness packages remained at
alpha.2 as `latest`. That partial publication was not repaired. A later exact Owner packet selected
`0.1.0-alpha.4` instead of completing the alpha.3 graph.

### Goal 2 — complete Phase 6 external consumers

Superseded by the completed alpha.4 A4-10 through A4-13 proofs.

### Goal 3 — complete Stage D

The prior alpha.3-premise temp-only OMP attempt remains historical boundary evidence, not
completion. Alpha.4 Stage D later passed as a separate temp-only fixture.

### Goal 4 — broader readiness

Still open. Reassess `08-READY-FOR-OTHER-PROJECTS.md` only after external-adoption decisions and
committed-profile discoverability provide valid evidence.

## Completed alpha.4 recovery

`0.1.0-alpha.4` is the selected coherent fourteen-package target and is now implemented, frozen,
published on `candidate` and `next`, Git-proven, and independently proved through A4-10 through
A4-14. Never use the alpha.3 project artifact as recovery evidence or repair, move, delete,
unpublish, or retag alpha.3.

Frozen identities:

- source `R` `f662a454216d90c61c443c55a83165618d5e9843` / tree
  `68d5bb37d506b49301e2d3c433979b0c7fa64f2f`
- artifact-manifest SHA-256
  `553c0e4ee510b3087360b0e2e7910aa07adf6c8140b4fbff798049e703a482bd`
- tag object `7c70e518458eb4923d42353dcba7d2069adb7b04`, remote-pushed

Local external commits, not remote adoption:

- Wizloft CLI `c5e011383fd6b056d271517580b8cfd7d59bb7c3` on `rewrite/typescript` (parent
  `b2b2af52df2bd337a341888c2512e74ac2b64c0c`), unpushed
- Meldmark `3f4ab1a6b29b90e82112ffbf64a853183cb0de30` on `main` (parent
  `a35cf34a2e2418eaacda6cef39218235d50566b8`), no remote

Stage D passed as a temp-only no-remote fixture; `.omp/` remained ignored/local-only.

## Remaining goals

### Goal 1 — documentation candidate commit/push boundary

Independent audit is required for this docs-only candidate's commit eligibility. The candidate
itself authorizes no commit or push. Push remains separately authorized.

### Goal 2 — separately decide external remote adoption

Wizloft CLI push and any Meldmark remote configuration/push require their own repository-specific
authority and live ref preflight. Proof completion is not remote adoption.

### Goal 3 — separately decide committed OMP-profile discoverability

Do not copy the Stage D `.omp/` overlay into Harness source. Committed-profile discoverability
remains open.

### Goal 4 — broader readiness

Reassess `08-READY-FOR-OTHER-PROJECTS.md` only after the remaining push and profile decisions
provide valid evidence.

No registry, Git, external-repository, or OMP action is authorized by this goals record.
