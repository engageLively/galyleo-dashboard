/**
 * Factory that selects the active DashboardIO backend.
 *
 * Selection order:
 * 1. ?ioBackend=dev      → DevIO  (explicit override — Vite dev server endpoints)
 * 2. ?ioBackend=jupyter  → JupyterIO (explicit override)
 * 3. ?ioBackend=local    → LocalIO  (explicit override — browser file picker)
 * 4. import.meta.env.DEV → DevIO  (auto: running under `npm run dev`)
 * 5. window.jupyter defined → JupyterIO (auto: Jupyter environment)
 * 6. default             → LocalIO
 */

import type { DashboardIO } from './ioInterface';
import { IframeIO } from './iframeIO';
import { JupyterIO } from './jupyterIO';
import { LocalIO } from './localIO';

export function createIO(): DashboardIO {
  const params = new URLSearchParams(window.location.search);
  const backend = params.get('ioBackend');

  if (backend === 'local') return new LocalIO();
  if (backend === 'jupyter') return new JupyterIO();
  if (backend === 'iframe') return new IframeIO(params.get('instanceId') ?? '');

  // Running inside a JupyterLab GalyleoPanel iframe
  if (params.has('instanceId')) return new IframeIO(params.get('instanceId')!);

  // DevIO is imported dynamically so it's never bundled into the production build
  if (backend === 'dev' || import.meta.env.DEV) {
    // Dynamic import with a synchronous-looking trick: we return a proxy that
    // resolves the real DevIO lazily.  For simplicity in the editor (which
    // awaits every IO call), we use a LazyIO wrapper.
    return new LazyIO(() => import('./devIO').then(m => new m.DevIO()));
  }

  if (typeof (window as unknown as Record<string, unknown>).jupyter !== 'undefined') {
    return new JupyterIO();
  }

  return new LocalIO();
}

/**
 * Thin wrapper that lazily instantiates a DashboardIO on the first call.
 * This lets createIO() return synchronously while still allowing the real
 * backend (DevIO) to be a dynamic import (tree-shaken from prod bundle).
 */
class LazyIO implements DashboardIO {
  private _factory: () => Promise<DashboardIO>;
  private _instance: Promise<DashboardIO>;

  constructor(factory: () => Promise<DashboardIO>) {
    this._factory = factory;
    this._instance = factory();
  }

  private async _io(): Promise<DashboardIO> {
    return this._instance;
  }

  currentPath(): string | null { return null; }

  async listDashboards() { return (await this._io()).listDashboards(); }
  async load(path?: string) { return (await this._io()).load(path); }
  async save(spec: Parameters<DashboardIO['save']>[0]) { return (await this._io()).save(spec); }
  async saveAs(spec: Parameters<DashboardIO['saveAs']>[0], path: string) { return (await this._io()).saveAs(spec, path); }
  async rename(newPath: string) { return (await this._io()).rename(newPath); }
}
