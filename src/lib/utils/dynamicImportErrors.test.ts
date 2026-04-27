import { describe, expect, it } from 'vitest';
import { isStaleDynamicImportError } from './dynamicImportErrors';

describe('isStaleDynamicImportError', () => {
  it('returns true for Vite / browser dynamic import fetch failures', () => {
    expect(
      isStaleDynamicImportError(
        new Error('Failed to fetch dynamically imported module: https://example.com/assets/AuthPage-abc.js'),
      ),
    ).toBe(true);
  });

  it('returns true for webpack ChunkLoadError', () => {
    const e = new Error('Loading chunk 7 failed');
    e.name = 'ChunkLoadError';
    expect(isStaleDynamicImportError(e)).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isStaleDynamicImportError(new Error('Network request failed'))).toBe(false);
    expect(isStaleDynamicImportError(null)).toBe(false);
  });
});
