import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  return `hsla(${h}, 70%, 50%, 0.15)`;
};

export const BrandLogo: React.FC<BrandLogoProps> = ({ name, className, size = 'md', fallbackIcon }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const domainGuess = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  
  // Special overrides for common brands to ensure accurate domains
  const getDomain = (n: string) => {
    const lower = n.toLowerCase();
    if (lower.includes('apple')) return 'apple.com';
    if (lower.includes('chase')) return 'chase.com';
    if (lower.includes('netflix')) return 'netflix.com';
    if (lower.includes('starbucks')) return 'starbucks.com';
    if (lower.includes('amazon')) return 'amazon.com';
    if (lower.includes('verizon')) return 'verizon.com';
    if (lower.includes('spotify')) return 'spotify.com';
    if (lower.includes('uber')) return 'uber.com';
    if (lower.includes('landlord')) return ''; // No logo for generic landlord
    return domainGuess;
  };

  const domain = getDomain(name);
  const colorGlow = getBrandColor(name);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  if (!domain || hasError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center rounded-md bg-surface-raised border border-surface-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] shrink-0", 
          sizeClasses[size],
          className
        )}
      >
        {fallbackIcon || <Building2 className="w-1/2 h-1/2 text-zinc-600" />}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative rounded-md bg-white border border-surface-border shrink-0 overflow-hidden flex items-center justify-center transition-all duration-500",
        sizeClasses[size],
        className
      )}
      style={{ boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1), 0 0 12px ${colorGlow}` }}
    >
      <AnimatePresence>
        {!isLoaded && !hasError && (
          <motion.div 
            className="absolute inset-0 bg-zinc-200 animate-pulse"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
      <img 
        src={`https://logo.clearbit.com/${domain}?size=128`}
        alt={`${name} logo`}
        className={cn("w-full h-full object-contain p-1 transition-all duration-500", isLoaded ? "opacity-100 blur-0" : "opacity-0 blur-sm")}
        onLoad={() => setIsLoaded(true)}
        onError={() => { setHasError(true); setIsLoaded(true); }}
      />
    </div>
  );
};
