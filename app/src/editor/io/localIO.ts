import type { DashboardIO, DashboardFileEntry } from './ioInterface';
import type { GalyleoDashboard } from '../../types/dashboard';

export class LocalIO implements DashboardIO {
  private _currentPath: string | null = null;

  currentPath(): string | null { return this._currentPath; }
  listDashboards(): Promise<DashboardFileEntry[]> { return Promise.resolve([]); }

  load(_path?: string): Promise<GalyleoDashboard> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.gd.json';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) { reject(new Error('Cancelled')); return; }
        this._currentPath = file.name;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            resolve(JSON.parse(reader.result as string) as GalyleoDashboard);
          } catch {
            reject(new Error(`${file.name} is not valid JSON`));
          }
        };
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsText(file);
      };
      // Reject if the picker is dismissed without selecting a file
      input.oncancel = () => reject(new Error('Cancelled'));
      input.click();
    });
  }

  async save(spec: GalyleoDashboard): Promise<void> {
    const filename = this._currentPath ?? 'dashboard.gd.json';
    this._download(spec, filename);
  }

  async saveAs(spec: GalyleoDashboard, path: string): Promise<void> {
    this._currentPath = path.endsWith('.gd.json') ? path : `${path}.gd.json`;
    this._download(spec, this._currentPath);
  }

  async rename(newPath: string): Promise<void> {
    this._currentPath = newPath;
  }

  private _download(spec: GalyleoDashboard, filename: string): void {
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
