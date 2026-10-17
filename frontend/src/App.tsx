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
import { CompanyProfilePage } from './pages/CompanyProfilePage';
import { DriversPage } from './pages/DriversPage';
import { RoutesPage } from './pages/RoutesPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { AllocationsPage }   from './pages/AllocationsPage';
import { UsersPage } from './pages/UsersPage';


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
        radius: 'sm',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'sm',
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Select: {
      defaultProps: {
        radius: 'sm',
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
              <Route path="/company" element={<CompanyProfilePage />} />
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
