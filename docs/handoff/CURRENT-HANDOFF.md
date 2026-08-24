# Current Handoff — Release Decision Boundary

## Packet identity

- Classification: documentation/status reconciliation only
- Repository: `wizloft-harness`
- Branch: `main`
- Baseline HEAD: `f13d4d56e720336083764609f62fdd0a3341fa8b`
- Expected index: empty
- Expected committed worktree: clean
- Owning plan: `docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`
- Owning release ADR: `docs/decisions/0012-public-package-release-contract.md`

## Current committed facts

- Phase 4C proof closed at `aa6234f832dc2fb0b04bf5039ee2cf81b5772630`.
- Local OMP portability committed at `49978971e8fdb34bfc07adb48817310218e163db` and
  `5c966c40c8f766260a958e9de3f35f6c85e73566`.
- Phase 5 unpublished fourteen-package `0.1.0-alpha.3` graph committed at
  `f13d4d56e720336083764609f62fdd0a3341fa8b`.
- `@wizloft/harness-project` is public at `0.1.0-alpha.3`.
- Phase 4C and Phase 5 were independently audited.
- Phase 6 has not started.
- Publication is not authorized.

## Goal

Give the next Owner/Coordinator the correct release decision boundary. Do not rerun Phase 4C. Do
not start publication, tagging, pushing, registry proof, CLI upgrade, Meldmark, or OMP dogfood
from this handoff.

## Next action

1. Verify HEAD is `f13d4d56e720336083764609f62fdd0a3341fa8b` and the index is empty.
2. Read `docs/project/00-START-HERE.md` and `docs/project/04-CURRENT-STATUS.md`.
3. Ask the Owner for an explicit publication decision using
   `docs/templates/OWNER-DECISION-REQUEST.md`.
4. Issue a Worker packet only after that decision names exact allowed paths and classification
   (`publication` or a later Phase 6 consumer packet).

## Forbidden until authorization

- npm publish, access mutation, dist-tags
- Git tags and push
- Phase 6 external consumer sequence
- Wizloft CLI and Meldmark repository changes
- treating `packages/project/tests/project-packed-runtime.test.mjs` as unfinished WIP

## Stop gates

Stop immediately if:

- HEAD/status differs from this checkpoint in a way that is not this docs packet;
- a Worker is asked to publish or start Phase 6 without an Owner decision;
- a new architecture/release/version decision is being inferred;
- anyone proposes rerunning Phase 4C as the next packet.

## Expected dirty state for this reconciliation

Unstaged, uncommitted, allowed status/handoff docs only. No staging or commit in this packet.
Independent Auditor review is required because these documents govern future coordination.
