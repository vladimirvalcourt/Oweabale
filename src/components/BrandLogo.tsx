import React from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface BrandLogoProps {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fallbackIcon?: React.ReactNode;
}

const getBrandColor = (name: string): string => {
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const h = Math.abs(hash) % 360;
  return `hsla(${h}, 55%, 42%, 0.35)`;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ name, className, size = 'md', fallbackIcon }) => {
  const colorGlow = getBrandColor(name);
  const initials = initialsFromName(name);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };
  const textSize = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
  };

  if (!name.trim()) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md bg-surface-raised border border-surface-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] shrink-0',
          sizeClasses[size],
          className
        )}
      >
        {fallbackIcon || <Building2 className="w-1/2 h-1/2 text-content-muted" />}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-md border border-surface-border shrink-0 overflow-hidden flex items-center justify-center font-mono font-bold text-content-primary bg-surface-elevated select-none tracking-tight',
        sizeClasses[size],
        textSize[size],
        className
      )}
      style={{ boxShadow: `inset 0 1px 2px rgba(0,0,0,0.15), 0 0 10px ${colorGlow}` }}
      title={name}
      aria-label={`${name} brand`}
    >
      {initials}
    </div>
  );
};
