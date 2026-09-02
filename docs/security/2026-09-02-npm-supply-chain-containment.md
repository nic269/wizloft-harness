# npm Supply-Chain Containment — 2026-09-02

Status: Registry contained; credential hardening requires interactive npm authentication.

## Confirmed incident

OSSF/OSV identifies malicious `0.1.1-alpha.3` artifacts for exactly these packages:

| Package | Advisory |
|---|---|
| `@wizloft/harness` | `MAL-2026-14285` |
| `@wizloft/harness-context` | `MAL-2026-14286` |
| `@wizloft/harness-kernel` | `MAL-2026-14287` |
| `@wizloft/harness-plugin-repository-files` | `MAL-2026-14288` |
| `@wizloft/harness-validation` | `MAL-2026-14289` |

The affected `dist/index.js` files contain import-time obfuscated loaders capable of fetching and
executing attacker-controlled code. The incident version is distinct from the supported clean
`0.1.0-alpha.4` graph and the historical legitimate `0.1.0-alpha.3` partial publication.

## Registry containment performed

On 2026-09-02, the npm owner authorized and performed these exact mutations:

- deprecated each of the five `0.1.1-alpha.3` artifacts with its matching OSV advisory URL;
- moved the four compromised `beta` tags to verified `0.1.0-alpha.4`;
- moved the compromised kernel `alpha` tag to verified `0.1.0-alpha.4`;
- preserved `latest`, `candidate`, and `next`;
- did not unpublish any artifact and did not publish a new release.

Post-mutation registry reads confirmed zero dist-tags across the fourteen-package graph pointing to
`0.1.1-alpha.3`.

## Local exposure sweep

The bounded sweep covered Wizloft projects, Orca workspaces, installed `@wizloft` package manifests,
npm content-addressable cache, VS Code task triggers, and common macOS persistence locations.

Results:

- zero manifest or lockfile references to `0.1.1-alpha.3`;
- zero installed packages at `0.1.1-alpha.3`;
- zero cached tarballs matching the five malicious npm integrity values;
- zero known `.vscode/tasks.json` folder-open triggers;
- zero known IOC hits in common LaunchAgent/LaunchDaemon locations.

These results show no evidence that the incident artifacts were installed or executed on the audited
host. They are not a claim of exhaustive disk forensics against an unknown second-stage payload.

## Clean-room alpha.4 proof

OrbStack ran an isolated Node.js `22.13.0` container from annotated tag
`harness-v0.1.0-alpha.4`, source tree `68d5bb37d506b49301e2d3c433979b0c7fa64f2f`.

- The source tree passed a static scan for all published advisory indicators before execution.
- Dependencies were installed without lifecycle scripts and without host credentials.
- The container network was disconnected before project build and test execution.
- `pnpm verify` passed as the unprivileged `node` user, including all 153 project-package tests.
- All fourteen packages were rebuilt and packed with the network disconnected.
- Every registry tarball matched its npm SHA-512 integrity.
- Every rebuilt package matched the corresponding registry artifact semantically. Three package
  manifests differed only in JSON dependency-key order; executable and declared content matched.

## Credential and release follow-up

The only listed npm token was created after the malicious publication, but it has broad package/org
write permission and bypasses 2FA. npm rejected CLI revocation because account-governance actions now
require interactive authentication. Until it is revoked:

- do not use the token for routine development;
- do not publish another Harness release;
- complete interactive npm sign-in and revoke the token;
- replace token publishing with a reviewed trusted-publishing workflow before the next release;
- establish branch/tag protection before enabling that workflow.

No recovery version is authorized by this incident record. A future release still requires an exact
release packet, frozen artifacts, dependency-order publication, registry consumer proof, and separate
owner approval.
