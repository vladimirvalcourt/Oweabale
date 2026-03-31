/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Bills from './pages/Bills';
import AddBill from './pages/AddBill';
import Debts from './pages/Debts';
import Settings from './pages/Settings';
import Upload from './pages/Upload';
import Transactions from './pages/Transactions';
import Goals from './pages/Goals';
import Categories from './pages/Categories';
import Subscriptions from './pages/Subscriptions';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="bills" element={<Bills />} />
          <Route path="bills/add" element={<AddBill />} />
          <Route path="bills/edit/:id" element={<AddBill />} />
          <Route path="debts" element={<Debts />} />
          <Route path="upload" element={<Upload />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="goals" element={<Goals />} />
          <Route path="categories" element={<Categories />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}


