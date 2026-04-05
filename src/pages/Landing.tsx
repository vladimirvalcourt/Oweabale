import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Shield, Lock, Zap, TrendingUp, FileText, Calculator, BarChart3, Target, Twitter, Github, Linkedin } from 'lucide-react';

function useInView(threshold = 0.15) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible] as const;
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  
  const [socialRef, socialVisible] = useInView();
  const [featuresRef, featuresVisible] = useInView();
  const [statsRef, statsVisible] = useInView();
  const [ctaRef, ctaVisible] = useInView();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-surface-base text-content-primary font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-surface-base/90 backdrop-blur-md border-b border-surface-border py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <Link to="/" className="font-black text-xl tracking-[0.2em] text-content-primary transition-colors duration-200">
            OWEABLE
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors duration-200">Features</a>
            <Link to="/pricing" className="hover:text-white transition-colors duration-200">Pricing</Link>
            <Link to="/dashboard" className="hover:text-white transition-colors duration-200">Sign In</Link>
          </div>
          <Link 
            to="/dashboard" 
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-sm font-bold transition-colors duration-200"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/70"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-surface-base"></div>
        </div>

        {/* Hero Glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-surface-base/0 to-transparent pointer-events-none"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 w-full flex flex-col items-center text-center mt-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-[1px] w-8 bg-[#F59E0B]"></div>
            <span className="text-[#F59E0B] text-xs tracking-widest uppercase">FINANCIAL CLARITY, FINALLY</span>
            <div className="h-[1px] w-8 bg-[#F59E0B]"></div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.85] mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            <span className="block text-white">Stop Bleeding</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">Money.</span>
          </h1>
          
          <p className="text-base md:text-lg text-zinc-400 max-w-3xl mx-auto leading-relaxed mb-12 font-light">
            Oweable gives you a ruthless command center for your bills, debts, and financial future. See everything. Owe nothing.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
            <Link 
              to="/dashboard" 
              className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-zinc-200 text-black rounded-sm text-base font-bold transition-colors duration-200 flex items-center justify-center gap-2"
            >
              Deploy Your Dashboard <ArrowRight className="w-5 h-5" />
            </Link>
            <a 
              href="#features" 
              className="w-full sm:w-auto px-6 py-3 bg-transparent border border-white/20 hover:border-white/50 text-white rounded-sm text-base font-medium transition-colors duration-200 flex items-center justify-center"
            >
              View The Arsenal
            </a>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <div className="border-y border-surface-border bg-surface-base py-6 overflow-hidden">
        <div 
          ref={socialRef}
          className={`max-w-7xl mx-auto px-6 lg:px-8 flex flex-wrap justify-center md:justify-between items-center gap-8 text-sm font-medium text-zinc-400 transition-all duration-700 ease-out ${socialVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Trusted by 12,000+ households</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex text-[#F59E0B]">
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
            </div>
            <span>4.9 / 5.0 rating</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-400" />
            <span>Bank-grade 256-bit encryption</span>
          </div>
        </div>
      </div>

      {/* Features Section (Bento Grid) */}
      <section id="features" className="py-32 bg-surface-raised overflow-hidden">
        <div ref={featuresRef} className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className={`mb-20 max-w-3xl transition-all duration-700 ease-out ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6 text-content-primary">Every dollar,<br/>accounted for.</h2>
            <p className="text-base text-zinc-400 leading-relaxed">
              From rent to streaming services, Oweable maps your complete financial picture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[280px]">
            {/* Bento Cell 1 - Large */}
            <div className={`md:col-span-2 transition-all duration-700 ease-out delay-[0ms] ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-surface-elevated border border-surface-border rounded-xl p-8 flex flex-col justify-between group hover:border-indigo-500/50 transition-colors duration-200 relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-200">
                  <TrendingUp className="w-48 h-48 text-indigo-400" />
                </div>
                <div className="relative z-10">
                  <div className="mb-8 w-full max-w-[240px] bg-surface-base border border-surface-border rounded-lg p-4 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-medium text-zinc-400">Total Debt</span>
                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">Payoff date: Oct 2026</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-border rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] rounded-full animate-[progress-active_4s_ease-in-out_infinite]"></div>
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3 text-content-primary">Debt Detonator</h3>
                  <p className="text-zinc-400 text-sm md:text-base max-w-md">
                    Crush interest rates and see the exact day you become debt-free.
                  </p>
                </div>
              </div>
            </div>

            {/* Bento Cell 2 */}
            <div className={`transition-all duration-700 ease-out delay-[100ms] ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-surface-elevated border border-surface-border rounded-xl p-8 flex flex-col justify-between group hover:border-indigo-500/50 transition-colors duration-200 relative overflow-hidden h-full">
                <div className="relative z-10">
                  <div className="mb-6 h-28 w-full max-w-[240px] overflow-hidden relative [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
                    <div className="flex flex-col gap-2 animate-[marquee-vertical_15s_linear_infinite]">
                      {[
                        { name: "Netflix", price: "$15.99" },
                        { name: "Equinox", price: "$250.00" },
                        { name: "Spotify", price: "$10.99" },
                        { name: "Adobe CC", price: "$54.99" },
                        { name: "ChatGPT", price: "$20.00" },
                        { name: "Netflix", price: "$15.99" },
                        { name: "Equinox", price: "$250.00" },
                        { name: "Spotify", price: "$10.99" },
                        { name: "Adobe CC", price: "$54.99" },
                        { name: "ChatGPT", price: "$20.00" }
                      ].map((sub, i) => (
                        <div key={i} className="flex items-center justify-between bg-surface-base border border-surface-border rounded-md px-3 py-2 shadow-sm shrink-0">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)] animate-pulse"></div>
                            <span className="text-xs font-medium text-zinc-300">{sub.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-zinc-500">{sub.price}</span>
                            <span className="text-[10px] font-bold text-red-400 hover:text-red-300 cursor-pointer transition-colors uppercase tracking-wider">Cancel</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3 text-content-primary">Subscription Sniper</h3>
                  <p className="text-zinc-400 text-sm md:text-base">
                    Stop paying for things you don't use. We find them, you kill them.
                  </p>
                </div>
              </div>
            </div>

            {/* Bento Cell 3 */}
            <div className={`transition-all duration-700 ease-out delay-[200ms] ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-surface-elevated border border-surface-border rounded-xl p-8 flex flex-col justify-between group hover:border-indigo-500/50 transition-colors duration-200 relative overflow-hidden h-full">
                <div className="relative z-10">
                  <div className="mb-8 h-16 flex items-end gap-2 max-w-[240px]">
                    <div className="w-8 bg-surface-base border border-surface-border border-t-indigo-500/30 rounded-t-sm animate-[chart-1_4s_ease-in-out_infinite]"></div>
                    <div className="w-8 bg-surface-base border border-surface-border border-t-indigo-500/50 rounded-t-sm animate-[chart-2_5s_ease-in-out_infinite]"></div>
                    <div className="w-8 bg-surface-base border border-surface-border border-t-indigo-500/70 rounded-t-sm animate-[chart-3_6s_ease-in-out_infinite]"></div>
                    <div className="w-8 bg-indigo-500/20 border border-indigo-500/50 border-t-indigo-400 rounded-t-sm shadow-[0_-5px_15px_rgba(99,102,241,0.2)] relative animate-[chart-4_7s_ease-in-out_infinite]">
                      <div className="absolute -top-[1px] left-0 right-0 h-[2px] bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,1)]"></div>
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3 text-content-primary">Wealth Velocity</h3>
                  <p className="text-zinc-400 text-sm md:text-base">
                    Track net worth with institutional-grade precision.
                  </p>
                </div>
              </div>
            </div>

            {/* Bento Cell 4 - Large */}
            <div className={`md:col-span-2 transition-all duration-700 ease-out delay-[300ms] ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-surface-elevated border border-surface-border rounded-xl p-8 flex flex-col justify-between group hover:border-indigo-500/50 transition-colors duration-200 relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-200">
                  <Calculator className="w-48 h-48 text-indigo-400" />
                </div>
                <div className="relative z-10">
                  <div className="w-10 h-10 bg-surface-base border border-surface-border rounded-lg flex items-center justify-center mb-6">
                    <Calculator className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3 text-content-primary">Tax Fortress</h3>
                  <p className="text-zinc-400 text-sm md:text-base max-w-md">
                    Never be surprised by April again. Real-time liability tracking.
                  </p>
                </div>
              </div>
            </div>

            {/* Bento Cell 5 */}
            <div className={`md:col-span-3 transition-all duration-700 ease-out delay-[400ms] ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-surface-elevated border border-surface-border rounded-xl p-8 flex flex-col md:flex-row items-center justify-between group hover:border-indigo-500/50 transition-colors duration-200 relative overflow-hidden h-full">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-surface-base border border-surface-border rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-7 h-7 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold mb-2 text-content-primary">Receipt to Reality</h3>
                    <p className="text-zinc-400 text-sm md:text-base">
                      Snap a photo. We extract the merchant, amount, and date instantly.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Cell 6 */}
            <div className={`md:col-span-3 transition-all duration-700 ease-out delay-[500ms] ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-surface-elevated border border-surface-border rounded-xl p-8 flex flex-col md:flex-row items-center justify-between group hover:border-indigo-500/50 transition-colors duration-200 h-full">
                <div className="flex items-center gap-6 mb-6 md:mb-0">
                  <div className="w-14 h-14 bg-surface-base border border-surface-border rounded-xl flex items-center justify-center shrink-0">
                    <Lock className="w-7 h-7 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold mb-2 text-content-primary">Fort Knox Security</h3>
                    <p className="text-zinc-400 text-sm md:text-base">
                      Your data is encrypted end-to-end. We never sell your information.
                    </p>
                  </div>
                </div>
                <Link 
                  to="/dashboard" 
                  className="px-6 py-3 bg-surface-base hover:bg-surface-border border border-surface-border rounded-sm text-white text-sm font-medium transition-colors duration-200 whitespace-nowrap"
                >
                  Read Security Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-32 bg-surface-base border-y border-surface-border overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-surface-base/0 to-transparent pointer-events-none"></div>
        <div ref={statsRef} className={`relative z-10 max-w-7xl mx-auto px-6 lg:px-8 transition-all duration-700 ease-out ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 divide-y md:divide-y-0 md:divide-x divide-surface-border text-center md:text-left">
            <div className="md:pr-12 pt-12 md:pt-0">
              <p className="text-4xl md:text-5xl font-black text-[#F59E0B] mb-3 tracking-tighter">$2.4B+</p>
              <p className="text-sm md:text-base text-zinc-400 font-medium tracking-wide">In bills tracked</p>
            </div>
            <div className="md:px-12 pt-12 md:pt-0">
              <p className="text-4xl md:text-5xl font-black text-[#F59E0B] mb-3 tracking-tighter">98%</p>
              <p className="text-sm md:text-base text-zinc-400 font-medium tracking-wide">Of users cut expenses in month 1</p>
            </div>
            <div className="md:pl-12 pt-12 md:pt-0">
              <p className="text-4xl md:text-5xl font-black text-[#F59E0B] mb-3 tracking-tighter">4 min</p>
              <p className="text-sm md:text-base text-zinc-400 font-medium tracking-wide">Average setup time</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 relative overflow-hidden bg-surface-raised">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-indigo-900/20 via-surface-raised to-surface-raised"></div>
        <div ref={ctaRef} className={`relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center transition-all duration-700 ease-out ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-6 text-content-primary">
            Your money deserves a strategist.
          </h2>
          <p className="text-base md:text-lg text-zinc-400 mb-10 font-light">
            Join thousands who stopped guessing and started knowing.
          </p>
          <Link 
            to="/dashboard" 
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm text-base font-bold transition-all duration-200 hover:scale-105"
          >
            Claim Your Financial Freedom <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-base border-t border-surface-border pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <Link to="/" className="font-black text-xl tracking-[0.2em] text-content-primary block mb-4">
                OWEABLE
              </Link>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-xs">
                The command center for your financial future.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-surface-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              &copy; {new Date().getFullYear()} Oweable Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-zinc-500">
              <a href="#" className="hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
