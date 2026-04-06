/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import Layout from './components/Layout';
import DeviceGuard from './components/DeviceGuard';
import ErrorBoundary from './components/ErrorBoundary';
import { AppLoader } from './components/PageSkeleton';
import { useStore } from './store/useStore';
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

function AppRoutes() {
  const { fetchData, isLoading } = useStore();

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) return <AppLoader />;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/security" element={<Security />} />
      <Route path="/admin" element={<ErrorBoundary><AdminDashboard /></ErrorBoundary>} />
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
