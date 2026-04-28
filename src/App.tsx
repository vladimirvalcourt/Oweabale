/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { lazy, Suspense } from 'react';
import { Layout, DeviceGuard, ErrorBoundary, AuthGuard, AdminGuard, MaintenanceGuard, ProPlanGuard, DashboardSkeleton, ListSkeleton, AppLoader, SessionWarningModal, PWAInstallBanner } from './components';
import { useStore } from './store';
import { useAuth, usePWAUpdateNotification, usePWAStandaloneMode, usePostHogIdentity } from './hooks';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Fix 1: Dashboard is now lazy — this keeps recharts + motion/react OUT of the initial
// bundle. The 70 KB page was previously blocking first paint for ALL authenticated users.
const Dashboard      = lazy(() => import('./pages/Dashboard'));

const AuthPage       = lazy(() => import('./pages/AuthPage'));
const Obligations    = lazy(() => import('./pages/Obligations'));
const Settings       = lazy(() => import('./pages/Settings'));
const Ingestion      = lazy(() => import('./pages/Ingestion'));
const Transactions   = lazy(() => import('./pages/Transactions'));
const Freelance      = lazy(() => import('./pages/Freelance'));
const Goals          = lazy(() => import('./pages/Goals'));
const Savings        = lazy(() => import('./pages/Savings'));
const Income         = lazy(() => import('./pages/Income'));
const Investments    = lazy(() => import('./pages/Investments'));
const Insurance      = lazy(() => import('./pages/Insurance'));
const Budgets        = lazy(() => import('./pages/Budgets'));
const NetWorth       = lazy(() => import('./pages/NetWorth'));
const Calendar       = lazy(() => import('./pages/Calendar'));
const Taxes          = lazy(() => import('./pages/Taxes'));
const Categories     = lazy(() => import('./pages/Categories'));
const Subscriptions  = lazy(() => import('./pages/Subscriptions'));
const Reports        = lazy(() => import('./pages/Reports'));
const Landing        = lazy(() => import('./pages/Landing'));
const Onboarding     = lazy(() => import('./pages/Onboarding'));
import Pricing       from './pages/Pricing';
const FAQ            = lazy(() => import('./pages/FAQ'));
const Privacy        = lazy(() => import('./pages/Privacy'));
const Terms          = lazy(() => import('./pages/Terms'));
const Security       = lazy(() => import('./pages/Security'));
const Support        = lazy(() => import('./pages/Support'));
const AdminApp        = lazy(() => import('./features/admin/AdminApp'));
const Education      = lazy(() => import('./pages/Education'));
const HelpDesk       = lazy(() => import('./pages/HelpDesk'));
import AuthCallback from './pages/AuthCallback';
import PlaidCallback from './pages/PlaidCallback';
import { useDataSync } from './hooks';
import { ThemedToaster, UnsupportedBrowserBanner } from './components';
import { PostHogProvider } from './hooks/usePostHog';
import CrispChat from './components/common/CrispChat';

const Changelog      = lazy(() => import('./pages/Changelog'));
const Analytics      = lazy(() => import('./pages/Analytics'));
const CreditCenter   = lazy(() => import('./pages/CreditCenter'));
const NotFound       = lazy(() => import('./pages/NotFound'));
const SAASLandingDemo = lazy(() => import('./pages/SAASLandingDemo'));

/** After sign-in, route users to the correct namespace based on their plan. */
function SignInRoute({ authUser }: { authUser: User | null }) {
  const location = useLocation();
  const { authLoading } = useAuth();

  if (authLoading) return <AppLoader />;
  if (!authUser) return <AuthPage mode="signin" />;

  // Honor explicit ?redirect= param first (e.g. deep-linked protected page)
  const raw = new URLSearchParams(location.search).get('redirect');
  if (raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes(':')) {
    return <Navigate to={raw} replace />;
  }

  return <Navigate to="/pro/dashboard" replace />;
}

/**
 * PlanAwareRedirect
 * Replaces the old flat /dashboard, /bills etc. routes.
 * Preserves ?search and #hash so deep links keep working.
 */
function AppRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}${location.hash}`} replace />;
}

function PlanAwareRedirect({ pro }: { free?: string; pro: string }) {
  const location = useLocation();
  const suffix = location.search + location.hash;
  return <Navigate to={`${pro}${suffix}`} replace />;
}

function AppRoutes() {
  const { user: authUser, showWarning, timeLeft, extendSession, authLoading } = useAuth();

  useDataSync({ authUserId: authUser?.id ?? null, authLoading });
  usePWAUpdateNotification();
  usePWAStandaloneMode();

  // Public routes render instantly (e.g., Landing page, SEO pages).
  // Protected routes naturally wait for auth via AuthGuard.

  return (
    <>
    {/* Outer Suspense: catches any lazy page not individually wrapped (404, legal pages, etc.) */}
    <Suspense fallback={<AppLoader />}>
    <Routes>
      {/* ── Public routes ── */}
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/security" element={<Security />} />
      <Route path="/support" element={<Support />} />
      <Route path="/onboarding" element={<AuthPage mode="signup" />} />
      <Route path="/demo/saas-landing" element={<SAASLandingDemo />} />

      {/* ── Auth route — preserve ?redirect= when already signed in ── */}
      <Route path="/auth" element={<SignInRoute authUser={authUser} />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/plaid/callback" element={<PlaidCallback />} />

      {/* Old free namespace is kept only as redirects so existing links do not break. */}
      <Route path="free/dashboard" element={<AppRedirect to="/pro/dashboard" />} />
      <Route path="free/bills" element={<AppRedirect to="/pro/bills" />} />
      <Route path="free/subscriptions" element={<AppRedirect to="/pro/subscriptions" />} />
      <Route path="free/calendar" element={<AppRedirect to="/pro/calendar" />} />
      <Route path="free/settings" element={<AppRedirect to="/pro/settings" />} />

      {/* ────────────────────────────────────────────────────────────────
           PRO NAMESPACE  /pro/*
           Guarded by ProPlanGuard.
           Re-uses every existing page component — no file duplication.
      ──────────────────────────────────────────────────────────────── */}
      <Route element={<ProPlanGuard><DeviceGuard><Layout /></DeviceGuard></ProPlanGuard>}>
        <Route
          path="pro/dashboard"
          element={<ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><Dashboard /></Suspense></ErrorBoundary>}
        />
        <Route path="pro/bills"          element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Obligations /></Suspense></ErrorBoundary>} />
        <Route path="pro/income"         element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Income /></Suspense></ErrorBoundary>} />
        <Route path="pro/freelance"      element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Freelance /></Suspense></ErrorBoundary>} />
        <Route path="pro/ingestion"      element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Ingestion /></Suspense></ErrorBoundary>} />
        <Route path="pro/documents"      element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Ingestion /></Suspense></ErrorBoundary>} />
        <Route path="pro/transactions"   element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={8} />}><Transactions /></Suspense></ErrorBoundary>} />
        <Route path="pro/budgets"        element={<ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><Budgets /></Suspense></ErrorBoundary>} />
        <Route path="pro/net-worth"      element={<ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><NetWorth /></Suspense></ErrorBoundary>} />
        <Route path="pro/calendar"       element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Calendar /></Suspense></ErrorBoundary>} />
        <Route path="pro/taxes"          element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Taxes /></Suspense></ErrorBoundary>} />
        <Route path="pro/goals"          element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Goals /></Suspense></ErrorBoundary>} />
        <Route path="pro/savings"        element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Savings /></Suspense></ErrorBoundary>} />
        <Route path="pro/education"      element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Education /></Suspense></ErrorBoundary>} />
        <Route path="pro/categories"     element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Categories /></Suspense></ErrorBoundary>} />
        <Route path="pro/subscriptions"  element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Subscriptions /></Suspense></ErrorBoundary>} />
        <Route path="pro/reports"        element={<ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><Reports /></Suspense></ErrorBoundary>} />
        <Route path="pro/analytics"      element={<ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><Analytics /></Suspense></ErrorBoundary>} />
        <Route path="pro/investments"    element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Investments /></Suspense></ErrorBoundary>} />
        <Route path="pro/insurance"      element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Insurance /></Suspense></ErrorBoundary>} />
        <Route path="pro/credit"         element={<ErrorBoundary><CreditCenter /></ErrorBoundary>} />
        <Route path="pro/app/support"    element={<ErrorBoundary><HelpDesk /></ErrorBoundary>} />
        <Route path="pro/changelog"      element={<ErrorBoundary><Changelog /></ErrorBoundary>} />
        <Route
          path="pro/settings"
          element={<ErrorBoundary><Suspense fallback={<ListSkeleton rows={6} />}><Settings /></Suspense></ErrorBoundary>}
        />
      </Route>

      {/* ── Protected routes — require authentication ── */}
      <Route element={<AuthGuard />}>
        <Route element={<MaintenanceGuard />}>
        {/* Admin — requires both authentication AND is_admin = true on profile */}
        <Route element={<AdminGuard />}>
          <Route path="/admin/*" element={<ErrorBoundary><AdminApp /></ErrorBoundary>} />
        </Route>

        {/* Onboarding doesn't need Layout sidebar/topbar */}
        <Route path="/onboarding/setup" element={<Onboarding />} />

        {/* ── Legacy redirect routes (kept for ~2 weeks; remove after Sprint 3) ─────────────────
             Any old bookmark/hardcoded link (e.g. /dashboard) bounces to the correct namespace.
             PlanAwareRedirect preserves ?search and #hash automatically.
        ── */}
        <Route path="dashboard"    element={<PlanAwareRedirect pro="/pro/dashboard" />} />
        <Route path="bills"        element={<PlanAwareRedirect pro="/pro/bills" />} />
        <Route path="income"       element={<PlanAwareRedirect pro="/pro/income" />} />
        <Route path="freelance"    element={<PlanAwareRedirect pro="/pro/freelance" />} />
        <Route path="ingestion"    element={<PlanAwareRedirect pro="/pro/ingestion" />} />
        <Route path="documents"    element={<PlanAwareRedirect pro="/pro/documents" />} />
        <Route path="transactions" element={<PlanAwareRedirect pro="/pro/transactions" />} />
        <Route path="budgets"      element={<PlanAwareRedirect pro="/pro/budgets" />} />
        <Route path="net-worth"    element={<PlanAwareRedirect pro="/pro/net-worth" />} />
        <Route path="calendar"     element={<PlanAwareRedirect pro="/pro/calendar" />} />
        <Route path="taxes"        element={<PlanAwareRedirect pro="/pro/taxes" />} />
        <Route path="goals"        element={<PlanAwareRedirect pro="/pro/goals" />} />
        <Route path="savings"      element={<PlanAwareRedirect pro="/pro/savings" />} />
        <Route path="education"    element={<PlanAwareRedirect pro="/pro/education" />} />
        <Route path="categories"   element={<PlanAwareRedirect pro="/pro/categories" />} />
        <Route path="subscriptions" element={<PlanAwareRedirect pro="/pro/subscriptions" />} />
        <Route path="reports"      element={<PlanAwareRedirect pro="/pro/reports" />} />
        <Route path="analytics"    element={<PlanAwareRedirect pro="/pro/analytics" />} />
        <Route path="investments"  element={<PlanAwareRedirect pro="/pro/investments" />} />
        <Route path="insurance"    element={<PlanAwareRedirect pro="/pro/insurance" />} />
        <Route path="credit"       element={<PlanAwareRedirect pro="/pro/credit" />} />
        <Route path="settings"     element={<PlanAwareRedirect pro="/pro/settings" />} />
        <Route path="app/support"  element={<PlanAwareRedirect pro="/pro/app/support" />} />
        <Route path="changelog"    element={<PlanAwareRedirect pro="/pro/changelog" />} />

        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
    {/* SessionWarningModal is outside Suspense so it's never hidden by a route-level fallback */}
    <SessionWarningModal
      isOpen={showWarning}
      timeLeftSeconds={timeLeft}
      onExtend={extendSession}
      onLogout={() => { useStore.getState().signOut(); }}
    />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PostHogProvider>
        <AppShell />
        <SpeedInsights />
        <CrispChat />
      </PostHogProvider>
    </BrowserRouter>
  );
}

/** Inner component so we have access to routing context for isProRoute */
function AppShell() {
  const { user: authUser } = useAuth();
  const location = useLocation();
  const isProRoute = location.pathname.startsWith('/pro');
  
  // Track user identity in PostHog
  usePostHogIdentity();
  
  return (
    <>
      <UnsupportedBrowserBanner />
      <ThemedToaster />
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
      <PWAInstallBanner isLoggedIn={isProRoute && !!authUser?.id} />
    </>
  );
}
