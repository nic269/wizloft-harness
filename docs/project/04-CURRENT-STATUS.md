# Current Status

Snapshot date: **2026-08-25**

## Repository and release state

| Field | Current value |
|---|---|
| Harness baseline | clean `main @ bfbad5cde7979d28b80ef98d10fc29949bec0a3b` |
| Public identity | 14 packages at `0.1.0-alpha.3` |
| Candidate | all 14 artifacts published |
| Dist-tags | all 14 packages `candidate=next=0.1.0-alpha.3`; 13 previously published packages retain `latest=0.1.0-alpha.2`; project accepted automatic `latest=0.1.0-alpha.3` |
| G2B main | local/remote `16fe83ca9c7eee9060487869966c1802677de9ed` |
| G2B tag | annotated `harness-v0.1.0-alpha.3` peels to `4b3d5b9d2aa7adb5274b644ce022ad5bbfaf9fa7` |
| Phase 6 P2 | stages 1–5 proof-closed |
| Wizloft CLI | local unpushed `rewrite/typescript @ b2b2af52df2bd337a341888c2512e74ac2b64c0c`, parent `8738fdac8467ea62e5642169b3052376c9abc4d7` |
| Meldmark | local unpushed `main @ a35cf34a2e2418eaacda6cef39218235d50566b8`, parent `480118417ee20cfb64194ad7d65a0ae53b9aa629` |
| OMP Stage D | temp-only independent-audit PASS; no-remote fixture bootstrap `222d7501`, Worker candidate `70bb4342` |

The replacement `next` replay is sealed by checksum list
`9ae53b220a4a3fa99f86a7a7e68c68f8e70ce0b624704f812326933d6aae652b` and tree
`5843f15c650d9f7eb159be6d43bedc7c23d903b1b25b64633f748484ef1faf6a`.

## Exact immediate objective

Freeze and independently audit this docs-only Stage D reconciliation. Stage D exercised Owner →
Coordinator → Worker → Auditor through Orca, generated bootstrap discovery, the project-local
runner, and Validation/Evidence event correlation. `.omp/` remains ignored/local-only; the fixture
has no remote; no Harness source or registry action occurred.

After this candidate, external pushes, committed-profile discoverability, and broader readiness
remain independent Owner decisions:

- do not republish, repromote, retag, or rewrite pushed Harness provenance;
- do not treat either local external commit as remote adoption;
- do not repeat Stage D or convert its temp-only evidence into committed-profile authority;
- do not mark broader readiness complete while its separate gates remain open.

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

- republish, repromote, retag, rewrite pushed provenance, or mutate the registry;
- push either external commit without repository-specific authority and live ref preflight;
- commit/install OMP profiles or claim broader readiness from the temp-only Stage D proof;
- change the accepted fourteen-package `0.1.0-alpha.3` identity or reopen closed proof.
