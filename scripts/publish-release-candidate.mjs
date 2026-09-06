import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { inspectReleaseArtifacts } from './inspect-release-artifacts.mjs';

const execFile = promisify(execFileCallback);
const RECOVERY_VERSION = '0.1.2-alpha.3';
const DEPRECATED_MALICIOUS_VERSION = '0.1.1-alpha.3';
const REGISTRY = 'https://registry.npmjs.org';
const REGISTRY_WAIT_MS = 5 * 60 * 1000;
const POLL_MS = 5_000;

async function runNpm(args, cwd) {
  return execFile('npm', ['--registry', REGISTRY, ...args], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    env: process.env,
  });
}

async function registryMetadata(name, version) {
  try {
    const { stdout } = await runNpm(['view', `${name}@${version}`, '--json']);
    const value = JSON.parse(stdout);
    return value;
  } catch (error) {
    const output = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;
    if (error.code === 1 && /\bE404\b|No match found for version/u.test(output)) return null;
    throw error;
  }
}

async function distTags(name) {
  const { stdout } = await runNpm(['view', name, 'dist-tags', '--json']);
  return JSON.parse(stdout);
}

function digest(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest('hex');
}

function sri(algorithm, bytes) {
  return `${algorithm}-${createHash(algorithm).update(bytes).digest('base64')}`;
}

function assertProvenanceClaims(artifact, verifiedPackage, release) {
  assert.equal(verifiedPackage.name, artifact.name);
  assert.equal(verifiedPackage.version, artifact.version);
  assert.equal(verifiedPackage.registry, `${REGISTRY}/`);
  assert.equal(
    verifiedPackage.attestations?.provenance?.predicateType,
    'https://slsa.dev/provenance/v1',
    `${artifact.name} has no cryptographically verified SLSA provenance`,
  );
  const attestation = verifiedPackage.attestationBundles?.find(
    ({ predicateType }) => predicateType === 'https://slsa.dev/provenance/v1',
  );
  assert.notEqual(attestation, undefined, `${artifact.name} has no verified SLSA attestation`);
  const statement = JSON.parse(
    Buffer.from(attestation.bundle.dsseEnvelope.payload, 'base64').toString('utf8'),
  );
  assert.equal(statement.predicateType, 'https://slsa.dev/provenance/v1');
  assert.equal(statement.subject.length, 1, `${artifact.name} provenance must have one subject`);
  assert.equal(
    decodeURIComponent(statement.subject[0].name),
    `pkg:npm/${artifact.name}@${artifact.version}`,
    `${artifact.name} provenance subject mismatch`,
  );
  assert.equal(
    statement.subject[0].digest.sha512,
    Buffer.from(artifact.sha512.slice('sha512-'.length), 'base64').toString('hex'),
    `${artifact.name} provenance digest mismatch`,
  );
  const expectedRef = `refs/tags/harness-v${artifact.version}`;
  const workflow = statement.predicate.buildDefinition.externalParameters.workflow;
  assert.deepEqual(workflow, {
    ref: expectedRef,
    repository: 'https://github.com/nic269/wizloft-harness',
    path: '.github/workflows/publish.yml',
  });
  assert.equal(
    statement.predicate.buildDefinition.resolvedDependencies.some(
      ({ digest: dependencyDigest, uri }) =>
        dependencyDigest?.gitCommit === release.source.commit && uri.endsWith(`@${expectedRef}`),
    ),
    true,
    `${artifact.name} provenance source commit mismatch`,
  );
}

async function verifyRegistryProvenance(release, artifacts) {
  if (artifacts.length === 0) return;
  const auditRoot = await mkdtemp(path.join(tmpdir(), 'harness-provenance-'));
  try {
    await writeFile(
      path.join(auditRoot, 'package.json'),
      `${JSON.stringify(
        {
          name: 'harness-provenance-verifier',
          version: '1.0.0',
          private: true,
          dependencies: Object.fromEntries(artifacts.map(({ name, version }) => [name, version])),
        },
        null,
        2,
      )}\n`,
    );
    await runNpm(['install', '--ignore-scripts', '--no-audit', '--fund=false'], auditRoot);
    const { stdout } = await runNpm(
      ['audit', 'signatures', '--json', '--include-attestations'],
      auditRoot,
    );
    const audit = JSON.parse(stdout);
    assert.deepEqual(audit.invalid, [], 'npm found invalid registry signatures or attestations');
    assert.deepEqual(audit.missing, [], 'npm found missing registry signatures or attestations');
    for (const artifact of artifacts) {
      const verifiedPackage = audit.verified.find(
        ({ name, version }) => name === artifact.name && version === artifact.version,
      );
      assert.notEqual(
        verifiedPackage,
        undefined,
        `${artifact.name}@${artifact.version} was not cryptographically verified`,
      );
      assertProvenanceClaims(artifact, verifiedPackage, release);
    }
  } finally {
    await rm(auditRoot, { recursive: true, force: true });
  }
}

async function fetchRegistryTarball(metadata, artifact) {
  const tarballUrl = new URL(metadata.dist.tarball);
  assert.equal(tarballUrl.protocol, 'https:');
  assert.equal(tarballUrl.hostname, 'registry.npmjs.org');
  const response = await fetch(tarballUrl, {
    headers: { accept: 'application/octet-stream' },
    redirect: 'error',
  });
  assert.equal(response.ok, true, `${artifact.name} registry tarball returned ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.byteLength, artifact.size, `${artifact.name} registry size mismatch`);
  assert.equal(digest('sha1', bytes), artifact.sha1, `${artifact.name} registry SHA-1 mismatch`);
  assert.equal(
    digest('sha256', bytes),
    artifact.sha256,
    `${artifact.name} registry SHA-256 mismatch`,
  );
  assert.equal(sri('sha512', bytes), artifact.sha512, `${artifact.name} registry SHA-512 mismatch`);
}

async function inspectPublishedArtifact(artifact, metadata) {
  assert.equal(metadata.dist.integrity, artifact.sha512, `${artifact.name} integrity mismatch`);
  assert.equal(metadata.dist.shasum, artifact.sha1, `${artifact.name} registry SHA-1 mismatch`);
  await fetchRegistryTarball(metadata, artifact);
  const tags = await distTags(artifact.name);
  assert.equal(
    Object.values(tags).includes(DEPRECATED_MALICIOUS_VERSION),
    false,
    `${artifact.name} has a dist-tag on the deprecated malicious version`,
  );
  return tags.candidate === artifact.version;
}

async function classifyResumeArtifacts(release) {
  const existing = [];
  const missing = [];
  for (const artifact of release.artifacts) {
    const metadata = await registryMetadata(artifact.name, artifact.version);
    if (metadata === null) {
      missing.push(artifact);
      continue;
    }
    await waitForPublishedArtifact(artifact, release);
    existing.push(artifact);
  }
  return { existing, missing };
}

async function waitForPublishedArtifact(artifact, release) {
  const deadline = Date.now() + REGISTRY_WAIT_MS;
  let provenanceError;
  while (Date.now() < deadline) {
    const metadata = await registryMetadata(artifact.name, artifact.version);
    if (metadata !== null && (await inspectPublishedArtifact(artifact, metadata))) {
      try {
        await verifyRegistryProvenance(release, [artifact]);
        return;
      } catch (error) {
        provenanceError = error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error(
    `${artifact.name}@${artifact.version} did not become queryable with proven bytes and provenance`,
    { cause: provenanceError },
  );
}

async function assertReleaseTag(release) {
  const expectedTag = `harness-v${release.releaseVersion}`;
  const { stdout: tagOutput } = await execFile(
    'git',
    ['describe', '--exact-match', '--tags', 'HEAD'],
    {
      encoding: 'utf8',
    },
  );
  assert.equal(tagOutput.trim(), expectedTag, `workflow must run from ${expectedTag}`);
  const { stdout: objectType } = await execFile('git', ['cat-file', '-t', expectedTag], {
    encoding: 'utf8',
  });
  assert.equal(objectType.trim(), 'tag', `${expectedTag} must be annotated`);
  const { stdout: commit } = await execFile('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  const { stdout: tree } = await execFile('git', ['rev-parse', 'HEAD^{tree}'], {
    encoding: 'utf8',
  });
  assert.deepEqual(release.source, { commit: commit.trim(), tree: tree.trim() });
}

function assertOidcBoundary() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'publication is restricted to GitHub Actions');
  assert.ok(process.env.ACTIONS_ID_TOKEN_REQUEST_URL, 'GitHub OIDC request URL is unavailable');
  assert.ok(process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN, 'GitHub OIDC request token is unavailable');
  assert.equal(process.env.NODE_AUTH_TOKEN, undefined, 'NODE_AUTH_TOKEN must not be configured');
  assert.equal(process.env.NPM_TOKEN, undefined, 'NPM_TOKEN must not be configured');
}

assert.equal(
  process.argv.length,
  4,
  'usage: node scripts/publish-release-candidate.mjs <preflight|publish|resume-preflight|resume|verify> <absolute-artifacts-directory>',
);
const mode = process.argv[2];
assert.ok(
  ['preflight', 'publish', 'resume-preflight', 'resume', 'verify'].includes(mode),
  'unsupported release mode',
);
const artifactsRoot = process.argv[3];
assert.equal(path.isAbsolute(artifactsRoot), true, 'artifacts directory must be absolute');
const release = await inspectReleaseArtifacts(artifactsRoot);
await assertReleaseTag(release);
assert.equal(
  release.releaseVersion,
  RECOVERY_VERSION,
  `this recovery workflow is restricted to ${RECOVERY_VERSION}`,
);

let resumeState;
if (mode === 'preflight' || mode === 'publish') {
  for (const artifact of release.artifacts) {
    assert.equal(
      await registryMetadata(artifact.name, artifact.version),
      null,
      `${artifact.name}@${artifact.version} already exists; stop instead of republishing`,
    );
  }
} else if (mode === 'resume-preflight' || mode === 'resume') {
  resumeState = await classifyResumeArtifacts(release);
}

if (mode === 'preflight') {
  console.log(
    JSON.stringify(
      { ok: true, mode, releaseVersion: release.releaseVersion, packages: 14 },
      null,
      2,
    ),
  );
} else if (mode === 'resume-preflight') {
  console.log(
    JSON.stringify(
      {
        ok: true,
        mode,
        releaseVersion: release.releaseVersion,
        existing: resumeState.existing.map((artifact) => artifact.name),
        missing: resumeState.missing.map((artifact) => artifact.name),
      },
      null,
      2,
    ),
  );
} else if (mode === 'verify') {
  for (const artifact of release.artifacts) await waitForPublishedArtifact(artifact, release);
  console.log(
    JSON.stringify(
      { ok: true, mode, releaseVersion: release.releaseVersion, packages: 14 },
      null,
      2,
    ),
  );
} else {
  assertOidcBoundary();
  const existingNames = new Set(resumeState?.existing.map((artifact) => artifact.name) ?? []);
  for (const artifact of release.artifacts) {
    if (existingNames.has(artifact.name)) {
      console.log(
        `Skipped ${artifact.name}@${artifact.version} after verifying registry bytes and candidate tag`,
      );
      continue;
    }
    await runNpm([
      'publish',
      path.join(artifactsRoot, artifact.filename),
      '--tag',
      'candidate',
      '--access',
      'public',
      '--provenance',
    ]);
    await waitForPublishedArtifact(artifact, release);
    console.log(`Published ${artifact.name}@${artifact.version} with verified registry bytes`);
  }
  console.log(
    JSON.stringify(
      { ok: true, mode, releaseVersion: release.releaseVersion, packages: 14 },
      null,
      2,
    ),
  );
}
