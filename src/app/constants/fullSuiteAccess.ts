type EntitlementLike = { status: string; ends_at: string | null } | null | undefined;
type SubscriptionLike = { status: string } | null | undefined;
type TrialProfileLike =
  | {
      plan?: string | null;
      trial_ends_at?: string | null;
      trial_expired?: boolean | null;
    }
  | null
  | undefined;

export function isEntitlementActive(row: EntitlementLike): boolean {
  if (!row || row.status !== 'active') return false;
  if (!row.ends_at) return true;
  const end = new Date(row.ends_at).getTime();
  if (Number.isNaN(end)) return true;
  return end >= Date.now();
}

export function isSubscriptionLive(row: SubscriptionLike): boolean {
  return row?.status === 'active' || row?.status === 'trialing';
}

export function isProfileTrialActive(profile: TrialProfileLike): boolean {
  return (
    profile?.plan === 'trial' &&
    profile?.trial_expired === false &&
    !!profile?.trial_ends_at &&
    new Date(profile.trial_ends_at).getTime() > Date.now()
  );
}

export function hasFullSuiteAccess(params: {
  isAdmin?: boolean | null;
  entitlement?: EntitlementLike;
  subscription?: SubscriptionLike;
  profile?: TrialProfileLike;
}): boolean {
  return (
    params.isAdmin === true ||
    isEntitlementActive(params.entitlement) ||
    isSubscriptionLive(params.subscription) ||
    isProfileTrialActive(params.profile)
  );
}
