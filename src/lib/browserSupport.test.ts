import { describe, expect, it } from 'vitest';
import { browserSupportsModernWebCrypto } from './browserSupport';

describe('browserSupportsModernWebCrypto', () => {
  it('is true in Vitest (jsdom / Node with Web Crypto polyfill)', () => {
    expect(browserSupportsModernWebCrypto()).toBe(true);
  });
});
