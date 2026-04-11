import React, { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, Video, FileText, ArrowRight, CheckCircle2, PlayCircle, ShieldCheck, Target, Calculator, TrendingUp, CreditCard, Brain, Home, Receipt, Briefcase, Shield, ChevronDown } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CollapsibleModule } from '../components/CollapsibleModule';
import { supabase } from '../lib/supabase';

const MODULES = [
  {
    id: 'intro',
    title: 'Finance 101: The Core Protocol',
    duration: '45 MIN',
    category: 'ESSENTIALS',
    icon: ShieldCheck,
    lessons: [
      { id: '1-1', title: 'The 50/30/20 Rule Decoded', type: 'article', readTime: '5 MIN', content: "The 50/30/20 rule is a straightforward budgeting method that can help you manage your money simply. The basic rule of thumb is to divide your after-tax income and allocate it to spend: 50% on needs, 30% on wants, and socking away 20% to savings.\n\nNeeds are bills that you absolutely must pay and are the things necessary for survival. These include rent or mortgage payments, car payments, groceries, insurance, health care, minimum debt payment, and utilities.\n\nWants are all the things you spend money on that are not absolutely essential. This includes dinner and movies out, that new handbag, tickets to sporting events, vacations, the latest electronic gadget, and ultra-high-speed internet.\n\nSavings is the money you sock away for your future." },
      { id: '1-2', title: 'Why Emergency Funds Are Mandatory', type: 'article', readTime: '12 MIN', content: "An emergency fund is a stash of money set aside to cover the financial surprises life throws your way. These unexpected events can be stressful and costly:\n- Job loss\n- Medical or dental emergency\n- Unexpected car repairs\n- Boiler breaking down\n\nHaving an emergency fund creates a financial buffer that can keep you afloat in a time of need without having to rely on credit cards or high-interest loans." },
      { id: '1-3', title: 'Tracking vs. Budgeting', type: 'article', readTime: '8 MIN', content: "Tracking is looking backwards. Budgeting is looking forwards.\n\nWhen you track your expenses, you are simply logging what you have already spent. While this is a critical first step to understand your baseline, it does not change your future behavior.\n\nBudgeting is giving every dollar a job BEFORE you spend it. Oweable's protocol requires you to define exactly where your money goes on the 1st of the month, so you aren't wondering where it went on the 31st." },
    ]
  },
  {
    id: 'debt',
    title: 'Debt Annihilation Strategy',
    duration: '1 HR 15 MIN',
    category: 'TACTICS',
    icon: Target,
    lessons: [
      { id: '2-1', title: 'Snowball vs. Avalanche Methods', type: 'article', readTime: '15 MIN', content: "The Debt Snowball method involves paying off the smallest debts first to get psychological wins, while paying the minimum on everything else.\n\nThe Debt Avalanche method involves paying off the debt with the highest interest rate first, mathematically saving you the most money over time.\n\nChoose the one that keeps you motivated. If you need quick wins, use Snowball. If you are extremely disciplined, use Avalanche." },
      { id: '2-2', title: 'Negotiating Lower APRs', type: 'article', readTime: '10 MIN', content: "Most people don't know this, but you can simply call your credit card company and ask for a lower APR. If you have been a customer for at least a year and pay your minimums on time, there is a 70% chance they will lower your rate if you tell them you are considering a balance transfer to a competitor." },
      { id: '2-3', title: 'Good Debt vs. Bad Debt', type: 'article', readTime: '18 MIN', content: "Good debt is money borrowed to purchase an asset that will appreciate in value or generate income (like a mortgage or reasonable student loans).\n\nBad debt is money borrowed to purchase depreciating assets or consumption (like credit card debt for a vacation, or a 7% interest auto loan on a brand new depreciating vehicle)." },
    ]
  },
  {
    id: 'freelance',
    title: '1099 & Freelance Survival Guide',
    duration: '2 HRS',
    category: 'BUSINESS',
    icon: Calculator,
    lessons: [
      { id: '3-1', title: 'Quarterly Estimated Taxes Overview', type: 'article', readTime: '20 MIN', content: "If you expect to owe more than $1,000 in taxes at the end of the year from freelance or 1099 work, the IRS requires you to pay estimated taxes quarterly. Missing these payments can result in penalties.\n\nOweable calculates this for you automatically in the Taxes module." },
      { id: '3-2', title: 'Write-Offs You Are Probably Missing', type: 'article', readTime: '15 MIN', content: "Did you know a portion of your home internet, cell phone bill, and even rent can be written off if you have a dedicated home office?\n\nIf you use your personal vehicle for gig work, you can deduct standard mileage. Always track these in Oweable's Freelance Vault to reduce your taxable liability." },
      { id: '3-3', title: 'Separating Business & Personal Accounts', type: 'article', readTime: '10 MIN', content: "The number one mistake freelancers make is co-mingling funds. Always open a completely separate checking account for your 1099 income. When a client pays you, it goes to the business account. Then, you transfer a 'salary' to your personal account. This ensures an audit trail that the IRS loves." },
    ]
  },
  {
    id: 'investing',
    title: 'Wealth Architecture',
    duration: '2.5 HRS',
    category: 'INVESTING',
    icon: TrendingUp,
    lessons: [
      { id: '4-1', title: 'Roth IRA vs 401(k)', type: 'article', readTime: '15 MIN', content: "A 401(k) is typically offered by your employer and allows you to contribute pre-tax dollars, lowering your taxable income today. A Roth IRA is an individual account you open yourself using after-tax dollars, meaning you pay zero taxes when you withdraw the money in retirement.\n\nThe ultimate strategy: Maximize any employer 401(k) match (it is literally free money), then aggressively fund your Roth IRA." },
      { id: '4-2', title: 'Index Funds vs Single Stocks', type: 'article', readTime: '20 MIN', content: "Single stocks are like betting on a single horse in a race. If they win, you win big, but if they break a leg, you lose everything.\n\nAn Index Fund (like the S&P 500) is like buying a piece of every single horse in the race. You are virtually guaranteed to win over a long enough time horizon. Over 90% of professional stock pickers fail to beat the index over a 15-year period. Buy the index, hold the index, get rich." },
      { id: '4-3', title: 'The Miracle of Compound Interest', type: 'article', readTime: '10 MIN', content: "Compound interest is the 8th wonder of the world. It is the snowball effect applied to your money. If you invest $500 a month starting at age 25, assuming a 10% historical market return, you will have $2.8 million by age 65. If you wait until you are 35 to start, you will only have $1.1 million. Those 10 years cost you 1.7 million dollars. Start today." },
    ]
  },
  {
    id: 'credit',
    title: 'Credit Hack Matrix',
    duration: '1 HR 40 MIN',
    category: 'CREDIT',
    icon: CreditCard,
    lessons: [
      { id: '5-1', title: 'How FICO Scores Actually Work', type: 'article', readTime: '12 MIN', content: "Your FICO score is not a measure of how wealthy you are. It is an 'I Love Debt' score. It measures exactly one thing: How reliably you borrow money and pay it back.\n\nYour score is comprised of:\n35% Payment History\n30% Amounts Owed (Utilization)\n15% Length of Credit History\n10% New Credit\n10% Credit Mix" },
      { id: '5-2', title: 'The Credit Card Point Game', type: 'article', readTime: '15 MIN', content: "Credit card companies offer massive sign-up bonuses to acquire you. If you pay your balance in full every single month, you can effectively travel the world for free by routing all your normal living expenses through cards like Chase Sapphire or Amex Platinum.\n\nWARNING: If you carry a balance, the 24% interest negates the value of the 2% points instantly. Only play this game if you are financially disciplined." },
    ]
  },
  {
    id: 'psychology',
    title: 'Money Psychology',
    duration: '3 HRS',
    category: 'MINDSET',
    icon: Brain,
    lessons: [
      { id: '6-1', title: 'The Lifestyle Creep Trap', type: 'article', readTime: '12 MIN', content: "Lifestyle creep happens when your expenses rise exactly in tandem with your income. You make an extra $10k a year, but you upgrade your apartment, lease a nicer car, and suddenly that $10k vanishes.\n\nThe wealthy create a wedge between what they earn and what they spend. Whenever you get a raise, allocate 50% of the raise immediately to investments before you ever 'feel' the money." },
      { id: '6-2', title: 'Assets vs Liabilities', type: 'article', readTime: '10 MIN', content: "Robert Kiyosaki defined it perfectly:\n\nAn Asset is something that puts money in your pocket (stocks, cash-flowing real estate, a profitable business).\n\nA Liability is something that takes money out of your pocket (a car loan, maxed credit cards, a boat).\n\nPoor people buy liabilities. The middle class buys liabilities they think are assets. The rich buy assets." },
    ]
  },
  {
    id: 'real-estate',
    title: 'Real Estate & Leverage',
    duration: '2 HRS 15 MIN',
    category: 'REAL ESTATE',
    icon: Home,
    lessons: [
      { id: '7-1', title: 'House Hacking 101', type: 'article', readTime: '12 MIN', content: "House Hacking is the ultimate cheat code for living for free. By purchasing a multi-family property (like a duplex or triplex) with a low-down-payment FHA loan (3.5% down), you can live in one unit and rent out the others. The rent from your tenants covers your mortgage, allowing you to live absolutely free while building equity in a major asset." },
      { id: '7-2', title: 'Mastering Mortgages: Fixed vs ARM', type: 'article', readTime: '15 MIN', content: "A Fixed-Rate mortgage locks your interest rate in for 15 or 30 years. Your payment mathematically cannot go up, acting as an incredible hedge against inflation. An ARM (Adjustable Rate Mortgage) offers a lower initial rate, but resets later—which causes massive foreclosures during economic downturns. Always prioritize 30-year fixed-rate debt in an inflationary environment." }
    ]
  },
  {
    id: 'tax-optimization',
    title: 'Advanced Tax Optimization',
    duration: '1 HR 45 MIN',
    category: 'TAX STRATEGY',
    icon: Receipt,
    lessons: [
      { id: '8-1', title: 'The S-Corp Secret', type: 'article', readTime: '18 MIN', content: "If you operate as a sole proprietor or LLC and net over $80,000 a year, you are getting destroyed by the 15.3% Self-Employment tax. By officially bleeding your LLC into an S-Corporation tax designation, you pay yourself a 'reasonable salary' (subject to SE tax) and take the rest as an 'Owner's Draw' (exempt from SE tax), saving literally thousands of dollars every year." },
      { id: '8-2', title: 'Tax-Loss Harvesting', type: 'article', readTime: '14 MIN', content: "Nobody wins 100% of the time in the stock market. But the wealthy turn their losses into tax deductions. Tax-loss harvesting is the practice of selectively selling off the stocks in your portfolio that have lost value right before the end of the year. You use these losses to legally cancel out the capital gains taxes you owe on your winning stocks. It's perfectly legal, and every billionaire does it." }
    ]
  },
  {
    id: 'income',
    title: 'Income Expansion',
    duration: '1 HR 30 MIN',
    category: 'OFFENSE',
    icon: Briefcase,
    lessons: [
      { id: '9-1', title: 'Value-Based Pricing for Freelancers', type: 'article', readTime: '20 MIN', content: "Charging by the 'hour' traps you in the rat race. You are penalized for being fast and efficient. Value-Based Pricing means you charge based on the exact ROI you provide the client. If your new website design makes the client $100,000 richer this year, you don't charge them $50/hour to build it. You charge them $10,000 for the project. Disconnect your time from your income." },
      { id: '9-2', title: 'Salary Negotiation Scripts', type: 'article', readTime: '15 MIN', content: "Never walk into a negotiation asking for money because you 'need' it or 'have been there a long time.' Companies only care about value. You must walk in armed with localized data. 'In the last 12 months, I led project X which increased revenue by 14%. Current market data for this role shows a baseline of $95k. I would like to adjust my compensation to match this market value given the ROI I've generated.' Math removes emotions." }
    ]
  },
  {
    id: 'estate',
    title: 'Estate Protection & Insurance',
    duration: '2 HRS',
    category: 'PROTECTION',
    icon: Shield,
    lessons: [
      { id: '10-1', title: 'Trusts vs. Wills', type: 'article', readTime: '15 MIN', content: "A Will explicitly tells the government how to distribute your assets when you die—but it still goes through Probate Court, which is public, slow, and expensive. A Living Trust literally transfers ownership of your assets into a legal entity while you are alive. When you die, there is no court. The assets automatically and privately pass to your heirs. The wealthy use Trusts." },
      { id: '10-2', title: 'The Whole Life Insurance Trap', type: 'article', readTime: '18 MIN', content: "Financial advisors make massive commissions selling 'Whole Life Insurance' because the premiums are exorbitant. They pitch it as an 'investment.' It's a terrible investment. For 99% of people, the mathematically superior move is 'Buy Term and Invest the Difference.' Buy a cheap 20-year Term Life policy to protect your family, and put the thousands of dollars you saved into an S&P 500 Index Fund." }
    ]
  }
];

export default function Education() {
  const [selectedModule, setSelectedModule] = useState(MODULES[0].id);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  useEffect(() => {
    async function loadProgress() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('completed_lessons')
        .eq('id', user.id)
        .single();
      if (data?.completed_lessons) {
        setCompletedLessons(data.completed_lessons as string[]);
      }
    }
    loadProgress();
  }, []);

  const getModuleProgress = (mod: typeof MODULES[0]): number => {
    if (mod.lessons.length === 0) return 0;
    const done = mod.lessons.filter(l => completedLessons.includes(l.id)).length;
    return Math.round((done / mod.lessons.length) * 100);
  };

  const openLesson = (lesson: any) => {
    setActiveLesson(lesson);
    setViewerOpen(true);
  };

  const markComplete = async () => {
    if (!activeLesson) {
      setViewerOpen(false);
      return;
    }

    if (!completedLessons.includes(activeLesson.id)) {
      const updated = [...completedLessons, activeLesson.id];
      setCompletedLessons(updated);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ completed_lessons: updated })
          .eq('id', user.id);
      }
    }

    setViewerOpen(false);
  };

  const activeModule = MODULES.find(m => m.id === selectedModule);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content-primary">Financial Academy</h1>
          <p className="text-sm text-content-tertiary mt-1">Short lessons you can finish in one sitting.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Sidebar */}
        <div className="space-y-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-between px-2 pb-2 group"
          >
            <h2 className="text-xs font-sans font-medium text-zinc-500 group-hover:text-white transition-colors">Available courses</h2>
            <ChevronDown className={`w-4 h-4 text-zinc-500 group-hover:text-white transition-all duration-300 ${isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence initial={false}>
            {isSidebarOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 overflow-hidden"
              >
                {MODULES.map((mod) => {
                  const Icon = mod.icon;
                  const isSelected = selectedModule === mod.id;
                  const progress = getModuleProgress(mod);
                  return (
                    <button
                      key={mod.id}
                      onClick={() => setSelectedModule(mod.id)}
                      className={`w-full flex items-start gap-4 p-4 rounded-sm border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-500/50 bg-indigo-500/5 bg-surface-base'
                          : 'border-surface-border bg-surface-elevated hover:bg-surface-base'
                      }`}
                    >
                      <div className={`p-2 rounded-sm shrink-0 ${isSelected ? 'bg-indigo-500/10 text-indigo-400' : 'bg-surface-base border border-surface-border text-zinc-400'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-content-primary'}`}>{mod.title}</h3>
                          {!isSelected && <span className="text-xs text-content-tertiary shrink-0 ml-2">{mod.duration}</span>}
                        </div>

                        <AnimatePresence initial={false}>
                          {isSelected && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="flex items-center justify-between gap-2 mt-2">
                                <span className="text-xs font-sans font-medium text-content-tertiary">{mod.category}</span>
                                <span className="text-xs text-content-tertiary">{mod.duration}</span>
                              </div>

                              {/* Progress Bar */}
                              <div className="mt-4">
                                <div className="flex justify-between text-xs text-content-tertiary mb-1">
                                  <span>Progress</span>
                                  <span className="font-mono tabular-nums">{progress}%</span>
                                </div>
                                <div className="h-1 w-full bg-surface-base overflow-hidden rounded-full">
                                  <div
                                    className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Selected Module Content */}
        <div className="lg:col-span-2">
          {activeModule && (() => {
            const progress = getModuleProgress(activeModule);
            return (
              <CollapsibleModule
                title={activeModule.title}
                icon={GraduationCap}
                extraHeader={<span className="text-xs font-sans font-medium text-content-tertiary px-2 py-0.5 border border-surface-border rounded-sm">{activeModule.category}</span>}
              >
                <div className="p-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-sans font-semibold text-content-secondary mb-4">Curriculum</h3>
                    <div className="space-y-3">
                      {activeModule.lessons.map((lesson, idx) => {
                        const isDone = completedLessons.includes(lesson.id);
                        return (
                          <div
                            key={lesson.id}
                            onClick={() => openLesson(lesson)}
                            className="group flex items-center justify-between p-4 bg-surface-base border border-surface-border rounded-sm hover:border-zinc-600 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-1.5 rounded-sm ${isDone ? 'text-emerald-500' : 'text-zinc-500 group-hover:text-white transition-colors'}`}>
                                {isDone ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                              </div>
                              <div>
                                <p className="text-xs text-content-tertiary">Chapter {idx + 1}</p>
                                <p className="text-sm font-semibold text-content-primary mt-0.5">{lesson.title}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-content-tertiary px-2 py-1 bg-surface-elevated border border-surface-border hidden sm:block">
                                {lesson.readTime}
                              </span>
                              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-8 pt-6 border-t border-surface-border flex justify-end">
                      <button
                        type="button"
                        onClick={() => openLesson(activeModule.lessons[0])}
                        className="px-6 py-2.5 rounded-sm bg-brand-cta hover:bg-brand-cta-hover text-white text-sm font-sans font-semibold shadow-sm transition-colors flex items-center gap-2"
                      >
                        <PlayCircle className="w-4 h-4 shrink-0" aria-hidden />
                        {progress === 0 ? 'Start course' : progress === 100 ? 'Review course' : 'Resume course'}
                      </button>
                    </div>
                  </div>
                </div>
              </CollapsibleModule>
            );
          })()}
        </div>
      </div>

      {/* Lesson Viewer Modal */}
      <Transition show={viewerOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setViewerOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-sm bg-surface-base border border-surface-border text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                  {activeLesson && (
                    <>
                      <div className="bg-surface-elevated px-4 py-3 border-b border-surface-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {activeLesson.type === 'video' ? <PlayCircle className="w-5 h-5 text-indigo-400" /> : <FileText className="w-5 h-5 text-indigo-400" />}
                          <Dialog.Title as="h3" className="text-sm font-semibold leading-6 text-content-primary">
                            {activeLesson.title}
                          </Dialog.Title>
                        </div>
                        <button
                          onClick={() => setViewerOpen(false)}
                          className="text-zinc-500 hover:text-white"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="px-6 py-8 bg-surface-base">
                        <div className="prose prose-invert max-w-none text-zinc-300 text-sm leading-relaxed font-sans whitespace-pre-wrap">
                          {activeLesson.content}
                        </div>
                      </div>

                      <div className="bg-surface-elevated border-t border-surface-border px-4 py-4 sm:px-6 flex justify-end">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 justify-center rounded-sm bg-indigo-500 px-6 py-2.5 text-xs font-mono font-bold uppercase tracking-widest text-white hover:bg-indigo-400 focus:outline-none transition-colors"
                          onClick={markComplete}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {completedLessons.includes(activeLesson.id) ? 'Continue' : 'Mark as Complete'}
                        </button>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
