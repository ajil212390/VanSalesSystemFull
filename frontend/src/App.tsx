import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MantineProvider, createTheme, type MantineColorsTuple } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DriversPage } from './pages/DriversPage';
import { RoutesPage } from './pages/RoutesPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { PaymentGroupsPage } from './pages/PaymentGroupsPage';
import { AllocationsPage }   from './pages/AllocationsPage';
import { EndAllocationsPage } from './pages/EndAllocationsPage';
import { UsersPage } from './pages/UsersPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProductsPage } from './pages/ProductsPage';
import { AccountsPage } from './pages/AccountsPage';
import { PriceUpdatePage } from './pages/PriceUpdatePage';
import { PurchaseListPage } from './pages/PurchaseListPage';
import { PurchaseFormPage } from './pages/PurchaseFormPage';
import { PaymentListPage } from './pages/PaymentListPage';
import { PaymentFormPage } from './pages/PaymentFormPage';
import { ReceiptListPage } from './pages/ReceiptListPage';
import { ReceiptFormPage } from './pages/ReceiptFormPage';
import { DeliveryNotesPage } from './pages/DeliveryNotesPage';
import { ReceiptNotesPage } from './pages/ReceiptNotesPage';
import { StockAnalysisPage } from './pages/StockAnalysisPage';
import { VanManagementPage } from './pages/VanManagementPage';
import { RouteDetailsPage } from './pages/RouteDetailsPage';
import { InventoryByProductPage } from './pages/InventoryByProductPage';
import { InventoryByLocationPage } from './pages/InventoryByLocationPage';
import { PayablesReportPage } from './pages/PayablesReportPage';
import { ReceivablesReportPage } from './pages/ReceivablesReportPage';
import { ConnectionPackagesPage } from './pages/ConnectionPackagesPage';
import { ConnectionPackageFormPage } from './pages/ConnectionPackageFormPage';
import { SalesListPage } from './pages/SalesListPage';
import { SalesFormPage } from './pages/SalesFormPage';
import { ConnectionSaleFormPage } from './pages/ConnectionSaleFormPage';
import { GodownInventoryFormPage } from './pages/GodownInventoryFormPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { LedgerAnalysisPage } from './pages/LedgerAnalysisPage';


import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGuard } from './components/RoleGuard';
import { AppLayout } from './components/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Deep, sophisticated Burgundy color palette
const burgundy: MantineColorsTuple = [
  '#fdf2f4',
  '#fbe4e8',
  '#f5c2cb',
  '#ee96a6',
  '#e5657d',
  '#dc3f5c',
  '#b91c3d',
  '#800020', // Primary shade: Classic Deep Burgundy
  '#6b0b23',
  '#4a0516',
];

const theme = createTheme({
  colors: {
    burgundy,
  },
  primaryColor: 'burgundy',
  primaryShade: 7,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  defaultRadius: 'sm',
  components: {
    Button: {
      defaultProps: {
        radius: '10',
      },
    },
    TextInput: {
      defaultProps: {
        radius: '10',
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: '10',
      },
    },
    Select: {
      defaultProps: {
        radius: '10',
      },
    },
    NumberInput: {
      defaultProps: {
        radius: '10',
      },
    },
    Collapse: {
      defaultProps: {
        transitionDuration: 350,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        animateOpacity: true,
      },
    },
  },
});

export const App: React.FC = () => {
  const loadSession = useAuthStore((s) => s.loadSession);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-right" zIndex={2000} />
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />

              {/* Van Operations: Administrator Only (Manager only has Van Management) */}
              <Route path="/drivers" element={<RoleGuard allowedRoles={['Administrator']}><DriversPage /></RoleGuard>} />
              <Route path="/vehicles" element={<RoleGuard allowedRoles={['Administrator']}><VehiclesPage /></RoleGuard>} />
              <Route path="/routes" element={<RoleGuard allowedRoles={['Administrator']}><RoutesPage/></RoleGuard>} />
              <Route path="/payment-groups" element={<RoleGuard allowedRoles={['Administrator', 'Manager']}><PaymentGroupsPage /></RoleGuard>} />
              <Route path="/allocations" element={<RoleGuard allowedRoles={['Administrator']}><AllocationsPage/></RoleGuard>} />
              <Route path="/end-allocations" element={<RoleGuard allowedRoles={['Administrator', 'Manager']}><EndAllocationsPage /></RoleGuard>} />

              {/* Van Management & Stock Operations: Administrator & Manager */}
              <Route path="/van-management" element={<RoleGuard allowedRoles={['Administrator', 'Manager']}><VanManagementPage /></RoleGuard>} />
              <Route path="/van-management/:routeId" element={<RoleGuard allowedRoles={['Administrator', 'Manager']}><RouteDetailsPage /></RoleGuard>} />
              <Route path="/delivery-notes" element={<RoleGuard allowedRoles={['Administrator', 'Manager']}><DeliveryNotesPage /></RoleGuard>} />
              <Route path="/receipt-notes" element={<RoleGuard allowedRoles={['Administrator', 'Manager']}><ReceiptNotesPage /></RoleGuard>} />
              <Route path="/stock-analysis" element={<RoleGuard allowedRoles={['Administrator', 'Manager']}><StockAnalysisPage /></RoleGuard>} />
              <Route path="/stock-analysis/add-inventory" element={<RoleGuard allowedRoles={['Administrator', 'Manager']}><GodownInventoryFormPage /></RoleGuard>} />
              <Route path="/inventory/products" element={<RoleGuard allowedRoles={['Administrator', 'Manager']}><InventoryByProductPage /></RoleGuard>} />
              <Route path="/inventory/locations" element={<RoleGuard allowedRoles={['Administrator', 'Manager']}><InventoryByLocationPage /></RoleGuard>} />
              <Route path="/categories" element={<RoleGuard allowedRoles={['Administrator', 'Manager']}><CategoriesPage /></RoleGuard>} />
              <Route path="/products" element={<RoleGuard allowedRoles={['Administrator', 'Manager']}><ProductsPage /></RoleGuard>} />
              <Route path="/price-update" element={<RoleGuard allowedRoles={['Administrator', 'Manager']}><PriceUpdatePage /></RoleGuard>} />

              {/* Administrator Only */}
              <Route path="/users" element={<RoleGuard allowedRoles={['Administrator']}><UsersPage /></RoleGuard>} />
              <Route path="/connection-packages" element={<RoleGuard allowedRoles={['Administrator']}><ConnectionPackagesPage /></RoleGuard>} />
              <Route path="/connection-packages/new" element={<RoleGuard allowedRoles={['Administrator']}><ConnectionPackageFormPage /></RoleGuard>} />
              <Route path="/connection-packages/:id/edit" element={<RoleGuard allowedRoles={['Administrator']}><ConnectionPackageFormPage /></RoleGuard>} />

              {/* Accounting & Commercial: Administrator & Accountant */}
              <Route path="/accounts" element={<RoleGuard allowedRoles={['Administrator', 'Accountant']}><AccountsPage /></RoleGuard>} />
              <Route path="/purchases" element={<RoleGuard allowedRoles={['Administrator', 'Accountant']}><PurchaseListPage /></RoleGuard>} />
              <Route path="/purchases/new" element={<RoleGuard allowedRoles={['Administrator', 'Accountant']}><PurchaseFormPage /></RoleGuard>} />
              <Route path="/purchases/:id/edit" element={<RoleGuard allowedRoles={['Administrator', 'Accountant']}><PurchaseFormPage /></RoleGuard>} />
              <Route path="/payments" element={<RoleGuard allowedRoles={['Administrator', 'Accountant']}><PaymentListPage /></RoleGuard>} />
              <Route path="/payments/new" element={<RoleGuard allowedRoles={['Administrator', 'Accountant']}><PaymentFormPage /></RoleGuard>} />
              <Route path="/payments/:id/edit" element={<RoleGuard allowedRoles={['Administrator', 'Accountant']}><PaymentFormPage /></RoleGuard>} />
              <Route path="/receipts" element={<RoleGuard allowedRoles={['Administrator', 'Accountant']}><ReceiptListPage /></RoleGuard>} />
              <Route path="/receipts/new" element={<RoleGuard allowedRoles={['Administrator', 'Accountant']}><ReceiptFormPage /></RoleGuard>} />
              <Route path="/receipts/:id" element={<RoleGuard allowedRoles={['Administrator', 'Accountant']}><ReceiptFormPage /></RoleGuard>} />
              <Route path="/receipts/:id/edit" element={<RoleGuard allowedRoles={['Administrator', 'Accountant']}><ReceiptFormPage /></RoleGuard>} />
              <Route path="/ledger-analysis" element={<RoleGuard allowedRoles={['Administrator', 'Accountant']}><LedgerAnalysisPage /></RoleGuard>} />
              <Route path="/payables" element={<RoleGuard allowedRoles={['Administrator', 'Accountant']}><PayablesReportPage /></RoleGuard>} />
              <Route path="/receivables" element={<RoleGuard allowedRoles={['Administrator', 'Accountant']}><ReceivablesReportPage /></RoleGuard>} />
              <Route path="/sales" element={<RoleGuard allowedRoles={['Administrator', 'Accountant', 'Manager']}><SalesListPage /></RoleGuard>} />
              <Route path="/sales/new" element={<RoleGuard allowedRoles={['Administrator', 'Accountant', 'Manager']}><SalesFormPage /></RoleGuard>} />
              <Route path="/sales/:id/edit" element={<RoleGuard allowedRoles={['Administrator', 'Accountant', 'Manager']}><SalesFormPage /></RoleGuard>} />
              <Route path="/sales/new-connection" element={<RoleGuard allowedRoles={['Administrator', 'Accountant', 'Manager']}><ConnectionSaleFormPage /></RoleGuard>} />
              <Route path="/collections" element={<RoleGuard allowedRoles={['Administrator', 'Accountant', 'Manager']}><CollectionsPage /></RoleGuard>} />


            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
};

export default App;
