import React from 'react';
import type { HouseholdMember } from '../types/household';

interface HouseholdAvatarStackProps {
  members: HouseholdMember[];
}

export function HouseholdAvatarStack({ members }: HouseholdAvatarStackProps) {
  if (members.length <= 1) return null;

  return (
    <div className="hidden sm:flex -space-x-2" title={`${members.length} household members`}>
      {members.slice(0, 3).map((member) => {
        const displayName = member.first_name || member.email || '?';
        return (
          <div
            key={member.id}
            className="w-7 h-7 rounded-full bg-surface-raised border-2 border-surface-base flex items-center justify-center shrink-0 overflow-hidden"
          >
            {member.avatar_url ? (
              <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] font-medium text-content-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        );
      })}
      {members.length > 3 && (
        <div className="w-7 h-7 rounded-full bg-surface-elevated border-2 border-surface-base flex items-center justify-center shrink-0">
          <span className="text-[9px] font-medium text-content-secondary">
            +{members.length - 3}
          </span>
        </div>
      )}
    </div>
  );
}
