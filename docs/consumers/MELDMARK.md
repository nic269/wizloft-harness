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

It is initialized with released `@wizloft/harness-project@0.1.0-alpha.4`, not a hand-authored
`dev/harness` tree. The local durable commit is `3f4ab1a6b29b90e82112ffbf64a853183cb0de30` on
`main` (parent `a35cf34a2e2418eaacda6cef39218235d50566b8`). That checkout has no remote and the
commit is not pushed; do not infer remote adoption.

Meldmark does not need Wizloft CLI installed to use Harness. The canonical portable project
command remains `node .wizloft/harness/run.mjs`. A future host CLI is convenience only.

Do not initialize Meldmark from an unpublished workspace checkout unless a later turn explicitly
authorizes that exception.
