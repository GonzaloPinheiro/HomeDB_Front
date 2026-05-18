import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { colors, layout } from '../../lib/theme';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  pageTitle: string;
  children: ReactNode;
}

export default function Layout({ pageTitle, children }: LayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.bgMain }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: layout.sidebarWidth }}>
        <Header pageTitle={pageTitle} />
        <main
          style={{
            marginTop: layout.headerHeight,
            padding: 24,
            minHeight: `calc(100vh - ${layout.headerHeight}px)`,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
