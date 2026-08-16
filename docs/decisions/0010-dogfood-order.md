# 0010 Dogfood Order

Status: Accepted

Development order is:

1. reach Minimum Useful Harness;
2. self-host Harness on its own repository;
3. use Harness to rebuild Wizloft CLI in TypeScript while preserving accepted behavior/safety;
4. harden Harness from concrete CLI friction;
5. use the hardened Harness for Meldmark implementation.

This prevents Meldmark complexity from hiding Harness design defects and prevents speculative Harness platform work before a real consumer needs it.
