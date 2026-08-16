# 0006 Composition Is Deterministic

Status: Accepted

Plugin/profile/capability composition must be deterministic. Missing requirements and cycles fail with actionable diagnostics. Completion/result ordering should remain stable even where implementation later introduces concurrency.
