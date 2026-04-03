# Oweable - Technical Architecture & Project Documentation

## Project Overview
Oweable is an ultra-premium, dark-themed personal finance "command center" engineered for high-net-worth individuals and users demanding a ruthless, data-driven approach to debt elimination and wealth accumulation. Eschewing the gamified, bubbly aesthetics of traditional budgeting applications, Oweable delivers a sleek, professional, and aggressive UI designed for maximum financial visibility and velocity.

## Phase 1: Frontend Architecture & Design System

### Tech Stack
*   **Framework**: React 18 (Vite) - Client-Side Rendered (CSR) for maximum dashboard speed and responsiveness.
*   **Routing**: React Router DOM
*   **Styling**: Tailwind CSS
*   **State Management**: Zustand
*   **Icons**: Lucide React
*   **Charts**: Recharts
*   **Notifications**: Sonner

### Design System
*   **Theme**: Strict Dark Mode.
*   **Backgrounds**: `#0A0A0A` (Main), `#141414` (Widgets), `#1C1C1C` (Cards/Inputs)
*   **Borders**: `#262626` (Subtle dividers)
*   **Typography**: Inter (sans-serif) for primary text, JetBrains Mono for ledgers and financial data.
*   **Accent Colors**:
    *   **Indigo** (`#6366F1`): Primary actions, AI features, Debt Detonator.
    *   **Emerald** (`#34D399`): Positive cash flow, savings, wealth velocity.
    *   **Red** (`#EF4444`): Destructive actions, Subscription Sniper alerts, burn rate.
    *   **Amber** (`#F59E0B`): Premium highlights, "Ruthless ROI" branding.

### Core Features (The Arsenal)
1.  **Debt Detonator**: Algorithmic debt payoff timeline visualizing exact payoff dates and projected interest saved.
2.  **Subscription Sniper**: Active tracking of recurring expenses, flagging price hikes and unused services.
3.  **Wealth Velocity**: Tracking daily burn rate versus income rate to ensure positive cash flow momentum.
4.  **Tax Fortress**: Real-time liability tracking and fiscal year planning.
5.  **Citation Sniper**: High-urgency tracking for one-off penalties (tickets, fines) to prevent compounding fees.
6.  **Oweable AI**: A 24/7 Financial Advisor embedded directly into the dashboard.

---

## Phase 2: Backend Architecture & Data Flow

### 1. Core Infrastructure (Decoupled)
The Oweable frontend is built as a highly optimized Client-Side Rendered (CSR) application utilizing React 18 and Vite. Due to the inherent security constraints of CSR architectures, **no secret API keys, service credentials, or direct database queries shall reside within the React codebase.** 

To enforce strict separation of concerns and maintain bank-grade security, we will implement a decoupled backend architecture utilizing **Supabase (PostgreSQL)** as our primary relational database and authentication provider.

### 2. Authentication Flow & Data Isolation
We will implement **Supabase Auth** to manage user identity and session states. 
* The React frontend will handle the presentation of the login/registration UI.
* Upon successful authentication, the client receives a secure JSON Web Token (JWT).
* This JWT must be passed in the `Authorization` header of every subsequent data request.
* Supabase Row Level Security (RLS) policies will be strictly enforced at the database level, ensuring users can only query, mutate, or access their own isolated financial data.

### 3. The API Layer (Secure Executions)
Sensitive operations—specifically the Plaid Token Exchange and AI Financial Advisor prompts (OpenAI/Gemini)—require a secure execution environment isolated from the client. 
* We will deploy a lightweight, serverless API layer utilizing **Supabase Edge Functions** (or a dedicated Node.js/Express microservice).
* The React frontend will execute secure `fetch` calls to this API layer.
* The API layer will securely broker communications with third-party services (Plaid, LLMs) utilizing hidden, server-side environment variables, ensuring zero credential leakage to the client.

### 4. Data Model Blueprint
The PostgreSQL database will be structured to support high-performance financial querying. The foundational schema requires the following core tables:

*   **`users`**: `(id [uuid, pk], email [varchar], settings [jsonb], created_at [timestamp])`
*   **`accounts`**: `(id [uuid, pk], user_id [uuid, fk], plaid_item_id [varchar], institution_name [varchar], mask [varchar], balances [jsonb], updated_at [timestamp])`
*   **`transactions`**: `(id [uuid, pk], account_id [uuid, fk], amount [numeric], date [date], category [varchar], pending [boolean], created_at [timestamp])`
*   **`obligations`**: `(id [uuid, pk], user_id [uuid, fk], type [enum: bill, debt, citation], amount [numeric], due_date [date], status [varchar], metadata [jsonb])`
