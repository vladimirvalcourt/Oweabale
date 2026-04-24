import React from 'react';
import OweableDashboardPreview from './OweableDashboardPreview';

export default function HeroPreviewMedia() {
  return (
    <div className="relative w-full">
      {/* Container that crops the bottom of the dashboard */}
      <div className="relative w-full overflow-hidden rounded-3xl" style={{ maxHeight: '520px' }}>
        {/* Live Oweable Dashboard Preview - Fully themed and interactive */}
        <OweableDashboardPreview />
      </div>
      
      {/* Gradient fade at bottom for depth - covers the cropped area */}
      <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
    </div>
  );
}
