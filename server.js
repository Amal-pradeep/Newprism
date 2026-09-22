const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT) || 8080;
const indexPath = path.join(__dirname, 'index.html');

let html;
try {
  html = fs.readFileSync(indexPath, 'utf8');
} catch (error) {
  console.error('Failed to read index.html:', error);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const requestPath = (req.url || '/').split('?')[0];

  if (req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    });
    return res.end(html);
  }

  res.writeHead(405, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Allow': 'GET'
  });
  res.end('Method Not Allowed');
});

server.listen(port, '0.0.0.0', () => {
  console.log('Prism Orbit listening on ' + port);
});
