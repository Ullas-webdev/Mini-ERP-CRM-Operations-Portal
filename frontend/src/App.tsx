import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { HealthPage } from './pages/HealthPage';
import { SalesPage } from './pages/SalesPage';
import { WarehousePage } from './pages/WarehousePage';
import { AccountsPage } from './pages/AccountsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          {/* Global Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#0f172a',
                color: '#f1f5f9',
                border: '1px solid #334155',
                borderRadius: '12px',
                fontSize: '13px',
                padding: '12px 16px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
              },
              success: {
                iconTheme: { primary: '#10b981', secondary: '#0f172a' },
              },
              error: {
                iconTheme: { primary: '#f43f5e', secondary: '#0f172a' },
              },
            }}
          />
          <Routes>
            {/* Standalone Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Application Layout Routes */}
            <Route element={<AppLayout />}>
              {/* Health and Unauthorized public routes */}
              <Route path="/health" element={<HealthPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Protected Routes (Unauthenticated users redirect to /login) */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS']} />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/warehouse" element={<WarehousePage />} />
              </Route>

              {/* Accounts Domain */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'ACCOUNTS']} />}>
                <Route path="/accounts" element={<AccountsPage />} />
              </Route>

              {/* Admin Audit Log */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/audit-logs" element={<AuditLogsPage />} />
              </Route>

              <Route path="*" element={<LoginPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
