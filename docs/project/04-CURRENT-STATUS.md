# Current Status

Snapshot date: **2026-08-24**

## Repository state

| Field | Current value |
|---|---|
| Branch | `main` |
| HEAD | `4b3d5b9d2aa7adb5274b644ce022ad5bbfaf9fa7` |
| Commit | `docs: reconcile alpha.3 release status` |
| Expected index | empty |
| Expected committed worktree | clean |
| Public graph | 14 packages |
| Public identity | `0.1.0-alpha.3` |
| Project package | public `0.1.0-alpha.3` |
| Phase 4C | closed at `aa6234f832dc2fb0b04bf5039ee2cf81b5772630` |
| Phase 5 | implemented and independently audited as an unpublished release-ready candidate |
| Candidate publication | all 14 frozen artifacts published once under `candidate` |
| Dist-tags | 13 packages `latest=next=0.1.0-alpha.2`; `@wizloft/harness-project` accepted automatic `latest=0.1.0-alpha.3`, no `next` |
| Phase 6 | not started |
| Publication | candidate complete; no explicit latest/next mutation; not a next promotion |

This publication-status packet may leave only the allowed status/handoff docs unstaged. That
does not reopen Phase 4C, authorize next promotion, or start Phase 6.

Evidence root:
`/var/folders/yg/dk0mc14d183_6tvg70k548wh0000gn/T/wizloft-alpha3-node22130-.j5DCyb4mQy`

## Exact immediate objective

Do **not** rerun Phase 4C. Do **not** start Phase 6. Do **not** run explicit latest/next
commands, Git tag/push, or another publication.

The next Owner/Coordinator action is a separately authorized next-promotion, Git tag/push, or
Phase 6 decision. Until that decision exists:

- no further npm publication, access change, or dist-tag;
- no Git tag or push for alpha.3;
- no Wizloft CLI pin upgrade, Phase 6 registry consumer, fresh/existing init smoke, Meldmark, or
  OMP dogfood packet.

Authority remains `docs/decisions/0012-public-package-release-contract.md` and
`docs/plans/active/0003-cli-dogfood-hardening-cycle-1.md`.

## Historical correction checkpoint

The Phase 4C correction checkpoint below is historical. It is not the current baseline.

- HEAD then: `19946c7a2f07844bc15aab2380837f8f57be8e92`
- Public graph then: 13 packages at `0.1.0-alpha.2`
- Project package then: private `0.1.0-alpha.2`
- Recorded verification then: project tests 153/153; Phase 4A 11/11; Phase 4B packed closure green;
  `pnpm verify` green; `pnpm release:check` 13 packages at `0.1.0-alpha.2`

## Stop condition

Stop and request an owner decision if the next requested packet would:

- publish again, retag, push, or mutate a registry;
- start Phase 6 consumer work without a new Owner authorization;
- change the accepted fourteen-package `0.1.0-alpha.3` identity;
- treat the closed Phase 4C proof as unfinished WIP.
