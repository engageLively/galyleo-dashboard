/**
 * Loads the dashboard list from configured repos.
 *
 * Reads galyleo.config.json from the app's base URL, then fetches
 * index.json from each repo listed in dashboardRepos.  Also accepts
 * IO-layer entries (from DevIO.listDashboards) passed in directly.
 *
 * Priority order for the repo list:
 *   1. ?dashboardRepos=url1,url2  (session override)
 *   2. VITE_DASHBOARD_REPOS build-time env var
 *   3. galyleo.config.json at runtime
 *   4. Empty list (IO-only entries still shown)
 */

import type { DashboardFileEntry } from './ioInterface';

export interface LoadableEntry {
  label: string;
  source: string;
  /** Absolute URL to fetch spec JSON from (for repo entries) */
  fetchUrl?: string;
  /** Filename to pass to io.load() (for IO-layer entries) */
  ioPath?: string;
}

interface RepoIndexEntry {
  name: string;
  path: string;
  label?: string;
}

async function fetchRepoIndex(repoUrl: string): Promise<LoadableEntry[]> {
  const indexUrl = repoUrl.endsWith('/') ? `${repoUrl}index.json` : `${repoUrl}/index.json`;
  try {
    const res = await fetch(indexUrl);
    if (!res.ok) return [];
    const entries: RepoIndexEntry[] = await res.json();
    return entries.map(e => ({
      label: e.label ?? e.name,
      source: repoUrl,
      fetchUrl: repoUrl.endsWith('/') ? `${repoUrl}${e.path}` : `${repoUrl}/${e.path}`,
    }));
  } catch {
    return [];
  }
}

async function getRepoUrls(): Promise<string[]> {
  // 1. URL param override
  const params = new URLSearchParams(window.location.search);
  const paramRepos = params.get('dashboardRepos');
  if (paramRepos) return paramRepos.split(',').map(s => s.trim()).filter(Boolean);

  // 2. Build-time env var
  const envRepos = import.meta.env.VITE_DASHBOARD_REPOS as string | undefined;
  if (envRepos) return envRepos.split(',').map(s => s.trim()).filter(Boolean);

  // 3. Runtime config file
  try {
    const base = import.meta.env.BASE_URL ?? '/';
    const configUrl = base.endsWith('/') ? `${base}galyleo.config.json` : `${base}/galyleo.config.json`;
    const res = await fetch(configUrl);
    if (res.ok) {
      const cfg: { dashboardRepos?: string[] } = await res.json();
      if (Array.isArray(cfg.dashboardRepos)) return cfg.dashboardRepos;
    }
  } catch {
    // config not present — fine
  }

  return [];
}

/**
 * Returns all loadable entries from configured repos plus any IO-layer entries.
 *
 * @param ioEntries  Result of io.listDashboards() — shown under "Local" source.
 */
export async function listAllDashboards(ioEntries: DashboardFileEntry[]): Promise<LoadableEntry[]> {
  const [repoUrls] = await Promise.all([getRepoUrls()]);

  const local: LoadableEntry[] = ioEntries.map(e => ({
    label: e.name,
    source: 'Local',
    ioPath: e.path,
  }));

  const repoResults = await Promise.all(repoUrls.map(fetchRepoIndex));
  const remote = repoResults.flat();

  return [...local, ...remote];
}
