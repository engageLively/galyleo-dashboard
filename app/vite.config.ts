import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Vite dev-server plugin: exposes /api/dashboards/ endpoints backed by the
 * local filesystem so the editor can load and save .gd.json files in place.
 *
 * DASHBOARD_DIR env var sets the root directory (default: current working dir).
 * This middleware is ONLY active during `npm run dev`; production builds never
 * include it.
 *
 * Endpoints:
 *   GET  /api/dashboards          → [{name, path}] listing of .gd.json files
 *   GET  /api/dashboards/:name    → file contents as JSON
 *   PUT  /api/dashboards/:name    → write file contents (body: JSON spec)
 *   PATCH /api/dashboards/:name   → rename  (body: {path: newName})
 */
function localDashboardPlugin() {
  const dashboardDir = process.env.DASHBOARD_DIR
    ? path.resolve(process.env.DASHBOARD_DIR)
    : path.resolve(process.cwd(), 'public', 'dashboards');

  function safePath(name: string): string | null {
    const resolved = path.resolve(dashboardDir, name);
    if (!resolved.startsWith(dashboardDir + path.sep) && resolved !== dashboardDir) return null;
    return resolved;
  }

  return {
    name: 'local-dashboard-server',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use('/api/dashboards', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url ?? '/';
        const method = req.method ?? 'GET';
        const name = decodeURIComponent(url.replace(/^\//, ''));

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');

        // GET /api/dashboards  →  directory listing
        if (method === 'GET' && !name) {
          try {
            const files = fs.readdirSync(dashboardDir)
              .filter(f => f.endsWith('.gd.json'))
              .map(f => ({ name: f, path: f }));
            res.end(JSON.stringify(files));
          } catch {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Cannot read dashboard directory' }));
          }
          return;
        }

        // GET /api/dashboards/:name  →  file contents
        if (method === 'GET' && name) {
          const fp = safePath(name);
          if (!fp || !fs.existsSync(fp)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
          }
          res.end(fs.readFileSync(fp, 'utf8'));
          return;
        }

        // PUT /api/dashboards/:name  →  write file
        if (method === 'PUT' && name) {
          const fp = safePath(name);
          if (!fp) { res.statusCode = 403; res.end(JSON.stringify({ error: 'Forbidden' })); return; }
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              // Validate JSON before writing
              JSON.parse(body);
              fs.writeFileSync(fp, body, 'utf8');
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }

        // PATCH /api/dashboards/:name  →  rename
        if (method === 'PATCH' && name) {
          const fp = safePath(name);
          if (!fp) { res.statusCode = 403; res.end(JSON.stringify({ error: 'Forbidden' })); return; }
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const { path: newName } = JSON.parse(body) as { path: string };
              const newFp = safePath(newName);
              if (!newFp) { res.statusCode = 403; res.end(JSON.stringify({ error: 'Forbidden' })); return; }
              fs.renameSync(fp, newFp);
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Bad request' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localDashboardPlugin()],
  base: process.env.VITE_BASE_URL ?? '/',
  build: { sourcemap: true },
  server: {
    port: 3000,
    proxy: {
      '/services/galyleo': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/services\/galyleo/, ''),
      },
    },
  },
});
