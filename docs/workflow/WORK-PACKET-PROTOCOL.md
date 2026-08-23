# Work Packet Protocol

## Packet lifecycle

```text
OWNER INTENT
  -> COORDINATOR READS AUTHORITY / STATUS / BASELINE
  -> WORK PACKET
  -> WRITE LEASE
  -> WORKER
  -> HANDOFF / FROZEN CANDIDATE
  -> OPTIONAL OR REQUIRED AUDITOR
  -> FINDINGS / CORRECTION PACKET
  -> PROOF
  -> OWNER DECISION IF NEEDED
  -> CLOSEOUT
```

## Required packet fields

Every write packet must state:

1. Packet ID and title.
2. Work classification: proposal, implementation, correction, proof, release implementation,
   publication, or documentation.
3. Exact repository and worktree.
4. Baseline branch and SHA.
5. Authority sources and owning plan/decision.
6. Goal and explicit non-goals.
7. Exact allowed paths.
8. Explicit forbidden paths.
9. Write lease holder and expiry/release condition.
10. Required commands and expected results.
11. Stop gates.
12. Handoff fields.
13. Staging/commit policy.
14. Auditor requirement.

## Standard stop gates

Worker must stop when any occurs:

- HEAD or baseline differs;
- worktree contains unrelated user/agent changes;
- a required Authority source is missing or conflicting;
- a new production defect appears in a proof-only packet;
- implementation requires a path outside the allowlist;
- a public API, package graph, version, privacy, release, or publication decision is needed;
- tests reveal behavior contradicting the accepted contract;
- another process modifies a leased path;
- secret/credential material appears;
- verification cannot be made deterministic.

## Write lease rules

- Lease is exclusive for the named worktree/path set.
- Lease does not grant authority to change product decisions.
- Lease expires on handoff, stop gate, packet expiry, or explicit revocation.
- Worker must not keep editing after handing off a frozen candidate.
- Coordinator records lease release before Auditor review.

## Auditor routing heuristic

Audit is required when any of these apply:

- production code or package metadata changes;
- runtime/install/security/path/symlink/atomicity behavior;
- release graph or publication work;
- migration/deletion;
- concurrency or failure semantics;
- a previous proof exposed a real defect;
- residual uncertainty remains after tests.

Audit may be skipped for a tiny docs-only correction with exact fingerprints and full verification,
provided the Coordinator records why.

## Owner decision threshold

Use `OWNER_DECISION_REQUEST` when the next action changes:

- product scope or user behavior;
- accepted architecture;
- public API/compatibility;
- release/version/tag/publication policy;
- security model;
- permanent ownership boundary;
- irreversible Git/registry state.
