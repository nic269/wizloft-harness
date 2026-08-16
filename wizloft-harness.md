This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
docs/
  architecture/
    ARCHITECTURE.md
    AUTHORITY-CONTEXT-EVIDENCE.md
    MEMORY-MODEL.md
    PLUGIN-MODEL.md
  consumers/
    MELDMARK.md
    WIZLOFT-CLI.md
  decisions/
    0001-repository-is-source-of-truth.md
    0002-small-kernel-plugin-ecosystem.md
    0003-agent-agnostic.md
    0004-three-durability-planes.md
    0005-memory-first-class-capability.md
    0006-deterministic-composition.md
    0007-deepseek-interoperability-without-dependency.md
    0008-v0-typescript-pnpm.md
    0009-cli-ownership-boundary.md
    0010-dogfood-order.md
    0011-wizloft-cli-rewrite-strategy.md
  milestones/
    MUH.md
    SELF-HOST.md
  plans/
    active/
      0001-build-muh.md
  references/
    READING-MAP.md
    README.md
    UPSTREAM-BASELINES.md
  PROJECT-BRIEF.md
  README.md
examples/
  README.md
scripts/
  check-workspace.mjs
  link-consumer.sh
  record-reference-baselines.sh
  setup-references.sh
tests/
  bootstrap.test.mjs
.gitignore
.prettierignore
.prettierrc.json
AGENTS.md
CODEX-SLICE-PROMPTS.md
CODEX-START.md
eslint.config.mjs
package.json
pnpm-workspace.yaml
README.md
START-HERE.md
tsconfig.base.json
tsconfig.json
```

# Files

## File: scripts/check-workspace.mjs
````
import { lstat, readFile, readdir } from 'node:fs/promises';
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
````

## File: tests/bootstrap.test.mjs
````
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { inspectWorkspace } from '../scripts/check-workspace.mjs';

const repositoryRoot = new URL('../', import.meta.url);

async function readRepositoryFile(path) {
  return readFile(new URL(path, repositoryRoot), 'utf8');
}

test('workspace root is private and does not own executable names', async () => {
  const manifest = JSON.parse(await readRepositoryFile('package.json'));

  assert.equal(manifest.private, true);
  assert.equal(manifest.bin, undefined);
  assert.equal(manifest.directories?.bin, undefined);
  assert.match(manifest.packageManager, /^pnpm@\d+\.\d+\.\d+$/u);
  assert.equal(manifest.engines.node, '>=22.13.0');
  assert.equal(manifest.engines.pnpm, '>=11.10.0');
});

test('workspace exposes the complete root verification contract', async () => {
  const manifest = JSON.parse(await readRepositoryFile('package.json'));

  for (const script of ['format:check', 'lint', 'typecheck', 'test', 'build', 'verify']) {
    assert.equal(typeof manifest.scripts[script], 'string', `missing root script: ${script}`);
  }
});

test('workspace discovers target package roots without requiring packages to exist', async () => {
  const workspace = await readRepositoryFile('pnpm-workspace.yaml');

  assert.match(workspace, /- packages\/\*/u);
  assert.match(workspace, /- plugins\/\*/u);
  assert.match(workspace, /- profiles\/\*/u);
});

test('workspace contract rejects packages that can escape root verification', async (context) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'wizloft-harness-workspace-'));
  context.after(() => rm(fixtureRoot, { force: true, recursive: true }));

  for (const root of ['packages', 'plugins', 'profiles']) {
    await mkdir(path.join(fixtureRoot, root), { recursive: true });
  }

  const missingScriptsRoot = path.join(fixtureRoot, 'packages', 'missing-scripts');
  await mkdir(missingScriptsRoot);
  await writeFile(
    path.join(missingScriptsRoot, 'package.json'),
    JSON.stringify({
      name: '@wizloft/missing-scripts',
      scripts: { build: 'tsc -b' },
    }),
  );

  const invalidScriptsRoot = path.join(fixtureRoot, 'packages', 'invalid-scripts');
  await mkdir(invalidScriptsRoot);
  await writeFile(
    path.join(invalidScriptsRoot, 'package.json'),
    JSON.stringify({
      name: '@wizloft/invalid-scripts',
      bin: { WIZLOFT: './bin/wizloft.js' },
      directories: { bin: 'bin' },
      scripts: {
        build: '   ',
        test: 'echo ready && pnpm run test',
        typecheck: 'tsc --noEmit',
      },
    }),
  );

  const linkedPackageSource = path.join(fixtureRoot, 'linked-package-source');
  await mkdir(linkedPackageSource);
  await writeFile(
    path.join(linkedPackageSource, 'package.json'),
    JSON.stringify({
      name: '@wizloft/linked',
      scripts: {
        build: 'tsc -b',
        test: 'node --test',
        typecheck: 'tsc --noEmit',
      },
    }),
  );
  const linkedPackageRoot = path.join(fixtureRoot, 'plugins', 'linked');
  await symlink(linkedPackageSource, linkedPackageRoot, 'dir');

  const inspection = await inspectWorkspace(fixtureRoot);

  assert.equal(inspection.errors.length, 7);
  assert.deepEqual(
    new Set(inspection.errors),
    new Set([
      '@wizloft/invalid-scripts has empty required script: build',
      '@wizloft/invalid-scripts required script directly invokes itself: test',
      '@wizloft/invalid-scripts must not use package.json directories.bin',
      '@wizloft/invalid-scripts claims executable owned by wizloft-cli: WIZLOFT',
      '@wizloft/missing-scripts is missing required script: test',
      '@wizloft/missing-scripts is missing required script: typecheck',
      `${linkedPackageRoot} must not be a symbolic-link workspace package`,
    ]),
  );
});

test('workspace contract rejects symlinked workspace roots', async (context) => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'wizloft-harness-roots-'));
  context.after(() => rm(fixtureRoot, { force: true, recursive: true }));

  const externalPackages = path.join(fixtureRoot, 'external-packages');
  await mkdir(externalPackages);
  await symlink(externalPackages, path.join(fixtureRoot, 'packages'), 'dir');
  await mkdir(path.join(fixtureRoot, 'plugins'));
  await mkdir(path.join(fixtureRoot, 'profiles'));

  const inspection = await inspectWorkspace(fixtureRoot);

  assert.deepEqual(inspection.errors, [
    `${path.join(fixtureRoot, 'packages')} must not be a symbolic-link workspace root`,
  ]);
});
````

## File: .prettierignore
````
.references/
coverage/
dist/
node_modules/
pnpm-lock.yaml
````

## File: .prettierrc.json
````json
{
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all"
}
````

## File: eslint.config.mjs
````
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.references/**', 'coverage/**', 'dist/**', 'node_modules/**', 'pnpm-lock.yaml'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      sourceType: 'module',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
);
````

## File: package.json
````json
{
  "name": "wizloft-harness-workspace",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.10.0",
  "engines": {
    "node": ">=22.13.0",
    "pnpm": ">=11.10.0"
  },
  "scripts": {
    "build": "pnpm workspace:check && pnpm --recursive run build",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint .",
    "test": "pnpm workspace:check && node --test tests/bootstrap.test.mjs && pnpm --recursive run test",
    "typecheck": "pnpm workspace:check && tsc --project tsconfig.json --noEmit --pretty false && pnpm --recursive run typecheck",
    "verify": "pnpm workspace:check && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build",
    "workspace:check": "node scripts/check-workspace.mjs"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.5",
    "@types/node": "^22.20.1",
    "eslint": "^9.39.5",
    "globals": "^16.5.0",
    "prettier": "^3.9.6",
    "typescript": "^5.9.3",
    "typescript-eslint": "^8.67.0"
  }
}
````

## File: pnpm-workspace.yaml
````yaml
packages:
  - packages/*
  - plugins/*
  - profiles/*
````

## File: tsconfig.base.json
````json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "target": "ES2022",
    "types": ["node"],
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true
  }
}
````

## File: tsconfig.json
````json
{
  "extends": "./tsconfig.base.json",
  "files": [],
  "references": []
}
````

## File: docs/architecture/ARCHITECTURE.md
````markdown
# Architecture v0

## System model

```text
                    HUMAN / AGENT / CI
                           |
                           v
                    COMMAND / SDK SEAM
                           |
                           v
                    WIZLOFT HARNESS
                           |
               +-----------+-----------+
               |                       |
            KERNEL               CAPABILITIES
               |                       |
 plugin host / registry       Context / Authority
 config / lifecycle           Memory / Validation
 events / diagnostics         Evidence
               |                       |
               +-----------+-----------+
                           |
                         PLUGINS
                           |
        +------------------+------------------+
        |                  |                  |
     Providers          Policies          Integrations
        |                  |                  |
 file stores          authority gates    stack/domain
 repo context         validation rules   agent adapters
```

## Kernel responsibilities

The kernel owns only composition mechanics/invariants:

- plugin registration and lifecycle;
- capability registry and compatibility metadata;
- dependency graph resolution;
- deterministic ordering;
- configuration/profile composition primitives;
- event dispatch infrastructure;
- diagnostics and structured errors.

The kernel must not understand TypeScript, Next.js, Prisma, Shopify, Meldmark, Wizloft CLI, Codex, Claude Code, or DeepSeek semantics.

Kernel registries and capability services are scoped to one resolved Harness runtime instance. There are no process-global capability service singletons in v0.

## First-party capability contracts

- **Context** — contributors resolve the smallest useful context for work.
- **Authority** — resolves authoritative sources, precedence, ambiguity, conflict, and provenance.
- **Memory** — remembers learned knowledge with scope/provenance/lifecycle; never silently becomes authority.
- **Validation** — discovers and executes proof appropriate to work/change context.
- **Evidence** — normalizes proof/outcomes for humans, agents, and future automation.

They are first-party ecosystem packages, not kernel internals.

## Target package topology

The target workspace topology is:

```text
packages/
  kernel/              @wizloft/harness-kernel
  context/             @wizloft/harness-context
  authority/           @wizloft/harness-authority
  memory/              @wizloft/harness-memory
  validation/          @wizloft/harness-validation
  evidence/            @wizloft/harness-evidence
  commands/            @wizloft/harness-commands
  cli-adapter/         @wizloft/harness-cli-adapter
  harness/             @wizloft/harness
plugins/
  repository-files/
  file-events/
  file-memory/
profiles/
  base/
```

`@wizloft/harness` is the public consumer-facing SDK facade. This topology is a target architecture, not a requirement to scaffold empty packages. Each package should be created only when its implementation slice gives it a real responsibility.

## Durability planes

```text
Repository authority  -> accepted truth
Memory                -> learned/supporting knowledge
Events/evidence        -> execution history and proof
```

Deleting the memory index/store must not delete project truth. Deleting an event index must not alter accepted repository behavior.

## Profiles

Profiles compose plugins/configuration deterministically:

```text
base
  -> stack profile
    -> domain profile/plugin
      -> project-local config/overrides
```

## Agent/runtime relationship

Harness does not own a coding-agent runtime in v0:

```text
Codex --------+
Claude -------+--> adapter/command/SDK seam --> Wizloft Harness --> repository
DSH ----------+
Human CLI ----+
CI -----------+
```

## CLI ownership boundary

```text
wizloft-harness
  owns: command semantics, structured inputs/results, CLI adapter library
  does not own: global `wizloft` or `wizharness` executable names

wizloft-cli
  owns: `wizloft`, `wizanh`, `wizshopify`, future `wizharness`
  delegates Harness behavior to the Harness adapter/command API
```

This prevents duplicate command logic while keeping Harness embeddable by agents, CI, future UIs, and DeepSeek integration.

## DeepSeek interoperability seam

Do not depend on DeepSeek Harness in v0. Keep contracts modular enough for either future direction:

1. a Wizloft adapter/provider backed by DSH; or
2. a DSH plugin consuming Wizloft services.
````

## File: docs/architecture/AUTHORITY-CONTEXT-EVIDENCE.md
````markdown
# Authority, Context, Validation, and Evidence

## Authority

Authority answers: **what has this repository accepted as true?**

Sources may include decisions, architecture, product docs, module instructions, code/tests, configuration, or other repository-defined truth. A provider must preserve provenance and precedence rather than flattening every document into equal text.

Authority resolution must support semantics equivalent to:

- resolved;
- missing;
- ambiguous;
- conflicting.

Configurable defaults and memory do not manufacture authority.

## Context

Context answers: **what is the smallest useful set of material for this work?**

Contributors may supply:

- relevant authority;
- affected code/tests;
- recent work/evidence;
- stack/domain guidance;
- supporting memory.

Context composition must be deterministic and retain source labels. Historical evidence should not outrank current authority merely because it is textually similar.

## Validation

Validation answers: **what executable/observable proof is required for this work?**

Validators should declare applicability so a change can select focused proof rather than always running every possible command.

## Evidence

Evidence is normalized proof produced by work/validation. It may reference command, validator, status, duration, output metadata, source revision, and correlation/work id.

Evidence is not a task database and does not become product authority by itself.

## Critical invariant

```text
Authority says Y
Memory says X
        |
        v
Context presents Y as authority and X only as conflicting/stale supporting memory.
```
````

## File: docs/architecture/MEMORY-MODEL.md
````markdown
# Memory Model

## Core distinction

```text
Events     = what happened
Memory     = what we learned
Repository = what we have decided is true
```

Memory is first-class, persistent, queryable, and useful across sessions/projects, but it never becomes hidden product authority.

## Memory kinds

### Working memory

Current task/plan/context state. Prefer reconstruction from active plan, events, repository state, and agent session rather than durable semantic records by default.

### Episodic memory

Previous work episodes: approaches tried, failures, migrations, debugging outcomes, successful implementation patterns.

### Semantic memory

Learned reusable facts, conventions, gotchas, or patterns.

### Procedural knowledge

Stable procedure should graduate from memory into docs, skill, policy, validator, workflow, or plugin.

## Scope

```ts
type MemoryScope =
  'organization' | `project:${string}` | `workspace:${string}` | `session:${string}`;
```

Cross-project memory must preserve applicability/scope so a lesson from one stack is not promoted into an invalid organization-wide rule.

## Lifecycle

```text
candidate -> active -> stale/superseded -> archived
```

Every durable memory has provenance. Repository-backed memory should become potentially stale when its source revision/content changes.

## Conceptual record

```ts
interface MemoryRecord {
  id: string;
  kind: 'episodic' | 'semantic';
  scope: MemoryScope;
  content: string;
  tags: string[];
  provenance: MemoryProvenance;
  confidence?: number;
  state: 'candidate' | 'active' | 'stale' | 'superseded' | 'archived';
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  supersededBy?: string;
}
```

Semantics outrank this exact draft type shape.

## v0 storage

Implement a file/JSONL provider.

```text
canonical memory records -> durable files/JSONL
search/index             -> disposable/rebuildable
```

No required SQLite, embeddings, vector DB, or LLM memory extraction in v0.

## Capture policy

Be conservative:

- explicit remember operations;
- deterministic event-derived records when clearly justified;
- manual/explicit promotion;
- no automatic extraction of every conversation.

## Promotion

```text
Episode -> Semantic candidate -> validated reusable knowledge
                                  |
                                  +-> docs
                                  +-> skill
                                  +-> policy
                                  +-> validator
                                  +-> plugin
```
````

## File: docs/architecture/PLUGIN-MODEL.md
````markdown
# Plugin and Capability Model

## Principle

**A small kernel owns invariants. Everything project-specific composes.**

This borrows the plugin-first composability lesson from DeepSeek Harness without reproducing its full agent runtime.

## Conceptual plugin contract

```ts
type CapabilityId = `${string}@${number}`;
type Disposer = () => void | Promise<void>;
type MaybePromise<T> = T | Promise<T>;

interface CapabilityToken<T> {
  readonly id: CapabilityId;
}

interface CapabilityRequirement<T = unknown> {
  readonly token: CapabilityToken<T>;
}

interface CapabilityDeclaration<T = unknown> {
  readonly token: CapabilityToken<T>;
}

interface WizloftPlugin<TConfig = unknown> {
  readonly name: string;
  readonly version: string;
  readonly requires?: readonly CapabilityRequirement[];
  readonly provides?: readonly CapabilityDeclaration[];
  setup(ctx: PluginContext<TConfig>): MaybePromise<void | Disposer>;
}

interface PluginContext<TConfig = unknown> {
  readonly config: Readonly<TConfig>;
  readonly capabilities: {
    get<T>(token: CapabilityToken<T>): T;
    provide<T>(token: CapabilityToken<T>, service: T): Disposer;
  };
  readonly events: EventBus;
  readonly diagnostics: DiagnosticSink;
}
```

The exact API may evolve while v0 tests reveal a simpler contract, but accepted semantics must remain. This is the target v0 context shape: Slice 1 implements only the capability/lifecycle/diagnostic surface it needs, while typed profile config and the event bus become available in Slice 2.

## Runtime identity and service cardinality

- capability tokens expose a stable serializable exact-major id such as `context@1`;
- registry identity is based on that id, not JavaScript object identity;
- v0 does not solve semver capability ranges;
- one active capability service exists per capability token in a resolved Harness runtime;
- capability services are runtime-scoped, never process-global singletons;
- plugin names are unique within one resolved runtime/profile;
- multiple plugin instances or instance ids are deferred until a real use case requires them.

Capability-specific multiplicity stays inside the owning service. For example, `ContextService.registerContributor()` and `ValidationService.registerValidator()` may host many registrations. The kernel does not implement generic multibinding.

## Plugin categories

Organizational conventions, not different kernel mechanisms:

- **providers** — capability backends (file memory, event store, repo context);
- **policies** — guards/decision rules around capabilities;
- **stack plugins** — TypeScript, Node, Next.js, Prisma, Shopify, etc.;
- **domain plugins** — Meldmark or another Wizloft domain;
- **workflow plugins** — later, only if repeated work shapes justify them;
- **agent/runtime adapters** — Codex, Claude Code, DeepSeek Harness, etc.

## Capability identifiers

Leave room for versioned contracts:

```text
context@1
authority@1
memory@1
validation@1
evidence@1
```

## Dependencies and ordering

- required capabilities form the primary dependency DAG;
- composition order is deterministic;
- missing/incompatible requirements fail with actionable diagnostics;
- cycles are startup errors;
- a plugin may access only capabilities declared in `requires`;
- a plugin may register only capability services declared in `provides`;
- duplicate plugin names or active services for the same capability token are startup errors;
- deterministic tie-breaking among independent DAG nodes exists only for reproducibility;
- plugins must declare real semantic dependencies through capability requirements rather than relying on sibling declaration order;
- add `before`/`after` only if capability dependencies cannot express a real requirement.

## Lifecycle

Setup may return a disposer. Registrations and other kernel-scoped effects created during setup are tracked immediately. If setup throws, the kernel first rolls back that plugin's partial effects in reverse creation order, then disposes previously initialized plugins in reverse setup order. Shutdown uses the same reverse-order cleanup. Cleanup continues after a disposer failure and emits useful diagnostics for every failure. Hot reload is not required in v0, but clean teardown and reversible registration should remain possible.

## Safety boundary

Plugins receive public capability APIs, not kernel private state. v0 does not execute arbitrary remote plugin code and makes no security-isolation claim.

## Generic seam rule

When deciding placement:

```text
required for composition invariant? -> kernel
reusable across projects?           -> capability/provider/plugin
specific to one project/domain?      -> project/domain plugin
```
````

## File: docs/consumers/MELDMARK.md
````markdown
# Consumer 2 — Meldmark

Meldmark is the domain-rich consumer after the Harness survives self-hosting and the Wizloft CLI rebuild.

It should stress:

- many accepted product/UX/architecture decisions;
- design and component references;
- domain plugins (assessment authoring, attempt runtime, assignment/review, etc.);
- long-running implementation plans;
- richer project memory;
- context routing across product/design/code/tests;
- validation specific to affected capabilities.

Harness core must not contain Meldmark assessment semantics. Those belong in Meldmark project/domain plugins and repository authority.
````

## File: docs/consumers/WIZLOFT-CLI.md
````markdown
# Consumer 1 — Wizloft CLI Rewrite

## Why this consumer comes first

Wizloft CLI is a compact but real brownfield project. It tests different Harness dimensions than Meldmark:

- existing repository-harness-style `AGENTS.md`, decisions, plans, and workflow;
- multi-module CLI architecture;
- current CommonJS implementation moving to TypeScript;
- root/module authority boundaries;
- behavior-preserving rewrite;
- validation routing;
- CLI integration with Harness itself.

## Current contracts to preserve

The current CLI exposes:

```text
wizloft anh ...      <-> wizanh ...
wizloft shopify ...  <-> wizshopify ...
```

Both entry forms call the same module implementation. Root dispatch must not duplicate module business logic.

The rewrite will add:

```text
wizloft harness ...  <-> wizharness ...
```

The executable names are owned by `wizloft-cli`; Harness supplies the reusable command/CLI adapter.

## Shopify safety behavior to preserve

Treat the current repository implementation/docs/tests as the behavior oracle for at least:

- isolated per-profile HOME/XDG state;
- no Shopify session-file copying/parsing;
- path containment and symlink safety;
- private directories/files where supported;
- atomic metadata/config writes;
- lock/lease/target-lock semantics;
- environment allowlisting/secret stripping;
- `shell: false` process execution;
- argument redaction in dry-run output;
- theme dev port reservation/concurrency semantics;
- fake executable tests unless real account interaction is explicitly authorized.

Do not silently weaken these during the rewrite.

## Rewrite strategy

1. tag current state `pre-typescript-rewrite`;
2. use current code/docs/tests as read-only reference and acceptance oracle;
3. build a clean strict-TypeScript architecture rather than line-by-line translation;
4. preserve external behavior first;
5. add `harness` as an external module backed by the Harness package;
6. prefer a small deterministic module registry over growing root `if/else` dispatch;
7. keep root CLI a composition shell, not the owner of module business logic.

## Harness acceptance scenarios

While rebuilding, Harness should prove it can:

- rank root decisions/workflow above installed `.harness-core` provenance copies;
- respect module-local Shopify authority and de-prioritize historical research/journals/reports;
- route validation based on affected module/path;
- recall historical lessons without converting them into current authority;
- provide structured command results suitable for `wizloft-cli` human output and `--json`/agent use.

## Suggested TypeScript direction

Exact layout is not locked before the rewrite, but expected responsibilities are:

```text
src/
  cli/           root registry/dispatcher/help
  modules/
    anh/
    shopify/
    harness/     thin adapter to @wizloft/harness
bin/
  wizloft
  wizanh
  wizshopify
  wizharness
```

The consumer may evolve this structure if tests/clarity justify a better shape.
````

## File: docs/decisions/0001-repository-is-source-of-truth.md
````markdown
# 0001 Repository Is the Source of Truth

Status: Accepted

Project/product/architecture truth lives in repository artifacts such as accepted decisions, current docs, code, tests, configuration, and observable runtime evidence as defined by each consumer repository. Harness databases/indexes/memory must not silently replace that authority.
````

## File: docs/decisions/0002-small-kernel-plugin-ecosystem.md
````markdown
# 0002 Small Kernel, Composable Ecosystem

Status: Accepted

The kernel owns composition mechanics/invariants only. First-party capabilities live outside the kernel. Stack/domain/project knowledge belongs in plugins/profiles/project configuration.
````

## File: docs/decisions/0003-agent-agnostic.md
````markdown
# 0003 Agent-Agnostic Harness

Status: Accepted

Wizloft Harness must not depend on Codex, Claude Code, DeepSeek Harness, or another coding-agent runtime for its core semantics. Runtimes integrate through adapters, command APIs, SDKs, skills, or plugins.
````

## File: docs/decisions/0004-three-durability-planes.md
````markdown
# 0004 Three Durability Planes

Status: Accepted

Events/evidence record what happened. Memory records what was learned. Repository authority records what has been accepted as true. These planes have different trust/retention semantics and must not collapse into one hidden state database.
````

## File: docs/decisions/0005-memory-first-class-capability.md
````markdown
# 0005 Memory Is a First-Class Capability

Status: Accepted

Memory is a first-party capability contract with pluggable storage/retrieval/capture strategies. v0 uses file/JSONL storage and basic retrieval. Memory always carries scope/provenance/lifecycle and never outranks repository authority.
````

## File: docs/decisions/0006-deterministic-composition.md
````markdown
# 0006 Composition Is Deterministic

Status: Accepted

Plugin/profile/capability composition must be deterministic. Missing requirements and cycles fail with actionable diagnostics. Completion/result ordering should remain stable even where implementation later introduces concurrency.
````

## File: docs/decisions/0007-deepseek-interoperability-without-dependency.md
````markdown
# 0007 DeepSeek Interoperability Without v0 Dependency

Status: Accepted

DeepSeek Harness is an architecture reference and future integration target, not a v0 dependency. Wizloft contracts should preserve a seam for either a Wizloft adapter backed by DSH or a DSH plugin consuming Wizloft services.
````

## File: docs/decisions/0008-v0-typescript-pnpm.md
````markdown
# 0008 v0 Uses TypeScript and pnpm

Status: Accepted

Wizloft Harness v0 is implemented as a strict TypeScript pnpm workspace with a small dependency footprint. Consumer repositories may use other languages/stacks; TypeScript is an implementation choice for Harness, not a consumer requirement.
````

## File: docs/decisions/0009-cli-ownership-boundary.md
````markdown
# 0009 CLI Ownership Boundary

Status: Accepted

`wizloft-cli` owns organization-level executable names and CLI UX, including future `wizloft harness ...` and `wizharness ...` entrypoints.

`wizloft-harness` owns reusable command semantics, structured command inputs/results, SDK APIs, and a CLI adapter library. It must not claim the global `wizharness` binary in v0.

The CLI delegates to Harness APIs; Harness never depends on Wizloft CLI.
````

## File: docs/decisions/0010-dogfood-order.md
````markdown
# 0010 Dogfood Order

Status: Accepted

Development order is:

1. reach Minimum Useful Harness;
2. self-host Harness on its own repository;
3. use Harness to rebuild Wizloft CLI in TypeScript while preserving accepted behavior/safety;
4. harden Harness from concrete CLI friction;
5. use the hardened Harness for Meldmark implementation.

This prevents Meldmark complexity from hiding Harness design defects and prevents speculative Harness platform work before a real consumer needs it.
````

## File: docs/decisions/0011-wizloft-cli-rewrite-strategy.md
````markdown
# 0011 Wizloft CLI Rewrite Strategy

Status: Accepted

The current JavaScript/CommonJS Wizloft CLI is preserved as a tagged reference/behavior oracle. The next major implementation is a clean TypeScript rewrite, not a mechanical file-by-file conversion.

Preserve accepted observable behavior and Shopify safety contracts. Improve internal architecture where justified. Keep one project identity/repository rather than creating a permanent `wizloft-cli-v2` project.
````

## File: docs/milestones/MUH.md
````markdown
# Minimum Useful Harness (MUH)

MUH is the stop condition for initial Harness implementation. Once these pass, stop adding platform features and move to self-hosting / Wizloft CLI rebuild.

## Required capabilities

### Kernel

- deterministic plugin host;
- capability registry/requirements;
- dependency graph with missing/cycle diagnostics;
- lifecycle/disposer seam;
- diagnostics.

### Configuration/profiles/events

- typed project/profile composition;
- deterministic layering;
- event bus;
- append-only file event persistence.

### Context + Authority

- repository/file contributors;
- explicit provenance;
- authority precedence/statuses;
- context composition that distinguishes authority/history/memory.

### Validation + Evidence

- validator registration/applicability;
- execution/result contract;
- deterministic normalized evidence;
- event/evidence integration.

### Memory

- episodic + semantic records;
- org/project/workspace/session scope;
- provenance;
- candidate/active/stale/superseded/archived lifecycle;
- file/JSONL persistence across restart;
- basic keyword/metadata recall;
- repository authority wins over conflicting memory.

### SDK/command seam

- define/compose/run profile;
- inspect plugin/capability graph;
- resolve context/authority;
- remember/recall memory;
- run validation/read evidence;
- inspect events;
- structured command API and reusable CLI adapter;
- no global CLI binary owned by Harness.

## Explicitly not required for MUH

- Codex native adapter;
- DeepSeek integration;
- workflow engine;
- subagents/jobs;
- web UI;
- vector/embedding search;
- SQLite/Postgres memory provider;
- autonomous memory extraction;
- remote execution;
- plugin marketplace.

## Exit statement

MUH is achieved when Harness is reliable enough to help rebuild Wizloft CLI with itself. It does not mean feature complete.
````

## File: docs/milestones/SELF-HOST.md
````markdown
# Self-Host Gate

After MUH, run Wizloft Harness against the `wizloft-harness` repository itself.

The gate passes when Harness can:

1. discover accepted decisions and architecture as authority;
2. identify the active implementation plan and current code/tests without treating references as authority;
3. build bounded context for a real Harness maintenance task;
4. select focused validators plus root-required validation;
5. persist/retrieve project memory with provenance;
6. surface a deliberately conflicting/stale memory without overriding repository authority;
7. record deterministic events/evidence;
8. restart and retain durable memory/events;
9. produce understandable diagnostics for at least one missing capability and one dependency cycle fixture.

Do not use self-hosting as an excuse to add new platform features. Fix only reliability/ergonomics required for the next consumer.
````

## File: docs/plans/active/0001-build-muh.md
````markdown
# Execution Plan — Build Minimum Useful Harness

Status: Active

## Outcome

Build the smallest tested Wizloft Harness that satisfies MUH, self-hosts reliably, and is ready to be used for the Wizloft CLI TypeScript rebuild without implementing a coding-agent runtime.

## Slice 0 — Repository/tooling bootstrap

Status: Complete (2026-08-16)

- initialize strict TypeScript pnpm workspace;
- record the approved target package topology without scaffolding empty packages;
- create a package only when its implementation slice gives it real responsibility;
- root format/lint/typecheck/test/build/verify;
- CI-ready validation command;
- minimal dependencies.

Implemented:

- private pnpm workspace with `packages/*`, `plugins/*`, and `profiles/*` discovery;
- strict shared TypeScript configuration without product/runtime code;
- root format/lint/typecheck/test/build/verify commands;
- Node.js 22.13+ and pnpm 11.10+ tooling contract;
- workspace contract checks that reject symlinked packages, require non-empty non-recursive build/typecheck/test scripts, and reject Wizloft CLI executable ownership;
- bootstrap tests for private/no-binary ownership, root verification scripts, workspace discovery, and invalid-package rejection;
- architecture and plugin-model clarifications approved before implementation.

Proof:

- `pnpm install --frozen-lockfile` succeeds from a fresh temporary checkout;
- the documented npm-installed pnpm 11.10 bootstrap succeeds from a fresh temporary checkout;
- `pnpm verify` succeeds on the exact minimum Node.js 22.13.0;
- `pnpm verify` succeeds;
- bootstrap tests pass: 5 passed, 0 failed;
- `packages/`, `plugins/`, and `profiles/` still contain only their `.gitkeep` placeholders;
- no Slice 1 plugin-host or capability behavior is implemented.

## Slice 1 — Kernel/plugin host

- plugin identity;
- unique plugin names within one resolved runtime/profile;
- stable serializable exact-major capability ids and declarations/requirements;
- one runtime-scoped active capability service per capability token;
- capability registry;
- deterministic dependency graph/topological composition;
- declared-requirement-only capability access;
- declared-provides-only capability service registration;
- reproducible tie-breaking that carries no sibling-order semantics;
- capability-specific contributor registries rather than kernel multibinding;
- missing capability diagnostics;
- cycle diagnostics;
- rollback of partial setup effects plus reverse-order lifecycle/disposer cleanup that continues after disposer failures;
- diagnostics primitives.

No project-specific knowledge.

Slice 1 implements only the capability/lifecycle/diagnostic plugin-context surface. Typed profile config and the event bus join the public context in Slice 2.

## Slice 2 — Config/profiles/events

- typed project/profile config;
- deterministic profile layering/overrides;
- event bus;
- append-only file event provider;
- repeatable boot/event ordering tests.

No workflow engine or dynamic remote plugin execution.

## Slice 3 — Context + Authority

- first-party contracts;
- repository/file contributors;
- deterministic merge;
- provenance;
- authority resolved/missing/ambiguous/conflict semantics;
- explicit historical/supporting source labels;
- memory cannot manufacture authority.

## Slice 4 — Validation + Evidence

- validator registration/applicability;
- execution/result contract;
- deterministic normalized evidence ordering;
- event/evidence integration;
- focused vs root-required validation examples.

No hidden task-state DB.

## Slice 5 — Memory

- episodic/semantic memory contract;
- scope and provenance;
- candidate/active/stale/superseded/archived lifecycle;
- file/JSONL provider;
- basic keyword/metadata recall;
- restart persistence;
- source-change/stale seam;
- authority-over-conflicting-memory tests;
- promotion metadata/seam without autonomous extraction.

## Slice 6 — SDK + Command API + CLI Adapter

Expose reusable programmatic operations for:

- profile composition/run/inspect;
- context resolution;
- authority resolution;
- memory remember/recall;
- validation/evidence;
- event inspection.

Add a CLI adapter library that maps argv/options to the same command semantics and can render human or structured/JSON-friendly output.

**Do not expose a global `wizharness` binary from this repository.**

## Gate A — MUH

Run `docs/milestones/MUH.md`. Stop feature work when it passes.

## Gate B — Self-host

Run `docs/milestones/SELF-HOST.md`. Fix only blocking/reliability issues.

## Handoff — Wizloft CLI

Once both gates pass, switch implementation work to the `wizloft-cli` repository and follow `docs/consumers/WIZLOFT-CLI.md`.

## Deferred until real consumer demand

- native Codex/Claude adapters;
- DeepSeek runtime integration;
- workflow/subagent/job engines;
- UI;
- embeddings/vector DB;
- SQLite/Postgres memory providers;
- autonomous memory extraction;
- remote/plugin marketplace/security sandbox claims.
````

## File: docs/references/READING-MAP.md
````markdown
# Reference Reading Map

Inspect the smallest relevant surface for the slice being implemented.

## DeepSeek Harness

Purpose: study plugin-first composition, capability/provider seams, lifecycle/events, deterministic execution lessons, persistence/provider separation, and future runtime interoperability.

Read first:

- `README.md`
- `docs/architecture.md`
- `docs/cordis-primer.md` for understanding only
- `packages/README.md`

Selective areas:

- core session/event packages;
- core tools/policy pipeline;
- system-prompt composition;
- agent-loop boundaries (do not recreate it);
- compaction/provenance ideas;
- storage/session providers;
- profiles/bundles/bootstrap;
- subagent providers when designing future interoperability.

Adopt concepts selectively:

- capability/provider thinking;
- plugin composition;
- event extension points;
- deterministic behavior;
- lifecycle/disposal;
- profile layering;
- isolation != security.

Reject/defer for v0:

- Cordis dependency;
- own LLM/agent loop/tool runtime;
- sandbox runtime;
- self-modifying runtime plugins;
- subagent/workflow/job infrastructure.

## repository-harness — current

Purpose: study repository-as-system-of-record, compact agent guidance, bounded context, durable plans only when useful, human decision gates, and executable proof.

Read first:

- `README.md`
- `AGENTS.md`
- `docs/WORKFLOW.md`
- `docs/README.md`
- decision 0027 ending Protocol V1.

## repository-harness — legacy `harness-cli-v0.1.22`

Purpose: archaeology for useful structured evidence/intake/diagnostic ideas.

Inspect selectively:

- `.harness/` / schemas;
- CLI/control-plane code;
- feature intake/story/test-matrix/trace/evidence concepts.

Possible adaptations:

- structured evidence;
- machine-readable validation metadata;
- explicit diagnostics.

Do not recreate:

- mandatory story/task DB;
- duplicate lifecycle state already represented by Git/repository plans;
- process overhead for every small change.

## Local consumer — Wizloft CLI

If `.references/consumers/wizloft-cli` exists, treat it as read-only while building Harness.
Focus on:

- root `AGENTS.md`, workflow, decisions/plans;
- root dispatcher/package/tests;
- Shopify `AGENTS.md`, architecture, roadmap, tests;
- `.harness-core` only to understand installed provenance/compatibility, not as current consumer authority.
````

## File: docs/references/README.md
````markdown
# References

Everything under `.references/` is local, gitignored, and advisory.

Tracked reference documents in this directory record why each reference exists and which exact upstream revisions influenced architecture.

Never let a reference repository silently override accepted Wizloft decisions.
````

## File: docs/PROJECT-BRIEF.md
````markdown
# Project Brief — Wizloft Harness

## Purpose

Wizloft Harness is a reusable engineering substrate for Wizloft projects. It helps humans and coding agents reliably discover repository authority, assemble bounded context, retain learned memory, select validation, and record evidence without moving project truth into a hidden control-plane database.

## First users

1. **Wizloft Harness itself** — self-hosting proves the contracts are usable.
2. **Wizloft CLI** — brownfield, multi-module, CommonJS-to-TypeScript rewrite; validates onboarding, authority hierarchy, validation routing, external CLI integration, and behavior-preserving migration.
3. **Meldmark** — domain-rich product with extensive decisions/design/specs; validates domain plugins, long-lived memory, product authority, and complex context routing.

## Product position

Wizloft Harness is not a replacement for Codex, Claude Code, DeepSeek Harness, or another agent runtime. It provides an agent-agnostic repository/engineering layer that those runtimes can consume.

## v0 goal

Reach **Minimum Useful Harness (MUH)**: enough reliable capability to use Harness while rebuilding Wizloft CLI. v0 is not platform completeness.

## Long-term direction

A small stable kernel with a composable ecosystem of capability providers, policies, stack plugins, domain plugins, project profiles, skills, and agent/runtime adapters. DeepSeek Harness should be integrable later in either direction without forcing Wizloft to adopt its runtime today.
````

## File: docs/README.md
````markdown
# Documentation Map

- `PROJECT-BRIEF.md` — purpose, users, v0 goal.
- `architecture/` — accepted architecture semantics.
- `decisions/` — durable accepted choices.
- `milestones/MUH.md` — first implementation stop condition.
- `milestones/SELF-HOST.md` — self-host gate.
- `plans/active/0001-build-muh.md` — implementation sequence.
- `consumers/WIZLOFT-CLI.md` — first external dogfood/rewrite contract.
- `consumers/MELDMARK.md` — later domain-rich consumer.
- `references/` — reference map and pinned baselines.
````

## File: examples/README.md
````markdown
# Examples

Keep examples small. Do not use examples as a substitute for real dogfood consumers.
The first real external consumer is Wizloft CLI; Meldmark follows after Harness hardening.
````

## File: scripts/link-consumer.sh
````bash
#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <name> <repository-path>" >&2
  exit 2
fi

NAME="$1"
TARGET="$(cd "$2" && pwd)"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST_DIR="$ROOT/.references/consumers"
DEST="$DEST_DIR/$NAME"

if [[ ! -d "$TARGET/.git" ]]; then
  echo "Target is not a Git repository: $TARGET" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
rm -f "$DEST"
ln -s "$TARGET" "$DEST"

echo "Linked read-only reference: $DEST -> $TARGET"
echo "Do not edit the consumer through this symlink during Harness implementation."
````

## File: scripts/record-reference-baselines.sh
````bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="$ROOT/.references"
OUT="$ROOT/docs/references/UPSTREAM-BASELINES.md"

sha() {
  git -C "$1" rev-parse HEAD
}

for d in deepseek-harness repository-harness-current repository-harness-v1; do
  if [[ ! -d "$REF/$d/.git" ]]; then
    echo "Missing $REF/$d. Run scripts/setup-references.sh first." >&2
    exit 1
  fi
done

cat > "$OUT" <<EOT
# Upstream Reference Baselines

Recorded: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

\`\`\`text
deepseek-harness:              $(sha "$REF/deepseek-harness")
repository-harness-current:    $(sha "$REF/repository-harness-current")
repository-harness-v1:         $(sha "$REF/repository-harness-v1") (tag: harness-cli-v0.1.22)
\`\`\`

These repositories are architecture references, not Wizloft authority.
EOT

echo "Updated $OUT"
````

## File: scripts/setup-references.sh
````bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="$ROOT/.references"
mkdir -p "$REF"

clone_if_missing() {
  local name="$1"
  local url="$2"
  local ref="${3:-}"
  local dir="$REF/$name"
  if [[ -d "$dir/.git" ]]; then
    echo "[exists] $name"
    return
  fi
  if [[ -n "$ref" ]]; then
    git clone --branch "$ref" --single-branch "$url" "$dir"
  else
    git clone "$url" "$dir"
  fi
}

clone_if_missing "deepseek-harness" "https://github.com/deepseek-ai/deepseek-harness.git" "master"
clone_if_missing "repository-harness-current" "https://github.com/hoangnb24/repository-harness.git" "main"
clone_if_missing "repository-harness-v1" "https://github.com/hoangnb24/repository-harness.git" "harness-cli-v0.1.22"

mkdir -p "$REF/consumers"
echo "References ready under $REF"
echo "Next: ./scripts/record-reference-baselines.sh"
````

## File: .gitignore
````
.references
.DS_Store
node_modules/
dist/
coverage/
*.tsbuildinfo
````

## File: AGENTS.md
````markdown
# Agent Instructions — Wizloft Harness

## Mission

Build a generic, agent-agnostic engineering harness for multiple Wizloft projects.
Meldmark is a major future consumer, but Harness must not become Meldmark-shaped.
The existing Wizloft CLI is the first external brownfield consumer and the first rebuild/dogfood project.

## Read order

For architecture or implementation work, read the smallest relevant set in this order:

1. accepted decisions in `docs/decisions/`;
2. `docs/architecture/`;
3. current active plan under `docs/plans/active/`;
4. relevant milestone/consumer documents;
5. code and tests;
6. upstream/local references only when needed.

References are advisory. Wizloft repository decisions are authority.

## Invariants

- Repository authority outranks memory.
- Events record what happened; memory records what was learned; repository artifacts record what is accepted as true.
- The kernel contains composition mechanics and invariants, not project knowledge.
- Everything project-specific belongs in plugins/profiles/project configuration.
- Harness is not an LLM runtime, coding agent, shell runtime, or sandbox in v0.
- Do not introduce a task/story database as project authority.
- Do not introduce SQLite/vector DB merely because memory exists; v0 memory is file-backed and provider-driven.
- Plugin composition must be deterministic and diagnosable.
- Plugins receive public APIs, not kernel private state.
- `wizloft-cli` owns the `wizloft` and shortcut executable UX. Harness owns reusable command semantics/adapters, not the global `wizharness` binary.

## Upstream references

Use `.references/deepseek-harness` to study plugin/capability/event/lifecycle seams without copying its full agent-runtime scope.
Use `.references/repository-harness-current` for repository authority/workflow patterns.
Use `.references/repository-harness-v1` as archaeology only.

Do not copy upstream code unless there is a deliberate decision, attribution/license review, and a simpler local implementation is not preferable.

## Work shape

For bounded work, use an ephemeral plan in the current Codex session.
For work spanning slices/sessions, maintain the active plan.
Do not create story packets, matrices, or parallel planning artifacts without independent long-term value.

## Decision gate

If a material public contract or architecture decision is genuinely unspecified, stop before encoding an arbitrary choice and surface the smallest decision needed.
Implementation details that fit accepted architecture should be decided in code/tests/active plan without creating unnecessary ADRs.

## Completion

Claim a slice complete only with executable/observable evidence. Keep docs synchronized with implemented contracts.
````

## File: CODEX-SLICE-PROMPTS.md
````markdown
# Codex Slice Prompts

Use these after the initial architecture proposal is accepted. Run one slice at a time.

## Slice 0

Implement Slice 0 from `docs/plans/active/0001-build-muh.md` only. Keep dependencies minimal. Establish root install/typecheck/test/build/verify. Do not implement capability behavior yet. Update the active plan and report proof.

## Slice 1

Implement the deterministic kernel/plugin host slice only. Prioritize capability dependency resolution, cycle/missing dependency diagnostics, lifecycle/disposer correctness, and tests. Do not add project knowledge or dynamic plugin loading.

## Slice 2

Implement typed config/profile composition plus event bus/file event persistence. Preserve deterministic ordering. Do not add workflow orchestration.

## Slice 3

Implement Context and Authority contracts/providers sufficient for repository/file-based examples. Provenance must be explicit. Authority ambiguity/conflict must not be silently resolved by memory or defaults.

## Slice 4

Implement Validation and Evidence. Selection and normalized result ordering must be deterministic. No task-state database.

## Slice 5

Implement first-class Memory with file/JSONL persistence, scope, provenance, lifecycle, keyword/metadata recall, and conflict handling with authority. No embeddings/vector DB/LLM extraction.

## Slice 6

Implement SDK + command API + CLI adapter contract. Do not expose a global executable binary from this repository. The adapter must support both human-readable and structured/JSON-friendly results so `wizloft-cli`, agents, and CI can consume the same command semantics.

## MUH gate

Stop feature implementation and run the MUH acceptance suite. Do not continue to speculative features.
````

## File: CODEX-START.md
````markdown
# First Codex Request

We are starting Wizloft Harness. Do not write code immediately.

Read, in order:

1. `AGENTS.md`
2. `docs/PROJECT-BRIEF.md`
3. `docs/architecture/ARCHITECTURE.md`
4. `docs/architecture/PLUGIN-MODEL.md`
5. `docs/architecture/AUTHORITY-CONTEXT-EVIDENCE.md`
6. `docs/architecture/MEMORY-MODEL.md`
7. all accepted decisions under `docs/decisions/`
8. `docs/milestones/MUH.md`
9. `docs/milestones/SELF-HOST.md`
10. `docs/plans/active/0001-build-muh.md`
11. `docs/references/READING-MAP.md`
12. `docs/consumers/WIZLOFT-CLI.md`
13. `docs/consumers/MELDMARK.md`

If `.references/` is missing, run `scripts/setup-references.sh` and `scripts/record-reference-baselines.sh`.
If `.references/consumers/wizloft-cli` exists, inspect only enough of it to understand the current consumer contracts; treat it as read-only during Harness implementation.

Before implementing, report:

- the v0 kernel boundary;
- first-party capability packages and why they are not kernel internals;
- proposed plugin/capability type contracts;
- the three durability planes;
- the CLI ownership boundary between `wizloft-harness` and `wizloft-cli`;
- the proposed pnpm/TypeScript package structure for Slices 0–1;
- explicit v0 non-goals;
- the exact MUH stop condition.

Use upstream repositories as architecture references, not authority. Inspect the smallest relevant upstream surface for the current slice.

After the proposal, wait for architecture review before implementing Slice 0. Do not implement the entire plan in one change.
````

## File: README.md
````markdown
# Wizloft Harness — Starter Repository

Wizloft Harness is a generic, agent-agnostic engineering harness for Wizloft projects.
It is not a coding agent runtime. It makes repositories easier for humans and agents to understand, govern, validate, remember, and evolve.

## Core principles

```text
Events     = what happened
Memory     = what we learned
Repository = what we have decided is true
```

- The repository is the source of truth.
- Memory is first-class but never outranks repository authority.
- The kernel is small; project-specific behavior composes through plugins.
- Harness is agent-agnostic. Codex, Claude Code, DeepSeek Harness, and future runtimes are integrations/adapters, not kernel assumptions.
- Wizloft Harness owns command semantics; Wizloft CLI owns command names and executable UX.
- DeepSeek Harness is an architecture reference and future interoperability target, not a v0 dependency.

## Development strategy

```text
1. Build Minimum Useful Harness (MUH)
2. Use Harness on itself
3. Use Harness to rebuild wizloft-cli in TypeScript
4. Harden Harness from real friction
5. Use the hardened Harness to implement Meldmark
```

Start with [`START-HERE.md`](START-HERE.md), then [`AGENTS.md`](AGENTS.md).

## Development

The Slice 0 workspace requires Node.js 22.13 or newer and pnpm 11.10 or newer.

```bash
npm install --global pnpm@11.10.0 # skip when a compatible pnpm is already installed
pnpm install --frozen-lockfile
pnpm verify
```

`pnpm verify` is the CI-ready root contract for formatting, linting, type checking, tests, and builds.
````

## File: docs/references/UPSTREAM-BASELINES.md
````markdown
# Upstream Reference Baselines

Recorded: 2026-08-16T07:30:48Z

```text
deepseek-harness:              47f943859bef60e4160492346772ded9b24f765a
repository-harness-current:    e765792b635b4d5e3e5fc0578f82f9ca5dea2681
repository-harness-v1:         a1fed8691eeda77aa2d4634833963adb8b07454a (tag: harness-cli-v0.1.22)
```

These repositories are architecture references, not Wizloft authority.
````

## File: START-HERE.md
````markdown
# Start Here

This file is the human bootstrap guide for starting Wizloft Harness with Codex.

## 1. Recommended workspace

Keep Wizloft projects as sibling repositories:

```text
/Volumes/anh.nguyen/Projects/AnhN/
├── wizloft-harness/
├── wizloft-cli/
├── meldmark/
└── ... future projects
```

Do not nest Meldmark or Wizloft CLI inside the Harness repository.

## 2. Preserve the current Wizloft CLI before rewriting it

The current JavaScript/CommonJS implementation is a behavior and safety reference, not disposable noise.
Before changing it:

```bash
cd /Volumes/anh.nguyen/Projects/AnhN/wizloft-cli
git status
git add -A
git commit -m "chore: checkpoint pre-TypeScript Wizloft CLI"   # only if needed
git tag pre-typescript-rewrite
```

If you use a remote repository, push the branch/tag using your normal workflow.
Do not begin the TypeScript rewrite yet.

## 3. Install this starter as the Harness repository

Unzip/copy this starter to:

```text
/Volumes/anh.nguyen/Projects/AnhN/wizloft-harness
```

Then:

```bash
cd /Volumes/anh.nguyen/Projects/AnhN/wizloft-harness
git init
git add .
git commit -m "chore: bootstrap Wizloft Harness architecture"
```

## 4. Clone upstream architecture references

Run:

```bash
./scripts/setup-references.sh
```

This creates gitignored local references:

```text
.references/
├── deepseek-harness/
├── repository-harness-current/
└── repository-harness-v1/
```

DeepSeek Harness is used for plugin/capability/event/lifecycle design study.
Current repository-harness is used for repository-as-authority and low-process workflow study.
Legacy `harness-cli-v0.1.22` is archaeology for useful evidence/control-plane ideas that should not become hidden authority again.

After cloning, record exact commits:

```bash
./scripts/record-reference-baselines.sh
```

Commit the updated `docs/references/UPSTREAM-BASELINES.md`.

## 5. Link real consumer repositories as read-only references

Make the existing CLI easy for Codex to inspect without copying it into Harness:

```bash
./scripts/link-consumer.sh wizloft-cli /Volumes/anh.nguyen/Projects/AnhN/wizloft-cli
```

Optionally link Meldmark now for later inspection:

```bash
./scripts/link-consumer.sh meldmark /Volumes/anh.nguyen/Projects/AnhN/meldmark
```

The links live under `.references/consumers/` and are gitignored. Treat them as read-only while implementing Harness unless a later phase explicitly switches work to that consumer repository.

## 6. Open Codex in the Harness repository

```bash
cd /Volumes/anh.nguyen/Projects/AnhN/wizloft-harness
codex
```

Give Codex the contents of [`CODEX-START.md`](CODEX-START.md).

Important: the first Codex turn should analyze and propose package boundaries. Do not let it implement all slices at once.

## 7. Review the first proposal before coding

Codex should report:

- kernel boundary;
- first-party capability boundaries;
- plugin/capability contract proposal;
- package/workspace structure;
- explicit v0 non-goals;
- how current Wizloft CLI and Meldmark will consume Harness later.

Review that proposal. The highest-leverage mistakes are package boundaries and plugin contracts, not individual functions.

## 8. Implement only until MUH

Follow `docs/plans/active/0001-build-muh.md` slice by slice.
The stop condition is the Minimum Useful Harness described in `docs/milestones/MUH.md`.

When MUH passes, stop feature work even if many attractive ideas remain.

## 9. Self-host gate

Run Harness against its own repository and satisfy `docs/milestones/SELF-HOST.md`.
Fix only issues that prevent reliable self-hosting or the next consumer.

## 10. Rebuild Wizloft CLI with Harness

Only after MUH + self-host pass:

1. switch Codex to the `wizloft-cli` repository;
2. keep `pre-typescript-rewrite` as the behavior oracle;
3. use Wizloft Harness context/authority/memory/validation while rebuilding;
4. rewrite from a clean TypeScript architecture rather than mechanically converting `.js` to `.ts`;
5. preserve accepted behavior and Shopify safety contracts;
6. add `wizloft harness ...` and `wizharness ...` only after the Harness command adapter is ready.

See `docs/consumers/WIZLOFT-CLI.md`.

## 11. Harden Harness from CLI friction

Return to `wizloft-harness` only for concrete friction discovered during the CLI rebuild:

- poor authority resolution;
- noisy/stale memory;
- awkward plugin contracts;
- incorrect context ranking;
- over-broad validation;
- bad diagnostics;
- difficult brownfield onboarding.

Do not add speculative platform features.

## 12. Begin Meldmark

After the CLI rewrite is complete and Harness has been hardened, onboard Meldmark as the domain-rich consumer described in `docs/consumers/MELDMARK.md`.
````
