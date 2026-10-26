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
import { AllocationsPage }   from './pages/AllocationsPage';
import { UsersPage } from './pages/UsersPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProductsPage } from './pages/ProductsPage';
import { AccountsPage } from './pages/AccountsPage';
import { PriceUpdatePage } from './pages/PriceUpdatePage';
import { PurchaseListPage } from './pages/PurchaseListPage';
import { PurchaseFormPage } from './pages/PurchaseFormPage';
import { PaymentListPage } from './pages/PaymentListPage';
import { PaymentFormPage } from './pages/PaymentFormPage';


import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';

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
              <Route path="/drivers" element={<DriversPage />} />
              <Route path="/vehicles" element={<VehiclesPage />} />
              <Route path="/routes" element={<RoutesPage/>} />
              <Route path="/allocations" element={<AllocationsPage/>} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/price-update" element={<PriceUpdatePage />} />
              <Route path="/accounts" element={<AccountsPage />} />
              <Route path="/purchases" element={<PurchaseListPage />} />
              <Route path="/purchases/new" element={<PurchaseFormPage />} />
              <Route path="/purchases/:id/edit" element={<PurchaseFormPage />} />
              <Route path="/payments" element={<PaymentListPage />} />
              <Route path="/payments/new" element={<PaymentFormPage />} />
              <Route path="/payments/:id/edit" element={<PaymentFormPage />} />

            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
};

export default App;
