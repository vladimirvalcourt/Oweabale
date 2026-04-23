import React from 'react';

export default function HeroDashboardMock() {
  return (
    <div className="relative">
      <div className="relative mx-auto w-full max-w-[860px]">
        <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#020304] shadow-[0_22px_54px_rgba(0,0,0,0.34)]">
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
