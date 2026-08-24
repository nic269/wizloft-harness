# Next Goals

## Goal 1 — Owner release/publication decision

Owner: Owner
Coordinator: prepare the decision request only
Writer: none until authorization exists
Auditor: required for any later publication packet

Do not rerun Phase 4C. Do not implement Phase 6 in a status packet.

The Coordinator should open `docs/templates/OWNER-DECISION-REQUEST.md` against:

- baseline `f13d4d56e720336083764609f62fdd0a3341fa8b`;
- ADR `docs/decisions/0012-public-package-release-contract.md`;
- plan `docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`.

The decision must say whether publication is authorized. Absence of that decision means stop.

## Goal 2 — authorized publication only

Publication is a distinct owner-authorized operation. It must not be mixed with source
implementation or with this status reconciliation.

If authorized, publish the already-implemented fourteen-package `0.1.0-alpha.3` graph. Do not
invent a new version, unpublish, or reuse a failed version.

## Goal 3 — registry proof

Only after publication:

- clean registry consumer installs the exact fourteen-package graph;
- `@next` consumer passes.

Do not claim registry availability before those proofs exist.

## Goal 4 — Phase 6 consumer sequence

Phase 6 has not started. After registry proof:

1. Upgrade Wizloft CLI exact Harness pins from alpha.2 to alpha.3.
2. Run CLI Harness/package regression.
3. Run fresh-project initialization smoke.
4. Run existing-project initialization smoke.
5. Initialize Meldmark with the released initializer.

## Goal 5 — OMP + Orca dogfood

Use one complete Coordinator → Worker → Auditor packet after the released initializer is the
consumer contract. Local OMP overlay/portability work is already committed and is not this goal.

## Goal 6 — extract a reusable project starter

After dogfood, produce a minimal starter that contains:

- Harness initializer command;
- `.omp` team profiles;
- work-packet templates;
- Orca worktree conventions;
- project-specific `PROJECT.md` content;
- no copied generated Harness runtime.
