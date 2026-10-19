import React, { useState } from 'react';
import {
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Group,
  Stack,
  Alert,
  Box,
} from '@mantine/core';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import {
  IconUser,
  IconLock,
  IconArrowRight,
  IconAlertCircle,
  IconShieldCheck,
  IconCheck,
} from '@tabler/icons-react';
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
        title: 'Sign In Successful',
        message: `Welcome back, ${res.data.user.username}!`,
        color: 'burgundy',
      });

      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.response?.status === 400 || err.response?.status === 401) {
        setErrorMessage('Invalid username or password. Please verify and try again.');
      } else {
        setErrorMessage('Unable to connect to the server. Please verify your connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
      }}
    >
      {/* LEFT SECTION: Visual Showcase with Faded Image & Gradient Overlay */}
      <Box
        style={{
          flex: '1.15',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '3.5rem',
          backgroundImage: `
            linear-gradient(135deg, rgba(120, 0, 30, 0.82) 0%, rgba(65, 5, 20, 0.86) 45%, rgba(10, 15, 26, 0.92) 100%),
            url('/login-hero.jpg')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          overflow: 'hidden',
        }}
        visibleFrom="md"
      >


        {/* Hero Copy & Feature Pills */}
        <Box style={{ position: 'relative', zIndex: 2, maxWidth: '520px', margin: 'auto 0' }}>
          <Text
            size="xs"
            fw={700}
            c="#ffb3c1"
            tt="uppercase"
            mb="xs"
            style={{ letterSpacing: '1.2px', textShadow: '0 1px 4px rgba(0, 0, 0, 0.9)' }}
          >
            Van Sales & Distribution System
          </Text>

          <Title
            order={1}
            style={{
              color: '#ffffff',
              fontSize: '2.6rem',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-1px',
              textShadow: '0 2px 12px rgba(0, 0, 0, 0.85)',
            }}
          >
            Precision Gas Delivery & Distribution.
          </Title>

          <Text
            c="rgba(255, 255, 255, 0.9)"
            size="sm"
            mt="md"
            mb="xl"
            style={{ lineHeight: 1.65, textShadow: '0 1px 6px rgba(0, 0, 0, 0.8)' }}
          >
            A high-efficiency enterprise platform engineered for seamless multi-tenant cylinder dispatching, real-time route execution, and end-of-day stock reconciliation.
          </Text>

          <Group gap="sm" wrap="wrap">
            {[
              'Stock Movement Tracking',
              'Driver Allocation',
              'Billing System',
              'Dedicated Mobile App',
            ].map((feature) => (
              <Box
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                }}
              >
                <IconCheck size={14} color="#f5c2cb" stroke={2.5} />
                <Text size="xs" fw={500} c="rgba(255, 255, 255, 0.95)">
                  {feature}
                </Text>
              </Box>
            ))}
          </Group>
        </Box>

        {/* Bottom Trust Note */}
        <Group justify="space-between" align="center" style={{ position: 'relative', zIndex: 2 }}>
          <Text size="xs" c="rgba(255, 255, 255, 0.5)">
            © 2026 Frontlly Infotech Pvt Ltd. All Rights Reserved
          </Text>
          <Group gap={6} align="center">
            <IconShieldCheck size={16} color="rgba(255, 255, 255, 0.6)" />
            <Text size="xs" c="rgba(255, 255, 255, 0.6)">
              Encrypted Session
            </Text>
          </Group>
        </Group>
      </Box>

      {/* RIGHT SECTION: Clean Matte Login Card */}
      <Box
        style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem',
          backgroundColor: '#ffffff',
          position: 'relative',
        }}
      >
        <Box className="login-form-animate" style={{ width: '100%', maxWidth: '420px' }}>
          {/* Header */}
          <Box mb="xl">
            <Title
              order={2}
              style={{
                color: '#0f172a',
                fontSize: '1.85rem',
                fontWeight: 700,
                letterSpacing: '-0.5px',
                lineHeight: 1.2,
              }}
            >
              Welcome back
            </Title>
            <Text c="dimmed" size="sm" mt={4}>
              Sign in with your enterprise credentials to manage your operations.
            </Text>
          </Box>

          {/* Error Alert */}
          {errorMessage && (
            <Alert
              icon={<IconAlertCircle size={18} />}
              color="red"
              variant="light"
              radius="sm"
              mb="lg"
              styles={{
                root: {
                  backgroundColor: '#fef2f2',
                  borderColor: '#fecaca',
                },
                message: { fontSize: '13px', color: '#991b1b', fontWeight: 500 },
              }}
            >
              {errorMessage}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Username"
                placeholder="e.g. admin"
                required
                autoFocus
                leftSection={<IconUser size={18} stroke={1.75} color="#94a3b8" />}
                {...register('username')}
                error={errors.username?.message}
                styles={{
                  label: { fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' },
                  input: {
                    height: '42px',
                    borderRadius: '6px',
                    borderColor: '#cbd5e1',
                    fontSize: '14px',
                    transition: 'border-color 150ms ease',
                    '&:focus': {
                      borderColor: '#800020',
                    },
                  },
                }}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                required
                leftSection={<IconLock size={18} stroke={1.75} color="#94a3b8" />}
                {...register('password')}
                error={errors.password?.message}
                styles={{
                  label: { fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' },
                  input: {
                    height: '42px',
                    borderRadius: '6px',
                    borderColor: '#cbd5e1',
                    fontSize: '14px',
                    transition: 'border-color 150ms ease',
                    '&:focus': {
                      borderColor: '#800020',
                    },
                  },
                }}
              />

              <Button
                type="submit"
                color="burgundy"
                fullWidth
                mt="sm"
                loading={isSubmitting}
                disabled={isSubmitting}
                rightSection={<IconArrowRight size={18} stroke={2} />}
                className="login-btn-premium"
                style={{
                  backgroundColor: '#800020',
                  height: '42px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                Sign In to Dashboard
              </Button>
            </Stack>
          </form>

          {/* Footer Security Assurance */}
          <Box mt="2.5rem" pt="lg" style={{ borderTop: '1px solid #f1f5f9' }}>
            <Group justify="center" gap={6} align="center">
              <IconShieldCheck size={16} color="#64748b" />
              <Text size="xs" c="dimmed" fw={500}>
                Protected by 256-bit TLS Enterprise Encryption
              </Text>
            </Group>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
