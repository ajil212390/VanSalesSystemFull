import React, { useState, useMemo } from 'react';
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
  Box,
  Transition,
  Tooltip,
} from '@mantine/core';
import { IconPencil, IconTrash, IconSearch } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface RouteItem {
  RouteId: number;
  RouteName: string;
  Description?: string;
  StartLocation?: string;
  EndLocation?: string;
  IsActive: boolean;
  delete_block_reason?: string | null;
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch routes list
  const { data: routes = [], isLoading } = useQuery<RouteItem[]>({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/routes/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  // Client-side search filter
  const filteredRoutes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return routes;
    return routes.filter((r) =>
      (r.RouteName && r.RouteName.toLowerCase().includes(q)) ||
      (r.StartLocation && r.StartLocation.toLowerCase().includes(q)) ||
      (r.EndLocation && r.EndLocation.toLowerCase().includes(q)) ||
      (r.Description && r.Description.toLowerCase().includes(q))
    );
  }, [routes, searchQuery]);

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

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, {
        onSettled: () => setDeleteTarget(null),
      });
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
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Routes
          </Title>
          <Text size="sm" c="dimmed">
            Manage distribution and delivery routes for your company.
          </Text>
        </div>

        {/* Right Actions: Search Bar (left of button) + Add Button */}
        <Group gap="sm" align="center" wrap="nowrap">
          <Transition mounted={!formOpened} transition="fade" duration={200}>
            {(searchStyles) => (
              <Box style={{ ...searchStyles, width: 280 }}>
                <TextInput
                  placeholder="Search routes..."
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
                + Add Route
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

      {/* Animated Routes Table */}
      <Transition mounted={!formOpened} transition="fade" duration={250} timingFunction="ease">
        {(styles) => (
          <Paper radius="sm" withBorder style={{ ...styles, backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
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
          ) : filteredRoutes.length === 0 ? (
            <Center p="xl">
              <Stack align="center" gap="xs">
                <Text c="dimmed" size="sm">
                  No routes match "{searchQuery}".
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
                  <Table.Th>Route Name</Table.Th>
                  <Table.Th>Start Location</Table.Th>
                  <Table.Th>End Location</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredRoutes.map((r) => (
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
                        <Tooltip
                          label={r.delete_block_reason || 'Delete Route'}
                          withArrow
                          position="top"
                        >
                          <span>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              disabled={!!r.delete_block_reason}
                              style={{
                                cursor: r.delete_block_reason ? 'not-allowed' : 'pointer',
                                opacity: r.delete_block_reason ? 0.35 : 1,
                              }}
                              onClick={() => {
                                if (!r.delete_block_reason) {
                                  setDeleteTarget({ id: r.RouteId, name: r.RouteName });
                                }
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
        title="Delete Route"
        itemType="route"
        itemName={deleteTarget?.name}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </Stack>
  );
};
