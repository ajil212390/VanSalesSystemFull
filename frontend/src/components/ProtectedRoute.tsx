import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { useAuthStore } from '../store/authStore';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <Center style={{ minHeight: '100vh', backgroundColor: '#0f172a' }}>
        <Stack align="center" gap="sm">
          <Loader color="orange" size="lg" />
          <Text c="dimmed" size="sm">
            Verifying your session...
          </Text>
        </Stack>
      </Center>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
