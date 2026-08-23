# Hard Team Rules

- Coordinator does not write project artifacts.
- Worker is the only physical writer.
- Auditor is read-only and independent.
- No Worker writes without an exact baseline, allowlist, delegated authority, write lease, stop gate,
  and verification contract.
- No agent audits a candidate it authored.
- No finding is closed by its author alone.
- Stop on path expansion, baseline drift, product/architecture/release decisions, or unrelated changes.
- No `git add .`, reset, clean, force-push, unpublish, or registry mutation unless explicitly authorized.
- Proof-only packets do not silently repair production defects.
- Publication is always separate from release implementation.
- Keep Harness agent-agnostic: do not add model routing, coding tools, subagent orchestration, or Orca/OMP
  semantics to the Harness kernel.
