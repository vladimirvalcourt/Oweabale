# Critical Pending Objectives 

This file tracks major architectural requirements that have been deferred for later implementation but are **essential** for production release.

## 1. Authentication & Security Layer (High Priority)
- **Supabase Auth Gateway (`/auth`)**: Build a secure, brutalist-styled Login and Sign-Up portal supporting Email & Password authentication.
- **Session State Management**: Implement Supabase `onAuthStateChange` listener to inject the authenticated user's UUID into the Zustand `useStore`.
- **Data Isolation**: Ensure frontend store only fetches and caches PostgreSQL data belonging exactly to the authenticated UUID. 
- **Route Protection (Auth Guard)**: Wrap all internal dashboard routes (`/dashboard`, `/bills`, `/settings`) with an `AuthGuard` component that automatically intercepts and redirects unauthenticated traffic back to `/auth`.

## 2. Plaid Bank API Integration (High Priority)
- **Edge Functions**: Deploy a secure Supabase Edge Function to securely interface with the Plaid API to spin up `link_token` instances.
- **Client Integration**: Add Plaid Link flow into the `/settings` or `/onboarding` page to allow users to securely authenticate their bank accounts without storing credentials.
- **Webhook Processing**: Create listeners that automatically ingest, tokenize, and categorize recurring bills directly from checking account data dumps.
