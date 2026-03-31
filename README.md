# Oweable - Financial Dashboard

Oweable is a top-tier, production-ready financial dashboard designed to help users track their net worth, manage bills, pay off debts, and monitor subscriptions.

## 🚀 Tech Stack

- **Framework:** React 18 (via Vite)
  - *Note: While the architecture follows Next.js App Router principles (feature-based routing, strict boundaries), Vite is used as the bundler for optimal performance in this specific sandbox environment.*
- **Routing:** React Router DOM
- **State Management:** Zustand
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Notifications:** Sonner
- **Charts:** Recharts

## 📁 Folder Structure

The codebase follows a scalable, feature-based architecture typical of Enterprise SaaS applications:

```text
/src
  /components       # Shared, reusable UI components
    /ui             # Generic components (Buttons, Cards, Inputs)
    /layout         # App layout, Sidebar, Header
  /features         # Feature-based modules (Domain logic)
    /dashboard      # Dashboard views and widgets
    /bills          # Bill tracking and management
    /debts          # Debt payoff tracking
    /goals          # Financial goals
    /subscriptions  # Recurring payment tracking
    /settings       # User preferences and integrations
  /hooks            # Custom React hooks & global store
  /lib              # Utility functions and constants
  /types            # Global TypeScript interfaces
  App.tsx           # Main application routing
  main.tsx          # Application entry point
```

## 🏗️ Architecture Decisions

1. **Feature-Based Organization:** Instead of grouping by file type (e.g., all components together, all hooks together), files are grouped by feature (`/features/bills`, `/features/debts`). This makes the codebase highly scalable and easier to maintain.
2. **Separation of Concerns:** UI components (`/components/ui`) are strictly presentational. Business logic and state management are handled in `/hooks` and feature-level components.
3. **Strict Typing:** TypeScript interfaces are centralized in `/types` to ensure consistent data structures across the app.
4. **Tailwind for Styling:** Utility-first CSS ensures consistent design without the overhead of maintaining separate stylesheets.

## 💻 Running Locally

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Build for production: `npm run build`

## 📝 Component Standards

Every component in this project follows these rules:
- **Typed Props:** All components use TypeScript interfaces for props.
- **Documentation:** Components include a brief comment explaining their purpose.
- **Clean Imports:** Imports are organized (React, third-party, local).
