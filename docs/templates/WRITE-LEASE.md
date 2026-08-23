# Write Lease

- Lease ID:
- Packet ID:
- Holder agent/session:
- Orca worktree:
- Branch:
- Baseline SHA:
- Allowed path set:
  - 
- Forbidden path set:
  - 
- Granted by:
- Granted at:
- Expires when:
- Revocation conditions:
- Concurrent leases checked: yes / no

## Lease invariants

- Only the holder may write the allowed paths.
- The lease does not grant product-decision authority.
- Any path expansion requires Coordinator approval and a revised packet.
- Handoff or stop gate releases the lease.
