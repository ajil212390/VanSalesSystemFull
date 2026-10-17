import React, { useState } from 'react';
import {
  Title,
  Paper,
  TextInput,
  Button,
  Group,
  Stack,
  Table,
  Badge,
  Loader,
  Center,
  Text,
  Collapse,
  SimpleGrid,
  CloseButton,
  ActionIcon,
} from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';

interface RouteItem {
  RouteId: number;
  RouteName: string;
  Description?: string;
  StartLocation?: string;
  EndLocation?: string;
  IsActive: boolean;
}

interface RouteFormValues {
  RouteName: string;
  StartLocation: string;
  EndLocation: string;
  Description: string;
}

export const RoutesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [formOpened, setFormOpened] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteItem | null>(null);

  // 1. Fetch routes list
  const { data: routes = [], isLoading } = useQuery<RouteItem[]>({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/routes/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  // 2. Form state
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RouteFormValues>({
    defaultValues: {
      RouteName: '',
      StartLocation: '',
      EndLocation: '',
      Description: '',
    },
  });

  // 3. Mutation to create or edit route
  const saveMutation = useMutation({
    mutationFn: async (data: RouteFormValues) => {
      const payload: any = {
        RouteName: data.RouteName.trim(),
        StartLocation: data.StartLocation?.trim() || null,
        EndLocation: data.EndLocation?.trim() || null,
        Description: data.Description?.trim() || null,
        IsActive: true,
      };

      if (editingRoute) {
        return apiClient.patch(`/routes/${editingRoute.RouteId}/`, payload);
      }
      return apiClient.post('/routes/', payload);
    },
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: editingRoute ? 'Route updated successfully.' : 'Route added successfully.',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      reset();
      setEditingRoute(null);
      setFormOpened(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.RouteName?.[0] || err.response?.data?.detail || 'Failed to save route.';
      notifications.show({
        title: 'Error',
        message: msg,
        color: 'red',
      });
    },
  });

  const onSubmit = (values: RouteFormValues) => {
    saveMutation.mutate(values);
  };

  // 4. Mutation to delete route
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/routes/${id}/`);
    },
    onSuccess: () => {
      notifications.show({
        title: 'Deleted',
        message: 'Route deleted successfully.',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to delete route.';
      notifications.show({
        title: 'Cannot Delete',
        message: msg,
        color: 'red',
      });
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete route "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Helper: start editing a route
  const handleEdit = (route: RouteItem) => {
    setEditingRoute(route);
    reset({
      RouteName: route.RouteName || '',
      StartLocation: route.StartLocation || '',
      EndLocation: route.EndLocation || '',
      Description: route.Description || '',
    });
    setFormOpened(true);
  };

  // Helper: start adding a new route
  const handleAddNew = () => {
    if (formOpened && !editingRoute) {
      setFormOpened(false);
      return;
    }
    setEditingRoute(null);
    reset({
      RouteName: '',
      StartLocation: '',
      EndLocation: '',
      Description: '',
    });
    setFormOpened(true);
  };

  return (
    <Stack gap="lg">
      {/* Page Header */}
      <Group justify="space-between" align="center">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Routes
          </Title>
          <Text size="sm" c="dimmed">
            Manage distribution and delivery routes for your company.
          </Text>
        </div>

        <Button color="burgundy" onClick={handleAddNew}>
          + Add Route
        </Button>
      </Group>

      {/* Smooth Slide-Down Form Panel */}
      <Collapse expanded={formOpened} transitionDuration={300} transitionTimingFunction="ease">
        <Paper
          p="lg"
          radius="sm"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#f5c2cb',
            borderLeft: '4px solid #800020',
          }}
        >
          <Group justify="space-between" align="flex-start" mb="md">
            <div>
              <Text fw={700} style={{ color: '#800020' }}>
                {editingRoute ? `Edit Route: ${editingRoute.RouteName}` : 'New Route Details'}
              </Text>
              <Text size="xs" c="dimmed">
                {editingRoute
                  ? 'Update route details, start location, and destination market.'
                  : 'Specify route name, start location, and destination market.'}
              </Text>
            </div>
            <CloseButton
              size="md"
              onClick={() => {
                setFormOpened(false);
                setEditingRoute(null);
              }}
            />
          </Group>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput
                  label="Route Name"
                  placeholder="e.g. North Sector Daily"
                  required
                  {...register('RouteName', { required: 'Route name is required' })}
                  error={errors.RouteName?.message}
                />

                <TextInput
                  label="Start Location"
                  placeholder="e.g. Main Godown"
                  {...register('StartLocation')}
                />

                <TextInput
                  label="End Location"
                  placeholder="e.g. North Zone Market"
                  {...register('EndLocation')}
                />

                <TextInput
                  label="Description"
                  placeholder="Optional notes about this route"
                  {...register('Description')}
                />
              </SimpleGrid>

              <Group justify="flex-end" mt="md">
                <Button
                  variant="default"
                  onClick={() => {
                    setFormOpened(false);
                    setEditingRoute(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="burgundy"
                  loading={isSubmitting || saveMutation.isPending}
                >
                  {editingRoute ? 'Save Changes' : 'Save Route'}
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      </Collapse>

      {/* Routes Table */}
      <Paper p="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
        {isLoading ? (
          <Center p="xl">
            <Loader color="burgundy" />
          </Center>
        ) : routes.length === 0 ? (
          <Center p="xl">
            <Text c="dimmed" size="sm">
              No routes added yet. Click "+ Add Route" above to create one.
            </Text>
          </Center>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Route Name</Table.Th>
                <Table.Th>Start Location</Table.Th>
                <Table.Th>End Location</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {routes.map((r) => (
                <Table.Tr key={r.RouteId}>
                  <Table.Td style={{ fontWeight: 600 }}>{r.RouteName}</Table.Td>
                  <Table.Td>{r.StartLocation || '-'}</Table.Td>
                  <Table.Td>{r.EndLocation || '-'}</Table.Td>
                  <Table.Td>{r.Description || '-'}</Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      variant="outline"
                      style={{
                        borderColor: r.IsActive ? '#cbd5e1' : '#fca5a5',
                        color: r.IsActive ? '#334155' : '#dc2626',
                        backgroundColor: r.IsActive ? '#f8fafc' : '#fff5f5',
                        fontWeight: 500,
                      }}
                    >
                      {r.IsActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <ActionIcon
                        variant="subtle"
                        color="burgundy"
                        size="sm"
                        title="Edit"
                        onClick={() => handleEdit(r)}
                      >
                        <IconPencil size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        title="Delete"
                        loading={deleteMutation.isPending && deleteMutation.variables === r.RouteId}
                        onClick={() => handleDelete(r.RouteId, r.RouteName)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
};
