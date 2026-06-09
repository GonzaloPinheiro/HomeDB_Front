import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import AuthPage from './pages/auth/AuthPage';
import FilesPage from './pages/files/FilesPage';
import AdminLogsPage from './pages/admin/AdminLogsPage';

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
      <Route path="/" element={<Navigate to="/files" replace />} />
      <Route path="*" element={<Navigate to="/files" replace />} />
    </Routes>
  );
}
