import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const RELEASE_FILES = Object.freeze(['dist', 'README.md', 'LICENSE']);
export const RELEASE_HOMEPAGE = 'https://github.com/nic269/wizloft-harness#readme';
export const RELEASE_BUGS_URL = 'https://github.com/nic269/wizloft-harness/issues';
export const RELEASE_REGISTRY = 'https://registry.npmjs.org/';
export const RELEASE_REPOSITORY_URL = 'git+https://github.com/nic269/wizloft-harness.git';

export const PUBLIC_PACKAGES = Object.freeze([
  {
    directory: 'packages/kernel',
    name: '@wizloft/harness-kernel',
    dependencies: [],
    devDependencies: [],
  },
  {
    directory: 'packages/authority',
    name: '@wizloft/harness-authority',
    dependencies: ['@wizloft/harness-kernel'],
    devDependencies: [],
    pluginSource: 'packages/authority/src/index.ts',
  },
  {
    directory: 'packages/context',
    name: '@wizloft/harness-context',
    dependencies: ['@wizloft/harness-kernel'],
    devDependencies: [],
    pluginSource: 'packages/context/src/index.ts',
  },
  {
    directory: 'packages/evidence',
    name: '@wizloft/harness-evidence',
    dependencies: ['@wizloft/harness-kernel'],
    devDependencies: [],
    pluginSource: 'packages/evidence/src/index.ts',
  },
  {
    directory: 'packages/memory',
    name: '@wizloft/harness-memory',
    dependencies: ['@wizloft/harness-kernel'],
    devDependencies: [],
  },
  {
    directory: 'packages/validation',
    name: '@wizloft/harness-validation',
    dependencies: ['@wizloft/harness-evidence', '@wizloft/harness-kernel'],
    devDependencies: [],
    pluginSource: 'packages/validation/src/index.ts',
  },
  {
    directory: 'packages/harness',
    name: '@wizloft/harness',
    dependencies: [
      '@wizloft/harness-authority',
      '@wizloft/harness-context',
      '@wizloft/harness-evidence',
      '@wizloft/harness-kernel',
      '@wizloft/harness-memory',
      '@wizloft/harness-validation',
    ],
    devDependencies: [],
  },
  {
    directory: 'packages/commands',
    name: '@wizloft/harness-commands',
    dependencies: ['@wizloft/harness'],
    devDependencies: [],
  },
  {
    directory: 'packages/cli-adapter',
    name: '@wizloft/harness-cli-adapter',
    dependencies: ['@wizloft/harness-commands'],
    devDependencies: [],
  },
  {
    directory: 'plugins/file-events',
    name: '@wizloft/harness-plugin-file-events',
    dependencies: ['@wizloft/harness-kernel'],
    devDependencies: [],
    pluginSource: 'plugins/file-events/src/index.ts',
  },
  {
    directory: 'plugins/file-memory',
    name: '@wizloft/harness-plugin-file-memory',
    dependencies: ['@wizloft/harness-kernel', '@wizloft/harness-memory'],
    devDependencies: [],
    pluginSource: 'plugins/file-memory/src/index.ts',
  },
  {
    directory: 'plugins/memory-context',
    name: '@wizloft/harness-plugin-memory-context',
    dependencies: [
      '@wizloft/harness-context',
      '@wizloft/harness-kernel',
      '@wizloft/harness-memory',
    ],
    devDependencies: [
      '@wizloft/harness-authority',
      '@wizloft/harness-plugin-file-memory',
      '@wizloft/harness-plugin-repository-files',
    ],
    pluginSource: 'plugins/memory-context/src/index.ts',
  },
  {
    directory: 'plugins/repository-files',
    name: '@wizloft/harness-plugin-repository-files',
    dependencies: [
      '@wizloft/harness-authority',
      '@wizloft/harness-context',
      '@wizloft/harness-kernel',
    ],
    devDependencies: [],
    pluginSource: 'plugins/repository-files/src/index.ts',
  },
  {
    directory: 'packages/project',
    name: '@wizloft/harness-project',
    dependencies: [
      '@wizloft/harness',
      '@wizloft/harness-authority',
      '@wizloft/harness-cli-adapter',
      '@wizloft/harness-commands',
      '@wizloft/harness-context',
      '@wizloft/harness-evidence',
      '@wizloft/harness-kernel',
      '@wizloft/harness-plugin-file-events',
      '@wizloft/harness-plugin-file-memory',
      '@wizloft/harness-plugin-memory-context',
      '@wizloft/harness-plugin-repository-files',
      '@wizloft/harness-validation',
    ],
    devDependencies: [],
  },
]);

export const PUBLIC_PACKAGE_NAMES = new Set(PUBLIC_PACKAGES.map(({ name }) => name));

const WORKSPACE_ROOTS = Object.freeze(['packages', 'plugins', 'profiles']);
const MODELED_DEPENDENCY_SECTIONS = Object.freeze(['dependencies', 'devDependencies']);
const UNAPPROVED_DEPENDENCY_SECTIONS = Object.freeze(['optionalDependencies', 'peerDependencies']);
const PACKED_DEPENDENCY_SECTIONS = Object.freeze([
  ...MODELED_DEPENDENCY_SECTIONS,
  ...UNAPPROVED_DEPENDENCY_SECTIONS,
]);

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;

export function isValidReleaseVersion(value) {
  return typeof value === 'string' && SEMVER_PATTERN.test(value) && value !== '0.0.0';
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function sameStrings(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function sourcePluginVersion(source) {
  const matches = [...source.matchAll(/\bversion:\s*'([^']+)'/gu)];
  return matches.length === 1 ? matches[0][1] : undefined;
}

function internalDependencyNames(manifest, section) {
  return Object.keys(manifest[section] ?? {})
    .filter((name) => PUBLIC_PACKAGE_NAMES.has(name))
    .sort();
}

export function inspectPackedInternalDependencies(manifest, releaseVersion) {
  const errors = [];
  for (const section of PACKED_DEPENDENCY_SECTIONS) {
    for (const [dependency, specifier] of Object.entries(manifest[section] ?? {})) {
      if (PUBLIC_PACKAGE_NAMES.has(dependency) && specifier !== releaseVersion) {
        errors.push(
          `${manifest.name} packed ${section}.${dependency} must equal ${releaseVersion}`,
        );
      }
      if (typeof specifier === 'string' && specifier.startsWith('workspace:')) {
        errors.push(`${manifest.name} packed ${section}.${dependency} retains workspace protocol`);
      }
    }
  }
  return Object.freeze(errors);
}

function validatePublicManifest(errors, manifest, entry, releaseVersion) {
  const prefix = entry.name;
  if (manifest.name !== entry.name) errors.push(`${prefix} has an unexpected package name`);
  if (manifest.private === true) errors.push(`${prefix} must be publishable`);
  if (manifest.version !== releaseVersion) {
    errors.push(`${prefix} version must equal root release version ${releaseVersion}`);
  }
  if (manifest.version === '0.0.0') errors.push(`${prefix} must not use placeholder version 0.0.0`);
  if (manifest.license !== 'MIT') errors.push(`${prefix} license must be MIT`);
  if (manifest.engines?.node !== '>=22.13.0') {
    errors.push(`${prefix} engines.node must be >=22.13.0`);
  }
  if (!sameStrings(manifest.files, RELEASE_FILES)) {
    errors.push(`${prefix} files must be dist, README.md, and LICENSE`);
  }
  if (manifest.types !== './dist/index.d.ts') {
    errors.push(`${prefix} types must be ./dist/index.d.ts`);
  }
  if (
    manifest.exports?.['.']?.types !== './dist/index.d.ts' ||
    manifest.exports?.['.']?.import !== './dist/index.js'
  ) {
    errors.push(`${prefix} exports must expose the public JS and declaration entrypoints`);
  }
  if (
    manifest.repository?.type !== 'git' ||
    manifest.repository?.url !== RELEASE_REPOSITORY_URL ||
    manifest.repository?.directory !== entry.directory
  ) {
    errors.push(`${prefix} repository metadata is invalid`);
  }
  if (manifest.homepage !== RELEASE_HOMEPAGE) errors.push(`${prefix} homepage is invalid`);
  if (manifest.bugs?.url !== RELEASE_BUGS_URL) errors.push(`${prefix} bugs.url is invalid`);
  if (
    manifest.publishConfig?.access !== 'public' ||
    manifest.publishConfig?.registry !== RELEASE_REGISTRY
  ) {
    errors.push(`${prefix} publishConfig must target public npm`);
  }
  if (manifest.publishConfig?.tag !== undefined) {
    errors.push(`${prefix} must not own a publish dist-tag`);
  }

  for (const section of MODELED_DEPENDENCY_SECTIONS) {
    const actualDependencies = internalDependencyNames(manifest, section);
    const expectedDependencies = [...entry[section]].sort();
    if (!sameStrings(actualDependencies, expectedDependencies)) {
      const graphName = section === 'dependencies' ? 'runtime' : 'development';
      errors.push(`${prefix} internal ${graphName} dependency graph is invalid`);
    }
    for (const dependency of actualDependencies) {
      if (manifest[section][dependency] !== 'workspace:*') {
        errors.push(`${prefix} source ${section}.${dependency} must remain workspace:*`);
      }
    }
  }

  for (const section of UNAPPROVED_DEPENDENCY_SECTIONS) {
    for (const dependency of internalDependencyNames(manifest, section)) {
      errors.push(`${prefix} internal ${section}.${dependency} is not approved by release graph`);
    }
  }
}

export async function inspectReleaseContract(repositoryRoot) {
  const errors = [];
  const rootManifest = await readJson(path.join(repositoryRoot, 'package.json'));
  const releaseVersion = rootManifest.version;
  if (rootManifest.private !== true) errors.push('root workspace must remain private');
  if (!isValidReleaseVersion(releaseVersion)) {
    errors.push('root package.json must declare a valid non-placeholder semver release version');
  }

  let rootLicense;
  try {
    rootLicense = await readFile(path.join(repositoryRoot, 'LICENSE'));
  } catch {
    errors.push('root MIT LICENSE is missing');
  }

  for (const entry of PUBLIC_PACKAGES) {
    const packageRoot = path.join(repositoryRoot, entry.directory);
    let manifest;
    try {
      manifest = await readJson(path.join(packageRoot, 'package.json'));
    } catch {
      errors.push(`${entry.name} package.json is missing or invalid`);
      continue;
    }
    validatePublicManifest(errors, manifest, entry, releaseVersion);

    try {
      await lstat(path.join(packageRoot, 'README.md'));
    } catch {
      errors.push(`${entry.name} README.md is missing`);
    }
    try {
      const packageLicense = await readFile(path.join(packageRoot, 'LICENSE'));
      if (rootLicense !== undefined && !packageLicense.equals(rootLicense)) {
        errors.push(`${entry.name} LICENSE must be byte-identical to root LICENSE`);
      }
    } catch {
      errors.push(`${entry.name} LICENSE is missing`);
    }

    if (entry.pluginSource !== undefined) {
      try {
        const source = await readFile(path.join(repositoryRoot, entry.pluginSource), 'utf8');
        if (sourcePluginVersion(source) !== releaseVersion) {
          errors.push(`${entry.name} runtime plugin version must equal ${releaseVersion}`);
        }
      } catch {
        errors.push(`${entry.name} runtime plugin source is missing or invalid`);
      }
    }
  }

  for (const workspaceRoot of WORKSPACE_ROOTS) {
    const rootPath = path.join(repositoryRoot, workspaceRoot);
    for (const entry of await readdir(rootPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const directory = path.posix.join(workspaceRoot, entry.name);
      if (PUBLIC_PACKAGES.some((candidate) => candidate.directory === directory)) continue;
      try {
        const manifest = await readJson(path.join(rootPath, entry.name, 'package.json'));
        if (manifest.private !== true) {
          errors.push(
            `${manifest.name ?? directory} is outside the public allowlist and must be private`,
          );
        }
      } catch {
        errors.push(`${directory} package.json is missing or invalid`);
      }
    }
  }

  return Object.freeze({
    errors: Object.freeze(errors),
    releaseVersion,
    publicPackages: PUBLIC_PACKAGES,
  });
}
