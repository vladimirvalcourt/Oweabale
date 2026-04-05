# Oweable - Technical Architecture & Project Documentation

## Project Overview
Oweable is an ultra-premium, dark-themed personal finance "command center" engineered for high-net-worth individuals and users demanding a ruthless, data-driven approach to debt elimination and wealth accumulation. Eschewing the gamified, bubbly aesthetics of traditional budgeting applications, Oweable delivers a sleek, professional, and aggressive UI designed for maximum financial visibility and velocity.

## Phase 1: Frontend Architecture & Design System

### Tech Stack
*   **Framework**: React 18 (Vite) - Client-Side Rendered (CSR) for maximum dashboard speed and responsiveness.
*   **Routing**: React Router DOM
*   **Styling**: Vanilla CSS (with Tailwind CSS for utility-first layout)
*   **State Management**: Zustand (Integrated with Supabase for persistence)
*   **Icons**: Streamline Icons (Premium integration)
*   **Charts**: Recharts
*   **Notifications**: Sonner

### Design System
*   **Theme**: Strict Dark Mode.
*   **Backgrounds**: `#0A0A0A` (Main), `#141414` (Widgets), `#1C1C1C` (Cards/Inputs)
*   **Borders**: `#262626` (Subtle dividers)
*   **Typography**: Inter (sans-serif) for primary text, JetBrains Mono for ledgers and financial data.
*   **Accent Colors**:
    *   **Indigo** (`#6366F1`): Primary actions, Debt Detonator.
    *   **Emerald** (`#34D399`): Positive cash flow, savings, wealth velocity.
    *   **Red** (`#EF4444`): Destructive actions, Subscription Sniper alerts, burn rate.
    *   **Amber** (`#F59E0B`): Premium highlights, "Ruthless ROI" branding.

### Core Features (The Arsenal)
1.  **Debt Detonator**: Algorithmic debt payoff timeline visualizing exact payoff dates and projected interest saved.
2.  **Subscription Sniper**: Active tracking of recurring expenses, flagging price hikes and unused services.
3.  **Wealth Velocity**: Tracking daily burn rate versus income rate to ensure positive cash flow momentum.
4.  **Tax Fortress**: Real-time liability tracking and fiscal year planning.
5.  **Citation Sniper**: High-urgency tracking for one-off penalties (tickets, fines) to prevent compounding fees.
6.  **Net Worth Tracker**: Comprehensive overview of assets vs liabilities with real-time delta tracking.

---

## Phase 2: Backend Architecture & Data Flow

### 1. Core Infrastructure (Secure & Decoupled)
The Oweable frontend is a highly optimized Client-Side Rendered (CSR) application. To maintain bank-grade security, **no secret API keys or direct database queries reside within the client-side codebase.** All data operations are managed through the Supabase client with strict security protocols.

### 2. Database & Persistence (Supabase)
We utilize **Supabase (PostgreSQL)** as our primary relational database and authentication provider.
*   **Data Synchronization**: The Zustand store is synchronized with Supabase tables to ensure a seamless "offline-first" feel with real-time persistence.
*   **Row Level Security (RLS)**: Strictly enforced at the database level. Users can only access, mutate, or query their own isolated financial records.
*   **Schema**: Optimized for performance with specialized tables for `accounts`, `transactions`, `obligations`, and `user_profiles`.

### 3. Security & Authentication
*   **Supabase Auth**: Manages user identity and session states via secure JWTs.
*   **Server-Side Logic**: Sensitive operations like Plaid token exchanges or complex financial calculations are handled via **Supabase Edge Functions**, ensuring zero credential leakage to the client.

### 4. Data Model Blueprint
The PostgreSQL database is structured for high-performance financial querying:
*   **`profiles`**: User-specific settings, encryption keys, and preferences.
*   **`accounts`**: Linked financial accounts (via Plaid or manual entry).
*   **`transactions`**: Granular ledger of all debits and credits.
*   **`obligations`**: Tracking for bills, debts, and citations with status monitoring.
*   **`goals`**: Financial milestones and target tracking coordinates.
