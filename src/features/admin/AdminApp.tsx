import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import AdminOverviewPage from './pages/AdminOverviewPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';
import AdminModerationPage from './pages/AdminModerationPage';
import AdminDataTablesPage from './pages/AdminDataTablesPage';
import AdminSessionsPage from './pages/AdminSessionsPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminCompliancePage from './pages/AdminCompliancePage';
import AdminTelemetryPage from './pages/AdminTelemetryPage';
import AdminCaseFilePage from './pages/AdminCaseFilePage';
import AdminEmailBlastPage from './pages/AdminEmailBlastPage';
import AdminCouponManagerPage from './pages/AdminCouponManagerPage';
import { AdminPermissionGate } from './shared/AdminPermissionGate';

export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminOverviewPage />} />
        <Route path="user/:userId" element={<AdminPermissionGate permission="users.read"><AdminCaseFilePage /></AdminPermissionGate>} />
        <Route path="user" element={<AdminPermissionGate permission="users.read"><AdminCaseFilePage /></AdminPermissionGate>} />
        <Route path="data" element={<AdminPermissionGate permission="users.manage"><AdminDataTablesPage /></AdminPermissionGate>} />
        <Route path="audit-logs" element={<AdminPermissionGate permission="audit.read"><AdminAuditLogsPage /></AdminPermissionGate>} />
        <Route path="moderation" element={<AdminPermissionGate permission="moderation.manage"><AdminModerationPage /></AdminPermissionGate>} />
        <Route path="sessions" element={<AdminPermissionGate permission="users.manage"><AdminSessionsPage /></AdminPermissionGate>} />
        <Route path="reports" element={<AdminPermissionGate permission="dashboard.view"><AdminReportsPage /></AdminPermissionGate>} />
        <Route path="compliance" element={<AdminPermissionGate permission="compliance.read"><AdminCompliancePage /></AdminPermissionGate>} />
        <Route path="telemetry" element={<AdminPermissionGate permission="telemetry.read"><AdminTelemetryPage /></AdminPermissionGate>} />
        {/* ADD 7 + 6: New billing/marketing tools */}
        <Route path="email-blast" element={<AdminPermissionGate permission="moderation.manage"><AdminEmailBlastPage /></AdminPermissionGate>} />
        <Route path="coupons" element={<AdminPermissionGate permission="dashboard.view"><AdminCouponManagerPage /></AdminPermissionGate>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
