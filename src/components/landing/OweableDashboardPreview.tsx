import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Custom Oweable Pay List Preview Component
 * Renders a branded dashboard mockup for the hero section
 * Works in both dark and light modes with proper theming
 */
export default function OweableDashboardPreview() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Create a timeline for the "ghost clicking" sequence
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 3 });

    cardRefs.current.forEach((card, _index) => {
      if (!card) return;

      // Animate the card being pressed (click down)
      tl.to(card, {
        scale: 0.97,
        boxShadow: "0px 2px 8px rgba(0,0,0,0.08)",
        duration: 0.12,
        ease: "power2.in",
      })
      .to(card, {
        scale: 1,
        boxShadow: "0px 8px 24px rgba(0,0,0,0.12)",
        duration: 0.4,
        ease: "elastic.out(1, 0.6)",
      }, "+=0.08")
      
      // Add a small pause between clicks for realism
      .to({}, { duration: 1.2 });
    });

    return () => {
      tl.kill();
    };
  }, []);
  return (
    <div className="relative w-full bg-surface-base rounded-3xl overflow-hidden border border-surface-border shadow-2xl">
      {/* Browser Chrome / Window Frame */}
      <div className="bg-surface-raised border-b border-surface-border px-4 py-3 flex items-center gap-3">
        {/* Window Controls */}
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        
        {/* URL Bar */}
        <div className="flex-1 bg-surface-base border border-surface-border rounded-md px-3 py-1.5 text-xs text-content-secondary font-mono">
          app.oweable.com/dashboard
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-content-primary">Pay List</h3>
            <p className="text-xs text-content-secondary mt-1">Welcome back, track your finances</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-brand-profit/20 flex items-center justify-center">
              <span className="text-xs font-bold text-brand-profit">JD</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Net Worth Card */}
          <div 
            ref={(el) => { cardRefs.current[0] = el; }}
            className="bg-surface-raised border border-surface-border rounded-xl p-4 transition-transform"
          >
            <p className="text-[10px] uppercase tracking-wider text-content-tertiary mb-2">Net Worth</p>
            <p className="text-2xl font-bold text-content-primary">$24,580</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-brand-profit">↑ 12%</span>
              <span className="text-[10px] text-content-tertiary">this month</span>
            </div>
          </div>

          {/* Monthly Bills Card */}
          <div 
            ref={(el) => { cardRefs.current[1] = el; }}
            className="bg-surface-raised border border-surface-border rounded-xl p-4 transition-transform"
          >
            <p className="text-[10px] uppercase tracking-wider text-content-tertiary mb-2">Monthly Bills</p>
            <p className="text-2xl font-bold text-content-primary">$3,240</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-brand-profit">5 due soon</span>
            </div>
          </div>

          {/* Safe to Spend Card */}
          <div 
            ref={(el) => { cardRefs.current[2] = el; }}
            className="bg-surface-raised border border-surface-border rounded-xl p-4 transition-transform"
          >
            <p className="text-[10px] uppercase tracking-wider text-content-tertiary mb-2">Safe to Spend</p>
            <p className="text-2xl font-bold text-brand-profit">$8,450</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-content-secondary">After bills & debt</span>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div 
          ref={(el) => { cardRefs.current[3] = el; }}
          className="bg-surface-raised border border-surface-border rounded-xl p-4 transition-transform"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-content-primary">Upcoming Bills</h4>
            <span className="text-xs text-content-secondary">View all →</span>
          </div>
          
          <div className="space-y-3">
            {/* Bill Item 1 */}
            <div className="flex items-center justify-between py-2 border-b border-surface-border/50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <span className="text-xs">🏠</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-content-primary">Rent Payment</p>
                  <p className="text-[10px] text-content-tertiary">Due in 3 days</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-content-primary">$1,800</span>
            </div>

            {/* Bill Item 2 */}
            <div className="flex items-center justify-between py-2 border-b border-surface-border/50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <span className="text-xs">⚡</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-content-primary">Electric Bill</p>
                  <p className="text-[10px] text-content-tertiary">Due in 7 days</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-content-primary">$145</span>
            </div>

            {/* Bill Item 3 */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <span className="text-xs">📱</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-content-primary">Phone Plan</p>
                  <p className="text-[10px] text-content-tertiary">Due in 12 days</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-content-primary">$85</span>
            </div>
          </div>
        </div>

        {/* Debt Payoff Progress */}
        <div 
          ref={(el) => { cardRefs.current[4] = el; }}
          className="bg-gradient-to-br from-brand-profit/10 to-transparent border border-brand-profit/20 rounded-xl p-4 transition-transform"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-content-primary">Debt Payoff Progress</p>
              <p className="text-[10px] text-content-secondary mt-0.5">Student Loans • $18,200 remaining</p>
            </div>
            <span className="text-sm font-bold text-brand-profit">68%</span>
          </div>
          <div className="w-full bg-surface-base rounded-full h-2 overflow-hidden">
            <div className="bg-brand-profit h-full rounded-full" style={{ width: '68%' }} />
          </div>
          <p className="text-[10px] text-content-tertiary mt-2">On track to pay off in 14 months</p>
        </div>
      </div>

      {/* Oweable Branding Watermark */}
      <div className="absolute bottom-4 right-4 opacity-20 pointer-events-none">
        <span className="text-xs font-bold text-content-primary tracking-tight">oweable</span>
      </div>
    </div>
  );
}
