/**
 * Local-dev implementation of DashboardIO.
 *
 * Talks to the /api/dashboards/ endpoints served by the Vite dev-server
 * plugin in vite.config.ts. Files are read from and written to the
 * directory set by the DASHBOARD_DIR env var (default: the directory where
 * `npm run dev` was launched).
 *
 * This implementation is only used in development (auto-detected by
 * createIO when running on localhost with import.meta.env.DEV === true).
 * It is never bundled into the production build because it is only imported
 * via a dynamic import guarded by import.meta.env.DEV.
 */

import type { DashboardIO, DashboardFileEntry } from './ioInterface';
import type { GalyleoDashboard } from '../../types/dashboard';

const BASE = '/api/dashboards';

export class DevIO implements DashboardIO {
  private _currentPath: string | null = null;

  currentPath(): string | null {
    return this._currentPath;
  }

  async listDashboards(): Promise<DashboardFileEntry[]> {
    const res = await fetch(BASE);
    if (!res.ok) throw new Error(`DevIO: cannot list dashboards (${res.status})`);
    return res.json() as Promise<DashboardFileEntry[]>;
  }

  async load(path?: string): Promise<GalyleoDashboard> {
    if (!path) throw new Error('DevIO.load requires a path — use listDashboards() first.');
    const res = await fetch(`${BASE}/${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`DevIO: cannot load ${path} (${res.status})`);
    const spec: GalyleoDashboard = await res.json();
    this._currentPath = path;
    return spec;
  }

  async save(spec: GalyleoDashboard): Promise<void> {
    if (!this._currentPath) throw new Error('No file open — use Save As first.');
    await this._put(this._currentPath, spec);
  }

  async saveAs(spec: GalyleoDashboard, path: string): Promise<void> {
    const filename = path.endsWith('.gd.json') ? path : `${path}.gd.json`;
    await this._put(filename, spec);
    this._currentPath = filename;
  }

  async rename(newPath: string): Promise<void> {
    if (!this._currentPath) throw new Error('No file open — cannot rename.');
    const res = await fetch(`${BASE}/${encodeURIComponent(this._currentPath)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newPath }),
    });
    if (!res.ok) throw new Error(`DevIO: rename failed (${res.status})`);
    this._currentPath = newPath;
  }

  private async _put(path: string, spec: GalyleoDashboard): Promise<void> {
    const res = await fetch(`${BASE}/${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spec, null, 2),
    });
    if (!res.ok) throw new Error(`DevIO: save failed (${res.status})`);
  }
}
