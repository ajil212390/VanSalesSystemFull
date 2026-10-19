import React, { useState, useMemo } from 'react';
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
  Box,
  Transition,
  Tooltip,
} from '@mantine/core';
import { IconPencil, IconTrash, IconAlertCircle, IconSearch } from '@tabler/icons-react';
import { useForm, Controller, useWatch  } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

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
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch allocations
  const { data: allocations = [], isLoading } = useQuery<AllocationItem[]>({
    queryKey: ['allocations'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/allocations/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  // Client-side search filter
  const filteredAllocations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allocations;
    return allocations.filter((a) =>
      (a.RouteName && a.RouteName.toLowerCase().includes(q)) ||
      (a.VehicleNumber && a.VehicleNumber.toLowerCase().includes(q)) ||
      (a.DriverName && a.DriverName.toLowerCase().includes(q)) ||
      (a.Narration && a.Narration.toLowerCase().includes(q))
    );
  }, [allocations, searchQuery]);

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
    if (driverHasNoUser) {
      notifications.show({
        title: 'Cannot Save Allocation',
        message: 'The selected driver does not have a user account created yet. Please create a staff user login first.',
        color: 'red',
      });
      return;
    }
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

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, {
        onSettled: () => setDeleteTarget(null),
      });
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
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Allocations
          </Title>
          <Text size="sm" c="dimmed">
            Assign drivers and vehicles to active delivery routes.
          </Text>
        </div>

        {/* Right Actions: Search Bar (left of button) + New Allocation Button */}
        <Group gap="sm" align="center" wrap="nowrap">
          <Transition mounted={!formOpened} transition="fade" duration={200}>
            {(searchStyles) => (
              <Box style={{ ...searchStyles, width: 280 }}>
                <TextInput
                  placeholder="Search allocations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  leftSection={<IconSearch size={16} stroke={1.5} color="#800020" />}
                  rightSection={
                    searchQuery ? (
                      <CloseButton
                        size="sm"
                        aria-label="Clear search"
                        onClick={() => setSearchQuery('')}
                      />
                    ) : null
                  }
                  radius="md"
                  size="sm"
                />
              </Box>
            )}
          </Transition>

          <Transition mounted={!formOpened} transition="fade" duration={200}>
            {(btnStyles) => (
              <Button color="burgundy" onClick={handleAddNew} style={btnStyles}>
                + New Allocation
              </Button>
            )}
          </Transition>
        </Group>
      </Group>

      {/* Seamless Form & Table Container - wraps both to eliminate flex gap jumping */}
      <Box>
        {/* Smooth Slide-Down Form Panel */}
        <Collapse expanded={formOpened} transitionDuration={250} transitionTimingFunction="ease">
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
                      searchable
                      nothingFoundMessage="No route found"
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
                      searchable
                      nothingFoundMessage="No route found"
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
                      searchable
                      nothingFoundMessage="No route found"
                    />
                  )}
                />
              </SimpleGrid>
                              {/* Alert if driver is not mapped to a user account */}
              {driverHasNoUser && (
                <Alert
                  color="burgundy"
                  variant="light"
                  radius="sm"
                  icon={<IconAlertCircle size={18} />}
                  title="Action Required: Driver Not Linked to a User Account"
                  styles={{
                    root: {
                      borderColor: '#f5c2cb',
                      borderLeft: '4px solid #800020',
                    },
                    message: { fontSize: '13px' },
                  }}
                >
                  The selected driver cannot be assigned because they do not have a user login account. Please create a staff user for this driver under <b>Staff Users</b> before saving this allocation.
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
                <Tooltip
                  label="Cannot save: Selected driver has no staff user account"
                  disabled={!driverHasNoUser}
                  withArrow
                  position="top"
                >
                  <span>
                    <Button
                      type="submit"
                      color="burgundy"
                      disabled={driverHasNoUser}
                      loading={isSubmitting || saveMutation.isPending}
                      style={{
                        cursor: driverHasNoUser ? 'not-allowed' : 'pointer',
                        opacity: driverHasNoUser ? 0.45 : 1,
                      }}
                    >
                      {editingAllocation ? 'Save Changes' : 'Save Allocation'}
                    </Button>
                  </span>
                </Tooltip>
              </Group>
            </Stack>
          </form>
        </Paper>
      </Collapse>

      {/* Animated Allocations Table */}
      <Transition mounted={!formOpened} transition="fade" duration={250} timingFunction="ease">
        {(styles) => (
          <Paper radius="sm" withBorder style={{ ...styles, backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
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
          ) : filteredAllocations.length === 0 ? (
            <Center p="xl">
              <Stack align="center" gap="xs">
                <Text c="dimmed" size="sm">
                  No allocations match "{searchQuery}".
                </Text>
                <Button variant="subtle" size="xs" color="burgundy" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              </Stack>
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
                {filteredAllocations.map((a) => (
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
                        <Tooltip label="Delete Allocation" withArrow position="top">
                          <span>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget({
                                  id: a.RouteVehicleDriverId,
                                  name: `${a.RouteName} - ${a.DriverName} (${a.VehicleNumber})`,
                                });
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </span>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
          </Paper>
        )}
      </Transition>
      </Box>

      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmModal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Allocation"
        itemType="allocation"
        itemName={deleteTarget?.name}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </Stack>
  );
};
