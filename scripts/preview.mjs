import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(import.meta.dirname, '../dist');
const mime = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const requestedPort = process.argv.find((arg) => arg.startsWith('--port='))?.split('=')[1];
const port = requestedPort ? Number(requestedPort) : 4173;
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Choose a valid port with --port=4173.');

export function makePreview() {
  return createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
      if (path.startsWith('/preview/')) path = path.slice('/preview'.length);
      if (path.endsWith('/')) path += 'index.html';
      const file = resolve(root, `.${path}`);
      if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('File not found. Run npm run build first.');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const server = makePreview();
  server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${server.address().port}/preview/`));
}
