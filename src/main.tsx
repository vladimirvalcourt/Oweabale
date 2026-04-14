import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App.tsx';
import 'sonner/dist/styles.css';
import './index.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  const devHint = import.meta.env.DEV
    ? '<p style="font-size:0.75rem;color:#71717a;margin-top:0.75rem;max-width:28rem;">Developer: add your Supabase project URL and anon key to the environment used by Vite.</p>'
    : '';
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#09090b;font-family:system-ui,sans-serif;color:#f4f4f5;text-align:center;padding:2rem;">
      <div style="max-width:24rem;">
        <p style="font-size:1rem;font-weight:600;">This app can&apos;t load right now</p>
        <p style="font-size:0.875rem;color:#a1a1aa;margin-top:0.5rem;line-height:1.5;">Please try again in a moment. If it keeps happening, contact support.</p>
        ${devHint}
      </div>
    </div>`;
  throw new Error(
    import.meta.env.DEV
      ? 'Missing Supabase credentials. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for local dev.'
      : 'Application configuration error.',
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
