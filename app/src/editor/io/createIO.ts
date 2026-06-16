/**
 * Factory that selects the active DashboardIO backend.
 *
 * Selection order:
 * 1. ?ioBackend=jupyter  → JupyterIO (explicit override)
 * 2. ?ioBackend=local    → LocalIO   (explicit override)
 * 3. window.jupyter defined → JupyterIO (auto-detect Jupyter environment)
 * 4. default             → LocalIO
 */

import type { DashboardIO } from './ioInterface';
import { JupyterIO } from './jupyterIO';
import { LocalIO } from './localIO';

export function createIO(): DashboardIO {
  const params = new URLSearchParams(window.location.search);
  const backend = params.get('ioBackend');

  if (backend === 'jupyter') return new JupyterIO();
  if (backend === 'local') return new LocalIO();

  // Auto-detect: Jupyter Lab / Notebook sets window.jupyter
  if (typeof (window as unknown as Record<string, unknown>).jupyter !== 'undefined') {
    return new JupyterIO();
  }

  return new LocalIO();
}
