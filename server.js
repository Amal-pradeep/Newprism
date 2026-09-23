const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT) || 8080;
const root = __dirname;

function sendFile(res, filePath, contentType) {
  try {
    const body = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });
    res.end(body);
  } catch (error) {
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});
    res.end('Not Found');
  }
}

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (req.method !== 'GET') {
    res.writeHead(405, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Allow': 'GET'
    });
    return res.end('Method Not Allowed');
  }

  if (requestPath === '/manifest.webmanifest') {
    return sendFile(res, path.join(root, 'manifest.webmanifest'), 'application/manifest+json; charset=utf-8');
  }
  if (requestPath === '/sw.js') {
    return sendFile(res, path.join(root, 'sw.js'), 'application/javascript; charset=utf-8');
  }
  if (requestPath === '/icon.svg') {
    return sendFile(res, path.join(root, 'icon.svg'), 'image/svg+xml; charset=utf-8');
  }
  if (requestPath === '/favicon.ico') {
    return sendFile(res, path.join(root, 'favicon.ico'), 'image/x-icon');
  }

  return sendFile(res, path.join(root, 'index.html'), 'text/html; charset=utf-8');
});

server.listen(port, '0.0.0.0', () => {
  console.log('Prism Orbit listening on ' + port);
});
