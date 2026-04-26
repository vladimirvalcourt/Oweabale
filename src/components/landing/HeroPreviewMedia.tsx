import React from 'react';

export default function HeroPreviewMedia() {
  return (
    <div className="relative w-full">
      {/* Container that crops the bottom of the dashboard */}
      <div
        className="relative w-full overflow-hidden rounded-3xl border bg-surface-base shadow-2xl"
        style={{ maxHeight: '520px' }}
      >
        {/* Preserve light/dark-specific hero art while keeping the cropped framing. */}
        <img
          src="/screenshots/dashboard-dark.png"
          alt="Oweable Dashboard - Track bills, manage debt, and plan your finances"
          className="hidden w-full h-auto object-cover dark:block"
          loading="eager"
          decoding="async"
        />
        <img
          src="/screenshots/dashboard-light.png"
          alt="Oweable Dashboard - Track bills, manage debt, and plan your finances"
          className="block w-full h-auto object-cover dark:hidden"
          loading="eager"
          decoding="async"
        />
      </div>
      
      {/* Gradient fade at bottom for depth - covers the cropped area */}
      <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
    </div>
  );
}
