import React from 'react';

export default function HeroPreviewMedia() {
  return (
    <div className="relative w-full">
      {/* Oweable Dashboard Preview with theme-aware styling */}
      <div className="relative w-full rounded-3xl overflow-hidden border shadow-2xl bg-surface-base transition-colors duration-300">
        {/* Single Oweable dashboard image that works in both themes */}
        <img
          src="/screenshots/dashboard.png"
          alt="Oweable Dashboard - Track bills, manage debt, and plan your finances"
          className="w-full h-auto object-cover"
          loading="eager"
          decoding="async"
        />
        
        {/* Theme overlay for better contrast in light mode */}
        <div className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-0 dark:opacity-0 light:opacity-[0.02] bg-white" aria-hidden="true" />
      </div>
      
      {/* Gradient fade at bottom for depth */}
      <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
}
