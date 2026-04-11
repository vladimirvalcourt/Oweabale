import { useEffect, useState } from 'react';

/**
 * Web equivalent of obscuring sensitive UI when the app goes to the background:
 * covers financial shell content while the tab is hidden (alt-tab, app switcher, etc.).
 */
export function PrivacyScreenWhenHidden() {
  const [hidden, setHidden] = useState(() =>
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  );

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (!hidden) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#08090A] text-zinc-500"
      aria-hidden="true"
    >
      <p className="text-[10px] font-mono uppercase tracking-[0.25em]">Oweable — hidden for privacy</p>
    </div>
  );
}
