import React, { useState } from 'react';
import {
  Title,
  Paper,
  TextInput,
  Select,
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
  Alert,
  ActionIcon,
} from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { useForm, Controller, useWatch  } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';

interface AllocationItem {
  RouteVehicleDriverId: number;
  Route: number;
  Vehicle: number;
  Driver: number;
  RouteName: string;
  VehicleNumber: string;
  DriverName: string;
  AssignmentDate?: string;
  Narration?: string;
  IsActive: boolean;
}

interface AllocationFormValues {
  Route: string;
  Vehicle: string;
  Driver: string;
  AssignmentDate: string;
  Narration: string;
}

export const AllocationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [formOpened, setFormOpened] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<AllocationItem | null>(null);

  // 1. Fetch allocations
  const { data: allocations = [], isLoading } = useQuery<AllocationItem[]>({
    queryKey: ['allocations'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/allocations/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  // 2. Fetch dropdown options (Routes, Vehicles, Drivers)
  const { data: routes = [] } = useQuery<any[]>({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await apiClient.get('/routes/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await apiClient.get('/vehicles/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  const { data: drivers = [] } = useQuery<any[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await apiClient.get('/drivers/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });
    const { data: users = [] } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get('/users/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  // 3. Form Setup
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AllocationFormValues>({
    defaultValues: {
      Route: '',
      Vehicle: '',
      Driver: '',
      AssignmentDate: new Date().toISOString().split('T')[0],
      Narration: '',
    },
  });
    // Instantly re-evaluate whenever the selected Driver changes
  const selectedDriverId = useWatch({ control, name: 'Driver' });

  // Find if this driver is linked to any staff user
  const selectedDriverUser = selectedDriverId
    ? users.find((u) => u.DriverId && String(u.DriverId) === String(selectedDriverId))
    : null;

  // True only if a driver is chosen AND has NO user account
  const driverHasNoUser = Boolean(selectedDriverId && !selectedDriverUser);

  // 4. Mutation to create or edit allocation
  const saveMutation = useMutation({
    mutationFn: async (data: AllocationFormValues) => {
      const payload: any = {
        Route: parseInt(data.Route, 10),
        Vehicle: parseInt(data.Vehicle, 10),
        Driver: parseInt(data.Driver, 10),
        AssignmentDate: data.AssignmentDate || null,
        Narration: data.Narration?.trim() || null,
        IsActive: true,
      };

      if (editingAllocation) {
        return apiClient.patch(`/allocations/${editingAllocation.RouteVehicleDriverId}/`, payload);
      }
      return apiClient.post('/allocations/', payload);
    },
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: editingAllocation ? 'Allocation updated successfully.' : 'Route, vehicle, and driver allocated successfully.',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      reset();
      setEditingAllocation(null);
      setFormOpened(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to save allocation.';
      notifications.show({
        title: 'Error',
        message: msg,
        color: 'red',
      });
    },
  });

  const onSubmit = (values: AllocationFormValues) => {
    saveMutation.mutate(values);
  };

  // 5. Mutation to delete allocation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/allocations/${id}/`);
    },
    onSuccess: () => {
      notifications.show({
        title: 'Deleted',
        message: 'Allocation deleted successfully.',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to delete allocation.';
      notifications.show({
        title: 'Cannot Delete',
        message: msg,
        color: 'red',
      });
    },
  });

  const handleDelete = (id: number, info: string) => {
    if (window.confirm(`Are you sure you want to delete allocation "${info}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Helper: start editing an allocation
  const handleEdit = (item: AllocationItem) => {
    setEditingAllocation(item);
    reset({
      Route: String(item.Route || ''),
      Vehicle: String(item.Vehicle || ''),
      Driver: String(item.Driver || ''),
      AssignmentDate: item.AssignmentDate || new Date().toISOString().split('T')[0],
      Narration: item.Narration || '',
    });
    setFormOpened(true);
  };

  // Helper: start adding a new allocation
  const handleAddNew = () => {
    if (formOpened && !editingAllocation) {
      setFormOpened(false);
      return;
    }
    setEditingAllocation(null);
    reset({
      Route: '',
      Vehicle: '',
      Driver: '',
      AssignmentDate: new Date().toISOString().split('T')[0],
      Narration: '',
    });
    setFormOpened(true);
  };

  return (
    <Stack gap="lg">
      {/* Page Header */}
      <Group justify="space-between" align="center">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Allocations
          </Title>
          <Text size="sm" c="dimmed">
            Assign drivers and vehicles to active delivery routes.
          </Text>
        </div>

        <Button color="burgundy" onClick={handleAddNew}>
          + New Allocation
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
                {editingAllocation ? `Edit Allocation #${editingAllocation.RouteVehicleDriverId}` : 'New Allocation Assignment'}
              </Text>
              <Text size="xs" c="dimmed">
                {editingAllocation
                  ? 'Update route, vehicle, and driver assignments.'
                  : 'Pair an active Route, Vehicle, and Driver for distribution.'}
              </Text>
            </div>
            <CloseButton
              size="md"
              onClick={() => {
                setFormOpened(false);
                setEditingAllocation(null);
              }}
            />
          </Group>


          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                <Controller
                  name="Route"
                  control={control}
                  rules={{ required: 'Route is required' }}
                  render={({ field }) => (
                    <Select
                      label="Select Route"
                      placeholder="Choose route"
                      data={routes.map((r) => ({
                        value: String(r.RouteId),
                        label: r.RouteName,
                      }))}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.Route?.message}
                      required
                    />
                  )}
                />

                <Controller
                  name="Vehicle"
                  control={control}
                  rules={{ required: 'Vehicle is required' }}
                  render={({ field }) => (
                    <Select
                      label="Select Vehicle"
                      placeholder="Choose vehicle"
                      data={vehicles.map((v) => ({
                        value: String(v.VehicleId),
                        label: `${v.VehicleNumber} ${v.VehicleName ? `(${v.VehicleName})` : ''}`,
                      }))}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.Vehicle?.message}
                      required
                    />
                  )}
                />

                <Controller
                  name="Driver"
                  control={control}
                  rules={{ required: 'Driver is required' }}
                  render={({ field }) => (
                    <Select
                      label="Select Driver"
                      placeholder="Choose driver"
                      data={drivers.map((d) => ({
                        value: String(d.DriverId),
                        label: `${d.DriverName} (${d.PhoneNumber})`,
                      }))}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.Driver?.message}
                      required
                    />
                  )}
                />
              </SimpleGrid>
                              {/* Alert if driver is not mapped to a user account */}
              {driverHasNoUser && (
                <Alert
                  color="yellow"
                  variant="light"
                  radius="sm"
                  title="Notice: Driver Not Linked to a User Account"
                  styles={{ message: { fontSize: '13px' } }}
                >
                  The selected driver does not have a user account created yet. You can still assign them, or create a staff login for them under <b>Staff Users</b>.
                </Alert>
              )}

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput
                  label="Assignment Date"
                  type="date"
                  {...register('AssignmentDate')}
                />

                <TextInput
                  label="Notes / Narration"
                  placeholder="e.g. Morning shift"
                  {...register('Narration')}
                />
              </SimpleGrid>

              <Group justify="flex-end" mt="md">
                <Button
                  variant="default"
                  onClick={() => {
                    setFormOpened(false);
                    setEditingAllocation(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="burgundy"
                  loading={isSubmitting || saveMutation.isPending}
                >
                  {editingAllocation ? 'Save Changes' : 'Save Allocation'}
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      </Collapse>

      {/* Allocations Table */}
      <Paper p="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
        {isLoading ? (
          <Center p="xl">
            <Loader color="burgundy" />
          </Center>
        ) : allocations.length === 0 ? (
          <Center p="xl">
            <Text c="dimmed" size="sm">
              No allocations created yet. Click "+ New Allocation" above to assign a Route, Vehicle, and Driver.
            </Text>
          </Center>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Route</Table.Th>
                <Table.Th>Vehicle</Table.Th>
                <Table.Th>Driver</Table.Th>
                <Table.Th>Assignment Date</Table.Th>
                <Table.Th>Notes</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {allocations.map((a) => (
                <Table.Tr key={a.RouteVehicleDriverId}>
                  <Table.Td style={{ fontWeight: 600 }}>{a.RouteName || `Route #${a.Route}`}</Table.Td>
                  <Table.Td>{a.VehicleNumber || `Vehicle #${a.Vehicle}`}</Table.Td>
                  <Table.Td>{a.DriverName || `Driver #${a.Driver}`}</Table.Td>
                  <Table.Td>{a.AssignmentDate || '-'}</Table.Td>
                  <Table.Td>{a.Narration || '-'}</Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      variant="outline"
                      style={{
                        borderColor: a.IsActive ? '#cbd5e1' : '#fca5a5',
                        color: a.IsActive ? '#334155' : '#dc2626',
                        backgroundColor: a.IsActive ? '#f8fafc' : '#fff5f5',
                        fontWeight: 500,
                      }}
                    >
                      {a.IsActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <ActionIcon
                        variant="subtle"
                        color="burgundy"
                        size="sm"
                        title="Edit"
                        onClick={() => handleEdit(a)}
                      >
                        <IconPencil size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        title="Delete"
                        loading={deleteMutation.isPending && deleteMutation.variables === a.RouteVehicleDriverId}
                        onClick={() => handleDelete(a.RouteVehicleDriverId, `${a.RouteName} - ${a.DriverName}`)}
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
