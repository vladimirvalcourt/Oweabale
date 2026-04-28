import { describe, expect, it } from 'vitest';
import { isBillingLockBypass } from './proPlanGuardPolicy';

describe('ProPlanGuard billing lock bypass', () => {
  it('only allows the billing tab through the expired-trial lock', () => {
    expect(isBillingLockBypass('/pro/settings', '?tab=billing')).toBe(true);
    expect(isBillingLockBypass('/pro/settings', '?tab=billing&locked=trial')).toBe(true);
    expect(isBillingLockBypass('/pro/settings', '')).toBe(false);
    expect(isBillingLockBypass('/pro/settings', '?tab=profile')).toBe(false);
    expect(isBillingLockBypass('/pro/dashboard', '?tab=billing')).toBe(false);
  });
});
