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
    SimpleGrid,
    Collapse,
    CloseButton,
    ActionIcon,
    Box,
    Transition,
    Tooltip,
    SegmentedControl } from '@mantine/core';
import {
    IconPencil,
    IconTrash,
    IconSearch,
    IconArrowLeft,
    IconArrowsSort } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
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

// Helper: format YYYY-MM-DD -> DD-MM-YYYY
const formatDDMMYYYY = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

// Helper: check expiry status of date: 'expired' (< today), 'due_soon' (within 30 days), or 'normal'
const getExpiryStatus = (dateStr?: string | null): 'expired' | 'due_soon' | 'normal' => {
    if (!dateStr) return 'normal';
    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const target = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(dateStr);
    if (isNaN(target.getTime())) return 'normal';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - today.getTime();
    const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 30) return 'due_soon';
    return 'normal';
};

// Helper: parse date to timestamp for sorting
const getDateTimestamp = (dateStr?: string | null): number => {
    if (!dateStr) return Infinity;
    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const d = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(dateStr);
    return isNaN(d.getTime()) ? Infinity : d.getTime();
};

// Helper: render clean date cell with DD-MM-YYYY format:
// Red for expired (overdue), Reddish-yellow (amber) for due soon, normal dark for valid
const renderDateCell = (dateStr?: string | null) => {
    if (!dateStr) {
        return <Text size="sm" c="dimmed">-</Text>;
    }
    const formatted = formatDDMMYYYY(dateStr);
    const status = getExpiryStatus(dateStr);

    let color = '#1e293b';
    let fw = 400;

    if (status === 'expired') {
        color = '#dc2626'; // Red
        fw = 600;
    } else if (status === 'due_soon') {
        color = '#d97706'; // Reddish yellow / warm amber
        fw = 600;
    }

    return (
        <Text
            size="sm"
            style={{
                color,
                fontWeight: fw,
                whiteSpace: 'nowrap',
            }}
        >
            {formatted}
        </Text>
    );
};

// Helper: check if vehicle has any expired or due soon date across the 4 compliance areas
const getVehicleStatus = (v: VehicleItem) => {
    const statuses = [
        getExpiryStatus(v.RcExpiryDate),
        getExpiryStatus(v.InsuranceExpiryDate),
        getExpiryStatus(v.FitnessExpiryDate),
        getExpiryStatus(v.PollutionExpiryDate),
    ];
    const isOverdue = statuses.includes('expired');
    const isDueSoon = statuses.includes('due_soon');
    return { isOverdue, isDueSoon };
};

export const VehiclesPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [formOpened, setFormOpened] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<VehicleItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: number; number: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<string>('default');
    const [complianceTab, setComplianceTab] = useState<'all' | 'overdue' | 'due_soon'>('all');

    // 1. Fetch vehicles list (excluding internal godown storage)
    const { data: vehicles = [], isLoading } = useQuery<VehicleItem[]>({
        queryKey: ['vehicles'],
        queryFn: async () => {
            const res = await apiClient.get<any>('/vehicles/');
            const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            return list.filter((v: any) => !v.VehicleNumber?.toLowerCase().includes('godown') && !v.VehicleName?.toLowerCase().includes('godown'));
        } });

    // Expiry statistics for the UI toggle
    const stats = useMemo(() => {
        let overdue = 0;
        let dueSoon = 0;
        for (const v of vehicles) {
            const { isOverdue, isDueSoon } = getVehicleStatus(v);
            if (isOverdue) overdue++;
            if (isDueSoon) dueSoon++;
        }
        return { total: vehicles.length, overdue, dueSoon };
    }, [vehicles]);

    // Client-side search, toggle filtering, and sorting
    const filteredVehicles = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        let list = vehicles.filter((v) => {
            const matchesQuery = !q || (
                (v.VehicleNumber && v.VehicleNumber.toLowerCase().includes(q)) ||
                (v.VehicleName && v.VehicleName.toLowerCase().includes(q))
            );
            if (!matchesQuery) return false;

            const { isOverdue, isDueSoon } = getVehicleStatus(v);
            if (complianceTab === 'overdue' && !isOverdue) return false;
            if (complianceTab === 'due_soon' && !isDueSoon) return false;
            return true;
        });

        if (sortBy === 'default') {
            return list;
        }

        return list.slice().sort((a, b) => {
            if (sortBy === 'rc_expiry') {
                const tA = getDateTimestamp(a.RcExpiryDate);
                const tB = getDateTimestamp(b.RcExpiryDate);
                if (tA !== tB) return tA - tB;
                return (a.VehicleNumber || '').localeCompare(b.VehicleNumber || '');
            }

            if (sortBy === 'insurance_expiry') {
                const tA = getDateTimestamp(a.InsuranceExpiryDate);
                const tB = getDateTimestamp(b.InsuranceExpiryDate);
                if (tA !== tB) return tA - tB;
                return (a.VehicleNumber || '').localeCompare(b.VehicleNumber || '');
            }

            if (sortBy === 'fitness_expiry') {
                const tA = getDateTimestamp(a.FitnessExpiryDate);
                const tB = getDateTimestamp(b.FitnessExpiryDate);
                if (tA !== tB) return tA - tB;
                return (a.VehicleNumber || '').localeCompare(b.VehicleNumber || '');
            }

            if (sortBy === 'pollution_expiry') {
                const tA = getDateTimestamp(a.PollutionExpiryDate);
                const tB = getDateTimestamp(b.PollutionExpiryDate);
                if (tA !== tB) return tA - tB;
                return (a.VehicleNumber || '').localeCompare(b.VehicleNumber || '');
            }

            if (sortBy === 'vehicle_asc') {
                return (a.VehicleNumber || '').localeCompare(b.VehicleNumber || '');
            }

            return 0;
        });
    }, [vehicles, searchQuery, complianceTab, sortBy]);

    // 2. Form state
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting } } = useForm<VehicleFormValues>({
        defaultValues: {
            VehicleNumber: '',
            VehicleName: '',
            RcExpiryDate: '',
            InsuranceExpiryDate: '',
            FitnessExpiryDate: '',
            PollutionExpiryDate: '' } });

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
                IsActive: true };

            if (editingVehicle) {
                return apiClient.patch(`/vehicles/${editingVehicle.VehicleId}/`, payload);
            }
            return apiClient.post('/vehicles/', payload);
        },
        onSuccess: () => {
            notifications.show({
                title: 'Success',
                message: editingVehicle ? 'Vehicle updated successfully.' : 'Vehicle added successfully.',
                color: 'green' });
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
                color: 'red' });
        } });

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
                color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        },
        onError: (err: any) => {
            const msg = err.response?.data?.detail || 'Failed to delete vehicle.';
            notifications.show({
                title: 'Cannot Delete',
                message: msg,
                color: 'red' });
        } });

    const confirmDelete = () => {
        if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, {
                onSettled: () => setDeleteTarget(null) });
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
            PollutionExpiryDate: vehicle.PollutionExpiryDate || '' });
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
            PollutionExpiryDate: '' });
        setFormOpened(true);
    };

    return (
        <Stack gap="lg">
            {/* Page Header */}
            <Group justify="space-between" align="center" wrap="wrap" gap="md">
                <div>
                    <Button
                        variant="subtle"
                        color="gray"
                        size="xs"
                        leftSection={<IconArrowLeft size={16} />}
                        onClick={() => navigate('/')}
                        mb={4}
                        styles={{ root: { paddingLeft: 0, paddingRight: 8, color: '#475569' } }}
                    >
                        Back to Dashboard
                    </Button>
                    <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
                        Vehicles/Stock Location
                    </Title>
                    <Text size="sm" c="dimmed">
                        Manage your company's delivery vehicles and compliance renewal dates.
                    </Text>
                </div>

                {/* Right Actions: Search, Sort and Add Vehicle */}
                <Group gap="sm" wrap="wrap" align="center">
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
                        style={{ width: 220 }}
                    />

                    <Select
                        size="sm"
                        radius="md"
                        leftSection={<IconArrowsSort size={15} color="#800020" />}
                        placeholder="Sort by"
                        value={sortBy}
                        onChange={(val) => setSortBy(val || 'default')}
                        data={[
                            { value: 'default', label: 'Default' },
                            { value: 'rc_expiry', label: 'RC Expiry' },
                            { value: 'insurance_expiry', label: 'Insurance Expiry' },
                            { value: 'fitness_expiry', label: 'Fitness Expiry' },
                            { value: 'pollution_expiry', label: 'Pollution Expiry' },
                            { value: 'vehicle_asc', label: 'Vehicle Number' },
                        ]}
                        style={{ width: 175 }}
                        comboboxProps={{ shadow: 'md', transitionProps: { transition: 'pop', duration: 150 } }}
                    />

                    <Transition mounted={!formOpened} transition="fade" duration={200}>
                        {(btnStyles) => (
                            <Button color="burgundy" radius={10} onClick={handleAddNew} style={btnStyles}>
                                + Add Vehicle
                            </Button>
                        )}
                    </Transition>
                </Group>
            </Group>

            {/* Compliance Status Toggle Pills */}
            <Transition mounted={!formOpened} transition="fade" duration={200}>
                {(styles) => (
                    <Group justify="flex-start" align="center" style={styles}>
                        <SegmentedControl
                            size="xs"
                            radius="xl"
                            color="burgundy"
                            transitionDuration={250}
                            transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
                            value={complianceTab}
                            onChange={(val) => setComplianceTab(val as any)}
                            data={[
                                { label: `All (${stats.total})`, value: 'all' },
                                { label: `Overdue (${stats.overdue})`, value: 'overdue' },
                                { label: `Due Soon (${stats.dueSoon})`, value: 'due_soon' },
                            ]}
                            styles={{
                                root: {
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    padding: 3,
                                    borderRadius: 9999,
                                },
                                label: {
                                    fontWeight: 600,
                                    fontSize: 12,
                                    padding: '4px 14px',
                                },
                            }}
                        />
                    </Group>
                )}
            </Transition>

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
                        borderLeft: '4px solid #800020' }}
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
                                    No vehicles match current search.
                                </Text>
                                <Button
                                    variant="subtle"
                                    size="xs"
                                    color="burgundy"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSortBy('default');
                                        setComplianceTab('all');
                                    }}
                                >
                                    Reset Filters
                                </Button>
                            </Stack>
                        </Center>
                    ) : (
                        <Table.ScrollContainer minWidth={950}>
                            <Table highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Vehicle Number</Table.Th>
                                        <Table.Th>Name / Type</Table.Th>
                                        <Table.Th>RC Expiry</Table.Th>
                                        <Table.Th>Insurance Expiry</Table.Th>
                                        <Table.Th>Fitness Expiry</Table.Th>
                                        <Table.Th>Pollution Expiry</Table.Th>
                                        <Table.Th>Status</Table.Th>
                                        <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {filteredVehicles.map((v) => (
                                        <Table.Tr key={v.VehicleId}>
                                            <Table.Td style={{ fontWeight: 600 }}>{v.VehicleNumber}</Table.Td>
                                            <Table.Td>{v.VehicleName || '-'}</Table.Td>
                                            <Table.Td>{renderDateCell(v.RcExpiryDate)}</Table.Td>
                                            <Table.Td>{renderDateCell(v.InsuranceExpiryDate)}</Table.Td>
                                            <Table.Td>{renderDateCell(v.FitnessExpiryDate)}</Table.Td>
                                            <Table.Td>{renderDateCell(v.PollutionExpiryDate)}</Table.Td>
                                            <Table.Td>
                                                <Badge
                                                    size="sm"
                                                    variant="outline"
                                                    style={{
                                                        borderColor: v.IsActive ? '#800020' : '#dc2626',
                                                        color: v.IsActive ? '#800020' : '#dc2626',
                                                        backgroundColor: 'transparent',
                                                        fontWeight: 600,
                                                        letterSpacing: '0.4px' }}
                                                >
                                                    {v.IsActive ? 'ACTIVE' : 'INACTIVE'}
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
                                                                    opacity: v.delete_block_reason ? 0.35 : 1 }}
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
                        </Table.ScrollContainer>
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
