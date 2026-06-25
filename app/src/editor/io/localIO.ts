import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { LocalIODialog } from '../dialogs/LocalIODialog';
import type { DashboardIO, DashboardFileEntry } from './ioInterface';
import type { GalyleoDashboard } from '../../types/dashboard';

function mountDialog<T>(
  renderFn: (resolve: (v: T) => void, reject: (e: Error) => void, cleanup: () => void) => React.ReactElement,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    function cleanup() {
      root.unmount();
      document.body.removeChild(container);
    }

    root.render(renderFn(resolve, reject, cleanup));
  });
}

export class LocalIO implements DashboardIO {
  private _currentPath: string | null = null;

  currentPath(): string | null { return this._currentPath; }
  listDashboards(): Promise<DashboardFileEntry[]> { return Promise.resolve([]); }

  load(_path?: string): Promise<GalyleoDashboard> {
    return mountDialog<GalyleoDashboard>((resolve, reject, cleanup) =>
      createElement(LocalIODialog, {
        mode: 'load',
        onLoad: (spec) => { cleanup(); resolve(spec); },
        onCancel: () => { cleanup(); reject(new Error('Cancelled')); },
      })
    );
  }

  async save(spec: GalyleoDashboard): Promise<void> {
    return mountDialog<void>((_resolve, _reject, cleanup) =>
      createElement(LocalIODialog, {
        mode: 'save',
        json: JSON.stringify(spec, null, 2),
        onClose: () => { cleanup(); },
      })
    );
  }

  async saveAs(spec: GalyleoDashboard, path: string): Promise<void> {
    this._currentPath = path.endsWith('.gd.json') ? path : `${path}.gd.json`;
    return this.save(spec);
  }

  async rename(newPath: string): Promise<void> {
    this._currentPath = newPath;
  }
}
