import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App.tsx';
import './index.css';

// 🛡️ Oweable Security & Error Monitoring (MCP Compatible)
Sentry.init({
  dsn: "https://ce1fd32e214219aee8f8831399acaf67@o4511101036134400.ingest.us.sentry.io/4511101043343360",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, 
  // MCP Monitoring
  sendDefaultPii: true,
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
