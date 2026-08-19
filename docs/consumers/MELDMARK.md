# Consumer 2 — Meldmark

Meldmark is the domain-rich consumer after the Harness survives self-hosting and the Wizloft CLI rebuild.

It should stress:

- many accepted product/UX/architecture decisions;
- design and component references;
- domain plugins (assessment authoring, attempt runtime, assignment/review, etc.);
- long-running implementation plans;
- richer project memory;
- context routing across product/design/code/tests;
- validation specific to affected capabilities.

Harness core must not contain Meldmark assessment semantics. Those belong in Meldmark project/domain plugins and repository authority.

## Onboarding gate

Meldmark must not hand-copy the Wizloft CLI Gate H0 layout.

It waits for released `0.1.0-alpha.3` and is initialized with `@wizloft/harness-project`, not a
hand-authored `dev/harness` tree.

Meldmark does not need Wizloft CLI installed to use Harness. The canonical portable project
command remains `node .wizloft/harness/run.mjs`. A future host CLI is convenience only.

Meldmark readiness remains gated on clean, existing, idempotent, and released initializer proof
from Hardening Cycle 1. Do not initialize Meldmark from an unpublished workspace checkout unless a
later turn explicitly authorizes that exception.
