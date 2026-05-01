import React from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { TransitionLink } from '@/components/common/TransitionLink';

// Inline Button Component - Adapted to use design tokens
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "gradient";
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className = "", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      default: "bg-brand-indigo text-white border border-brand-violet/30 hover:bg-brand-cta-hover",
      secondary: "bg-surface-elevated text-content-primary hover:bg-surface-highlight",
      ghost: "hover:bg-surface-highlight text-content-secondary hover:text-content-primary",
      gradient: "bg-brand-indigo text-white hover:bg-brand-cta-hover active:translate-y-px"
    };
    
    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-10 px-5 text-sm",
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

// Navigation Component
const Navigation = React.memo(() => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="fixed top-0 w-full z-50 border-b border-surface-border bg-surface-base/92 backdrop-blur-xl">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-start">
          <div className="text-xl font-semibold text-content-primary mr-auto">Oweable</div>
          
          <div className="hidden md:flex items-center justify-center gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <a href="#features" className="text-sm text-content-secondary hover:text-content-primary transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm text-content-secondary hover:text-content-primary transition-colors">
              Pricing
            </a>
            <a href="#docs" className="text-sm text-content-secondary hover:text-content-primary transition-colors">
              Documentation
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4 ml-auto">
            <TransitionLink to="/auth">
              <Button type="button" variant="ghost" size="sm">
                Sign in
              </Button>
            </TransitionLink>
            <TransitionLink to="/auth?mode=signup">
              <Button type="button" variant="default" size="sm">
                Get Started
              </Button>
            </TransitionLink>
          </div>

          <button
            type="button"
            className="md:hidden text-content-primary min-h-[48px] min-w-[48px] flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-base/95 backdrop-blur-xl border-t border-surface-border animate-in slide-in-from-top duration-300">
          <div className="px-6 py-4 flex flex-col gap-4">
            <a
              href="#features"
              className="text-sm text-content-secondary hover:text-content-primary transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm text-content-secondary hover:text-content-primary transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </a>
            <a
              href="#docs"
              className="text-sm text-content-secondary hover:text-content-primary transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Documentation
            </a>
            <div className="flex flex-col gap-2 pt-4 border-t border-surface-border">
              <TransitionLink to="/auth" onClick={() => setMobileMenuOpen(false)}>
                <Button type="button" variant="ghost" size="sm" className="w-full">
                  Sign in
                </Button>
              </TransitionLink>
              <TransitionLink to="/auth?mode=signup" onClick={() => setMobileMenuOpen(false)}>
                <Button type="button" variant="default" size="sm" className="w-full">
                  Get Started
                </Button>
              </TransitionLink>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

Navigation.displayName = "Navigation";

// Hero Component
const Hero = React.memo(() => {
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const subtitleRef = React.useRef<HTMLParagraphElement>(null);
  const ctaRef = React.useRef<HTMLDivElement>(null);
  
  const isTitleInView = useInView(titleRef, { once: true });
  const isSubtitleInView = useInView(subtitleRef, { once: true });
  const isCtaInView = useInView(ctaRef, { once: true });

  return (
    <section className="min-h-[100dvh] w-full p-3">
      <div className="relative min-h-[calc(100dvh-1.5rem)] w-full overflow-hidden rounded-3xl border border-surface-border-subtle bg-surface-base">
        
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/hero-loop-poster.webp"
          className="absolute inset-0 h-full w-full object-cover"
          src="/hero-loop.mp4"
        />

        {/* Noise overlay */}
        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.7] mix-blend-overlay" />

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-2 sm:px-6 md:px-10">
          <div className="grid grid-cols-12 items-end gap-4">
            
            <div className="col-span-12 lg:col-span-8">
              <motion.h1
                ref={titleRef}
                initial={{ y: 18, opacity: 0 }}
                animate={isTitleInView ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="font-medium leading-[0.85] tracking-[-0.07em] text-[26vw] text-content-primary sm:text-[24vw] md:text-[22vw] lg:text-[20vw] xl:text-[19vw] 2xl:text-[20vw]"
              >
                Oweable
              </motion.h1>
            </div>

            <div className="col-span-12 flex flex-col gap-5 pb-6 lg:col-span-4 lg:pb-10">
              
              <motion.p
                ref={subtitleRef}
                initial={{ y: 20, opacity: 0 }}
                animate={isSubtitleInView ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-xs text-content-secondary sm:text-sm md:text-base"
                style={{ lineHeight: 1.2 }}
              >
                AI-powered financial life-saver that prevents disasters before they happen. Track spending, optimize taxes, and build wealth automatically.
              </motion.p>

              <motion.div
                ref={ctaRef}
                initial={{ y: 20, opacity: 0 }}
                animate={isCtaInView ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <TransitionLink to="/auth?mode=signup">
                  <button className="group inline-flex items-center gap-2 self-start rounded-md bg-brand-indigo py-2.5 pl-5 pr-3 text-sm font-medium text-white transition-[background-color,transform] hover:bg-brand-cta-hover active:translate-y-px sm:text-base">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </TransitionLink>
              </motion.div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

// Main Component
export default function SAASLandingTemplate() {
  return (
    <main className="min-h-screen bg-surface-base text-content-primary">
      <Navigation />
      <Hero />
    </main>
  );
}
