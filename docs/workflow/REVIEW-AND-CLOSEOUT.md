# Review and Closeout

## Review sequence

1. Coordinator verifies the Worker stopped and lease is released.
2. Coordinator records the frozen candidate identity.
3. Auditor reviews only the frozen snapshot.
4. Auditor reports findings; it does not fix them.
5. Coordinator routes a correction packet to a Worker.
6. Auditor rechecks affected findings when risk warrants it.
7. Owner resolves decisions that are not delegated.
8. Coordinator runs or verifies closeout evidence.

## Finding format

Each finding should contain:

- ID;
- severity: blocker / high / medium / low;
- exact path and location;
- violated contract or invariant;
- concrete failure scenario;
- required correction, not speculative redesign;
- status: open / corrected-awaiting-review / verified / owner-accepted-risk.

## Closeout evidence

At minimum:

- baseline and final SHA;
- exact committed or dirty paths;
- test/typecheck/build counts;
- `git diff --check`;
- release/package graph status when relevant;
- confirmation of excluded work;
- remaining worktree/index state;
- active plan status;
- Phase/next-goal boundary.

## Harness closeout

When the repository-local Harness runtime is available, the Coordinator should use it to:

- inspect the project profile;
- resolve owning Authority;
- resolve current Context;
- select/run applicable Validation;
- record or reference Evidence/Events according to the repository workflow.

Harness evidence complements Git and executable tests; it does not replace them.

## Commit ownership

- Worker commits only with explicit packet authorization.
- Proof and production corrections should remain separate commits when their ownership differs.
- Publication is never an implicit continuation of a release implementation commit.
- Coordinator may authorize a docs-only closeout commit, but must not become the physical writer.
