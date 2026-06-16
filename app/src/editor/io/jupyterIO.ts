/**
 * Jupyter Server implementation of DashboardIO.
 *
 * Uses the Jupyter Contents API (/api/contents) to list, read, and write
 * .gd.json files. This is the ONLY file in the editor that has any
 * dependency on Jupyter. All other editor code uses the DashboardIO interface.
 *
 * Assumes the app is served from the same origin as the Jupyter server,
 * so requests to /api/contents go to the correct host without extra config.
 */

import type { DashboardIO, DashboardFileEntry } from './ioInterface';
import type { GalyleoDashboard } from '../../types/dashboard';

const CONTENTS_API = '/api/contents';

export class JupyterIO implements DashboardIO {
  private _currentPath: string | null = null;

  currentPath(): string | null {
    return this._currentPath;
  }

  async listDashboards(): Promise<DashboardFileEntry[]> {
    const res = await fetch(`${CONTENTS_API}?type=file&format=json`);
    if (!res.ok) throw new Error(`Jupyter Contents API error: ${res.status}`);
    const data = await res.json();
    const items: Array<{ name: string; path: string; type: string }> =
      data.content ?? [];
    return items
      .filter(item => item.type === 'file' && item.name.endsWith('.gd.json'))
      .map(item => ({ name: item.name, path: item.path }));
  }

  async load(path?: string): Promise<GalyleoDashboard> {
    if (!path) throw new Error('JupyterIO.load requires a path — use listDashboards() first.');
    const res = await fetch(`${CONTENTS_API}/${encodeURIComponent(path)}?format=text`);
    if (!res.ok) throw new Error(`Cannot load ${path}: HTTP ${res.status}`);
    const data = await res.json();
    const spec: GalyleoDashboard = JSON.parse(data.content);
    this._currentPath = path;
    return spec;
  }

  async save(spec: GalyleoDashboard): Promise<void> {
    if (!this._currentPath) throw new Error('No file open — use Save As first.');
    await this._put(this._currentPath, spec);
  }

  async saveAs(spec: GalyleoDashboard, path: string): Promise<void> {
    await this._put(path, spec);
    this._currentPath = path;
  }

  async rename(newPath: string): Promise<void> {
    if (!this._currentPath) throw new Error('No file open — cannot rename.');
    const res = await fetch(`${CONTENTS_API}/${encodeURIComponent(this._currentPath)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newPath }),
    });
    if (!res.ok) throw new Error(`Rename failed: HTTP ${res.status}`);
    this._currentPath = newPath;
  }

  private async _put(path: string, spec: GalyleoDashboard): Promise<void> {
    const res = await fetch(`${CONTENTS_API}/${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'file',
        format: 'text',
        content: JSON.stringify(spec, null, 2),
      }),
    });
    if (!res.ok) throw new Error(`Save failed: HTTP ${res.status}`);
  }
}
