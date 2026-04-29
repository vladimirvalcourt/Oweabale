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
import AdminSupportPage from './pages/AdminSupportPage';
import AdminBillingPage from './pages/AdminBillingPage';
import AdminLifecyclePage from './pages/AdminLifecyclePage';
import AdminGovernancePage from './pages/AdminGovernancePage';
import AdminIncidentPage from './pages/AdminIncidentPage';
import AdminCommsPage from './pages/AdminCommsPage';
import { AdminPermissionGate } from './shared';

export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminOverviewPage />} />
        <Route path="user/:userId" element={<AdminPermissionGate permission="users.read"><AdminCaseFilePage /></AdminPermissionGate>} />
        <Route path="user" element={<AdminPermissionGate permission="users.read"><AdminCaseFilePage /></AdminPermissionGate>} />
        <Route path="support" element={<AdminPermissionGate permission="support.manage"><AdminSupportPage /></AdminPermissionGate>} />
        <Route path="billing" element={<AdminPermissionGate permission="billing.manage"><AdminBillingPage /></AdminPermissionGate>} />
        <Route path="lifecycle" element={<AdminPermissionGate permission="users.manage"><AdminLifecyclePage /></AdminPermissionGate>} />
        <Route path="data" element={<AdminPermissionGate permission="users.manage"><AdminDataTablesPage /></AdminPermissionGate>} />
        <Route path="audit-logs" element={<AdminPermissionGate permission="audit.read"><AdminAuditLogsPage /></AdminPermissionGate>} />
        <Route path="governance" element={<AdminPermissionGate permission="governance.manage"><AdminGovernancePage /></AdminPermissionGate>} />
        <Route path="incident" element={<AdminPermissionGate permission="incident.manage"><AdminIncidentPage /></AdminPermissionGate>} />
        <Route path="moderation" element={<AdminPermissionGate permission="moderation.manage"><AdminModerationPage /></AdminPermissionGate>} />
        <Route path="sessions" element={<AdminPermissionGate permission="users.manage"><AdminSessionsPage /></AdminPermissionGate>} />
        <Route path="reports" element={<AdminPermissionGate permission="dashboard.view"><AdminReportsPage /></AdminPermissionGate>} />
        <Route path="compliance" element={<AdminPermissionGate permission="compliance.read"><AdminCompliancePage /></AdminPermissionGate>} />
        <Route path="telemetry" element={<AdminPermissionGate permission="telemetry.read"><AdminTelemetryPage /></AdminPermissionGate>} />
        <Route path="comms" element={<AdminPermissionGate permission="comms.manage"><AdminCommsPage /></AdminPermissionGate>} />
        <Route path="email-blast" element={<AdminPermissionGate permission="comms.manage"><AdminCommsPage /></AdminPermissionGate>} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
