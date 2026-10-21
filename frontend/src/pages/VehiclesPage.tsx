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
    SimpleGrid,
    Collapse,
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

interface VehicleItem {
    VehicleId: number;
    VehicleNumber: string;
    VehicleName?: string;
    RcExpiryDate?: string;
    InsuranceExpiryDate?: string;
    FitnessExpiryDate?: string;
    PollutionExpiryDate?: string;
    IsActive: boolean;
    delete_block_reason?: string | null;
}

interface VehicleFormValues {
    VehicleNumber: string;
    VehicleName: string;
    RcExpiryDate: string;
    InsuranceExpiryDate: string;
    FitnessExpiryDate: string;
    PollutionExpiryDate: string;
}

export const VehiclesPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [formOpened, setFormOpened] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<VehicleItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: number; number: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // 1. Fetch vehicles list
    const { data: vehicles = [], isLoading } = useQuery<VehicleItem[]>({
        queryKey: ['vehicles'],
        queryFn: async () => {
            const res = await apiClient.get<any>('/vehicles/');
            return Array.isArray(res.data) ? res.data : (res.data?.results || []);
        },
    });

    // Client-side search filter
    const filteredVehicles = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return vehicles;
        return vehicles.filter((v) =>
            (v.VehicleNumber && v.VehicleNumber.toLowerCase().includes(q)) ||
            (v.VehicleName && v.VehicleName.toLowerCase().includes(q))
        );
    }, [vehicles, searchQuery]);

    // 2. Form state
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<VehicleFormValues>({
        defaultValues: {
            VehicleNumber: '',
            VehicleName: '',
            RcExpiryDate: '',
            InsuranceExpiryDate: '',
            FitnessExpiryDate: '',
            PollutionExpiryDate: '',
        },
    });

    // 3. Mutation to create or edit vehicle
    const saveMutation = useMutation({
        mutationFn: async (data: VehicleFormValues) => {
            const payload: any = {
                VehicleNumber: data.VehicleNumber.trim().toUpperCase(),
                VehicleName: data.VehicleName?.trim() || null,
                RcExpiryDate: data.RcExpiryDate || null,
                InsuranceExpiryDate: data.InsuranceExpiryDate || null,
                FitnessExpiryDate: data.FitnessExpiryDate || null,
                PollutionExpiryDate: data.PollutionExpiryDate || null,
                IsActive: true,
            };

            if (editingVehicle) {
                return apiClient.patch(`/vehicles/${editingVehicle.VehicleId}/`, payload);
            }
            return apiClient.post('/vehicles/', payload);
        },
        onSuccess: () => {
            notifications.show({
                title: 'Success',
                message: editingVehicle ? 'Vehicle updated successfully.' : 'Vehicle added successfully.',
                color: 'green',
            });
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            reset();
            setEditingVehicle(null);
            setFormOpened(false);
        },
        onError: (err: any) => {
            const msg = err.response?.data?.VehicleNumber?.[0] || err.response?.data?.detail || 'Failed to save vehicle.';
            notifications.show({
                title: 'Error',
                message: msg,
                color: 'red',
            });
        },
    });

    const onSubmit = (values: VehicleFormValues) => {
        saveMutation.mutate(values);
    };

    // 4. Mutation to delete vehicle
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return apiClient.delete(`/vehicles/${id}/`);
        },
        onSuccess: () => {
            notifications.show({
                title: 'Deleted',
                message: 'Vehicle deleted successfully.',
                color: 'green',
            });
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        },
        onError: (err: any) => {
            const msg = err.response?.data?.detail || 'Failed to delete vehicle.';
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

    // Helper: start editing a vehicle
    const handleEdit = (vehicle: VehicleItem) => {
        setEditingVehicle(vehicle);
        reset({
            VehicleNumber: vehicle.VehicleNumber || '',
            VehicleName: vehicle.VehicleName || '',
            RcExpiryDate: vehicle.RcExpiryDate || '',
            InsuranceExpiryDate: vehicle.InsuranceExpiryDate || '',
            FitnessExpiryDate: vehicle.FitnessExpiryDate || '',
            PollutionExpiryDate: vehicle.PollutionExpiryDate || '',
        });
        setFormOpened(true);
    };

    // Helper: start adding a new vehicle
    const handleAddNew = () => {
        if (formOpened && !editingVehicle) {
            setFormOpened(false);
            return;
        }
        setEditingVehicle(null);
        reset({
            VehicleNumber: '',
            VehicleName: '',
            RcExpiryDate: '',
            InsuranceExpiryDate: '',
            FitnessExpiryDate: '',
            PollutionExpiryDate: '',
        });
        setFormOpened(true);
    };

    return (
        <Stack gap="lg">
            {/* Page Header */}
            <Group justify="space-between" align="center" wrap="wrap" gap="md">
                <div>
                    <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
                        Vehicles
                    </Title>
                    <Text size="sm" c="dimmed">
                        Manage your company's delivery vehicles and compliance renewal dates.
                    </Text>
                </div>

                {/* Right Actions: Search Bar (left of button) + Add Button */}
                <Group gap="sm" align="center" wrap="nowrap">
                    <Transition mounted={!formOpened} transition="fade" duration={200}>
                        {(searchStyles) => (
                            <Box style={{ ...searchStyles, width: 280 }}>
                                <TextInput
                                    placeholder="Search vehicles..."
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
                            <Button color="burgundy" radius={10} onClick={handleAddNew} style={btnStyles}>
                                + Add Vehicle
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
                                {editingVehicle ? `Edit Vehicle: ${editingVehicle.VehicleNumber}` : 'New Vehicle Details'}
                            </Text>
                            <Text size="xs" c="dimmed">
                                {editingVehicle
                                    ? 'Update vehicle details and compliance renewal dates.'
                                    : 'Enter vehicle registration, model, and compliance renewal dates.'}
                            </Text>
                        </div>
                        <CloseButton
                            size="md"
                            onClick={() => {
                                setFormOpened(false);
                                setEditingVehicle(null);
                            }}
                        />
                    </Group>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Stack gap="sm">
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                                <TextInput
                                    label="Vehicle Number"
                                    placeholder="e.g. KL-07-AB-1234"
                                    required
                                    {...register('VehicleNumber', { required: 'Vehicle number is required' })}
                                    error={errors.VehicleNumber?.message}
                                />

                                <TextInput
                                    label="Vehicle Name / Model"
                                    placeholder="e.g. Tata Ace Gold"
                                    {...register('VehicleName')}
                                />
                            </SimpleGrid>

                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                                <TextInput
                                    label="RC Expiry Date"
                                    type="date"
                                    {...register('RcExpiryDate')}
                                />

                                <TextInput
                                    label="Insurance Expiry Date"
                                    type="date"
                                    {...register('InsuranceExpiryDate')}
                                />
                            </SimpleGrid>

                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                                <TextInput
                                    label="Fitness Expiry Date"
                                    type="date"
                                    {...register('FitnessExpiryDate')}
                                />

                                <TextInput
                                    label="Pollution Expiry Date"
                                    type="date"
                                    {...register('PollutionExpiryDate')}
                                />
                            </SimpleGrid>

                            <Group justify="flex-end" mt="md">
                                <Button
                                    variant="default"
                                    onClick={() => {
                                        setFormOpened(false);
                                        setEditingVehicle(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    color="burgundy"
                                    loading={isSubmitting || saveMutation.isPending}
                                >
                                    {editingVehicle ? 'Save Changes' : 'Save Vehicle'}
                                </Button>
                            </Group>
                        </Stack>
                    </form>
                </Paper>
            </Collapse>

            {/* Animated Vehicles Table */}
            <Transition mounted={!formOpened} transition="fade" duration={250} timingFunction="ease">
                {(styles) => (
                    <Paper radius="sm" withBorder style={{ ...styles, backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
                    {isLoading ? (
                        <Center p="xl">
                            <Loader color="burgundy" />
                        </Center>
                    ) : vehicles.length === 0 ? (
                        <Center p="xl">
                            <Text c="dimmed" size="sm">
                                No vehicles added yet. Click "+ Add Vehicle" above to register one.
                            </Text>
                        </Center>
                    ) : filteredVehicles.length === 0 ? (
                        <Center p="xl">
                            <Stack align="center" gap="xs">
                                <Text c="dimmed" size="sm">
                                    No vehicles match "{searchQuery}".
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
                                    <Table.Th>Vehicle Number</Table.Th>
                                    <Table.Th>Name / Type</Table.Th>
                                    <Table.Th>RC Expiry</Table.Th>
                                    <Table.Th>Insurance Expiry</Table.Th>
                                    <Table.Th>Fitness Expiry</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {filteredVehicles.map((v) => (
                                    <Table.Tr key={v.VehicleId}>
                                        <Table.Td style={{ fontWeight: 600 }}>{v.VehicleNumber}</Table.Td>
                                        <Table.Td>{v.VehicleName || '-'}</Table.Td>
                                        <Table.Td>{v.RcExpiryDate || '-'}</Table.Td>
                                        <Table.Td>{v.InsuranceExpiryDate || '-'}</Table.Td>
                                        <Table.Td>{v.FitnessExpiryDate || '-'}</Table.Td>
                                        <Table.Td>
                                            <Badge
                                                size="sm"
                                                variant="outline"
                                                style={{
                                                    borderColor: v.IsActive ? '#cbd5e1' : '#fca5a5',
                                                    color: v.IsActive ? '#334155' : '#dc2626',
                                                    backgroundColor: v.IsActive ? '#f8fafc' : '#fff5f5',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {v.IsActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>
                                            <Group gap={4} justify="flex-end" wrap="nowrap">
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="burgundy"
                                                    size="sm"
                                                    title="Edit"
                                                    onClick={() => handleEdit(v)}
                                                >
                                                    <IconPencil size={16} />
                                                </ActionIcon>
                                                <Tooltip
                                                    label={v.delete_block_reason || 'Delete Vehicle'}
                                                    withArrow
                                                    position="top"
                                                >
                                                    <span>
                                                        <ActionIcon
                                                            variant="subtle"
                                                            color="red"
                                                            size="sm"
                                                            disabled={!!v.delete_block_reason}
                                                            style={{
                                                                cursor: v.delete_block_reason ? 'not-allowed' : 'pointer',
                                                                opacity: v.delete_block_reason ? 0.35 : 1,
                                                            }}
                                                            onClick={() => {
                                                                if (!v.delete_block_reason) {
                                                                    setDeleteTarget({ id: v.VehicleId, number: v.VehicleNumber });
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
                title="Delete Vehicle"
                itemType="vehicle"
                itemName={deleteTarget?.number}
                loading={deleteMutation.isPending}
                onConfirm={confirmDelete}
            />
        </Stack>
    );
};
