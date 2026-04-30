import React from "react";
import { ArrowRight } from "lucide-react";
import { TransitionLink } from '@/components/common/TransitionLink';

// Inline Button Component for Hero CTA
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "gradient";
  size?: "default" | "lg";
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className = "", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      default: "bg-surface-base text-content-primary border border-surface-border hover:bg-surface-raised",
      gradient: "bg-gradient-to-b from-white via-white/95 to-white/60 text-black hover:scale-105 active:scale-95"
    };
    
    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      lg: "h-12 px-8 text-base"
    };
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

/**
 * Modern SaaS Hero Section
 * 
 * Features:
 * - Animated entrance (fade-in + slide-up)
 * - Announcement banner with link
 * - Gradient text heading
 * - Primary CTA button
 * - Dashboard preview with glow effect
 * - Fully responsive
 * - Accessible (WCAG AA compliant)
 * 
 * Usage: Import and use in any page component
 */
export const SAASHero = React.memo(() => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start px-6 py-20 md:py-24 animate-in fade-in slide-in-from-bottom-4 duration-600">
      {/* Announcement Banner */}
      <aside className="mb-8 inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-full border border-surface-border bg-surface-highlight backdrop-blur-sm max-w-full">
        <span className="text-xs text-center whitespace-nowrap text-content-secondary">
          New version of Oweable is out!
        </span>
        <a
          href="#changelog"
          className="flex items-center gap-1 text-xs hover:text-content-primary transition-all active:scale-95 whitespace-nowrap text-content-secondary"
          aria-label="Read more about the new version"
        >
          Read more
          <ArrowRight size={12} />
        </a>
      </aside>

      {/* Main Heading */}
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-center max-w-3xl px-6 leading-tight mb-6 tracking-tight bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent">
        Give your finances <br />the clarity they deserve
      </h1>

      {/* Subtitle */}
      <p className="text-sm md:text-base text-center max-w-2xl px-6 mb-10 text-content-secondary">
        AI-powered financial life-saver that prevents disasters before they happen. <br />
        Track spending, optimize taxes, and build wealth automatically.
      </p>

      {/* CTA Buttons */}
      <div className="flex items-center gap-4 relative z-10 mb-16">
        <TransitionLink to="/auth?mode=signup">
          <Button
            type="button"
            variant="gradient"
            size="lg"
            className="rounded-lg flex items-center justify-center"
            aria-label="Get started with Oweable"
          >
            Start Free Trial
          </Button>
        </TransitionLink>
      </div>

      {/* Dashboard Preview */}
      <div className="w-full max-w-5xl relative pb-20">
        {/* Glow effect */}
        <div
          className="absolute left-1/2 w-[90%] pointer-events-none z-0 opacity-50"
          style={{
            top: "-23%",
            transform: "translateX(-50%)"
          }}
          aria-hidden="true"
        >
          <div className="w-full h-64 bg-gradient-to-t from-brand-indigo/20 to-transparent blur-3xl" />
        </div>
        
        {/* Dashboard Image */}
        <div className="relative z-10">
          <img
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=800&fit=crop"
            alt="Dashboard preview showing financial analytics and metrics interface"
            className="w-full h-auto rounded-lg shadow-2xl border border-surface-border"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
});

SAASHero.displayName = "SAASHero";
