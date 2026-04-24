import React from 'react';

export default function HeroPreviewMedia() {
  return (
    <div className="relative w-full">
      {/* Acme-style Dashboard Preview with dark/light mode support */}
      <div className="relative w-full rounded-3xl overflow-hidden border shadow-2xl">
        <img
          src="https://ui.shadcn.com/examples/dashboard-dark.png"
          alt="Oweable Dashboard Preview"
          className="w-full h-full object-center hidden dark:block rounded-3xl"
        />
        <img
          src="https://ui.shadcn.com/examples/dashboard-light.png"
          alt="Oweable Dashboard Preview"
          className="w-full h-full object-center dark:hidden block rounded-3xl"
        />
      </div>
      {/* Gradient fade at bottom for depth */}
      <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </div>
  );
}
