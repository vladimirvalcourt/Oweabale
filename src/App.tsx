/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import DeviceGuard from './components/DeviceGuard';
import Dashboard from './pages/Dashboard';
import Obligations from './pages/Obligations';
import Settings from './pages/Settings';
import Upload from './pages/Upload';
import Transactions from './pages/Transactions';
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
import Pricing from './pages/Pricing';

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
            borderRadius: '2px', // Brutalist radius
          },
        }} 
      />
      <DeviceGuard>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/" element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="obligations" element={<Obligations />} />
            <Route path="income" element={<Income />} />
            <Route path="upload" element={<Upload />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="net-worth" element={<NetWorth />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="taxes" element={<Taxes />} />
            <Route path="goals" element={<Goals />} />
            <Route path="categories" element={<Categories />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </DeviceGuard>
    </BrowserRouter>
  );
}


