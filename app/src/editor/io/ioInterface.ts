/**
 * Abstract interface for dashboard file I/O.
 *
 * This is the only API the editor uses to load and save dashboards.
 * All environment-specific details (Jupyter Contents API, Google Drive,
 * local browser file dialogs, etc.) live in concrete implementations of
 * this interface. No other editor file imports anything host-specific.
 */

import type { GalyleoDashboard } from '../../types/dashboard';

export interface DashboardFileEntry {
  /** Display name (filename without path prefix). */
  name: string;
  /** Full path used by load/saveAs/rename. */
  path: string;
}

export interface DashboardIO {
  /**
   * List available dashboard files (.gd.json) that can be opened.
   * Returns an empty array if the backend does not support listing.
   */
  listDashboards(): Promise<DashboardFileEntry[]>;

  /**
   * Load a dashboard spec from the given path.
   * If path is omitted, the backend may open a file-picker dialog.
   * Throws if the file cannot be read or is not valid JSON.
   */
  load(path?: string): Promise<GalyleoDashboard>;

  /**
   * Save the spec to the currently open path.
   * Throws with a user-friendly message if no path has been set yet
   * (caller should invoke saveAs instead).
   */
  save(spec: GalyleoDashboard): Promise<void>;

  /**
   * Save the spec to a new path and update the current path.
   * Subsequent calls to save() will use this new path.
   */
  saveAs(spec: GalyleoDashboard, path: string): Promise<void>;

  /**
   * Rename the current file to a new path.
   * Throws if no file is currently open.
   */
  rename(newPath: string): Promise<void>;

  /** Returns the path of the currently open file, or null if none. */
  currentPath(): string | null;
}
