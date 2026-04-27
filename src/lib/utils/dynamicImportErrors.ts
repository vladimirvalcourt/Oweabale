/**
 * Detects load failures for lazy-loaded / code-split chunks (Vite, webpack).
 * Common after a new deploy or a long-idle tab when cached HTML references removed assets.
 */
export function isStaleDynamicImportError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as Error;
  const name = err.name ?? '';
  const msg = (err.message ?? '').toLowerCase();

  if (name === 'ChunkLoadError') return true;

  if (msg.includes('failed to fetch dynamically imported module')) return true;
  if (msg.includes('error loading dynamically imported module')) return true;
  if (msg.includes('importing a module script failed')) return true;
  if (msg.includes('failed to import module')) return true;

  return false;
}
