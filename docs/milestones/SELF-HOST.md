# Self-Host Gate

After MUH, run Wizloft Harness against the `wizloft-harness` repository itself.

The gate passes when Harness can:

1. discover accepted decisions and architecture as authority;
2. identify the active implementation plan and current code/tests without treating references as authority;
3. build bounded context for a real Harness maintenance task;
4. select focused validators plus root-required validation;
5. persist/retrieve project memory with provenance;
6. surface a deliberately conflicting/stale memory without overriding repository authority;
7. record deterministic events/evidence;
8. restart and retain durable memory/events;
9. produce understandable diagnostics for at least one missing capability and one dependency cycle fixture.

Do not use self-hosting as an excuse to add new platform features. Fix only reliability/ergonomics required for the next consumer.
