/**
 * JanSetu Backend Server
 * Production-ready, zero-dependency Node.js HTTP server.
 * Handles API routes, static asset delivery from the frontend folder, and real-time civic lifecycle events.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Auto-load .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const routes = require('./src/routes');

const PORT = process.env.PORT || 4000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// MIME types dictionary for static file delivery
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * Utility to parse incoming JSON request body
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let rawBody = '';
    req.on('data', chunk => {
      rawBody += chunk.toString();
      if (rawBody.length > 10 * 1024 * 1024) {
        reject(new Error('Payload size exceeded (10MB limit)'));
      }
    });
    req.on('end', () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (err) {
        reject(new Error('Malformed JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Route parameter matching helper (e.g. /api/issues/:issueId/assign)
 */
function matchRoute(routePath, requestPath) {
  const routeParts = routePath.split('/');
  const requestParts = requestPath.split('/');

  if (routeParts.length !== requestParts.length) return null;

  const params = {};
  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) {
      const paramName = routeParts[i].slice(1);
      params[paramName] = requestParts[i];
    } else if (routeParts[i] !== requestParts[i]) {
      return null;
    }
  }
  return params;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Enhance res with express-like helper methods
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };

  res.json = function(data) {
    this.writeHead(this.statusCode || 200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-role, x-user-id, x-user-name'
    });
    return this.end(JSON.stringify(data));
  };

  // CORS Preflight Handling
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-role, x-user-id, x-user-name'
    });
    return res.end();
  }

  // 1. API Route Dispatching
  if (pathname.startsWith('/api/')) {
    try {
      req.query = Object.fromEntries(parsedUrl.searchParams);
      req.body = (method === 'POST' || method === 'PUT' || method === 'PATCH') 
        ? await parseJsonBody(req) 
        : {};

      for (const route of routes) {
        if (route.method === method) {
          const params = matchRoute(route.path, pathname);
          if (params) {
            req.params = params;

            // Run middleware if attached
            if (route.middleware) {
              return route.middleware(req, res, () => route.handler(req, res));
            }
            return route.handler(req, res);
          }
        }
      }

      return res.status(404).json({ success: false, error: `Endpoint ${method} ${pathname} not found.` });
    } catch (error) {
      console.error('[Server Error]', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // 2. Static File Serving from frontend directory
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  const filePath = path.join(FRONTEND_DIR, safePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA Fallback: serve frontend/index.html
        fs.readFile(path.join(FRONTEND_DIR, 'index.html'), (spaErr, spaContent) => {
          if (spaErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('Frontend index.html not found');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(spaContent);
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Internal Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(`🏛️  CivicSamadhan (e-Grievance Platform) Online`);
  console.log(`📍 Web Portal:    http://localhost:${PORT}`);
  console.log(`📡 REST API Root: http://localhost:${PORT}/api/issues`);
  console.log(`📁 Static Frontend: ${FRONTEND_DIR}`);
  console.log(`=============================================================\n`);
});
