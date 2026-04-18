import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import AdminOverviewPage from './pages/AdminOverviewPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';
import AdminModerationPage from './pages/AdminModerationPage';
import AdminDataTablesPage from './pages/AdminDataTablesPage';

export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminOverviewPage />} />
        <Route path="data" element={<AdminDataTablesPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="moderation" element={<AdminModerationPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
