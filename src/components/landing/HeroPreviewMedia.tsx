import React from 'react';

export default function HeroPreviewMedia() {
  return (
    <div className="relative w-full">
      {/* Dashboard Preview with local image for CSP compliance */}
      <div className="relative w-full rounded-3xl overflow-hidden border shadow-2xl bg-surface-base">
        <img
          src="/screenshots/dashboard.png"
          alt="Oweable Dashboard Preview showing bill tracking and financial overview"
          className="w-full h-auto object-cover"
          loading="eager"
        />
      </div>
      {/* Gradient fade at bottom for depth */}
      <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
}
