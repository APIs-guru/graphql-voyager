import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { spawnOutput } from './utils.ts';

// Clean up existing worker-dist directory
const outputDir = 'worker-dist';
fs.rmSync(outputDir, { recursive: true, force: true });

console.error('Building worker with Docker...');
const dockerOutput = spawnOutput('docker', [
  'compose',
  'up',
  '--abort-on-container-exit',
  '--build',
  'build-worker',
]);

// Process the Docker output
const hash = crypto.createHash('sha256').update(dockerOutput).digest('hex');

assert(dockerOutput.includes('`') === false);
const processedOutput = `
export const VizWorkerSource = String.raw \`${dockerOutput}\`;
export const VizWorkerHash = \`${hash}\`;
`;

fs.mkdirSync(outputDir, { recursive: true });
const outputFile = path.join(outputDir, 'voyager.worker.js');
fs.writeFileSync(outputFile, processedOutput.trim());

console.error(`Worker built successfully: ${outputFile}`);
