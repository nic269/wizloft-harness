# @wizloft/harness-context

First-party `context@1` capability contract and default runtime-scoped service.

Context contributors are composed deterministically into three trust buckets:

1. `authority`;
2. `supporting`;
3. `historical`.

Within each bucket, the service preserves contributor registration order and contributor item
order. It does not deduplicate or semantically rank content. The default runtime plugin id is
`@wizloft/context`.
