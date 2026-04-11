/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';
import DeviceGuard from './components/DeviceGuard';
import ErrorBoundary from './components/ErrorBoundary';
import AuthGuard from './components/AuthGuard';
import AdminGuard from './components/AdminGuard';
import { AppLoader } from './components/PageSkeleton';
import SessionWarningModal from './components/SessionWarningModal';
import { useStore } from './store/useStore';
import { useAuth } from './hooks/useAuth';

const AuthPage       = lazy(() => import('./pages/AuthPage'));
const Dashboard      = lazy(() => import('./pages/Dashboard'));
const Obligations    = lazy(() => import('./pages/Obligations'));
const Settings       = lazy(() => import('./pages/Settings'));
const Ingestion      = lazy(() => import('./pages/Ingestion'));
const Transactions   = lazy(() => import('./pages/Transactions'));
const Freelance      = lazy(() => import('./pages/Freelance'));
const Goals          = lazy(() => import('./pages/Goals'));
const Income         = lazy(() => import('./pages/Income'));
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
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Education      = lazy(() => import('./pages/Education'));
const HelpDesk       = lazy(() => import('./pages/HelpDesk'));
const Changelog      = lazy(() => import('./pages/Changelog'));
const Analytics      = lazy(() => import('./pages/Analytics'));
const CreditCenter   = lazy(() => import('./pages/CreditCenter'));
import AuthCallback from './pages/AuthCallback';
const MobileCapture  = lazy(() => import('./pages/MobileCapture'));
const NotFound         = lazy(() => import('./pages/NotFound'));

import { useDataSync } from './hooks/useDataSync';
import { ThemedToaster } from './components/ThemedToaster';

function AppRoutes() {
  const { user: authUser, showWarning, timeLeft, extendSession, authLoading } = useAuth();
  const user = useStore((s) => s.user);
  const isLoading = useStore((s) => s.isLoading);
  const location = useLocation();

  useDataSync({ authUserId: authUser?.id ?? null, authLoading });

  // Only block the entire app on authentication resolution.
  if (authLoading) return <AppLoader />;

  // Avoid onboarding redirect before profile row is merged (prevents dashboard flash for new users).
  if (authUser && isLoading && !user.id) return <AppLoader />;

  if (
    authUser &&
    user.id &&
    !user.hasCompletedOnboarding &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
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

      {/* ── Auth route — redirect to dashboard if already signed in ── */}
      <Route
        path="/auth"
        element={authUser ? <Navigate to="/dashboard" replace /> : <AuthPage />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/capture" element={<MobileCapture />} />

      {/* ── Protected routes — require authentication ── */}
      <Route element={<AuthGuard />}>
        {/* Admin — requires both authentication AND is_admin = true on profile */}
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
        </Route>

        {/* Onboarding doesn't need Layout sidebar/topbar */}
        <Route path="/onboarding" element={<Onboarding />} />
        
        <Route element={<DeviceGuard><Layout /></DeviceGuard>}>
          <Route path="dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="bills" element={<ErrorBoundary><Obligations /></ErrorBoundary>} />
          <Route path="income" element={<ErrorBoundary><Income /></ErrorBoundary>} />
          <Route path="freelance" element={<ErrorBoundary><Freelance /></ErrorBoundary>} />
          <Route path="ingestion" element={<ErrorBoundary><Ingestion /></ErrorBoundary>} />
          <Route path="transactions" element={<ErrorBoundary><Transactions /></ErrorBoundary>} />
          <Route path="budgets" element={<ErrorBoundary><Budgets /></ErrorBoundary>} />
          <Route path="net-worth" element={<ErrorBoundary><NetWorth /></ErrorBoundary>} />
          <Route path="calendar" element={<ErrorBoundary><Calendar /></ErrorBoundary>} />
          <Route path="taxes" element={<ErrorBoundary><Taxes /></ErrorBoundary>} />
          <Route path="goals" element={<ErrorBoundary><Goals /></ErrorBoundary>} />
          <Route path="education" element={<ErrorBoundary><Education /></ErrorBoundary>} />
          <Route path="categories" element={<ErrorBoundary><Categories /></ErrorBoundary>} />
          <Route path="subscriptions" element={<ErrorBoundary><Subscriptions /></ErrorBoundary>} />
          <Route path="reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
          <Route path="analytics" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
          <Route path="credit" element={<ErrorBoundary><CreditCenter /></ErrorBoundary>} />
          <Route path="support" element={<ErrorBoundary><HelpDesk /></ErrorBoundary>} />
          <Route path="changelog" element={<ErrorBoundary><Changelog /></ErrorBoundary>} />
          <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
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
      <ThemedToaster />
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

