import http from 'node:http';
import { httpServerHandler } from 'cloudflare:node';

// Bridge the existing Node HTTP application into the Cloudflare Workers runtime.
// server.js remains the application source of truth while Cloudflare owns the edge.
let orbitServer;
const originalCreateServer = http.createServer;
http.createServer = function (...args) {
  orbitServer = originalCreateServer(...args);
  return orbitServer;
};

await import('./server.js');

if (!orbitServer) {
  throw new Error('Orbit server.js did not create an HTTP server.');
}

export default httpServerHandler(orbitServer);
