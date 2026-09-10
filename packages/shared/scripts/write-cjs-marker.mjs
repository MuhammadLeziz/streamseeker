/**
 * The package is ESM (`"type": "module"`), so Node reads every `.js` file
 * under it as ESM, the CommonJS build included. A nested package.json saying
 * otherwise scopes that override to `dist/cjs` alone.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const target = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/cjs/package.json');

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
