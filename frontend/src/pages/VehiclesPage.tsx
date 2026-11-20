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
    Tooltip } from '@mantine/core';
import {
    IconPencil,
    IconTrash,
    IconSearch,
    IconArrowLeft,
    IconArrowsSort,
    IconFilter } from '@tabler/icons-react';
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

// Helper: check expiry status & remaining days
const getExpiryInfo = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    let target: Date;
    if (match) {
        target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    } else {
        target = new Date(dateStr);
    }
    if (isNaN(target.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - today.getTime();
    const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

    return {
        daysLeft,
        isExpired: daysLeft < 0,
        isExpiringSoon: daysLeft >= 0 && daysLeft <= 30,
        targetTime: target.getTime(),
    };
};

// Helper: summarize compliance for all 4 sections (RC, Insurance, Fitness, Pollution)
const getVehicleComplianceSummary = (v: VehicleItem) => {
    const dates = [
        { key: 'rc', label: 'RC', date: v.RcExpiryDate },
        { key: 'insurance', label: 'Insurance', date: v.InsuranceExpiryDate },
        { key: 'fitness', label: 'Fitness', date: v.FitnessExpiryDate },
        { key: 'pollution', label: 'Pollution', date: v.PollutionExpiryDate },
    ];

    let minDaysLeft: number | null = null;
    let minTargetTime: number = Infinity;
    let hasExpired = false;
    let hasExpiringSoon = false;

    for (const item of dates) {
        const info = getExpiryInfo(item.date);
        if (info) {
            if (info.isExpired) hasExpired = true;
            if (info.isExpiringSoon) hasExpiringSoon = true;
            if (info.targetTime < minTargetTime) {
                minTargetTime = info.targetTime;
                minDaysLeft = info.daysLeft;
            }
        }
    }

    return {
        minDaysLeft,
        minTargetTime,
        hasExpired,
        hasExpiringSoon,
        isAttentionNeeded: hasExpired || hasExpiringSoon,
    };
};

// Helper: render date cell with DD-MM-YYYY format and compliance status badge
const renderDateCell = (dateStr?: string | null) => {
    if (!dateStr) {
        return <Text size="sm" c="dimmed">-</Text>;
    }
    const formatted = formatDDMMYYYY(dateStr);
    const info = getExpiryInfo(dateStr);
    if (!info) {
        return <Text size="sm">{formatted}</Text>;
    }

    if (info.isExpired) {
        return (
            <Group gap={6} wrap="nowrap" align="center">
                <Text size="sm" fw={600} c="red.7">
                    {formatted}
                </Text>
                <Badge size="xs" color="red" variant="filled" radius="sm">
                    Expired
                </Badge>
            </Group>
        );
    }
    if (info.isExpiringSoon) {
        return (
            <Group gap={6} wrap="nowrap" align="center">
                <Text size="sm" fw={600} c="orange.8">
                    {formatted}
                </Text>
                <Badge size="xs" color="orange" variant="light" radius="sm">
                    {info.daysLeft === 0 ? 'Today' : `${info.daysLeft}d left`}
                </Badge>
            </Group>
        );
    }
    return <Text size="sm">{formatted}</Text>;
};

export const VehiclesPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [formOpened, setFormOpened] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<VehicleItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: number; number: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<string>('nearest_expiry');
    const [complianceFilter, setComplianceFilter] = useState<string>('all');

    // 1. Fetch vehicles list (excluding internal godown storage)
    const { data: vehicles = [], isLoading } = useQuery<VehicleItem[]>({
        queryKey: ['vehicles'],
        queryFn: async () => {
            const res = await apiClient.get<any>('/vehicles/');
            const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
            return list.filter((v: any) => !v.VehicleNumber?.toLowerCase().includes('godown') && !v.VehicleName?.toLowerCase().includes('godown'));
        } });

    // Summary stats across vehicles
    const stats = useMemo(() => {
        let expired = 0;
        let dueSoon = 0;
        let compliant = 0;

        for (const v of vehicles) {
            const summary = getVehicleComplianceSummary(v);
            if (summary.hasExpired) {
                expired++;
            } else if (summary.hasExpiringSoon) {
                dueSoon++;
            } else {
                compliant++;
            }
        }

        return {
            total: vehicles.length,
            expired,
            dueSoon,
            compliant,
        };
    }, [vehicles]);

    // Client-side search, compliance filter, and sorting
    const filteredVehicles = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        let list = vehicles.filter((v) => {
            const matchesQuery = !q || (
                (v.VehicleNumber && v.VehicleNumber.toLowerCase().includes(q)) ||
                (v.VehicleName && v.VehicleName.toLowerCase().includes(q))
            );
            if (!matchesQuery) return false;

            if (complianceFilter === 'all') return true;
            const summary = getVehicleComplianceSummary(v);
            if (complianceFilter === 'attention') return summary.isAttentionNeeded;
            if (complianceFilter === 'expired') return summary.hasExpired;
            if (complianceFilter === 'expiring_soon') return summary.hasExpiringSoon;
            if (complianceFilter === 'compliant') return !summary.hasExpired && !summary.hasExpiringSoon;
            return true;
        });

        return list.slice().sort((a, b) => {
            if (sortBy === 'nearest_expiry') {
                const sumA = getVehicleComplianceSummary(a);
                const sumB = getVehicleComplianceSummary(b);
                if (sumA.minTargetTime !== sumB.minTargetTime) {
                    return sumA.minTargetTime - sumB.minTargetTime;
                }
                return (a.VehicleNumber || '').localeCompare(b.VehicleNumber || '');
            }

            if (sortBy === 'rc_expiry') {
                const tA = getExpiryInfo(a.RcExpiryDate)?.targetTime ?? Infinity;
                const tB = getExpiryInfo(b.RcExpiryDate)?.targetTime ?? Infinity;
                if (tA !== tB) return tA - tB;
                return (a.VehicleNumber || '').localeCompare(b.VehicleNumber || '');
            }

            if (sortBy === 'insurance_expiry') {
                const tA = getExpiryInfo(a.InsuranceExpiryDate)?.targetTime ?? Infinity;
                const tB = getExpiryInfo(b.InsuranceExpiryDate)?.targetTime ?? Infinity;
                if (tA !== tB) return tA - tB;
                return (a.VehicleNumber || '').localeCompare(b.VehicleNumber || '');
            }

            if (sortBy === 'fitness_expiry') {
                const tA = getExpiryInfo(a.FitnessExpiryDate)?.targetTime ?? Infinity;
                const tB = getExpiryInfo(b.FitnessExpiryDate)?.targetTime ?? Infinity;
                if (tA !== tB) return tA - tB;
                return (a.VehicleNumber || '').localeCompare(b.VehicleNumber || '');
            }

            if (sortBy === 'pollution_expiry') {
                const tA = getExpiryInfo(a.PollutionExpiryDate)?.targetTime ?? Infinity;
                const tB = getExpiryInfo(b.PollutionExpiryDate)?.targetTime ?? Infinity;
                if (tA !== tB) return tA - tB;
                return (a.VehicleNumber || '').localeCompare(b.VehicleNumber || '');
            }

            if (sortBy === 'vehicle_asc') {
                return (a.VehicleNumber || '').localeCompare(b.VehicleNumber || '');
            }

            if (sortBy === 'vehicle_desc') {
                return (b.VehicleNumber || '').localeCompare(a.VehicleNumber || '');
            }

            return 0;
        });
    }, [vehicles, searchQuery, complianceFilter, sortBy]);

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

                {/* Right Action: Add Button */}
                <Transition mounted={!formOpened} transition="fade" duration={200}>
                    {(btnStyles) => (
                        <Button color="burgundy" radius={10} onClick={handleAddNew} style={btnStyles}>
                            + Add Vehicle
                        </Button>
                    )}
                </Transition>
            </Group>

            {/* Filter, Sort & Compliance Quick Actions */}
            <Transition mounted={!formOpened} transition="fade" duration={200}>
                {(barStyles) => (
                    <Paper
                        p="sm"
                        radius="sm"
                        withBorder
                        style={{
                            ...barStyles,
                            backgroundColor: '#ffffff',
                            borderColor: '#e2e8f0',
                        }}
                    >
                        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                            <Group gap="xs" wrap="wrap" style={{ flexGrow: 1 }}>
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
                                    style={{ width: 200, minWidth: 150 }}
                                />

                                <Select
                                    size="sm"
                                    radius="md"
                                    leftSection={<IconArrowsSort size={15} color="#800020" />}
                                    value={sortBy}
                                    onChange={(val) => setSortBy(val || 'nearest_expiry')}
                                    data={[
                                        { value: 'nearest_expiry', label: 'Nearest Expiry (Any of 4)' },
                                        { value: 'rc_expiry', label: 'RC Expiry (Earliest)' },
                                        { value: 'insurance_expiry', label: 'Insurance Expiry (Earliest)' },
                                        { value: 'fitness_expiry', label: 'Fitness Expiry (Earliest)' },
                                        { value: 'pollution_expiry', label: 'Pollution Expiry (Earliest)' },
                                        { value: 'vehicle_asc', label: 'Vehicle No (A to Z)' },
                                        { value: 'vehicle_desc', label: 'Vehicle No (Z to A)' },
                                    ]}
                                    style={{ width: 235 }}
                                    comboboxProps={{ shadow: 'md', transitionProps: { transition: 'pop', duration: 150 } }}
                                />

                                <Select
                                    size="sm"
                                    radius="md"
                                    leftSection={<IconFilter size={15} color="#800020" />}
                                    value={complianceFilter}
                                    onChange={(val) => setComplianceFilter(val || 'all')}
                                    data={[
                                        { value: 'all', label: 'All Compliance Status' },
                                        { value: 'attention', label: '⚠️ Needs Attention' },
                                        { value: 'expired', label: '🔴 Expired Only' },
                                        { value: 'expiring_soon', label: '🟠 Expiring in 30 Days' },
                                        { value: 'compliant', label: '🟢 All Up-to-date' },
                                    ]}
                                    style={{ width: 215 }}
                                    comboboxProps={{ shadow: 'md', transitionProps: { transition: 'pop', duration: 150 } }}
                                />
                            </Group>

                            {/* Quick Stats Badges */}
                            <Group gap={6} wrap="wrap">
                                <Badge
                                    variant={complianceFilter === 'all' ? 'filled' : 'light'}
                                    color="gray"
                                    size="md"
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    onClick={() => setComplianceFilter('all')}
                                >
                                    Total: {stats.total}
                                </Badge>
                                {stats.expired > 0 && (
                                    <Badge
                                        variant={complianceFilter === 'expired' ? 'filled' : 'light'}
                                        color="red"
                                        size="md"
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        onClick={() => setComplianceFilter(complianceFilter === 'expired' ? 'all' : 'expired')}
                                    >
                                        {stats.expired} Expired
                                    </Badge>
                                )}
                                {stats.dueSoon > 0 && (
                                    <Badge
                                        variant={complianceFilter === 'expiring_soon' ? 'filled' : 'light'}
                                        color="orange"
                                        size="md"
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        onClick={() => setComplianceFilter(complianceFilter === 'expiring_soon' ? 'all' : 'expiring_soon')}
                                    >
                                        {stats.dueSoon} Due Soon
                                    </Badge>
                                )}
                                <Badge
                                    variant={complianceFilter === 'compliant' ? 'filled' : 'light'}
                                    color="green"
                                    size="md"
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    onClick={() => setComplianceFilter(complianceFilter === 'compliant' ? 'all' : 'compliant')}
                                >
                                    {stats.compliant} Valid
                                </Badge>
                            </Group>
                        </Group>
                    </Paper>
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
                                    No vehicles match current search or filters.
                                </Text>
                                <Button
                                    variant="subtle"
                                    size="xs"
                                    color="burgundy"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setComplianceFilter('all');
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
