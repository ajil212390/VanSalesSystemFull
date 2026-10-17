import React, { useState, useEffect } from 'react';
import {
  Stepper,
  Button,
  Group,
  TextInput,
  PasswordInput,
  Select,
  Progress,
  Text,
  Paper,
  Title,
  Container,
  Alert,
  Box,
  Anchor,
  SimpleGrid,
  Stack,
} from '@mantine/core';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { setServerErrors } from '../utils/errorMapper';
import type { StateItem, AuthResponse } from '../types/auth';

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const registerSchema = z
  .object({
    // Step 1: Company
    company_name: z.string().min(2, 'Company name is required').max(200, 'Max 200 characters'),
    address_line1: z.string().min(3, 'Address line 1 is required').max(100, 'Max 100 characters'),
    address_line2: z.string().max(100, 'Max 100 characters'),
    address_line3: z.string().max(100, 'Max 100 characters'),
    state_id: z.string().min(1, 'Please select a state'),
    pincode: z
      .string()
      .refine((val) => !val || /^\d{6}$/.test(val), 'Pincode must be 6 digits'),
    phone: z
      .string()
      .refine((val) => !val || /^\d{10}$/.test(val), 'Phone must be 10 digits'),
    email: z.string().refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Invalid email address'),
    gst_no: z
      .string()
      .refine((val) => !val || GST_REGEX.test(val.toUpperCase()), 'Invalid GSTIN format (e.g. 29ABCDE1234F1Z5)'),

    // Step 2: Administrator Account
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(100, 'Max 100 characters')
      .refine((s) => !/\s/.test(s), 'Username cannot contain spaces'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string().min(8, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const getPasswordStrength = (pass: string) => {
  let score = 0;
  if (!pass) return 0;
  if (pass.length >= 8) score += 25;
  if (/[A-Z]/.test(pass)) score += 25;
  if (/[0-9]/.test(pass)) score += 25;
  if (/[^A-Za-z0-9]/.test(pass)) score += 25;
  return score;
};

const getStrengthLabel = (score: number) => {
  if (score <= 25) return { label: 'Weak', color: 'red' };
  if (score <= 50) return { label: 'Medium', color: 'orange' };
  if (score <= 75) return { label: 'Good', color: 'yellow' };
  return { label: 'Strong', color: 'teal' };
};

export const RegisterPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [states, setStates] = useState<StateItem[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    control,
    trigger,
    watch,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      company_name: '',
      address_line1: '',
      address_line2: '',
      address_line3: '',
      state_id: '',
      pincode: '',
      phone: '',
      email: '',
      gst_no: '',
      username: '',
      password: '',
      confirm_password: '',
    },
  });

  const passwordValue = watch('password') || '';
  const passwordStrength = getPasswordStrength(passwordValue);
  const strengthInfo = getStrengthLabel(passwordStrength);

  useEffect(() => {
    setLoadingStates(true);
    apiClient
      .get<StateItem[]>('/states/')
      .then((res) => setStates(res.data))
      .catch(() => {
        notifications.show({
          title: 'Network notice',
          message: 'Could not load states list. Please refresh.',
          color: 'red',
        });
      })
      .finally(() => setLoadingStates(false));
  }, []);

  const handleNextStep = async () => {
    const step1Valid = await trigger([
      'company_name',
      'address_line1',
      'address_line2',
      'address_line3',
      'state_id',
      'pincode',
      'phone',
      'email',
      'gst_no',
    ]);
    if (step1Valid) {
      setActiveStep(1);
    }
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        company_name: data.company_name.trim(),
        address_line1: data.address_line1.trim(),
        address_line2: data.address_line2?.trim() || '',
        address_line3: data.address_line3?.trim() || '',
        state_id: parseInt(data.state_id, 10),
        pincode: data.pincode?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        gst_no: data.gst_no?.trim() ? data.gst_no.trim().toUpperCase() : null,
        username: data.username.trim(),
        password: data.password,
        confirm_password: data.confirm_password,
      };

      const res = await apiClient.post<AuthResponse>('/auth/register/', payload);
      setAuth(res.data);

      notifications.show({
        title: 'Registration complete',
        message: `Company '${res.data.user.company_name}' registered successfully.`,
        color: 'burgundy',
      });

      navigate('/');
    } catch (err: any) {
      if (err.response?.data) {
        setServerErrors(setError, err.response.data);
        if (err.response.data.username) {
          setActiveStep(1);
        } else if (
          err.response.data.company_name ||
          err.response.data.phone ||
          err.response.data.gst_no
        ) {
          setActiveStep(0);
        }
      } else {
        notifications.show({
          title: 'Connection error',
          message: 'Unable to reach the server. Please try again.',
          color: 'red',
        });
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
        padding: '2rem 1rem',
      }}
    >
      <Container size="sm" style={{ width: '100%', maxWidth: '640px' }}>
        <Paper
          radius="md"
          p="2rem"
          withBorder
          shadow="xs"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
          }}
        >
          {/* Minimalist Header */}
          <Stack align="center" gap={4} mb="xl">
            <Title
              order={2}
              style={{
                color: '#800020',
                fontWeight: 700,
                letterSpacing: '-0.5px',
              }}
            >
              RouteFlow Registration
            </Title>
            <Text c="dimmed" size="xs">
              Set up your company profile and administrator account
            </Text>
          </Stack>

          {/* Root Form Error */}
          {errors.root && (
            <Alert
              title="Notice"
              color="red"
              variant="light"
              radius="sm"
              mb="md"
              styles={{ message: { fontSize: '13px' } }}
            >
              {errors.root.message}
            </Alert>
          )}

          {/* Stepper with Burgundy Active Color */}
          <Stepper
            active={activeStep}
            onStepClick={setActiveStep}
            color="burgundy"
            size="xs"
            mb="xl"
            styles={{
              stepLabel: { fontSize: '13px', fontWeight: 600 },
              stepDescription: { fontSize: '12px' },
            }}
          >
            <Stepper.Step label="Company Profile" description="Basic details & address" />
            <Stepper.Step label="Administrator Account" description="Admin credentials" />
          </Stepper>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* STEP 1: COMPANY INFO */}
            {activeStep === 0 && (
              <Stack gap="sm">
                <TextInput
                  label="Company Name"
                  placeholder="e.g. Future Gas Agencies"
                  required
                  {...register('company_name')}
                  error={errors.company_name?.message}
                  styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
                />

                <TextInput
                  label="Address Line 1"
                  placeholder="Building, street, or landmark"
                  required
                  {...register('address_line1')}
                  error={errors.address_line1?.message}
                  styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
                />

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <TextInput
                    label="Address Line 2 (Optional)"
                    placeholder="Locality / Area"
                    {...register('address_line2')}
                    error={errors.address_line2?.message}
                    styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
                  />
                  <TextInput
                    label="Address Line 3 (Optional)"
                    placeholder="City / District"
                    {...register('address_line3')}
                    error={errors.address_line3?.message}
                    styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
                  />
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                  <Controller
                    name="state_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="State"
                        placeholder={loadingStates ? 'Loading...' : 'Select state'}
                        required
                        data={states.map((s) => ({
                          value: String(s.StateId),
                          label: `${s.StateName} (${s.GSTStateCode || '--'})`,
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        searchable
                        nothingFoundMessage="No state found"
                        error={errors.state_id?.message}
                        styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
                      />
                    )}
                  />

                  <TextInput
                    label="Pincode"
                    placeholder="6 digits"
                    maxLength={6}
                    {...register('pincode')}
                    error={errors.pincode?.message}
                    styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
                  />

                  <TextInput
                    label="Phone Number"
                    placeholder="10 digits"
                    maxLength={10}
                    {...register('phone')}
                    error={errors.phone?.message}
                    styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
                  />
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  <TextInput
                    label="Email Address (Optional)"
                    placeholder="contact@company.com"
                    type="email"
                    {...register('email')}
                    error={errors.email?.message}
                    styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
                  />

                  <TextInput
                    label="GSTIN Number (Optional)"
                    placeholder="15 characters (e.g. 32ABCDE1234F1Z5)"
                    maxLength={15}
                    {...register('gst_no')}
                    error={errors.gst_no?.message}
                    styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
                  />
                </SimpleGrid>

                <Group justify="space-between" mt="lg">
                  <Text size="xs" c="dimmed">
                    Already registered?{' '}
                    <Anchor component={Link} to="/login" c="burgundy" fw={600}>
                      Sign In
                    </Anchor>
                  </Text>
                  <Button
                    onClick={handleNextStep}
                    color="burgundy"
                    size="sm"
                    style={{ backgroundColor: '#800020' }}
                  >
                    Next: Administrator Account
                  </Button>
                </Group>
              </Stack>
            )}

            {/* STEP 2: ADMINISTRATOR ACCOUNT */}
            {activeStep === 1 && (
              <Stack gap="sm">
                <TextInput
                  label="Administrator Username"
                  placeholder="3 to 100 characters, no spaces"
                  required
                  autoFocus
                  {...register('username')}
                  error={errors.username?.message}
                  styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
                />

                <PasswordInput
                  label="Password"
                  placeholder="At least 8 characters"
                  required
                  {...register('password')}
                  error={errors.password?.message}
                  styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
                />

                {/* Password strength bar */}
                {passwordValue.length > 0 && (
                  <Box>
                    <Group justify="space-between" mb={2}>
                      <Text size="xs" c="dimmed">
                        Strength
                      </Text>
                      <Text size="xs" fw={600} c={strengthInfo.color}>
                        {strengthInfo.label}
                      </Text>
                    </Group>
                    <Progress value={passwordStrength} color={strengthInfo.color} size="xs" radius="xl" />
                  </Box>
                )}

                <PasswordInput
                  label="Confirm Password"
                  placeholder="Re-type password"
                  required
                  {...register('confirm_password')}
                  error={errors.confirm_password?.message}
                  styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
                />

                <Group justify="space-between" mt="lg">
                  <Button
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={() => setActiveStep(0)}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>

                  <Button
                    type="submit"
                    color="burgundy"
                    size="sm"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    style={{ backgroundColor: '#800020' }}
                  >
                    Complete Registration
                  </Button>
                </Group>
              </Stack>
            )}
          </form>
        </Paper>
      </Container>
    </Box>
  );
};
