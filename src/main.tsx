import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App.tsx';
import 'sonner/dist/styles.css';
import './index.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#09090b;font-family:monospace;color:#ef4444;text-align:center;padding:2rem;">
      <div>
        <p style="font-size:1rem;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;">Missing Configuration</p>
        <p style="font-size:0.75rem;color:#71717a;margin-top:0.5rem;">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.</p>
      </div>
    </div>`;
  throw new Error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
