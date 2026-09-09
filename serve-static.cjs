const http = require('http');
const fs = require('fs');
const path = require('path');

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const root = path.resolve(readArg('--root', process.cwd()));
const port = Number(readArg('--port', '4173'));
const host = readArg('--host', '127.0.0.1');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://${host}`).pathname);
  const requested = path.resolve(root, `.${pathname}`);
  const relative = path.relative(root, requested);
  if (relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) return null;

  if (fs.existsSync(requested) && fs.statSync(requested).isFile()) return requested;
  if (fs.existsSync(requested) && fs.statSync(requested).isDirectory()) {
    const indexFile = path.join(requested, 'index.html');
    if (fs.existsSync(indexFile)) return indexFile;
  }

  return path.join(root, 'index.html');
}

const server = http.createServer((request, response) => {
  let filePath;
  try {
    filePath = resolveRequestPath(request.url || '/');
  } catch {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }

  if (!filePath || !fs.existsSync(filePath)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  response.setHeader('Content-Type', mimeTypes[extension] || 'application/octet-stream');
  fs.createReadStream(filePath).on('error', () => {
    response.writeHead(500);
    response.end('Server error');
  }).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Preview server running at http://${host}:${port}/`);
});
