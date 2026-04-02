import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Receipt, TrendingDown, Scan, ShieldCheck, Wallet, PieChart, CheckCircle2 } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="border-b border-[#262626] bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg leading-none">O</span>
            </div>
            <span className="font-semibold text-xl tracking-tight text-[#FAFAFA]">
              Oweable
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/dashboard" 
              className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link 
              to="/dashboard" 
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0A0A0A] to-[#0A0A0A] -z-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
            The ultimate bill management platform
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-tight">
            Take absolute control of your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">monthly bills</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop stressing about due dates. Oweable helps you track expenses, crush debt, and manage your entire financial life in one beautiful, secure dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/dashboard" 
              className="px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-base font-medium transition-all flex items-center gap-2 w-full sm:w-auto justify-center shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)]"
            >
              Open Dashboard <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-[#111111] border-y border-[#262626]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Everything you need to manage your money</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">Powerful tools designed to give you clarity and confidence in your financial decisions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8 hover:border-indigo-500/50 transition-colors group">
              <div className="w-12 h-12 bg-[#1C1C1C] border border-[#262626] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Receipt className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Bill Tracking</h3>
              <p className="text-zinc-400 leading-relaxed">
                Never miss a payment again. Track upcoming bills, set auto-pay reminders, and view your monthly obligations at a glance.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8 hover:border-emerald-500/50 transition-colors group">
              <div className="w-12 h-12 bg-[#1C1C1C] border border-[#262626] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingDown className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Debt Payoff Strategies</h3>
              <p className="text-zinc-400 leading-relaxed">
                Visualize your path to becoming debt-free. Compare Snowball vs. Avalanche methods to see how much interest you can save.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8 hover:border-cyan-500/50 transition-colors group">
              <div className="w-12 h-12 bg-[#1C1C1C] border border-[#262626] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Scan className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Receipt Scanning</h3>
              <p className="text-zinc-400 leading-relaxed">
                Upload photos of receipts or PDF invoices. Our built-in OCR automatically extracts the merchant, amount, and due date.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8 hover:border-purple-500/50 transition-colors group">
              <div className="w-12 h-12 bg-[#1C1C1C] border border-[#262626] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Wallet className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Income & Assets</h3>
              <p className="text-zinc-400 leading-relaxed">
                Track your salary, freelance income, and investments. Get a complete picture of your net worth in real-time.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8 hover:border-pink-500/50 transition-colors group">
              <div className="w-12 h-12 bg-[#1C1C1C] border border-[#262626] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <PieChart className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Visual Reports</h3>
              <p className="text-zinc-400 leading-relaxed">
                Understand your spending habits with beautiful, interactive charts. See exactly where your money goes every month.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8 hover:border-amber-500/50 transition-colors group">
              <div className="w-12 h-12 bg-[#1C1C1C] border border-[#262626] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Bank-Grade Security</h3>
              <p className="text-zinc-400 leading-relaxed">
                Your financial data is encrypted end-to-end. We use industry-standard security practices to keep your information safe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it helps section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Stop wondering where your money went.</h2>
              <p className="text-lg text-zinc-400 leading-relaxed">
                Managing bills shouldn't be a part-time job. Oweable centralizes your financial obligations so you can focus on living your life, not updating spreadsheets.
              </p>
              <ul className="space-y-4">
                {[
                  'Avoid late fees with proactive due date tracking',
                  'Identify forgotten subscriptions draining your account',
                  'Create realistic budgets based on actual spending',
                  'Set and achieve meaningful savings goals'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-indigo-500 shrink-0" />
                    <span className="text-zinc-300">{item}</span>
                  </li>
                ))}
              </ul>
              <Link 
                to="/dashboard" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1C1C1C] hover:bg-[#262626] border border-[#333333] text-white rounded-lg text-sm font-medium transition-colors"
              >
                Try Oweable for free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex-1 w-full">
              <div className="relative rounded-2xl overflow-hidden border border-[#262626] shadow-2xl bg-[#141414] aspect-[4/3] flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                {/* Abstract Dashboard Representation */}
                <div className="w-3/4 h-3/4 flex flex-col gap-4 p-6">
                  <div className="flex gap-4 h-1/3">
                    <div className="flex-1 bg-[#1C1C1C] rounded-lg border border-[#262626] p-4 flex flex-col justify-between">
                      <div className="w-8 h-2 bg-zinc-700 rounded"></div>
                      <div className="w-24 h-6 bg-indigo-500/50 rounded"></div>
                    </div>
                    <div className="flex-1 bg-[#1C1C1C] rounded-lg border border-[#262626] p-4 flex flex-col justify-between">
                      <div className="w-8 h-2 bg-zinc-700 rounded"></div>
                      <div className="w-24 h-6 bg-emerald-500/50 rounded"></div>
                    </div>
                  </div>
                  <div className="flex-1 bg-[#1C1C1C] rounded-lg border border-[#262626] p-4 flex items-end gap-2">
                    {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                      <div key={i} className="flex-1 bg-indigo-500/40 rounded-t-sm" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-indigo-900/20 border-t border-indigo-500/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl font-bold tracking-tight mb-6">Ready to master your finances?</h2>
          <p className="text-xl text-indigo-200/70 mb-10">
            Join thousands of users who have taken control of their bills and crushed their debt with Oweable.
          </p>
          <Link 
            to="/dashboard" 
            className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-lg font-medium transition-all inline-flex items-center gap-2 shadow-lg shadow-indigo-500/25"
          >
            Get Started Now <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A0A0A] border-t border-[#262626] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs leading-none">O</span>
            </div>
            <span className="font-semibold text-lg tracking-tight text-[#FAFAFA]">
              Oweable
            </span>
          </div>
          <p className="text-sm text-zinc-500">
            &copy; {new Date().getFullYear()} Oweable Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-zinc-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
