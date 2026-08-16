# @wizloft/harness-evidence

Generic runtime-scoped `evidence@1` capability.

- `record()` accepts correlation id, stable kind, and JSON-compatible payload;
- records receive unique ids and UTC timestamps through injectable seams;
- accepted records remain visible in `list()` in acceptance order;
- every accepted record publishes `wizloft.evidence.recorded`;
- the validated event-publish callback is snapshotted when the service is created;
- event delivery failure does not roll back accepted evidence.

Evidence does not depend on Validation and does not provide database, replay, update/delete, command,
or task-state behavior. The default runtime plugin id is `@wizloft/evidence`.
