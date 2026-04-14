import { describe, expect, it } from 'vitest';
import { normalizePlaidFlowErrorMessage } from './plaidErrors';

describe('normalizePlaidFlowErrorMessage', () => {
  it('maps generic Edge non-2xx copy', () => {
    expect(normalizePlaidFlowErrorMessage('Edge Function returned a non-2xx status code')).toContain(
      'temporarily unavailable',
    );
  });

  it('maps auth failures', () => {
    expect(normalizePlaidFlowErrorMessage('Unauthorized: missing authorization')).toContain('session expired');
  });

  it('passes through other messages', () => {
    expect(normalizePlaidFlowErrorMessage('Institution unavailable')).toBe('Institution unavailable');
  });
});
