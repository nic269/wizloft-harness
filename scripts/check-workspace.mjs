import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const WORKSPACE_ROOTS = ['packages', 'plugins', 'profiles'];
const REQUIRED_SCRIPTS = ['build', 'test', 'typecheck'];
const WIZLOFT_CLI_EXECUTABLES = new Set(['wizanh', 'wizharness', 'wizloft', 'wizshopify']);

function directlyInvokesItself(scriptName, command) {
  const directInvocations = [
    `bun ${scriptName}`,
    `bun run ${scriptName}`,
    `npm run ${scriptName}`,
    `pnpm ${scriptName}`,
    `pnpm run ${scriptName}`,
    `yarn ${scriptName}`,
    `yarn run ${scriptName}`,
  ];

  const commandSegments = command
    .split(/&&|\|\||[;\n]/gu)
    .map((segment) => segment.trim().replaceAll(/\s+/gu, ' '));

  return commandSegments.some((segment) =>
    directInvocations.some(
      (invocation) => segment === invocation || segment.startsWith(`${invocation} `),
    ),
  );
}

function executableNames(manifest) {
  if (typeof manifest.bin === 'string') {
    const packageName = manifest.name?.split('/').at(-1);
    return packageName ? [packageName] : [];
  }

  if (manifest.bin && typeof manifest.bin === 'object') {
    return Object.keys(manifest.bin);
  }

  return [];
}

async function readManifest(manifestPath) {
  try {
    const manifestStats = await lstat(manifestPath);
    if (manifestStats.isSymbolicLink()) {
      throw new Error(`${manifestPath} must not be a symbolic-link package manifest`);
    }

    return JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`cannot read ${manifestPath}: ${detail}`, { cause: error });
  }
}

export async function inspectWorkspace(repositoryRoot) {
  const errors = [];
  const manifests = [];
  const packageNames = new Set();

  for (const workspaceRoot of WORKSPACE_ROOTS) {
    const rootPath = path.join(repositoryRoot, workspaceRoot);
    const rootStats = await lstat(rootPath);

    if (rootStats.isSymbolicLink()) {
      errors.push(`${rootPath} must not be a symbolic-link workspace root`);
      continue;
    }

    if (!rootStats.isDirectory()) {
      errors.push(`${rootPath} must be a workspace directory`);
      continue;
    }

    const entries = await readdir(rootPath, { withFileTypes: true });

    for (const entry of entries) {
      const packageRoot = path.join(rootPath, entry.name);

      if (entry.isSymbolicLink()) {
        errors.push(`${packageRoot} must not be a symbolic-link workspace package`);
        continue;
      }

      if (!entry.isDirectory()) {
        continue;
      }

      const manifestPath = path.join(rootPath, entry.name, 'package.json');
      let manifest;

      try {
        manifest = await readManifest(manifestPath);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
        continue;
      }

      const displayName = typeof manifest.name === 'string' ? manifest.name : manifestPath;
      manifests.push({ manifest, manifestPath });

      if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
        errors.push(`${manifestPath} must declare a non-empty package name`);
      } else if (packageNames.has(manifest.name)) {
        errors.push(`duplicate workspace package name: ${manifest.name}`);
      } else {
        packageNames.add(manifest.name);
      }

      for (const requiredScript of REQUIRED_SCRIPTS) {
        const script = manifest.scripts?.[requiredScript];

        if (typeof script !== 'string') {
          errors.push(`${displayName} is missing required script: ${requiredScript}`);
        } else if (script.trim().length === 0) {
          errors.push(`${displayName} has empty required script: ${requiredScript}`);
        } else if (directlyInvokesItself(requiredScript, script)) {
          errors.push(`${displayName} required script directly invokes itself: ${requiredScript}`);
        }
      }

      if (manifest.directories?.bin !== undefined) {
        errors.push(`${displayName} must not use package.json directories.bin`);
      }

      for (const executableName of executableNames(manifest)) {
        if (WIZLOFT_CLI_EXECUTABLES.has(executableName.toLocaleLowerCase('en-US'))) {
          errors.push(`${displayName} claims executable owned by wizloft-cli: ${executableName}`);
        }
      }
    }
  }

  return { errors, manifests };
}

export async function assertWorkspaceContracts(repositoryRoot) {
  const inspection = await inspectWorkspace(repositoryRoot);

  if (inspection.errors.length > 0) {
    throw new Error(`Workspace contract violations:\n- ${inspection.errors.join('\n- ')}`);
  }

  return inspection;
}

const executedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : undefined;

if (executedPath === import.meta.url) {
  try {
    await assertWorkspaceContracts(path.resolve(fileURLToPath(new URL('../', import.meta.url))));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
