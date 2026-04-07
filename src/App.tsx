/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import Layout from './components/Layout';
import DeviceGuard from './components/DeviceGuard';
import ErrorBoundary from './components/ErrorBoundary';
import AuthGuard from './components/AuthGuard';
import { AppLoader } from './components/PageSkeleton';
import { useStore } from './store/useStore';
import { useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Obligations from './pages/Obligations';
import Settings from './pages/Settings';
import Ingestion from './pages/Ingestion';
import Transactions from './pages/Transactions';
import Freelance from './pages/Freelance';
import Goals from './pages/Goals';
import Income from './pages/Income';
import Budgets from './pages/Budgets';
import NetWorth from './pages/NetWorth';
import Calendar from './pages/Calendar';
import Taxes from './pages/Taxes';
import Categories from './pages/Categories';
import Subscriptions from './pages/Subscriptions';
import Reports from './pages/Reports';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Pricing from './pages/Pricing';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Security from './pages/Security';
import AdminDashboard from './pages/AdminDashboard';
import Education from './pages/Education';
import HelpDesk from './pages/HelpDesk';
import AuthCallback from './pages/AuthCallback';
import MobileCapture from './pages/MobileCapture';

function AppRoutes() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { user, fetchData, isLoading, signOut: clearStore } = useStore();

  useEffect(() => {
    if (authUser) {
      fetchData();
    } else if (!authLoading) {
      // Clear data if user is explicitly null and not loading
      clearStore();
    }
  }, [authUser, authLoading]);

  // Only block the entire app on authentication resolution. 
  // Individual pages (like Dashboard) handle their own 'isLoading' states for data sync.
  if (authLoading) return <AppLoader />;
  
  // If user is logged in but hasn't completed onboarding, redirect to onboarding 
  // (unless already on that page)
  const isNewUser = authUser && user.id && !user.hasCompletedOnboarding;
  const isNotOnOnboarding = window.location.pathname !== '/onboarding';
  
  if (isNewUser && isNotOnOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <Routes>
      {/* ── Public routes ── */}
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/security" element={<Security />} />
      <Route path="/admin" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />

      {/* ── Auth route — redirect to dashboard if already signed in ── */}
      <Route
        path="/auth"
        element={authUser ? <Navigate to="/dashboard" replace /> : <AuthPage />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/capture" element={<MobileCapture />} />

      {/* ── Protected routes — require authentication ── */}
      <Route element={<AuthGuard />}>
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
          <Route path="support" element={<ErrorBoundary><HelpDesk /></ErrorBoundary>} />
          <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#141414',
            color: '#FAFAFA',
            border: '1px solid #262626',
            borderRadius: '2px',
          },
        }}
      />
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

