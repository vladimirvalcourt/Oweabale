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
  onPromoteAdmin: (userId: string) => void;
  onDemoteAdmin: (userId: string) => void;
  onAdminAction: (action: 'ban' | 'unban' | 'delete', userId: string) => void;
};

const PLAN_STYLES: Record<string, string> = {
  Lifetime: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  Pro: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
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
  onPromoteAdmin,
  onDemoteAdmin,
  onAdminAction,
}: Props) {
  return (
    <div className="lg:col-span-2 border border-surface-border rounded-sm bg-surface-raised p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2">
          <Users className="w-4 h-4" /> Users
        </h2>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-content-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search email or id"
            className="pl-7 pr-2 py-1.5 text-xs bg-surface-base border border-surface-border rounded-sm focus-app"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-content-tertiary border-b border-surface-border">
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
                <tr key={user.id} className="border-b border-surface-border/60">
                  <td className="py-2 pr-2">
                    <span className={user.is_admin ? 'text-indigo-400 font-bold' : ''}>
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
                  <td className="py-2 text-right space-x-1">
                    {user.is_admin ? (
                      <button
                        type="button"
                        onClick={() => onDemoteAdmin(user.id)}
                        disabled={isPrimary}
                        className="px-2 py-1 rounded-sm text-[11px] bg-indigo-500/15 text-indigo-300 disabled:opacity-40"
                      >
                        Demote
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPromoteAdmin(user.id)}
                        className="px-2 py-1 rounded-sm text-[11px] bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                      >
                        Promote
                      </button>
                    )}
                    {user.is_banned ? (
                      <button
                        type="button"
                        onClick={() => onAdminAction('unban', user.id)}
                        className="px-2 py-1 rounded-sm text-[11px] bg-emerald-500/15 text-emerald-300"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAdminAction('ban', user.id)}
                        disabled={isPrimary}
                        className="px-2 py-1 rounded-sm text-[11px] bg-rose-500/15 text-rose-300 disabled:opacity-40"
                      >
                        Ban
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onAdminAction('delete', user.id)}
                      disabled={isPrimary}
                      className="px-2 py-1 rounded-sm text-[11px] bg-red-500/20 text-red-300 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-content-muted">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
