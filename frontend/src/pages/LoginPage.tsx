import React, { useState } from 'react';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Group,
  Anchor,
  Stack,
  Alert,
  Box,
} from '@mantine/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { AuthResponse } from '../types/auth';

const loginSchema = z.object({
  username: z.string().min(1, 'Please enter your username'),
  password: z.string().min(1, 'Please enter your password'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const from = (location.state as any)?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.post<AuthResponse>('/auth/login/', {
        username: data.username.trim(),
        password: data.password,
      });

      setAuth(res.data);

      notifications.show({
        title: 'Logged in',
        message: `Welcome, ${res.data.user.username}!`,
        color: 'burgundy',
      });

      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.response?.status === 400 || err.response?.status === 401) {
        setErrorMessage('Invalid login details');
      } else {
        setErrorMessage('Could not connect to the server. Please check your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <Container size="xs" style={{ width: '100%', maxWidth: '400px' }}>
        <Paper
          p="2rem"
          radius="md"
          withBorder
          shadow="xs"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
          }}
        >
          {/* Minimalist Brand Header */}
          <Stack align="center" gap={4} mb="xl">
            <Title
              order={2}
              style={{
                color: '#800020',
                fontWeight: 700,
                letterSpacing: '-0.5px',
              }}
            >
              Future Gas
            </Title>
                       <Text c="dimmed" size="xs">
              Sign in to manage your company
            </Text>

          </Stack>

          {/* Error Alert */}
          {errorMessage && (
            <Alert
              color="red"
              variant="light"
              radius="sm"
              mb="md"
              styles={{ message: { fontSize: '13px' } }}
            >
              {errorMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Username"
                placeholder="Enter your username"
                required
                autoFocus
                {...register('username')}
                error={errors.username?.message}
                styles={{
                  label: { fontSize: '13px', fontWeight: 500, color: '#334155' },
                }}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                required
                {...register('password')}
                error={errors.password?.message}
                styles={{
                  label: { fontSize: '13px', fontWeight: 500, color: '#334155' },
                }}
              />

              <Button
                type="submit"
                color="burgundy"
                size="sm"
                fullWidth
                mt="xs"
                loading={isSubmitting}
                disabled={isSubmitting}
                style={{
                  backgroundColor: '#800020',
                  height: '38px',
                  fontWeight: 600,
                }}
              >
                Sign In
              </Button>
            </Stack>
          </form>


        </Paper>
      </Container>
    </Box>
  );
};
