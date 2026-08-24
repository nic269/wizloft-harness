# Next Goals

The local fourteen-package alpha.3 implementation is release-ready, but the active plan remains
open because the public release is incomplete.

## Goal 1 — authorize and prove one coherent alpha.3 release

Only `@wizloft/harness-project@0.1.0-alpha.3` is published; the other Harness packages remain at
alpha.2. A later exact Owner packet must first prove the published project artifact is
byte/provenance-identical to the frozen candidate. A mismatch stops for an Owner decision and new
coherent version. If it matches, publish the remaining thirteen exact artifacts and independently
prove all fourteen in the registry, the intended dist-tags, and matching Git provenance.

## Goal 2 — complete Phase 6 external consumers

Only after the coherent release is proved, run the ordered exact-version consumer, Wizloft CLI,
fresh/CLEAN initializer, existing-project initializer, and Meldmark gates. External repository
changes and pushes remain separately authorized.

## Goal 3 — complete Stage D

Treat the prior temp-only OMP attempt as historical boundary evidence, not completion. After the
coherent release is proved, obtain a separate exact packet, rerun Stage D, and independently audit
it. Do not commit or install an OMP profile under this status correction.

## Goal 4 — broader readiness

Reassess `08-READY-FOR-OTHER-PROJECTS.md` only after coherent publication, Phase 6, Stage D,
external-adoption decisions, and committed-profile discoverability provide valid evidence.
