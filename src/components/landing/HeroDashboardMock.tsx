import React from 'react';

export default function HeroDashboardMock() {
  return (
    <div className="relative [perspective:2400px]">
      <div className="relative mx-auto w-full max-w-[1180px] [transform-style:preserve-3d]">
        <div className="absolute inset-0 rounded-[28px] bg-black/30 blur-3xl [transform:translateY(8%)_scale(0.92)]" />
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#020304] shadow-[0_42px_120px_rgba(0,0,0,0.58)] [transform:rotateX(12deg)_rotateY(-16deg)_rotateZ(6deg)]">
          <img
            src="/hero-dashboard-premium.png"
            alt="Oweable dashboard preview."
            className="block h-full w-full object-cover object-center"
          />
        </div>
      </div>
    </div>
  );
}
