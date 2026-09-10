/**
 * Serves the production build the way GitLab Pages will: under a subpath.
 *
 * Worth having as its own script because the root-served dev server cannot
 * catch the one class of bug that only appears in production — an absolute
 * asset or data URL that works at `/` and 404s at `/<project>/`. Run a real
 * build first:
 *
 *   npm run build:catalogue
 *   npm run build -w @streamseeker/web -- --base-href "/streamseeker/"
 *   npm run serve:dist
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'apps/web/dist/StreamSeeker/browser');
const base = process.env.BASE_PATH ?? '/streamseeker';
const port = Number(process.env.PORT ?? 4300);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');

  if (!url.pathname.startsWith(base)) {
    // Exactly what Pages does with a request outside the project prefix, and
    // the symptom an absolute URL produces.
    response.writeHead(404).end(`Not under ${base}/`);
    return;
  }

  const relative = url.pathname.slice(base.length) || '/';
  const candidate = join(dist, normalize(relative).replace(/^(\.\.[/\\])+/, ''));
  const file =
    existsSync(candidate) && statSync(candidate).isFile() ? candidate : join(dist, 'index.html');

  response.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    // Rebuilding and reloading has to show the rebuild. Hashed filenames make
    // caching safe in production and actively misleading here, where the whole
    // point is to look at the build you just made.
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`Serving ${dist}\n  http://localhost:${port}${base}/`);
});
