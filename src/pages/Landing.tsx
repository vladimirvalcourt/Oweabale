import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { TransitionLink } from '../components/common';
import { BrandWordmark } from '../components/common';
import { useSEO } from '../hooks';
import { useAuth } from '../hooks';

interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
  style?: React.CSSProperties;
}

function WordsPullUp({ text, className = '', showAsterisk = false, style }: WordsPullUpProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(' ');

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`} style={style}>
      {words.map((word, index) => {
        const isLast = index === words.length - 1;
        return (
          <motion.span
            key={`${word}-${index}`}
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="relative inline-block"
            style={{ marginRight: isLast ? 0 : '0.25em' }}
          >
            {word}
            {showAsterisk && isLast && (
              <span className="absolute top-[0.65em] -right-[0.3em] text-[0.31em]">*</span>
            )}
          </motion.span>
        );
      })}
    </div>
  );
}

const navItems = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Support', href: '/support' },
  { label: 'Sign in', href: '/auth' },
];

export default function Landing() {
  useSEO({
    title: 'Oweable — Stop guessing what you owe',
    description:
      'Oweable helps you track bills, debt, subscriptions, due dates, and uneven income in one clear Pay List.',
    ogTitle: 'Oweable — Stop guessing what you owe',
    ogDescription:
      'A clearer way to see what is due, what is behind, and what to pay first.',
    canonical: 'https://www.oweable.com/',
    ogImage: 'https://www.oweable.com/og-image.svg',
  });

  const { user: authUser } = useAuth();
  const primaryHref = authUser?.id ? '/dashboard' : '/auth';

  return (
    <div className="min-h-screen bg-surface-base text-content-primary selection:bg-content-primary/15">
      <main>
        <section className="h-screen w-full bg-black p-2">
          <div className="relative h-full w-full overflow-hidden rounded-2xl md:rounded-[2rem]">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover opacity-80"
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
            />
            <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.45] mix-blend-overlay" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/5 to-black/70" />

            <nav className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
              <div className="flex items-center gap-3 rounded-b-2xl bg-black px-4 py-2 sm:gap-6 md:gap-10 md:rounded-b-3xl md:px-8">
                <TransitionLink to="/" className="hidden items-center text-[#E1E0CC] sm:inline-flex">
                  <BrandWordmark
                    logoClassName="h-4 w-4"
                    textClassName="text-xs font-semibold uppercase text-[#E1E0CC]"
                  />
                </TransitionLink>
                {navItems.map((item) => {
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      className="text-[10px] text-[#E1E0CC]/70 transition-colors hover:text-[#E1E0CC] sm:text-xs md:text-sm"
                    >
                      {item.label}
                    </a>
                  );
                })}
              </div>
            </nav>

            <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 sm:px-6 md:px-10">
              <div className="grid grid-cols-12 items-end gap-4">
                <div className="col-span-12 lg:col-span-8">
                  <h1
                    className="font-medium leading-[0.85] tracking-[-0.07em] text-[22vw] sm:text-[20vw] md:text-[18vw] lg:text-[15vw] xl:text-[14vw]"
                    style={{ color: '#E1E0CC' }}
                  >
                    <WordsPullUp text="Oweable" showAsterisk />
                  </h1>
                </div>

                <div className="col-span-12 flex flex-col gap-5 pb-6 lg:col-span-4 lg:pb-10">
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-xl text-sm text-[#E1E0CC]/80 sm:text-base"
                    style={{ lineHeight: 1.25 }}
                  >
                    Stop guessing what you owe. Oweable gives you one clear Pay List for bills, debt, subscriptions, due dates, and obligations that are easy to miss.
                  </motion.p>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col gap-3 sm:flex-row"
                  >
                    <TransitionLink
                      to={primaryHref}
                      className="group inline-flex items-center gap-2 self-start rounded-full bg-[#E1E0CC] py-1 pl-5 pr-1 text-sm font-medium text-black transition-all hover:gap-3 sm:text-base"
                    >
                      {authUser?.id ? 'Open Oweable' : 'Start free'}
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                        <ArrowRight className="h-4 w-4 text-[#E1E0CC]" />
                      </span>
                    </TransitionLink>
                    <TransitionLink
                      to="/pricing"
                      className="inline-flex h-11 items-center justify-center self-start rounded-full border border-[#E1E0CC]/25 px-5 text-sm font-medium text-[#E1E0CC] transition-colors hover:bg-[#E1E0CC]/10 sm:h-12"
                    >
                      View pricing
                    </TransitionLink>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
