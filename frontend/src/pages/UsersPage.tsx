import React, { useState } from 'react';
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
} from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';

interface UserItem {
  UserId: number;
  Username: string;
  UserRole: number;
  role_name: string;
  DriverId?: number;
  driver_name?: string;
  IsActive: boolean;
  CreatedAt: string;
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

  // 1. Fetch Users
  const { data: users = [], isLoading } = useQuery<UserItem[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/users/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

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

  const handleDelete = (id: number, username: string) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      deleteMutation.mutate(id);
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
      <Group justify="space-between" align="center">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Staff Users
          </Title>
          <Text size="sm" c="dimmed">
            Manage system logins, roles, and driver links for your company staff.
          </Text>
        </div>

        <Button color="burgundy" onClick={handleAddNew}>
          + Add Staff User
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

      {/* Users Table */}
      <Paper p="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
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
              {users.map((u) => (
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
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        title="Delete"
                        loading={deleteMutation.isPending && deleteMutation.variables === u.UserId}
                        onClick={() => handleDelete(u.UserId, u.Username)}
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
