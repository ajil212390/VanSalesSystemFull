import React, { useState, useMemo } from 'react';
import {
  Title,
  Paper,
  TextInput,
  PasswordInput,
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
  Switch,
  ActionIcon,
  Box,
  Transition,
  Tooltip,
} from '@mantine/core';
import { IconPencil, IconTrash, IconSearch } from '@tabler/icons-react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface UserItem {
  UserId: number;
  Username: string;
  UserRole: number;
  role_name: string;
  DriverId?: number;
  driver_name?: string;
  IsActive: boolean;
  CreatedAt: string;
  delete_block_reason?: string | null;
}

interface UserFormValues {
  Username: string;
  password: string;
  UserRole: string;
  DriverId: string;
  IsActive: boolean; 
}

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [formOpened, setFormOpened] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; username: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Users
  const { data: users = [], isLoading } = useQuery<UserItem[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/users/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  // Client-side search filter
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter((u) =>
      (u.Username && u.Username.toLowerCase().includes(q)) ||
      (u.role_name && u.role_name.toLowerCase().includes(q)) ||
      (u.driver_name && u.driver_name.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  // 2. Fetch Roles
  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/roles/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  // 3. Fetch Drivers for optional linking
  const { data: drivers = [] } = useQuery<any[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/drivers/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  // 4. Form setup
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    defaultValues: {
      Username: '',
      password: '',
      UserRole: '',
      DriverId: '',
      IsActive: true,
    },
  });

  // 5. Mutation to create or edit user
  const saveMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const payload: any = {
        Username: data.Username.trim(),
        UserRole: parseInt(data.UserRole, 10),
        DriverId: data.DriverId ? parseInt(data.DriverId, 10) : null,
        IsActive: Boolean(data.IsActive), // <-- CHANGE THIS
      };

      if (data.password && data.password.trim()) {
        payload.password = data.password.trim();
      }

      if (editingUser) {
        return apiClient.patch(`/users/${editingUser.UserId}/`, payload);
      }
      return apiClient.post('/users/', payload);
    },
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: editingUser ? 'Staff user updated successfully.' : 'Staff user created successfully.',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      reset();
      setEditingUser(null);
      setFormOpened(false);
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.Username?.[0] ||
        err.response?.data?.password?.[0] ||
        err.response?.data?.detail ||
        'Failed to save user.';
      notifications.show({
        title: 'Error',
        message: msg,
        color: 'red',
      });
    },
  });

  const onSubmit = (values: UserFormValues) => {
    saveMutation.mutate(values);
  };

  // 6. Mutation to delete user
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/users/${id}/`);
    },
    onSuccess: () => {
      notifications.show({
        title: 'Deleted',
        message: 'Staff user deleted successfully.',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to delete user.';
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

  // Helper: start editing a user
  const handleEdit = (user: UserItem) => {
    setEditingUser(user);
    reset({
      Username: user.Username || '',
      password: '',
      UserRole: user.UserRole ? String(user.UserRole) : '',
      DriverId: user.DriverId ? String(user.DriverId) : '',
      IsActive: user.IsActive,
    });
    setFormOpened(true);
  };

  // Helper: start adding a new user
  const handleAddNew = () => {
    if (formOpened && !editingUser) {
      setFormOpened(false);
      return;
    }
    setEditingUser(null);
    reset({
      Username: '',
      password: '',
      UserRole: '',
      DriverId: '',
      IsActive: true, 
    });
    setFormOpened(true);
  };

  return (
    <Stack gap="lg">
      {/* Page Header */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Staff Users
          </Title>
          <Text size="sm" c="dimmed">
            Manage system logins, roles, and driver links for your company staff.
          </Text>
        </div>

        {/* Right Actions: Search Bar (left of button) + Add Button */}
        <Group gap="sm" align="center" wrap="nowrap">
          <Transition mounted={!formOpened} transition="fade" duration={200}>
            {(searchStyles) => (
              <Box style={{ ...searchStyles, width: 280 }}>
                <TextInput
                  placeholder="Search users..."
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
                + Add Staff User
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
                {editingUser ? `Edit Staff User: ${editingUser.Username}` : 'New Staff User Account'}
              </Text>
              <Text size="xs" c="dimmed">
                {editingUser
                  ? 'Update staff user role, driver link, or reset login password.'
                  : 'Create user login credentials and assign system roles.'}
              </Text>
            </div>
            <CloseButton
              size="md"
              onClick={() => {
                setFormOpened(false);
                setEditingUser(null);
              }}
            />
          </Group>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput
                  label="Username"
                  placeholder="e.g. rahul_sales"
                  required
                  {...register('Username', { required: 'Username is required' })}
                  error={errors.Username?.message}
                />

                <PasswordInput
                  label={editingUser ? 'Password (leave blank to keep unchanged)' : 'Password'}
                  placeholder={editingUser ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                  required={!editingUser}
                  {...register('password', {
                    required: editingUser ? false : 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                  error={errors.password?.message}
                />

                <Controller
                  name="UserRole"
                  control={control}
                  rules={{ required: 'Role is required' }}
                  render={({ field }) => (
                    <Select
                      label="Role"
                      placeholder="Select a role"
                      data={roles.map((r) => ({
                        value: String(r.UserRoleId),
                        label: r.RoleName,
                      }))}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.UserRole?.message}
                      required
                      searchable
                      nothingFoundMessage="No route found"
                    />
                  )}
                />

                <Controller
                  name="DriverId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Link to Driver (Optional)"
                      placeholder="Select driver if applicable"
                      clearable
                      data={drivers.map((d) => ({
                        value: String(d.DriverId),
                        label: `${d.DriverName} (${d.PhoneNumber})`,
                      }))}
                      value={field.value}
                      onChange={field.onChange}
                      searchable
                      nothingFoundMessage="No route found"
                    />
                  )}
                />                <Controller
                  name="IsActive"
                  control={control}
                  render={({ field }) => (
                    <Paper p="xs" radius="sm" withBorder style={{ backgroundColor: '#fcfcfc', borderColor: '#e2e8f0' }}>
                      <Switch
                        label={field.value ? 'Account Status: Active' : 'Account Status: Inactive'}
                        description={field.value ? 'User can log in to the system' : 'User is disabled and cannot log in'}
                        checked={field.value}
                        onChange={(e) => field.onChange(e.currentTarget.checked)}
                        color="burgundy"
                        size="sm"
                      />
                    </Paper>
                  )}
                />

              </SimpleGrid>

              <Group justify="flex-end" mt="md">
                <Button
                  variant="default"
                  onClick={() => {
                    setFormOpened(false);
                    setEditingUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="burgundy"
                  loading={isSubmitting || saveMutation.isPending}
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      </Collapse>

      {/* Animated Users Table */}
      <Transition mounted={!formOpened} transition="fade" duration={250} timingFunction="ease">
        {(styles) => (
          <Paper radius="sm" withBorder style={{ ...styles, backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
          {isLoading ? (
            <Center p="xl">
              <Loader color="burgundy" />
            </Center>
          ) : users.length === 0 ? (
            <Center p="xl">
              <Text c="dimmed" size="sm">
                No staff users found. Click "+ Add Staff User" above to create one.
              </Text>
            </Center>
          ) : filteredUsers.length === 0 ? (
            <Center p="xl">
              <Stack align="center" gap="xs">
                <Text c="dimmed" size="sm">
                  No staff users match "{searchQuery}".
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
                  <Table.Th>Username</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Linked Driver</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredUsers.map((u) => (
                  <Table.Tr key={u.UserId}>
                    <Table.Td style={{ fontWeight: 600 }}>{u.Username}</Table.Td>
                    <Table.Td>
                      <Badge variant="outline" color="burgundy" size="sm" style={{ borderColor: '#f5c2cb', color: '#800020' }}>
                        {u.role_name || `Role #${u.UserRole}`}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{u.driver_name || '-'}</Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="outline"
                        style={{
                          borderColor: u.IsActive ? '#cbd5e1' : '#fca5a5',
                          color: u.IsActive ? '#334155' : '#dc2626',
                          backgroundColor: u.IsActive ? '#f8fafc' : '#fff5f5',
                          fontWeight: 500,
                        }}
                      >
                        {u.IsActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <ActionIcon
                          variant="subtle"
                          color="burgundy"
                          size="sm"
                          title="Edit"
                          onClick={() => handleEdit(u)}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                        <Tooltip
                          label={u.delete_block_reason || 'Delete Staff User'}
                          withArrow
                          position="top"
                        >
                          <span>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              disabled={!!u.delete_block_reason}
                              style={{
                                cursor: u.delete_block_reason ? 'not-allowed' : 'pointer',
                                opacity: u.delete_block_reason ? 0.35 : 1,
                              }}
                              onClick={() => {
                                if (!u.delete_block_reason) {
                                  setDeleteTarget({ id: u.UserId, username: u.Username });
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
        title="Delete Staff User"
        itemType="user"
        itemName={deleteTarget?.username}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </Stack>
  );
};
