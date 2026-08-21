import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { WorkOrdersPage } from './pages/WorkOrdersPage';
import { TransfersPage } from './pages/TransfersPage';
import { CustomerOrdersPage } from './pages/CustomerOrdersPage';
import { HealthPage } from './pages/HealthPage';
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
              <Route path="/health" element={<HealthPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* All Roles Access */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'OPERATIONS', 'SALES']} />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
              </Route>

              {/* Work Orders & Internal Transfers (Admin & Operations) */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'OPERATIONS']} />}>
                <Route path="/work-orders" element={<WorkOrdersPage />} />
                <Route path="/transfers" element={<TransfersPage />} />
              </Route>

              {/* Customer Orders & Reservations (Admin & Sales) */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SALES']} />}>
                <Route path="/customer-orders" element={<CustomerOrdersPage />} />
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
