import React, { useEffect } from 'react';
import {
  Title,
  Paper,
  TextInput,
  Select,
  Button,
  Group,
  Stack,
  SimpleGrid,
  Alert,
  Badge,
  Loader,
  Center,
  Textarea,
} from '@mantine/core';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import type { Company, StateItem } from '../types/auth';

export const CompanyProfilePage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const isOwnerOrAdmin = user?.role === 'Administrator' || user?.role === 'Manager';

  // 1. Fetch Company Profile
  const { data: company, isLoading, error } = useQuery<Company>({
    queryKey: ['company-profile'],
    queryFn: async () => {
      const res = await apiClient.get<Company>('/company/');
      return res.data;
    },
  });

  // 2. Fetch States
  const { data: states = [] } = useQuery<StateItem[]>({
    queryKey: ['states'],
    queryFn: async () => {
      const res = await apiClient.get<StateItem[]>('/states/');
      return res.data;
    },
  });

  const { register, handleSubmit, reset, control, formState: { isDirty } } = useForm({
    defaultValues: {
      Name: '',
      AddressLine1: '',
      AddressLine2: '',
      AddressLine3: '',
      state_id: '',
      Pincode: '',
      Phone: '',
      Email: '',
      GstNo: '',
      Narration: '',
    },
  });

  useEffect(() => {
    if (company) {
      reset({
        Name: company.Name || '',
        AddressLine1: company.AddressLine1 || '',
        AddressLine2: company.AddressLine2 || '',
        AddressLine3: company.AddressLine3 || '',
        state_id: company.state_id ? String(company.state_id) : '',
        Pincode: company.Pincode || '',
        Phone: company.Phone || '',
        Email: company.Email || '',
        GstNo: company.GstNo || '',
        Narration: company.Narration || '',
      });
    }
  }, [company, reset]);

  // 3. Update Company Mutation
  const mutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const payload: any = {
        Name: updatedData.Name,
        AddressLine1: updatedData.AddressLine1,
        AddressLine2: updatedData.AddressLine2 || '',
        AddressLine3: updatedData.AddressLine3 || '',
        Pincode: updatedData.Pincode || null,
        Phone: updatedData.Phone || null,
        Email: updatedData.Email || null,
        GstNo: updatedData.GstNo ? updatedData.GstNo.toUpperCase() : null,
        Narration: updatedData.Narration || null,
      };
      if (updatedData.state_id) {
        payload.state_id = parseInt(updatedData.state_id, 10);
      }
      const res = await apiClient.patch('/company/', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['company-profile'], data);
      notifications.show({
        title: 'Saved',
        message: 'Company profile updated successfully.',
        color: 'burgundy',
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Save failed',
        message: err.response?.data?.non_field_errors?.[0] || 'Could not update company profile.',
        color: 'red',
      });
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Center style={{ minHeight: '300px' }}>
        <Loader color="burgundy" size="md" />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert color="red" title="Error" variant="light">
        Failed to load company profile.
      </Alert>
    );
  }

  return (
    <Stack gap="md" style={{ maxWidth: '800px' }}>
      <Paper p="1.5rem" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <Title order={3} style={{ color: '#0f172a', fontWeight: 600 }}>
              Company Profile
            </Title>
            <Badge color="burgundy" variant="light" size="sm" style={{ backgroundColor: '#fdf2f4', color: '#800020' }}>
              Tenant #{company?.CompanyId}
            </Badge>
          </Group>
          {!isOwnerOrAdmin && (
            <Badge color="gray" variant="outline" size="sm">
              Read-Only
            </Badge>
          )}
        </Group>

        {!isOwnerOrAdmin && (
          <Alert color="gray" variant="light" mb="md" styles={{ message: { fontSize: '13px' } }}>
            You are logged in as <strong>{user?.role}</strong>. Only the <strong>Administrator</strong> or <strong>Manager</strong> can edit company details.
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack gap="sm">
            <TextInput
              label="Company Name"
              required
              disabled={!isOwnerOrAdmin}
              {...register('Name', { required: true })}
              styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
            />

            <TextInput
              label="Address Line 1"
              required
              disabled={!isOwnerOrAdmin}
              {...register('AddressLine1', { required: true })}
              styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
            />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label="Address Line 2 (Optional)"
                disabled={!isOwnerOrAdmin}
                {...register('AddressLine2')}
                styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
              />
              <TextInput
                label="Address Line 3 (Optional)"
                disabled={!isOwnerOrAdmin}
                {...register('AddressLine3')}
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
                    disabled={!isOwnerOrAdmin}
                    data={states.map((s) => ({
                      value: String(s.StateId),
                      label: `${s.StateName} (${s.GSTStateCode || '--'})`,
                    }))}
                    value={field.value}
                    onChange={field.onChange}
                    searchable
                    styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
                  />
                )}
              />

              <TextInput
                label="Pincode"
                maxLength={6}
                disabled={!isOwnerOrAdmin}
                {...register('Pincode')}
                styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
              />

              <TextInput
                label="Phone Number"
                maxLength={10}
                disabled={!isOwnerOrAdmin}
                {...register('Phone')}
                styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label="Email Address"
                type="email"
                disabled={!isOwnerOrAdmin}
                {...register('Email')}
                styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
              />

              <TextInput
                label="GSTIN"
                maxLength={15}
                disabled={!isOwnerOrAdmin}
                {...register('GstNo')}
                styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
              />
            </SimpleGrid>

            <Textarea
              label="Narration / Notes"
              rows={2}
              disabled={!isOwnerOrAdmin}
              {...register('Narration')}
              styles={{ label: { fontSize: '13px', fontWeight: 500, color: '#334155' } }}
            />

            {isOwnerOrAdmin && (
              <Group justify="flex-end" mt="md">
                <Button
                  type="submit"
                  color="burgundy"
                  size="sm"
                  loading={mutation.isPending}
                  disabled={!isDirty || mutation.isPending}
                  style={{ backgroundColor: '#800020' }}
                >
                  Save Changes
                </Button>
              </Group>
            )}
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
};
