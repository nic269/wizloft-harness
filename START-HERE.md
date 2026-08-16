# Start Here

This file is the human bootstrap guide for starting Wizloft Harness with Codex.

## 1. Recommended workspace

Keep Wizloft projects as sibling repositories:

```text
/Volumes/anh.nguyen/Projects/AnhN/
├── wizloft-harness/
├── wizloft-cli/
├── meldmark/
└── ... future projects
```

Do not nest Meldmark or Wizloft CLI inside the Harness repository.

## 2. Preserve the current Wizloft CLI before rewriting it

The current JavaScript/CommonJS implementation is a behavior and safety reference, not disposable noise.
Before changing it:

```bash
cd /Volumes/anh.nguyen/Projects/AnhN/wizloft-cli
git status
git add -A
git commit -m "chore: checkpoint pre-TypeScript Wizloft CLI"   # only if needed
git tag pre-typescript-rewrite
```

If you use a remote repository, push the branch/tag using your normal workflow.
Do not begin the TypeScript rewrite yet.

## 3. Install this starter as the Harness repository

Unzip/copy this starter to:

```text
/Volumes/anh.nguyen/Projects/AnhN/wizloft-harness
```

Then:

```bash
cd /Volumes/anh.nguyen/Projects/AnhN/wizloft-harness
git init
git add .
git commit -m "chore: bootstrap Wizloft Harness architecture"
```

## 4. Clone upstream architecture references

Run:

```bash
./scripts/setup-references.sh
```

This creates gitignored local references:

```text
.references/
├── deepseek-harness/
├── repository-harness-current/
└── repository-harness-v1/
```

DeepSeek Harness is used for plugin/capability/event/lifecycle design study.
Current repository-harness is used for repository-as-authority and low-process workflow study.
Legacy `harness-cli-v0.1.22` is archaeology for useful evidence/control-plane ideas that should not become hidden authority again.

After cloning, record exact commits:

```bash
./scripts/record-reference-baselines.sh
```

Commit the updated `docs/references/UPSTREAM-BASELINES.md`.

## 5. Link real consumer repositories as read-only references

Make the existing CLI easy for Codex to inspect without copying it into Harness:

```bash
./scripts/link-consumer.sh wizloft-cli /Volumes/anh.nguyen/Projects/AnhN/wizloft-cli
```

Optionally link Meldmark now for later inspection:

```bash
./scripts/link-consumer.sh meldmark /Volumes/anh.nguyen/Projects/AnhN/meldmark
```

The links live under `.references/consumers/` and are gitignored. Treat them as read-only while implementing Harness unless a later phase explicitly switches work to that consumer repository.

## 6. Open Codex in the Harness repository

```bash
cd /Volumes/anh.nguyen/Projects/AnhN/wizloft-harness
codex
```

Give Codex the contents of [`CODEX-START.md`](CODEX-START.md).

Important: the first Codex turn should analyze and propose package boundaries. Do not let it implement all slices at once.

## 7. Review the first proposal before coding

Codex should report:

- kernel boundary;
- first-party capability boundaries;
- plugin/capability contract proposal;
- package/workspace structure;
- explicit v0 non-goals;
- how current Wizloft CLI and Meldmark will consume Harness later.

Review that proposal. The highest-leverage mistakes are package boundaries and plugin contracts, not individual functions.

## 8. Implement only until MUH

Follow `docs/plans/active/0001-build-muh.md` slice by slice.
The stop condition is the Minimum Useful Harness described in `docs/milestones/MUH.md`.

When MUH passes, stop feature work even if many attractive ideas remain.

## 9. Self-host gate

Run Harness against its own repository and satisfy `docs/milestones/SELF-HOST.md`.
Fix only issues that prevent reliable self-hosting or the next consumer.

## 10. Rebuild Wizloft CLI with Harness

Only after MUH + self-host pass:

1. switch Codex to the `wizloft-cli` repository;
2. keep `pre-typescript-rewrite` as the behavior oracle;
3. use Wizloft Harness context/authority/memory/validation while rebuilding;
4. rewrite from a clean TypeScript architecture rather than mechanically converting `.js` to `.ts`;
5. preserve accepted behavior and Shopify safety contracts;
6. add `wizloft harness ...` and `wizharness ...` only after the Harness command adapter is ready.

See `docs/consumers/WIZLOFT-CLI.md`.

## 11. Harden Harness from CLI friction

Return to `wizloft-harness` only for concrete friction discovered during the CLI rebuild:

- poor authority resolution;
- noisy/stale memory;
- awkward plugin contracts;
- incorrect context ranking;
- over-broad validation;
- bad diagnostics;
- difficult brownfield onboarding.

Do not add speculative platform features.

## 12. Begin Meldmark

After the CLI rewrite is complete and Harness has been hardened, onboard Meldmark as the domain-rich consumer described in `docs/consumers/MELDMARK.md`.
