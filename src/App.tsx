/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import DeviceGuard from './components/DeviceGuard';
import ErrorBoundary from './components/ErrorBoundary';
import AuthGuard from './components/AuthGuard';
import AdminGuard from './components/AdminGuard';
import MaintenanceGuard from './components/MaintenanceGuard';
import { FullSuiteRouteGuard } from './components/FullSuiteGate';
import { AppLoader } from './components/PageSkeleton';
import SessionWarningModal from './components/SessionWarningModal';
import { useStore } from './store/useStore';
import { useAuth } from './hooks/useAuth';
import Dashboard from './pages/Dashboard';

const AuthPage       = lazy(() => import('./pages/AuthPage'));
const Obligations    = lazy(() => import('./pages/Obligations'));
const Settings       = lazy(() => import('./pages/Settings'));
const Ingestion      = lazy(() => import('./pages/Ingestion'));
const Transactions   = lazy(() => import('./pages/Transactions'));
const Freelance      = lazy(() => import('./pages/Freelance'));
const Goals          = lazy(() => import('./pages/Goals'));
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
const Pricing        = lazy(() => import('./pages/Pricing'));
const Privacy        = lazy(() => import('./pages/Privacy'));
const Terms          = lazy(() => import('./pages/Terms'));
const Security       = lazy(() => import('./pages/Security'));
const Support        = lazy(() => import('./pages/Support'));
const AdminApp        = lazy(() => import('./features/admin/AdminApp'));
const Education      = lazy(() => import('./pages/Education'));
const HelpDesk       = lazy(() => import('./pages/HelpDesk'));
const Changelog      = lazy(() => import('./pages/Changelog'));
const Analytics      = lazy(() => import('./pages/Analytics'));
const CreditCenter   = lazy(() => import('./pages/CreditCenter'));
import AuthCallback from './pages/AuthCallback';
import PlaidCallback from './pages/PlaidCallback';
const MobileCapture  = lazy(() => import('./pages/MobileCapture'));
const NotFound         = lazy(() => import('./pages/NotFound'));

import { useDataSync } from './hooks/useDataSync';
import { ThemedToaster } from './components/ThemedToaster';
import { UnsupportedBrowserBanner } from './components/UnsupportedBrowserBanner';

function SignInRoute({ authUser }: { authUser: User | null }) {
  const location = useLocation();
  if (!authUser) {
    return <AuthPage mode="signin" />;
  }
  const raw = new URLSearchParams(location.search).get('redirect');
  const to =
    raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes(':') ? raw : '/dashboard';
  return <Navigate to={to} replace />;
}

function AppRoutes() {
  const { user: authUser, showWarning, timeLeft, extendSession, authLoading } = useAuth();
  const user = useStore((s) => s.user);
  const isLoading = useStore((s) => s.isLoading);
  const location = useLocation();

  useDataSync({ authUserId: authUser?.id ?? null, authLoading });

  // Only block the entire app on authentication resolution.
  if (authLoading) return <AppLoader />;

  // Wait for the first Supabase sync after sign-in so we do not use stale persisted
  // `hasCompletedOnboarding` from Zustand before `fetchData` finishes.
  if (authUser && isLoading) return <AppLoader />;

  if (
    authUser &&
    user.id === authUser.id &&
    !user.hasCompletedOnboarding &&
    !isLoading &&
    location.pathname !== '/onboarding/setup'
  ) {
    return <Navigate to="/onboarding/setup" replace />;
  }

  return (
    <Suspense fallback={<AppLoader />}>
    <Routes>
      {/* ── Public routes ── */}
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/security" element={<Security />} />
      <Route path="/support" element={<Support />} />
      <Route path="/onboarding" element={<AuthPage mode="signup" />} />

      {/* ── Auth route — preserve ?redirect= when already signed in ── */}
      <Route path="/auth" element={<SignInRoute authUser={authUser} />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/plaid/callback" element={<PlaidCallback />} />
      <Route path="/capture" element={<MobileCapture />} />

      {/* ── Protected routes — require authentication ── */}
      <Route element={<AuthGuard />}>
        <Route element={<MaintenanceGuard />}>
        {/* Admin — requires both authentication AND is_admin = true on profile */}
        <Route element={<AdminGuard />}>
          <Route path="/admin/*" element={<ErrorBoundary><AdminApp /></ErrorBoundary>} />
        </Route>

        {/* Onboarding doesn't need Layout sidebar/topbar */}
        <Route path="/onboarding/setup" element={<Onboarding />} />

        <Route element={<DeviceGuard><Layout /></DeviceGuard>}>
          <Route
            path="dashboard"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Dashboard">
                  <Dashboard />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route path="bills" element={<ErrorBoundary><Obligations /></ErrorBoundary>} />
          <Route
            path="income"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Income tracking">
                  <Income />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="freelance"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Freelance / gigs">
                  <Freelance />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="ingestion"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Document ingestion">
                  <Ingestion />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="transactions"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Transaction history">
                  <Transactions />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="budgets"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Budgeting">
                  <Budgets />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="net-worth"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Net worth">
                  <NetWorth />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="calendar"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Calendar planning">
                  <Calendar />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="taxes"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Tax tools">
                  <Taxes />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="goals"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Goals">
                  <Goals />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="education"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Financial Academy">
                  <Education />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="categories"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Categories">
                  <Categories />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="subscriptions"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Subscriptions">
                  <Subscriptions />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="reports"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Reports">
                  <Reports />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="analytics"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Analytics">
                  <Analytics />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="investments"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Investments">
                  <Investments />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="insurance"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Insurance">
                  <Insurance />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="credit"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Credit Workshop">
                  <CreditCenter />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="app/support"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Support tools">
                  <HelpDesk />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route
            path="changelog"
            element={
              <ErrorBoundary>
                <FullSuiteRouteGuard featureName="Changelog">
                  <Changelog />
                </FullSuiteRouteGuard>
              </ErrorBoundary>
            }
          />
          <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
        </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    <SessionWarningModal 
      isOpen={showWarning}
      timeLeftSeconds={timeLeft}
      onExtend={extendSession}
      onLogout={() => { useStore.getState().signOut(); }}
    />
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <UnsupportedBrowserBanner />
      <ThemedToaster />
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

