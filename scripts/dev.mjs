import './build.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import worker from '../worker/index.mjs';
const root = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const assets = { async fetch(request) {
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (path !== root && !path.startsWith(root + sep)) return new Response('Forbidden', { status: 403 });
  try { return new Response(await readFile(path), { headers: { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' } }); }
  catch { return new Response('Not found', { status: 404 }); }
}};
const server = createServer(async (req, res) => {
  try {
    const response = await worker.fetch(new Request(new URL(req.url, 'http://localhost'), { method: req.method }), { DEMO_MODE: 'true', ASSETS: assets });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(500); res.end('Request failed'); }
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('Estate demo: http://127.0.0.1:' + server.address().port));
