# First Codex Request

We are starting Wizloft Harness. Do not write code immediately.

Read, in order:

1. `AGENTS.md`
2. `docs/PROJECT-BRIEF.md`
3. `docs/architecture/ARCHITECTURE.md`
4. `docs/architecture/PLUGIN-MODEL.md`
5. `docs/architecture/AUTHORITY-CONTEXT-EVIDENCE.md`
6. `docs/architecture/MEMORY-MODEL.md`
7. all accepted decisions under `docs/decisions/`
8. `docs/milestones/MUH.md`
9. `docs/milestones/SELF-HOST.md`
10. `docs/plans/active/0001-build-muh.md`
11. `docs/references/READING-MAP.md`
12. `docs/consumers/WIZLOFT-CLI.md`
13. `docs/consumers/MELDMARK.md`

If `.references/` is missing, run `scripts/setup-references.sh` and `scripts/record-reference-baselines.sh`.
If `.references/consumers/wizloft-cli` exists, inspect only enough of it to understand the current consumer contracts; treat it as read-only during Harness implementation.

Before implementing, report:

- the v0 kernel boundary;
- first-party capability packages and why they are not kernel internals;
- proposed plugin/capability type contracts;
- the three durability planes;
- the CLI ownership boundary between `wizloft-harness` and `wizloft-cli`;
- the proposed pnpm/TypeScript package structure for Slices 0–1;
- explicit v0 non-goals;
- the exact MUH stop condition.

Use upstream repositories as architecture references, not authority. Inspect the smallest relevant upstream surface for the current slice.

After the proposal, wait for architecture review before implementing Slice 0. Do not implement the entire plan in one change.
