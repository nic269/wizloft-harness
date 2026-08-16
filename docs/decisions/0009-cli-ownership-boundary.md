# 0009 CLI Ownership Boundary

Status: Accepted

`wizloft-cli` owns organization-level executable names and CLI UX, including future `wizloft harness ...` and `wizharness ...` entrypoints.

`wizloft-harness` owns reusable command semantics, structured command inputs/results, SDK APIs, and a CLI adapter library. It must not claim the global `wizharness` binary in v0.

The CLI delegates to Harness APIs; Harness never depends on Wizloft CLI.
