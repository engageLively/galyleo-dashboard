/**
 * Browser-local implementation of DashboardIO.
 *
 * Uses a hidden <a download> for saves and a hidden <input type="file"> for
 * loads. No server dependency — works in any environment where the app can
 * run without Jupyter. This is the default backend when Jupyter is not detected.
 *
 * listDashboards() returns [] because there is no directory to enumerate.
 * rename() updates the internal path only (the next save will use the new name).
 */

import type { DashboardIO, DashboardFileEntry } from './ioInterface';
import type { GalyleoDashboard } from '../../types/dashboard';

export class LocalIO implements DashboardIO {
  private _currentPath: string | null = null;

  currentPath(): string | null {
    return this._currentPath;
  }

  listDashboards(): Promise<DashboardFileEntry[]> {
    return Promise.resolve([]);
  }

  load(_path?: string): Promise<GalyleoDashboard> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.gd.json,.json';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return reject(new Error('No file selected.'));
        this._currentPath = file.name;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            resolve(JSON.parse(reader.result as string));
          } catch {
            reject(new Error('File is not valid JSON.'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsText(file);
      };
      input.click();
    });
  }

  async save(spec: GalyleoDashboard): Promise<void> {
    if (!this._currentPath) throw new Error('No file open — use Save As first.');
    this._download(spec, this._currentPath);
  }

  async saveAs(spec: GalyleoDashboard, path: string): Promise<void> {
    const filename = path.endsWith('.gd.json') ? path : `${path}.gd.json`;
    this._currentPath = filename;
    this._download(spec, filename);
  }

  async rename(newPath: string): Promise<void> {
    this._currentPath = newPath;
  }

  private _download(spec: GalyleoDashboard, filename: string): void {
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
