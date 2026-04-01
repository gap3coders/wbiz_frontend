import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const indexFile = path.join(distDir, 'index.html');
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

const sendFile = (res, filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(res);
};

createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', 'http://localhost');
    const rawPath = decodeURIComponent(requestUrl.pathname);
    const hasFileExtension = path.extname(rawPath) !== '';

    if (rawPath !== '/' && !rawPath.endsWith('/') && !hasFileExtension && !rawPath.startsWith('/api/')) {
      const redirectTo = `${rawPath}/${requestUrl.search}`;
      res.writeHead(308, { Location: redirectTo });
      res.end();
      return;
    }

    const relativePath = rawPath === '/' ? 'index.html' : rawPath.slice(1);
    const safePath = path.normalize(path.join(distDir, relativePath));

    if (!safePath.startsWith(distDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    try {
      const fileStat = await stat(safePath);
      if (fileStat.isFile()) {
        sendFile(res, safePath);
        return;
      }
    } catch {}

    sendFile(res, indexFile);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
}).listen(port);
