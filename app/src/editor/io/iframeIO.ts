/**
 * DashboardIO backend for when the editor is embedded in a JupyterLab iframe.
 *
 * Content flow:
 *   mount  → EditorShell sends galyleo:ready  → extension responds with galyleo:loadContent
 *   save() → sends galyleo:contentChanged      → extension writes file + sends galyleo:saveSuccess
 *
 * File listing and rename are delegated to JupyterLab; this backend only handles
 * the content-exchange protocol.
 */

import type { DashboardIO, DashboardFileEntry } from './ioInterface';
import type { GalyleoDashboard } from '../../types/dashboard';

export class IframeIO implements DashboardIO {
  private readonly _instanceId: string;
  /** JSON string of the last spec we sent via galyleo:contentChanged. */
  private _lastSavedJson: string | null = null;

  constructor(instanceId: string) {
    this._instanceId = instanceId;
  }

  /**
   * True when `content` is the echo of a spec we just saved.
   *
   * JupyterLab autosaves the document model and can notify all open editors
   * about updated content. Without this guard, such notifications would cause
   * the editor to reload its own freshly-saved spec, which — if combined with
   * auto-save — would create an infinite save → reload → save loop.
   */
  isOwnEcho(content: unknown): boolean {
    if (this._lastSavedJson === null) return false;
    try {
      return JSON.stringify(content) === this._lastSavedJson;
    } catch {
      return false;
    }
  }

  private _post(type: string, payload: Record<string, unknown> = {}): void {
    // Extension protocol: instanceId is at the root, payload is separate.
    window.parent.postMessage(
      { type, instanceId: this._instanceId, payload },
      '*',
    );
  }

  readonly hostManagedPath = true;
  currentPath(): string | null { return null; }

  async listDashboards(): Promise<DashboardFileEntry[]> {
    return new Promise((resolve) => {
      const TIMEOUT_MS = 5_000;
      const timer = setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve([]);
      }, TIMEOUT_MS);

      const handler = (evt: MessageEvent) => {
        const { type, instanceId, payload } = (evt.data ?? {}) as {
          type?: string; instanceId?: string; payload?: { dashboards?: DashboardFileEntry[] };
        };
        if (type === 'galyleo:dashboardList' && instanceId === this._instanceId) {
          clearTimeout(timer);
          window.removeEventListener('message', handler);
          resolve(payload?.dashboards ?? []);
        }
      };

      window.addEventListener('message', handler);
      this._post('galyleo:listDashboards');
    });
  }

  async load(path?: string): Promise<GalyleoDashboard> {
    if (path) {
      // Ask JupyterLab to open the file in a new editor tab
      this._post('galyleo:openFile', { path });
      // Return a never-resolving promise — JupyterLab will open a new panel
      return new Promise(() => { /* intentionally never resolves */ });
    }
    throw new Error('IframeIO: content is pushed by the JupyterLab extension via galyleo:loadContent');
  }

  async save(spec: GalyleoDashboard): Promise<void> {
    // Record before posting so that isOwnEcho() can suppress the echo reload
    // the JupyterLab document model may send back after autosave.
    this._lastSavedJson = JSON.stringify(spec);

    return new Promise<void>((resolve, reject) => {
      const TIMEOUT_MS = 15_000;

      const timer = setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Save timed out — no galyleo:saveSuccess received'));
      }, TIMEOUT_MS);

      const handler = (evt: MessageEvent) => {
        // Extension puts instanceId at root: { type, instanceId, payload }
        const { type, instanceId } = (evt.data ?? {}) as { type?: string; instanceId?: string };
        if (type === 'galyleo:saveSuccess' && instanceId === this._instanceId) {
          clearTimeout(timer);
          window.removeEventListener('message', handler);
          resolve();
        }
      };

      window.addEventListener('message', handler);
      this._post('galyleo:contentChanged', { content: spec });
    });
  }

  async saveAs(spec: GalyleoDashboard, _path: string): Promise<void> {
    return this.save(spec);
  }

  async rename(_newPath: string): Promise<void> {
    // Renaming is managed by JupyterLab's file browser, not the embedded editor
  }
}
