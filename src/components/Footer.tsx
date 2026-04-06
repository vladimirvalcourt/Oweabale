import { Link } from 'react-router-dom';
import { Twitter, Github, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface-raised pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="brand-header-text flex items-center gap-2 mb-5">
              <div className="w-2 h-2 bg-brand-violet shadow-glow-indigo" />
              Oweable
            </Link>
            <p className="text-sm text-content-tertiary max-w-sm leading-relaxed mb-8">
              Autonomous financial infrastructure for the modern worker. Track, save, and protect your profit with bank-grade precision.
            </p>
            <Link
              to="/onboarding"
              className="inline-block bg-content-primary text-surface-base px-6 py-3 text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all"
            >
              Get Started Free
            </Link>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-content-primary mb-6">Platform</h4>
            <ul className="flex flex-col gap-3 text-xs font-mono text-content-tertiary uppercase tracking-widest">
              <li><a href="/#features" className="hover:text-brand-violet transition-colors">Features</a></li>
              <li><Link to="/pricing" className="hover:text-brand-violet transition-colors">Pricing</Link></li>
              <li><Link to="/dashboard" className="hover:text-brand-violet transition-colors">Sign In</Link></li>
              <li><Link to="/support" className="hover:text-brand-violet transition-colors">Support</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-content-primary mb-6">Legal</h4>
            <ul className="flex flex-col gap-3 text-xs font-mono text-content-tertiary uppercase tracking-widest">
              <li><Link to="/privacy" className="hover:text-brand-violet transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-brand-violet transition-colors">Terms</Link></li>
              <li><Link to="/security" className="hover:text-brand-violet transition-colors">Security</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-surface-border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 text-[10px] font-mono text-content-muted uppercase tracking-widest">
            <span>OWEABLE INC. NYC</span>
            <span className="opacity-30">/</span>
            <span>© {new Date().getFullYear()} All Rights Reserved</span>
          </div>
          <div className="flex items-center gap-4 text-content-muted">
            <a href="#" className="hover:text-brand-violet transition-colors" aria-label="Twitter">
              <Twitter className="w-4 h-4" />
            </a>
            <a href="#" className="hover:text-brand-violet transition-colors" aria-label="GitHub">
              <Github className="w-4 h-4" />
            </a>
            <a href="#" className="hover:text-brand-violet transition-colors" aria-label="LinkedIn">
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
