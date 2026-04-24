import React from 'react';
import OweableDashboardPreview from './OweableDashboardPreview';

export default function HeroPreviewMedia() {
  return (
    <div className="relative w-full">
      {/* Live Oweable Dashboard Preview - Fully themed and interactive */}
      <OweableDashboardPreview />
      
      {/* Gradient fade at bottom for depth */}
      <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
}
