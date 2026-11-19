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
  Select,
  Switch,
  ThemeIcon,
} from '@mantine/core';
import {
  IconPencil,
  IconTrash,
  IconSearch,
  IconArrowLeft,
  IconCreditCard,
  IconBuildingBank,
  IconRoute,
  IconCheck,
  IconPlus,
  IconRefresh,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

export interface PaymentGroupItem {
  PaymentGroupId: number;
  PaymentGroupName: string;
  BankLedger?: number | null;
  BankLedgerName?: string | null;
  bank_ledger_name?: string | null;
  allocations_count?: number;
  allocated_routes?: string[];
  IsActive: boolean;
  CompanyId?: number;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export const PaymentGroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formOpened, setFormOpened] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PaymentGroupItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form State
  const [groupName, setGroupName] = useState('');
  const [selectedBankLedger, setSelectedBankLedger] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [nameError, setNameError] = useState('');

  // 1. Fetch Payment Groups
  const {
    data: paymentGroups = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<PaymentGroupItem[]>({
    queryKey: ['payment-groups'],
    queryFn: async () => {
      const res = await apiClient.get<PaymentGroupItem[]>('/payment-groups/');
      return Array.isArray(res.data) ? res.data : (res.data as any)?.results || [];
    },
  });

  // 2. Fetch Bank Ledgers (from /ledgers/ where group is Bank Accounts)
  const { data: ledgers = [] } = useQuery<any[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // Filter bank ledgers (SBI, Union Bank, Bank Accounts)
  const bankOptions = useMemo(() => {
    return ledgers
      .filter((l) => {
        const g = (l.group_name || l.GroupName || '').toLowerCase();
        const n = (l.Nature || '').toLowerCase();
        const name = (l.LedgerName || '').toLowerCase();
        return (
          g.includes('bank') ||
          l.GroupId === 17 ||
          l.GroupId === 25 ||
          name.includes('bank') ||
          name.includes('sbi') ||
          (n === 'asset' && g.includes('bank'))
        );
      })
      .map((l) => ({
        value: String(l.LedgerId),
        label: `${l.LedgerName} (${l.group_name || 'Bank Account'})`,
      }));
  }, [ledgers]);

  // Form open/edit handlers
  const handleAddNew = () => {
    setEditingGroup(null);
    setGroupName('');
    setSelectedBankLedger(null);
    setIsActive(true);
    setNameError('');
    setFormOpened(true);
  };

  const handleEdit = (group: PaymentGroupItem) => {
    setEditingGroup(group);
    setGroupName(group.PaymentGroupName);
    setSelectedBankLedger(group.BankLedger ? String(group.BankLedger) : null);
    setIsActive(group.IsActive !== false);
    setNameError('');
    setFormOpened(true);
  };

  const handleCloseForm = () => {
    setFormOpened(false);
    setEditingGroup(null);
    setGroupName('');
    setSelectedBankLedger(null);
    setNameError('');
  };

  // 3. Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!groupName.trim()) {
        setNameError('Payment group name is required');
        throw new Error('Payment group name is required');
      }

      const payload = {
        PaymentGroupName: groupName.trim(),
        BankLedger: selectedBankLedger ? parseInt(selectedBankLedger, 10) : null,
        IsActive: isActive,
      };

      if (editingGroup) {
        const res = await apiClient.patch(`/payment-groups/${editingGroup.PaymentGroupId}/`, payload);
        return res.data;
      }
      const res = await apiClient.post('/payment-groups/', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-groups'] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      notifications.show({
        title: editingGroup ? 'Payment Group Updated' : 'Payment Group Created',
        message: `Successfully saved ${data.PaymentGroupName || groupName}.`,
        color: 'burgundy',
      });
      handleCloseForm();
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error Saving Payment Group',
        message: err.response?.data?.detail || err.message || 'Could not save payment group.',
        color: 'red',
      });
    },
  });

  // 4. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/payment-groups/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-groups'] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      notifications.show({
        title: 'Deleted',
        message: 'Payment group deleted successfully.',
        color: 'burgundy',
      });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Cannot Delete Payment Group',
        message: err.response?.data?.detail || err.message || 'Failed to delete payment group.',
        color: 'red',
      });
    },
  });

  // 5. Toggle Active Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: number; newStatus: boolean }) => {
      const res = await apiClient.patch(`/payment-groups/${id}/`, { IsActive: newStatus });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payment-groups'] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      notifications.show({
        title: 'Status Updated',
        message: `${data.PaymentGroupName} is now ${data.IsActive ? 'Active' : 'Inactive'}.`,
        color: 'burgundy',
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Update Failed',
        message: err.response?.data?.detail || 'Failed to update status.',
        color: 'red',
      });
    },
  });

  // Filtered List
  const filteredGroups = useMemo(() => {
    return paymentGroups.filter((g) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        g.PaymentGroupName.toLowerCase().includes(q) ||
        (g.BankLedgerName || '').toLowerCase().includes(q) ||
        (g.bank_ledger_name || '').toLowerCase().includes(q) ||
        (g.allocated_routes || []).some((r) => r.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && g.IsActive !== false) ||
        (statusFilter === 'inactive' && g.IsActive === false);

      return matchSearch && matchStatus;
    });
  }, [paymentGroups, searchQuery, statusFilter]);

  // KPI Metrics
  const totalCount = paymentGroups.length;
  const activeCount = paymentGroups.filter((g) => g.IsActive !== false).length;
  const distinctBanksCount = useMemo(() => {
    const banks = new Set<number>();
    paymentGroups.forEach((g) => {
      if (g.BankLedger) banks.add(g.BankLedger);
    });
    return banks.size;
  }, [paymentGroups]);
  const totalAssignedRoutesCount = useMemo(() => {
    return paymentGroups.reduce((sum, g) => sum + (g.allocations_count || 0), 0);
  }, [paymentGroups]);

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
          <Title order={2} style={{ color: '#800020', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Payment Groups
          </Title>
          
        </div>

        <Group gap="sm" align="center">
          <Transition mounted={!formOpened} transition="fade" duration={200}>
            {(searchStyles) => (
              <Box style={{ ...searchStyles, width: 260 }}>
                <TextInput
                  placeholder="Search group or bank..."
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

          <Button
            variant="default"
            size="sm"
            leftSection={<IconRefresh size={15} className={isRefetching ? 'animate-spin' : ''} />}
            onClick={() => refetch()}
            loading={isRefetching}
            style={{ borderColor: '#e2e8f0', color: '#800020', fontWeight: 600 }}
          >
            Refresh
          </Button>

          <Transition mounted={!formOpened} transition="fade" duration={200}>
            {(btnStyles) => (
              <Button
                color="burgundy"
                radius={10}
                leftSection={<IconPlus size={16} />}
                onClick={handleAddNew}
                style={{ ...btnStyles, backgroundColor: '#800020', color: '#ffffff', fontWeight: 600 }}
              >
                Add Payment Group
              </Button>
            )}
          </Transition>
        </Group>
      </Group>

      {/* Slide-Down Form Panel */}
      <Box>
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
                <Text fw={700} style={{ color: '#800020', fontSize: 16 }}>
                  {editingGroup ? `Edit Payment Group: ${editingGroup.PaymentGroupName}` : 'New Payment Group'}
                </Text>
                <Text size="xs" c="dimmed">
                  {editingGroup
                    ? 'Update payment group name and re-assign linked settlement bank account.'
                    : 'Specify group name and select linked bank account (e.g. SBI, Union Bank) for driver collections.'}
                </Text>
              </div>
              <CloseButton size="md" onClick={handleCloseForm} />
            </Group>

            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label="Payment Group Name"
                  placeholder="e.g. Central Fleet Group, Kecheri Route Group"
                  required
                  value={groupName}
                  onChange={(e) => {
                    setGroupName(e.currentTarget.value);
                    if (nameError) setNameError('');
                  }}
                  error={nameError}
                />

                <Select
                  label="Linked Bank Account"
                  placeholder="Choose Bank Account (e.g. SBI, Union Bank)"
                  data={bankOptions}
                  value={selectedBankLedger}
                  onChange={(val) => setSelectedBankLedger(val)}
                  searchable
                  clearable
                  nothingFoundMessage="No bank ledgers found"
                  leftSection={<IconBuildingBank size={16} color="#800020" />}
                  description="Bank ledger where driver route collections will settle into"
                />
              </SimpleGrid>

              <Group justify="space-between" align="center" mt="xs">
                <Switch
                  label="Active Status"
                  description="When enabled, this payment group is available in route vehicle allocations"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.currentTarget.checked)}
                  color="burgundy"
                />

                <Group gap="sm">
                  <Button variant="default" onClick={handleCloseForm} radius={10}>
                    Cancel
                  </Button>
                  <Button
                    color="burgundy"
                    radius={10}
                    style={{ backgroundColor: '#800020', color: '#ffffff', fontWeight: 600 }}
                    loading={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                  >
                    {editingGroup ? 'Update Group' : 'Save Payment Group'}
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Paper>
        </Collapse>
      </Box>

      {/* KPI Cards Row */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Card 1: Total Groups */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              TOTAL GROUPS
            </Text>
            <IconCreditCard size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {totalCount}
          </Text>
          <Text size="xs" c="dimmed" mt="xs">
            Configured payment schemes
          </Text>
        </Paper>

        {/* Card 2: Active Groups */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              ACTIVE GROUPS
            </Text>
            <IconCheck size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {activeCount}
          </Text>
          <Text size="xs" c="dimmed" mt="xs">
            Ready for route allocations
          </Text>
        </Paper>

        {/* Card 3: Linked Bank Accounts */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              LINKED BANKS
            </Text>
            <IconBuildingBank size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {distinctBanksCount}
          </Text>
          <Text size="xs" c="dimmed" mt="xs">
            Distinct settlement ledgers
          </Text>
        </Paper>

        {/* Card 4: Assigned Routes */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              ALLOCATED ROUTES
            </Text>
            <IconRoute size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {totalAssignedRoutesCount}
          </Text>
          <Text size="xs" c="dimmed" mt="xs">
            Active van allocations linked
          </Text>
        </Paper>
      </SimpleGrid>

      {/* Main Table */}
      <Paper
        radius="md"
        withBorder
        style={{
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <Group justify="space-between" align="center" p="sm" px="md" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <Group gap="xs" align="center">
            <Text fw={700} style={{ color: '#800020', fontSize: 16 }}>
              Configured Payment Groups
            </Text>
            <Badge
              variant="light"
              size="sm"
              styles={{
                root: {
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: 11,
                  height: 22,
                },
              }}
            >
              {filteredGroups.length} Groups
            </Badge>
          </Group>

          <Group gap="xs">
            <Button
              size="xs"
              variant={statusFilter === 'all' ? 'filled' : 'subtle'}
              color="burgundy"
              onClick={() => setStatusFilter('all')}
              styles={{ root: { height: 26, fontSize: 11.5 } }}
            >
              All
            </Button>
            <Button
              size="xs"
              variant={statusFilter === 'active' ? 'filled' : 'subtle'}
              color="burgundy"
              onClick={() => setStatusFilter('active')}
              styles={{ root: { height: 26, fontSize: 11.5 } }}
            >
              Active
            </Button>
            <Button
              size="xs"
              variant={statusFilter === 'inactive' ? 'filled' : 'subtle'}
              color="burgundy"
              onClick={() => setStatusFilter('inactive')}
              styles={{ root: { height: 26, fontSize: 11.5 } }}
            >
              Inactive
            </Button>
          </Group>
        </Group>

        {isLoading ? (
          <Center p="xl" style={{ minHeight: 200 }}>
            <Loader color="burgundy" />
          </Center>
        ) : filteredGroups.length === 0 ? (
          <Center p="xl" style={{ minHeight: 200 }}>
            <Stack align="center" gap="xs">
              <IconCreditCard size={36} color="#cbd5e1" stroke={1.25} />
              <Text size="sm" c="dimmed">
                {searchQuery ? 'No payment groups match your search.' : 'No payment groups created yet. Click "+ Add Payment Group" above.'}
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={700}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', width: 80 }}>
                    ID
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    PAYMENT GROUP NAME
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    LINKED BANK ACCOUNT
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ALLOCATED ROUTES
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', width: 110 }}>
                    STATUS
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 110 }}>
                    ACTIONS
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredGroups.map((group) => {
                  const bankName = group.BankLedgerName || group.bank_ledger_name;
                  const routes = group.allocated_routes || [];

                  return (
                    <Table.Tr key={group.PaymentGroupId}>
                      {/* ID */}
                      <Table.Td style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>
                        #{group.PaymentGroupId}
                      </Table.Td>

                      {/* Payment Group Name */}
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <ThemeIcon size={28} radius="md" variant="light" color="burgundy">
                            <IconCreditCard size={16} stroke={1.75} />
                          </ThemeIcon>
                          <div>
                            <Text size="sm" fw={700} style={{ color: '#0f172a' }}>
                              {group.PaymentGroupName}
                            </Text>
                            <Text size="11px" c="dimmed">
                              Scheme ID: PG-{group.PaymentGroupId}
                            </Text>
                          </div>
                        </Group>
                      </Table.Td>

                      {/* Linked Bank Account */}
                      <Table.Td>
                        {bankName ? (
                          <Group gap={6} wrap="nowrap">
                            <IconBuildingBank size={16} color="#800020" stroke={1.75} />
                            <Badge
                              variant="outline"
                              size="sm"
                              styles={{
                                root: {
                                  borderColor: '#cbd5e1',
                                  color: '#0f172a',
                                  fontWeight: 600,
                                  fontSize: 11.5,
                                },
                              }}
                            >
                              {bankName}
                            </Badge>
                          </Group>
                        ) : (
                          <Badge variant="subtle" color="gray" size="sm">
                            No Bank Linked
                          </Badge>
                        )}
                      </Table.Td>

                      {/* Allocated Routes */}
                      <Table.Td>
                        {routes.length > 0 ? (
                          <Group gap={4} wrap="wrap">
                            {routes.slice(0, 2).map((r, i) => (
                              <Badge key={i} size="xs" variant="light" color="burgundy">
                                {r}
                              </Badge>
                            ))}
                            {routes.length > 2 && (
                              <Badge size="xs" variant="subtle" color="gray">
                                +{routes.length - 2} more
                              </Badge>
                            )}
                          </Group>
                        ) : (
                          <Text size="xs" c="dimmed">
                            Unassigned
                          </Text>
                        )}
                      </Table.Td>

                      {/* Status */}
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Tooltip label={`Click to ${group.IsActive ? 'Deactivate' : 'Activate'}`} withArrow>
                          <Badge
                            size="sm"
                            variant="outline"
                            style={{
                              borderColor: group.IsActive ? '#800020' : '#94a3b8',
                              color: group.IsActive ? '#800020' : '#64748b',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                            onClick={() =>
                              toggleActiveMutation.mutate({
                                id: group.PaymentGroupId,
                                newStatus: !group.IsActive,
                              })
                            }
                          >
                            {group.IsActive ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </Tooltip>
                      </Table.Td>

                      {/* Actions */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <ActionIcon
                            variant="subtle"
                            color="burgundy"
                            size="sm"
                            title="Edit"
                            onClick={() => handleEdit(group)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                          <Tooltip
                            label={
                              (group.allocations_count || 0) > 0
                                ? 'Cannot delete: assigned to active routes'
                                : 'Delete Payment Group'
                            }
                            withArrow
                          >
                            <span>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                size="sm"
                                disabled={(group.allocations_count || 0) > 0}
                                onClick={() =>
                                  setDeleteTarget({
                                    id: group.PaymentGroupId,
                                    name: group.PaymentGroupName,
                                  })
                                }
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </span>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Payment Group"
        itemType="payment group"
        itemName={deleteTarget?.name}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </Stack>
  );
};
