# @wizloft/harness-plugin-repository-files

First-party repository/file contributor for `authority@1` and `context@1`. The runtime plugin id is
`@wizloft/repository-files`.

Configuration maps exact subjects to root-relative files:

```json
{
  "root": "/project",
  "authority": [
    {
      "subject": "architecture",
      "path": "docs/architecture/ARCHITECTURE.md",
      "precedence": 100,
      "resolutionKey": "architecture-v0"
    }
  ],
  "context": [
    {
      "subject": "architecture",
      "path": "docs/architecture/ARCHITECTURE.md",
      "role": "authority"
    }
  ]
}
```

Paths are normalized root-relative provenance. Reads refuse absolute paths, escaping traversal,
resolved paths outside the canonical repository root, and symlinks that escape it. File content is
snapshotted without semantic parsing or resolution-key inference.
