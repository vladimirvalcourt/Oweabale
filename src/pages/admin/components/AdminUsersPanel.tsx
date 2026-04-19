import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import type { ProfileRow, UserSubscription } from './types';

type EnrichedProfile = ProfileRow & { joinedAt: string; lastLogin: string };

type Props = {
  users: ProfileRow[];
  search: string;
  onSearchChange: (value: string) => void;
  getEnrichedProfile: (profile: ProfileRow) => EnrichedProfile;
  primaryAdminEmail: string;
  subMap: Record<string, UserSubscription>;
  profilesTotalCount: number | null;
  profilesLoadingMore?: boolean;
  onLoadMoreProfiles?: () => void;
  onPromoteAdmin: (userId: string) => void;
  onDemoteAdmin: (userId: string) => void;
  onAdminAction: (action: 'ban' | 'unban' | 'delete', userId: string) => void;
  onViewUser: (userId: string) => void;
  onGrantRevoke: (action: 'grant' | 'revoke', userId: string) => void;
  onBulkAction: (action: 'ban' | 'unban' | 'grant_entitlement' | 'revoke_entitlement', userIds: string[]) => void;
};

const PLAN_STYLES: Record<string, string> = {
  Lifetime: 'bg-content-primary/10 text-content-secondary border-content-primary/15',
  Pro: 'bg-content-primary/[0.06] text-content-secondary border-surface-border',
};

const SUB_STATUS_STYLES: Record<string, string> = {
  trialing: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  past_due: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export function AdminUsersPanel({
  users,
  search,
  onSearchChange,
  getEnrichedProfile,
  primaryAdminEmail,
  subMap,
  profilesTotalCount,
  profilesLoadingMore = false,
  onLoadMoreProfiles,
  onPromoteAdmin,
  onDemoteAdmin,
  onAdminAction,
  onViewUser,
  onGrantRevoke,
  onBulkAction,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedIds = [...selected];

  const confirmBulkAction = (action: 'ban' | 'unban' | 'grant_entitlement' | 'revoke_entitlement') => {
    if (selectedIds.length === 0) return;
    if (action === 'ban') {
      if (!window.confirm(`Ban ${selectedIds.length} selected ${selectedIds.length === 1 ? 'user' : 'users'}?`)) return;
    }
    if (action === 'revoke_entitlement') {
      if (!window.confirm(`Revoke suite access for ${selectedIds.length} selected ${selectedIds.length === 1 ? 'user' : 'users'}?`)) return;
    }
    onBulkAction(action, selectedIds);
  };

  const confirmSingleAction = (
    action: 'ban' | 'unban' | 'delete',
    userId: string,
    emailOrId: string,
  ) => {
    if (action === 'ban' && !window.confirm(`Ban ${emailOrId}?`)) return;
    if (
      action === 'delete' &&
      !window.confirm(`Delete ${emailOrId}? This action is permanent.`)
    ) {
      return;
    }
    onAdminAction(action, userId);
  };

  const confirmRevokeSuite = (userId: string, emailOrId: string) => {
    if (!window.confirm(`Revoke suite access for ${emailOrId}?`)) return;
    onGrantRevoke('revoke', userId);
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  };

  const allChecked = users.length > 0 && users.every(u => selected.has(u.id));
  const toggleAll = () => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map(u => u.id)));
    }
  };

  return (
    <div className="border border-surface-border rounded-lg bg-surface-raised p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2">
            <Users className="w-4 h-4" /> Users
          </h2>
          {profilesTotalCount !== null && (
            <p className="text-[10px] text-content-tertiary mt-1">
              Showing {users.length} of {profilesTotalCount}
              {profilesTotalCount > users.length && onLoadMoreProfiles ? ' · more available' : ''}
            </p>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-content-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search email or id"
            className="pl-7 pr-2 py-1.5 text-xs bg-surface-base border border-surface-border rounded-lg focus-app-field"
          />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-surface-elevated border border-surface-border">
          <span className="text-xs text-content-tertiary">{selected.size} selected</span>
          <button
            type="button"
            onClick={() => confirmBulkAction('ban')}
            className="danger-button px-2 py-1 rounded-lg text-xs bg-rose-500/15 border border-rose-500/35 text-rose-300 hover:bg-rose-500/25"
          >
            Ban
          </button>
          <button
            type="button"
            onClick={() => confirmBulkAction('unban')}
            className="interactive-press interactive-focus px-2 py-1 rounded-lg text-xs bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
          >
            Unban
          </button>
          <button
            type="button"
            onClick={() => confirmBulkAction('grant_entitlement')}
            className="interactive-press interactive-focus px-2 py-1 rounded-lg text-xs bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
          >
            Grant Suite
          </button>
          <button
            type="button"
            onClick={() => confirmBulkAction('revoke_entitlement')}
            className="danger-button px-2 py-1 rounded-lg text-xs bg-amber-500/15 border border-amber-500/35 text-amber-300 hover:bg-amber-500/25"
          >
            Revoke Suite
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="interactive-press interactive-focus ml-auto px-2 py-1 rounded-lg text-xs bg-surface-base text-content-tertiary hover:text-content-secondary"
          >
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-content-tertiary border-b border-surface-border">
              <th className="py-2 pr-2 w-6">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="Select all users"
                  className="accent-content-primary"
                />
              </th>
              <th className="py-2 text-left">Account</th>
              <th className="py-2 text-left">Plan</th>
              <th className="py-2 text-left">Joined</th>
              <th className="py-2 text-left">Last Login</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const enriched = getEnrichedProfile(user);
              const sub = subMap[user.id];
              const isPrimary = (user.email?.trim().toLowerCase() ?? '') === primaryAdminEmail;

              const hasFullSuite =
                sub?.plan === 'Pro' ||
                sub?.plan === 'Lifetime' ||
                sub?.status === 'active' ||
                sub?.status === 'trialing';

              let planBadge: React.ReactNode = null;
              if (sub) {
                const style =
                  PLAN_STYLES[sub.plan] ??
                  SUB_STATUS_STYLES[sub.status] ??
                  'bg-surface-elevated text-content-secondary border-surface-border';
                planBadge = (
                  <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium ${style}`}>
                    {sub.plan === 'Pro' && sub.status !== 'active' ? sub.status : sub.plan}
                  </span>
                );
              }

              return (
                <tr key={user.id} className="border-b border-surface-border/60 hover:bg-surface-elevated/50">
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={selected.has(user.id)}
                      onChange={() => toggleOne(user.id)}
                      aria-label={`Select ${user.email ?? user.id}`}
                      className="accent-content-primary"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <span className={user.is_admin ? 'text-content-primary font-bold' : ''}>
                      {user.email || user.id.slice(0, 12)}
                    </span>
                    {!user.has_completed_onboarding && (
                      <span className="ml-1.5 text-[10px] text-content-muted">(setup)</span>
                    )}
                  </td>
                  <td className="py-2 pr-2">{planBadge ?? <span className="text-content-muted">Free</span>}</td>
                  <td className="py-2 text-content-tertiary">{enriched.joinedAt}</td>
                  <td className="py-2 text-content-tertiary">{enriched.lastLogin}</td>
                  <td className="py-2">
                    {user.is_banned ? (
                      <span className="text-rose-400">Banned</span>
                    ) : (
                      <span className="text-emerald-400">Active</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <div className="inline-flex flex-col items-end gap-1">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onViewUser(user.id)}
                          className="interactive-press interactive-focus px-2 py-1 rounded-lg text-[11px] bg-surface-elevated text-content-secondary hover:text-content-primary"
                        >
                          View
                        </button>
                        {user.is_admin ? (
                          <button
                            type="button"
                            onClick={() => onDemoteAdmin(user.id)}
                            disabled={isPrimary}
                            className="interactive-press interactive-focus px-2 py-1 rounded-lg text-[11px] bg-content-primary/[0.06] text-content-secondary disabled:opacity-40"
                          >
                            Demote
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onPromoteAdmin(user.id)}
                            className="interactive-press interactive-focus px-2 py-1 rounded-lg text-[11px] bg-content-primary/[0.05] text-content-primary hover:bg-content-primary/[0.08]"
                          >
                            Promote
                          </button>
                        )}
                        {hasFullSuite ? (
                          <button
                            type="button"
                            onClick={() => confirmRevokeSuite(user.id, user.email ?? user.id)}
                            disabled={isPrimary}
                            className="danger-button px-2 py-1 rounded-lg text-[11px] bg-amber-500/15 border border-amber-500/35 text-amber-300 hover:bg-amber-500/25 disabled:opacity-40"
                          >
                            Revoke Suite
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onGrantRevoke('grant', user.id)}
                            className="interactive-press interactive-focus px-2 py-1 rounded-lg text-[11px] bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                          >
                            Grant Suite
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {user.is_banned ? (
                          <button
                            type="button"
                            onClick={() => confirmSingleAction('unban', user.id, user.email ?? user.id)}
                            className="interactive-press interactive-focus px-2 py-1 rounded-lg text-[11px] bg-emerald-500/15 text-emerald-300"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => confirmSingleAction('ban', user.id, user.email ?? user.id)}
                            disabled={isPrimary}
                            className="danger-button px-2 py-1 rounded-lg text-[11px] bg-rose-500/15 border border-rose-500/35 text-rose-300 disabled:opacity-40"
                          >
                            Ban
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => confirmSingleAction('delete', user.id, user.email ?? user.id)}
                          disabled={isPrimary}
                          className="danger-button px-2 py-1 rounded-lg text-[11px] font-semibold bg-red-500/20 border border-red-500/40 text-red-300 disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-content-muted">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {profilesTotalCount !== null &&
        onLoadMoreProfiles &&
        users.length < profilesTotalCount && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => onLoadMoreProfiles()}
              disabled={profilesLoadingMore}
              className="px-4 py-2 rounded-lg text-xs border border-surface-border bg-surface-elevated text-content-secondary hover:text-content-primary disabled:opacity-50"
            >
              {profilesLoadingMore ? 'Loading…' : `Load more (${profilesTotalCount - users.length} remaining)`}
            </button>
          </div>
        )}
    </div>
  );
}
