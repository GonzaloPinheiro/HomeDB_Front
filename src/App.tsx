import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import AuthPage from './pages/auth/AuthPage';
import FilesPage from './pages/files/FilesPage';

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
      <Route path="/" element={<Navigate to="/files" replace />} />
      <Route path="*" element={<Navigate to="/files" replace />} />
    </Routes>
  );
}
