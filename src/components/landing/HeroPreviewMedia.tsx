import React from 'react';

export default function HeroPreviewMedia() {
  return (
    <div className="relative w-full">
      {/* Container that crops the bottom of the dashboard */}
      <div className="relative w-full overflow-hidden rounded-3xl" style={{ maxHeight: '520px' }}>
        {/* Dashboard image with theme-aware styling */}
        <img
          src="/screenshots/dashboard-hero.png"
          alt="Oweable Dashboard - Track bills, manage debt, and plan your finances"
          className="w-full h-auto object-cover"
          loading="eager"
          decoding="async"
        />
      </div>
      
      {/* Gradient fade at bottom for depth - covers the cropped area */}
      <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
    </div>
  );
}
