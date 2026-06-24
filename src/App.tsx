import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import AuthPage from './pages/auth/AuthPage';
import FilesPage from './pages/files/FilesPage';
import AdminLogsPage from './pages/admin/AdminLogsPage';
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import SystemMonitorPage from './pages/admin/SystemMonitorPage';

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/files"
        element={
          <Layout pageTitle="Mis archivos">
            <FilesPage />
          </Layout>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <Layout pageTitle="Logs del sistema">
            <AdminLogsPage />
          </Layout>
        }
      />
      <Route
        path="/admin/users"
        element={
          <Layout pageTitle="Gestión de usuarios">
            <AdminUsersPage />
          </Layout>
        }
      />
      <Route
        path="/admin/auditlogs"
        element={
          <Layout pageTitle="Audit logs">
            <AdminAuditLogsPage />
          </Layout>
        }
      />
      <Route
        path="/admin/monitor"
        element={
          <Layout pageTitle="Monitor del sistema">
            <SystemMonitorPage />
          </Layout>
        }
      />
      <Route path="/" element={<Navigate to="/files" replace />} />
      <Route path="*" element={<Navigate to="/files" replace />} />
    </Routes>
  );
}
