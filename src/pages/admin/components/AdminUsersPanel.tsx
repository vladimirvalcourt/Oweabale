import { Search, Users } from 'lucide-react';
import type { ProfileRow } from './types';

type EnrichedProfile = ProfileRow & { joinedAt: string; lastLogin: string };

type Props = {
  users: ProfileRow[];
  search: string;
  onSearchChange: (value: string) => void;
  getEnrichedProfile: (profile: ProfileRow) => EnrichedProfile;
  primaryAdminEmail: string;
  onDemoteAdmin: (userId: string) => void;
  onAdminAction: (action: 'ban' | 'unban' | 'delete', userId: string) => void;
};

export function AdminUsersPanel({
  users,
  search,
  onSearchChange,
  getEnrichedProfile,
  primaryAdminEmail,
  onDemoteAdmin,
  onAdminAction,
}: Props) {
  return (
    <div className="lg:col-span-2 border border-surface-border rounded-sm bg-surface-raised p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2"><Users className="w-4 h-4" /> Users</h2>
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
              <th className="py-2 text-left">Joined</th>
              <th className="py-2 text-left">Last Login</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const enriched = getEnrichedProfile(user);
              return (
                <tr key={user.id} className="border-b border-surface-border/60">
                  <td className="py-2 pr-2">
                    <span className={user.is_admin ? 'text-indigo-400 font-bold' : ''}>{user.email || user.id.slice(0, 12)}</span>
                  </td>
                  <td className="py-2 text-content-tertiary">{enriched.joinedAt}</td>
                  <td className="py-2 text-content-tertiary">{enriched.lastLogin}</td>
                  <td className="py-2">
                    {user.is_banned ? <span className="text-rose-400">Banned</span> : <span className="text-emerald-400">Active</span>}
                  </td>
                  <td className="py-2 text-right space-x-1">
                    {user.is_admin && (
                      <button
                        type="button"
                        onClick={() => onDemoteAdmin(user.id)}
                        disabled={!primaryAdminEmail || (user.email?.trim().toLowerCase() ?? '') === primaryAdminEmail}
                        className="px-2 py-1 rounded-sm text-[11px] bg-indigo-500/15 text-indigo-300 disabled:opacity-40"
                      >
                        Demote
                      </button>
                    )}
                    {user.is_banned ? (
                      <button type="button" onClick={() => onAdminAction('unban', user.id)} className="px-2 py-1 rounded-sm text-[11px] bg-emerald-500/15 text-emerald-300">Unban</button>
                    ) : (
                      <button type="button" onClick={() => onAdminAction('ban', user.id)} className="px-2 py-1 rounded-sm text-[11px] bg-rose-500/15 text-rose-300">Ban</button>
                    )}
                    <button type="button" onClick={() => onAdminAction('delete', user.id)} className="px-2 py-1 rounded-sm text-[11px] bg-red-500/20 text-red-300">Delete</button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-content-muted">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
