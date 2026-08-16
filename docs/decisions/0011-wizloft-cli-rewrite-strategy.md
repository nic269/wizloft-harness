# 0011 Wizloft CLI Rewrite Strategy

Status: Accepted

The current JavaScript/CommonJS Wizloft CLI is preserved as a tagged reference/behavior oracle. The next major implementation is a clean TypeScript rewrite, not a mechanical file-by-file conversion.

Preserve accepted observable behavior and Shopify safety contracts. Improve internal architecture where justified. Keep one project identity/repository rather than creating a permanent `wizloft-cli-v2` project.
