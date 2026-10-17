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

interface DriverItem {
    DriverId: number;
    DriverName: string;
    PhoneNumber: string;
    LicenseNumber?: string;
    LicenseExpiryDate?: string;
    AddressLine1?: string;
    AddressLine2?: string;
    AddressLine3?: string;
    IsActive: boolean;
}

interface DriverFormValues {
    DriverName: string;
    PhoneNumber: string;
    LicenseNumber: string;
    LicenseExpiryDate: string;
    AddressLine1: string;
    AddressLine2: string;
}

export const DriversPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [formOpened, setFormOpened] = useState(false);
    const [editingDriver, setEditingDriver] = useState<DriverItem | null>(null);

    // 1. Fetch drivers list
    const { data: drivers = [], isLoading } = useQuery<DriverItem[]>({
        queryKey: ['drivers'],
        queryFn: async () => {
            const res = await apiClient.get<DriverItem[]>('/drivers/');
            return Array.isArray(res.data) ? res.data : (res.data?.results || []);
        },
    });

    // 2. Form state
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<DriverFormValues>({
        defaultValues: {
            DriverName: '',
            PhoneNumber: '',
            LicenseNumber: '',
            LicenseExpiryDate: '',
            AddressLine1: '',
            AddressLine2: '',
        },
    });
    // 3. Mutation to create or edit driver
    const saveMutation = useMutation({
        mutationFn: async (data: DriverFormValues) => {
            const payload: any = {
                DriverName: data.DriverName.trim(),
                PhoneNumber: data.PhoneNumber.trim(),
                LicenseNumber: data.LicenseNumber?.trim() || null,
                LicenseExpiryDate: data.LicenseExpiryDate || null,
                AddressLine1: data.AddressLine1?.trim() || null,
                AddressLine2: data.AddressLine2?.trim() || null,
                IsActive: true,
            };

            if (editingDriver) {
                return apiClient.patch(`/drivers/${editingDriver.DriverId}/`, payload);
            }
            return apiClient.post('/drivers/', payload);
        },
        onSuccess: () => {
            notifications.show({
                title: 'Success',
                message: editingDriver ? 'Driver updated successfully.' : 'Driver added successfully.',
                color: 'green',
            });
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
            reset();
            setEditingDriver(null);
            setFormOpened(false);
        },
        onError: (err: any) => {
            const msg = err.response?.data?.DriverName?.[0] || err.response?.data?.detail || 'Failed to save driver.';
            notifications.show({
                title: 'Error',
                message: msg,
                color: 'red',
            });
        },
    });

    const onSubmit = (values: DriverFormValues) => {
        saveMutation.mutate(values);
    };

    // 4. Mutation to delete driver
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return apiClient.delete(`/drivers/${id}/`);
        },
        onSuccess: () => {
            notifications.show({
                title: 'Deleted',
                message: 'Driver deleted successfully.',
                color: 'green',
            });
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
        },
        onError: (err: any) => {
            const msg = err.response?.data?.detail || 'Failed to delete driver.';
            notifications.show({
                title: 'Cannot Delete',
                message: msg,
                color: 'red',
            });
        },
    });

    const handleDelete = (id: number, name: string) => {
        if (window.confirm(`Are you sure you want to delete driver "${name}"?`)) {
            deleteMutation.mutate(id);
        }
    };

    // Helper: start editing a driver
    const handleEdit = (driver: DriverItem) => {
        setEditingDriver(driver);
        reset({
            DriverName: driver.DriverName || '',
            PhoneNumber: driver.PhoneNumber || '',
            LicenseNumber: driver.LicenseNumber || '',
            LicenseExpiryDate: driver.LicenseExpiryDate || '',
            AddressLine1: driver.AddressLine1 || '',
            AddressLine2: driver.AddressLine2 || '',
        });
        setFormOpened(true);
    };

    // Helper: start adding a new driver
    const handleAddNew = () => {
        if (formOpened && !editingDriver) {
            setFormOpened(false);
            return;
        }
        setEditingDriver(null);
        reset({
            DriverName: '',
            PhoneNumber: '',
            LicenseNumber: '',
            LicenseExpiryDate: '',
            AddressLine1: '',
            AddressLine2: '',
        });
        setFormOpened(true);
    };


    return (
        <Stack gap="lg">
            {/* Page Header */}
            <Group justify="space-between" align="center">
                <div>
                    <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
                        Drivers
                    </Title>
                    <Text size="sm" c="dimmed">
                        Manage your company's drivers and their license information.
                    </Text>
                </div>

                        <Button color="burgundy" onClick={handleAddNew}>
                            + Add Driver
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
                                {editingDriver ? `Edit Driver: ${editingDriver.DriverName}` : 'New Driver Details'}
                            </Text>
                            <Text size="xs" c="dimmed">
                                {editingDriver
                                    ? 'Update driver details and license information.'
                                    : 'Enter driver credentials and license renewal dates.'}
                            </Text>
                        </div>
                        <CloseButton
                            size="md"
                            onClick={() => {
                                setFormOpened(false);
                                setEditingDriver(null);
                            }}
                        />
                    </Group>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Stack gap="sm">
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                                <TextInput
                                    label="Driver Name"
                                    placeholder="e.g. John Doe"
                                    required
                                    {...register('DriverName', { required: 'Driver name is required' })}
                                    error={errors.DriverName?.message}
                                />

                                <TextInput
                                    label="Phone Number"
                                    placeholder="e.g. 9876543210"
                                    required
                                    {...register('PhoneNumber', { required: 'Phone number is required' })}
                                    error={errors.PhoneNumber?.message}
                                />

                                <TextInput
                                    label="License Number"
                                    placeholder="e.g. DL-123456789"
                                    {...register('LicenseNumber')}
                                />

                                <TextInput
                                    label="License Expiry Date"
                                    type="date"
                                    {...register('LicenseExpiryDate')}
                                />

                                <TextInput
                                    label="Address Line 1"
                                    placeholder="Street / Building"
                                    {...register('AddressLine1')}
                                />

                                <TextInput
                                    label="Address Line 2"
                                    placeholder="City / Area"
                                    {...register('AddressLine2')}
                                />
                            </SimpleGrid>

                            <Group justify="flex-end" mt="md">
                                <Button
                                    variant="default"
                                    onClick={() => {
                                        setFormOpened(false);
                                        setEditingDriver(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    color="burgundy"
                                    loading={isSubmitting || saveMutation.isPending}
                                >
                                    {editingDriver ? 'Save Changes' : 'Save Driver'}
                                </Button>
                            </Group>
                        </Stack>
                    </form>
                </Paper>
            </Collapse>

            {/* Drivers List Table */}
            <Paper p="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                {isLoading ? (
                    <Center p="xl">
                        <Loader color="burgundy" />
                    </Center>
                ) : drivers.length === 0 ? (
                    <Center p="xl">
                        <Text c="dimmed" size="sm">
                            No drivers added yet. Click "+ Add Driver" above to register one.
                        </Text>
                    </Center>
                ) : (
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Name</Table.Th>
                                <Table.Th>Phone</Table.Th>
                                <Table.Th>License No</Table.Th>
                                <Table.Th>Expiry Date</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {drivers.map((d) => (
                                <Table.Tr key={d.DriverId}>
                                    <Table.Td style={{ fontWeight: 600 }}>{d.DriverName}</Table.Td>
                                    <Table.Td>{d.PhoneNumber}</Table.Td>
                                    <Table.Td>{d.LicenseNumber || '-'}</Table.Td>
                                    <Table.Td>{d.LicenseExpiryDate || '-'}</Table.Td>
                                    <Table.Td>
                                        <Badge
                                            size="sm"
                                            variant="outline"
                                            style={{
                                                borderColor: d.IsActive ? '#cbd5e1' : '#fca5a5',
                                                color: d.IsActive ? '#334155' : '#dc2626',
                                                backgroundColor: d.IsActive ? '#f8fafc' : '#fff5f5',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {d.IsActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>
                                        <Group gap={4} justify="flex-end" wrap="nowrap">
                                            <ActionIcon
                                                variant="subtle"
                                                color="burgundy"
                                                size="sm"
                                                title="Edit"
                                                onClick={() => handleEdit(d)}
                                            >
                                                <IconPencil size={16} />
                                            </ActionIcon>
                                            <ActionIcon
                                                variant="subtle"
                                                color="red"
                                                size="sm"
                                                title="Delete"
                                                loading={deleteMutation.isPending && deleteMutation.variables === d.DriverId}
                                                onClick={() => handleDelete(d.DriverId, d.DriverName)}
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
