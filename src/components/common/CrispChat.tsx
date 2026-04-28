import { useEffect } from 'react';

/**
 * Crisp Live Chat Integration
 * Adds Crisp chat widget to the app
 */
export default function CrispChat() {
  useEffect(() => {
    // Get Crisp ID from environment or use demo ID
    const CRISP_ID = import.meta.env.VITE_CRISP_ID || '';
    
    if (!CRISP_ID) return;

    // Load Crisp script
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_ID;

    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    document.head.appendChild(script);

    // Configure Crisp
    window.$crisp.push(['safe', true]);
    window.$crisp.push(['set', 'session:segments', [['website']]]);

    return () => {
      // Cleanup on unmount
      if (window.$crisp) {
        window.$crisp = [];
      }
    };
  }, []);

  return null;
}

// TypeScript declarations for Crisp
declare global {
  interface Window {
    $crisp: any[];
    CRISP_WEBSITE_ID: string;
  }
}
