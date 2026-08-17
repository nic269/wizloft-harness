import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { inspectReleaseContract } from './release-contract.mjs';

const repositoryRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const inspection = await inspectReleaseContract(repositoryRoot);

if (inspection.errors.length > 0) {
  console.error(`Release contract violations:\n- ${inspection.errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(
    `Release contract valid: ${inspection.publicPackages.length} public packages at ${inspection.releaseVersion}`,
  );
}
