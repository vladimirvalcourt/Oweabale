import { describe, expect, it, vi } from 'vitest';
import {
  hasFullSuiteAccess,
  isEntitlementActive,
  isProfileTrialActive,
  isSubscriptionLive,
} from './fullSuiteAccess';

describe('fullSuiteAccess helpers', () => {
  it('treats active entitlements as valid until their end date', () => {
    expect(isEntitlementActive({ status: 'active', ends_at: null })).toBe(true);
    expect(
      isEntitlementActive({
        status: 'active',
        ends_at: new Date(Date.now() - 60_000).toISOString(),
      }),
    ).toBe(false);
  });

  it('treats trialing subscriptions as live', () => {
    expect(isSubscriptionLive({ status: 'trialing' })).toBe(true);
    expect(isSubscriptionLive({ status: 'canceled' })).toBe(false);
  });

  it('recognizes active profile trials', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T12:00:00Z'));

    expect(
      isProfileTrialActive({
        plan: 'trial',
        trial_expired: false,
        trial_ends_at: '2026-04-24T00:00:00Z',
      }),
    ).toBe(true);

    expect(
      isProfileTrialActive({
        plan: 'trial',
        trial_expired: true,
        trial_ends_at: '2026-04-24T00:00:00Z',
      }),
    ).toBe(false);

    vi.useRealTimers();
  });

  it('grants access for active profile trials even without billing rows', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T12:00:00Z'));

    expect(
      hasFullSuiteAccess({
        isAdmin: false,
        entitlement: null,
        subscription: null,
        profile: {
          plan: 'trial',
          trial_expired: false,
          trial_ends_at: '2026-04-24T00:00:00Z',
        },
      }),
    ).toBe(true);

    vi.useRealTimers();
  });
});
