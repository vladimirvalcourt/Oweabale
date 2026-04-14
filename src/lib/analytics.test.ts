import { describe, expect, it } from 'vitest';
import { track } from './analytics';

describe('track', () => {
  it('runs without throwing (hook optional)', () => {
    expect(() => track('ping', { n: 1 })).not.toThrow();
  });
});
