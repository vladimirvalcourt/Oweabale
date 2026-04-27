import React, { useState } from 'react';
import { Users, Mail, UserPlus, Trash2, Shield, Eye, Crown, Loader2 } from 'lucide-react';
import { CollapsibleModule } from '../../components/common';
import { useStore } from '../../store';
import { toast } from 'sonner';
import { getCustomIcon } from '../../lib/utils/customIcons';
import type { UserRole } from '../../types/household';
import { useFullSuiteAccess } from '../../hooks';
import { useNavigate } from 'react-router-dom';

export function HouseholdPanel() {
  const UsersIcon = getCustomIcon('security') || Users;
  const { hasFullSuite } = useFullSuiteAccess();
  const navigate = useNavigate();
  const { currentHousehold, householdMembers, userRole, inviteHouseholdMember, removeHouseholdMember, updateMemberRole } = useStore();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'partner' | 'viewer'>('partner');
  const [isInviting, setIsInviting] = useState(false);

  // Pro gating
  if (!hasFullSuite) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6">
        <h3 className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">Pro Feature</h3>
        <p className="text-xs text-content-secondary mb-4">
          Multi-user households are available with the Full Suite plan. Upgrade to invite partners and share your financial data.
        </p>
        <button 
          onClick={() => navigate('/pro')}
          className="px-4 py-2 bg-brand-cta text-white rounded-lg text-xs font-medium hover:bg-brand-cta-hover transition-colors"
        >
          Upgrade Now
        </button>
      </div>
    );
  }

  const isOwner = userRole === 'owner';
  const canManageMembers = isOwner || userRole === 'partner';
  
  const acceptedMembers = householdMembers.filter(m => m.status === 'accepted');
  const pendingInvites = householdMembers.filter(m => m.status === 'pending');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!canManageMembers) {
      toast.error('Only owners and partners can invite members');
      return;
    }

    setIsInviting(true);
    try {
      const success = await inviteHouseholdMember(inviteEmail.trim(), inviteRole);
      if (success) {
        setInviteEmail('');
        setInviteRole('partner');
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail?: string) => {
    if (!isOwner) {
      toast.error('Only the owner can remove members');
      return;
    }

    const displayName = memberEmail || 'this member';
    if (!confirm(`Remove ${displayName} from this household?`)) return;

    await removeHouseholdMember(memberId);
  };

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    if (!isOwner) {
      toast.error('Only the owner can change roles');
      return;
    }

    // Only allow changing to partner or viewer (not owner)
    if (newRole === 'owner') {
      toast.error('Cannot change role to owner');
      return;
    }

    await updateMemberRole(memberId, newRole as 'partner' | 'viewer');
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'partner':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      case 'viewer':
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return Crown;
      case 'partner':
        return Users;
      case 'viewer':
        return Eye;
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Household Info */}
      <CollapsibleModule 
        title="Household" 
        icon={UsersIcon} 
        defaultOpen
        summaryWhenCollapsed={currentHousehold ? `${acceptedMembers.length} member${acceptedMembers.length !== 1 ? 's' : ''}` : undefined}
      >
        <div className="space-y-6">
          {/* Household Name */}
          <div>
            <label className="text-xs font-medium text-content-secondary mb-2 block">
              Household Name
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={currentHousehold?.name || ''}
                disabled
                className="flex-1 rounded-lg border border-surface-border bg-surface-base px-4 py-2.5 text-sm text-content-primary cursor-not-allowed opacity-60"
              />
              {isOwner && (
                <span className="text-[10px] font-mono text-content-muted uppercase tracking-widest">
                  Owner only
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-content-tertiary">
              All bills, budgets, transactions, and goals are shared within your household.
            </p>
          </div>

          {/* Invite Form */}
          {canManageMembers && (
            <div className="rounded-lg border border-surface-border bg-surface-elevated/50 p-4">
              <h4 className="text-sm font-medium text-content-primary mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-content-tertiary" />
                Invite Member
              </h4>
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="invite-email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="partner@example.com"
                      className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-primary focus-app-field"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="invite-role" className="sr-only">
                      Role
                    </label>
                    <select
                      id="invite-role"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'partner' | 'viewer')}
                      className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm text-content-secondary focus-app-field"
                    >
                      <option value="partner">Partner</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-content-tertiary">
                    <strong>Partner:</strong> Full access &nbsp;·&nbsp; <strong>Viewer:</strong> Read-only
                  </p>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-cta px-4 py-2 text-xs font-medium text-surface-base hover:bg-brand-cta-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isInviting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        Send Invite
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-content-secondary mb-3 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-content-tertiary" />
                Pending Invites ({pendingInvites.length})
              </h4>
              <div className="space-y-2">
                {pendingInvites.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-base px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-surface-elevated border border-surface-border flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-content-tertiary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-content-primary truncate">
                          {member.invited_email}
                        </p>
                        <p className="text-xs text-content-tertiary">Invited</p>
                      </div>
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id, member.invited_email || undefined)}
                        className="ml-3 p-2 text-content-tertiary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Revoke invite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accepted Members */}
          <div>
            <h4 className="text-xs font-medium text-content-secondary mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-content-tertiary" />
              Members ({acceptedMembers.length})
            </h4>
            {acceptedMembers.length === 0 ? (
              <div className="text-center py-8 rounded-lg border border-dashed border-surface-border bg-surface-raised">
                <Users className="w-8 h-8 text-content-muted mx-auto mb-2" />
                <p className="text-sm text-content-secondary">No members yet</p>
                <p className="text-xs text-content-tertiary mt-1">
                  {canManageMembers ? 'Invite your first member above' : 'Ask the owner to invite you'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {acceptedMembers.map((member) => {
                  const RoleIcon = getRoleIcon(member.role);
                  const displayName = member.first_name || member.email || 'Unknown';
                  const isCurrentUser = member.user_id === useStore.getState().user.id;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-base px-4 py-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-content-primary/[0.08] border border-content-primary/15 flex items-center justify-center shrink-0">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt=""
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-medium text-content-primary">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-content-primary truncate">
                              {displayName}
                              {isCurrentUser && (
                                <span className="text-xs text-content-tertiary ml-1">(You)</span>
                              )}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${getRoleBadgeColor(member.role)}`}
                            >
                              <RoleIcon className="w-3 h-3" />
                              {member.role}
                            </span>
                          </div>
                          {member.email && !member.first_name && (
                            <p className="text-xs text-content-tertiary truncate">{member.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        {isOwner && !isCurrentUser && (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateRole(member.id, e.target.value as UserRole)}
                              className="text-xs rounded border border-surface-border bg-surface-raised px-2 py-1 text-content-secondary focus-app-field opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <option value="partner">Partner</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id, displayName)}
                              className="p-2 text-content-tertiary hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Permissions Info */}
          <div className="rounded-lg border border-surface-border bg-surface-elevated/50 p-4">
            <h4 className="text-xs font-medium text-content-secondary mb-2">Permissions</h4>
            <ul className="space-y-2 text-xs text-content-tertiary">
              <li className="flex items-start gap-2">
                <Crown className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-content-secondary">Owner:</strong> Full control — manage members, edit all data, billing
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Users className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-content-secondary">Partner:</strong> Full access — add/edit bills, transactions, budgets, goals
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Eye className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-content-secondary">Viewer:</strong> Read-only — view all data but cannot make changes
                </span>
              </li>
            </ul>
          </div>
        </div>
      </CollapsibleModule>
    </div>
  );
}
