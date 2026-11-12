import React, { useState, useMemo } from 'react';
import {
  Title,
  Text,
  Paper,
  SimpleGrid,
  Box,
  Group,
  Stack,
  Badge,
  Button,
  Table,
  TextInput,
  ActionIcon,
  Divider,
  Collapse,
  CloseButton,
  SegmentedControl,
  Tooltip,
  Loader,
  Center,
  Select,
} from '@mantine/core';
import {
  IconSearch,
  IconRefresh,
  IconTruck,
  IconCheck,
  IconEye,
  IconPackage,
  IconTrash,
  IconClock,
  IconCreditCard,
  IconReceipt,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface EndRouteDriverLineItem {
  EndRouteDriverLineId: number;
  Product: number;
  product_name: string;
  Unit: number;
  unit_name: string;
  LoadedQty?: number;
  DeliveredQty?: number;
  FilledQty: number;
  EmptyQty: number;
  Rate: string | number;
  Amount: string | number;
}

interface EndRouteDriverItem {
  EndRouteDriverId: number;
  ShiftDate: string;
  RouteVehicleDriver: number;
  driver_name: string;
  vehicle_number: string;
  route_name: string;
  Ledger: number;
  ledger_name: string;
  CompanyId: number;
  Remarks: string;
  Status: 'PENDING' | 'SETTLED' | string;
  CreatedAt: string;
  lines?: EndRouteDriverLineItem[];
  total_loaded?: number;
  total_delivered?: number;
  total_filled?: number;
  total_unsold?: number;
  total_empty?: number;
  cash_amount?: number;
  bank_amount?: number;
  gross_amount?: number;
  trip_expenses?: number;
  net_balance?: number;
}

export const EndAllocationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'settled' | 'all'>('pending');
  const [selectedItem, setSelectedItem] = useState<EndRouteDriverItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<EndRouteDriverItem | null>(null);

  // Per-line receiving godown selection
  const [lineGodowns, setLineGodowns] = useState<Record<number, string>>({});

  // Fetch Godowns
  const { data: godowns = [] } = useQuery<any[]>({
    queryKey: ['godowns'],
    queryFn: async () => {
      const res = await apiClient.get('/godowns/');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // Fetch EndRouteDriver data from backend
  const { data: endRouteDrivers = [], isLoading, isRefetching, refetch } = useQuery<EndRouteDriverItem[]>({
    queryKey: ['end-route-drivers'],
    queryFn: async () => {
      const res = await apiClient.get('/end-route-drivers/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  // Approve & Settle Mutation
  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/end-route-drivers/${id}/`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['end-route-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-notes'] });
      queryClient.invalidateQueries({ queryKey: ['van-stock'] });
      queryClient.invalidateQueries({ queryKey: ['godown-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-analysis'] });
      setIsDetailOpen(false);
      setSelectedItem(null);
      notifications.show({
        title: 'Record Removed',
        message: 'Shift settlement record deleted and stock reversed.',
        color: 'burgundy',
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Delete Failed',
        message: err.response?.data?.detail || 'Could not delete settlement record.',
        color: 'red',
      });
    },
  });

  const settleMutation = useMutation({
    mutationFn: async ({
      id,
      godown_id,
      godown_splits,
    }: {
      id: number;
      godown_id?: number;
      godown_splits?: any;
    }) => {
      const res = await apiClient.post(`/end-route-drivers/${id}/settle/`, {
        godown_id,
        godown_splits,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['end-route-drivers'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-notes'] });
      queryClient.invalidateQueries({ queryKey: ['van-stock'] });
      queryClient.invalidateQueries({ queryKey: ['godown-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-analysis'] });
      setIsDetailOpen(false);
      notifications.show({
        title: 'Settlement Approved',
        message: data.message || 'Driver shift end settlement approved and verified.',
        color: 'burgundy',
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Settlement Failed',
        message: err.response?.data?.message || err.message || 'Could not approve settlement.',
        color: 'red',
      });
    },
  });

  // Counts & Summaries
  const pendingCount = useMemo(
    () => endRouteDrivers.filter((i) => i.Status?.toUpperCase() === 'PENDING').length,
    [endRouteDrivers]
  );
  const settledCount = useMemo(
    () => endRouteDrivers.filter((i) => i.Status?.toUpperCase() === 'SETTLED').length,
    [endRouteDrivers]
  );

  const totalFilled = useMemo(
    () => endRouteDrivers.reduce((sum, item) => sum + (item.total_filled || 0), 0),
    [endRouteDrivers]
  );
  const totalEmpty = useMemo(
    () => endRouteDrivers.reduce((sum, item) => sum + (item.total_empty || 0), 0),
    [endRouteDrivers]
  );

  // Filtered List
  const filteredData = useMemo(() => {
    return endRouteDrivers.filter((item) => {
      const s = item.Status?.toUpperCase() || '';
      if (statusFilter === 'pending' && s !== 'PENDING') return false;
      if (statusFilter === 'settled' && s !== 'SETTLED') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.driver_name?.toLowerCase().includes(q) ||
        item.vehicle_number?.toLowerCase().includes(q) ||
        item.route_name?.toLowerCase().includes(q) ||
        item.ledger_name?.toLowerCase().includes(q) ||
        item.Remarks?.toLowerCase().includes(q) ||
        String(item.EndRouteDriverId).includes(q)
      );
    });
  }, [endRouteDrivers, statusFilter, searchQuery]);

  // Handle open details modal
  const handleOpenDetail = (item: EndRouteDriverItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);

    const initialLineGodowns: Record<number, string> = {};
    (item.lines || []).forEach((l) => {
      const pid = l.Product || l.EndRouteDriverLineId;
      initialLineGodowns[pid] = '1'; // Default to Central Godown
    });
    setLineGodowns(initialLineGodowns);
  };

  const handleApproveSettlement = () => {
    if (!selectedItem) return;

    const modalLinesList = selectedItem.lines || [];
    const splitsPayload: Record<number, any[]> = {};

    for (const line of modalLinesList) {
      const pid = line.Product || line.EndRouteDriverLineId;
      const targetGid = Number(lineGodowns[pid] || 1);
      const totalF = Number(line.FilledQty) || 0;
      const totalE = Number(line.EmptyQty) || 0;

      splitsPayload[pid] = [
        {
          godown_id: targetGid,
          filled_qty: totalF,
          empty_qty: totalE,
        },
      ];
    }

    settleMutation.mutate({
      id: selectedItem.EndRouteDriverId,
      godown_id: 1,
      godown_splits: splitsPayload,
    });
  };

  // Helper to extract amounts from backend API attributes or fallback remarks
  const parseSettlementAmounts = (item: EndRouteDriverItem | null) => {
    if (!item) return { cash: 0, bank: 0, total: 0 };

    // 1. Single Source of Truth: Direct backend API attributes
    if (item.cash_amount !== undefined && item.cash_amount !== null) {
      const cash = Number(item.cash_amount) || 0;
      const bank = Number(item.bank_amount) || 0;
      return { cash, bank, total: cash + bank };
    }

    // 2. Fallback for legacy text remarks ONLY if backend fields are completely absent
    let cash = 0;
    let bank = 0;
    const remarks = item.Remarks || '';

    const cashMatch = remarks.match(/cash[\s:]*₹?\s*([\d,.]+)/i);
    const bankMatch = remarks.match(/(?:bank|upi)[\s:]*₹?\s*([\d,.]+)/i);

    if (cashMatch) cash = parseFloat(cashMatch[1].replace(/,/g, '')) || 0;
    if (bankMatch) bank = parseFloat(bankMatch[1].replace(/,/g, '')) || 0;

    return { cash, bank, total: cash + bank };
  };

  const modalAmounts = parseSettlementAmounts(selectedItem);
  const modalLines = selectedItem?.lines || [];
  const modalTotalFilled = modalLines.reduce((acc, l) => acc + (Number(l.FilledQty) || 0), 0);
  const modalTotalEmpty = modalLines.reduce((acc, l) => acc + (Number(l.EmptyQty) || 0), 0);

  return (
    <Stack gap="lg">
      {/* Page Header */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700, letterSpacing: '-0.02em' }}>
            End Allocation
          </Title>
          <Text size="xs" c="#64748b" mt={2}>
            Driver route returns, empty cylinder receipts & settlement verification into Central Godown
          </Text>
        </div>

        <Group gap="sm" align="center">
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
        </Group>
      </Group>

      {/* Top 4 Metric KPI Cards matching Receipt Notes page */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Card 1: Settled Notes */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
          }}
        >
          <div>
            <Group justify="space-between" align="center" mb="xs">
              <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                SETTLED NOTES
              </Text>
              <IconReceipt size={20} color="#800020" stroke={1.75} />
            </Group>
            <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {settledCount}
            </Text>
          </div>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate>
              Reconciled with central godown ledger
            </Text>
          </Group>
        </Paper>

        {/* Card 2: Pending Verification */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
          }}
        >
          <div>
            <Group justify="space-between" align="center" mb="xs">
              <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                PENDING VERIFICATION
              </Text>
              <IconClock size={20} color="#800020" stroke={1.75} />
            </Group>
            <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {pendingCount}
            </Text>
          </div>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate>
              Drivers waiting at warehouse gate
            </Text>
          </Group>
        </Paper>

        {/* Card 3: Returns (Filled & Empty) */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
          }}
        >
          <div>
            <Group justify="space-between" align="center" mb="xs">
              <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                RETURNS
              </Text>
              <IconPackage size={20} color="#800020" stroke={1.75} />
            </Group>
            <Group gap="md" align="baseline" wrap="nowrap">
              <Group gap={6} align="baseline" wrap="nowrap">
                <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {totalFilled.toLocaleString()}
                </Text>
                <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ fontSize: 10, letterSpacing: '0.4px' }}>
                  FILLED
                </Text>
              </Group>

              <Divider orientation="vertical" style={{ borderColor: '#e2e8f0', height: 18, alignSelf: 'center' }} />

              <Group gap={6} align="baseline" wrap="nowrap">
                <Text fw={700} style={{ color: '#800020', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {totalEmpty.toLocaleString()}
                </Text>
                <Text size="xs" fw={700} style={{ color: '#800020', fontSize: 10, letterSpacing: '0.4px' }} tt="uppercase">
                  EMPTY
                </Text>
              </Group>
            </Group>
          </div>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate>
              Unsold full & empty returns
            </Text>
          </Group>
        </Paper>

        {/* Card 4: Route Collections */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
          }}
        >
          <div>
            <Group justify="space-between" align="center" mb="xs">
              <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                ROUTE COLLECTIONS
              </Text>
              <IconCreditCard size={20} color="#800020" stroke={1.75} />
            </Group>
            <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              ₹
              {endRouteDrivers
                .reduce((acc, item) => acc + parseSettlementAmounts(item).total, 0)
                .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </div>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate>
              Cash and digital route collections
            </Text>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Smooth Slide-Down Settlement Verification Panel */}
      <Collapse expanded={isDetailOpen && !!selectedItem} transitionDuration={250} transitionTimingFunction="ease">
        {selectedItem && (
          <Paper
            p="lg"
            radius="md"
            withBorder
            mb="md"
            style={{
              backgroundColor: '#ffffff',
              borderColor: '#f5c2cb',
              borderLeft: '4px solid #800020',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
          >
            <Group justify="space-between" align="flex-start" mb="md">
              <div>
                <Group gap="xs" align="center">
                  <Text fw={700} style={{ color: '#800020', fontSize: 17 }}>
                    Shift Settlement Verification
                  </Text>
                  <Badge size="sm" variant="light" color="burgundy" radius="sm">
                    ERD-{selectedItem.EndRouteDriverId}
                  </Badge>
                  <Badge
                    size="sm"
                    radius="sm"
                    variant="filled"
                    style={{
                      backgroundColor: selectedItem.Status?.toUpperCase() === 'SETTLED' ? '#f1f5f9' : '#fdf2f4',
                      color: selectedItem.Status?.toUpperCase() === 'SETTLED' ? '#334155' : '#800020',
                      fontWeight: 700,
                    }}
                  >
                    {selectedItem.Status?.toUpperCase()}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed" mt={2}>
                  Shift Date: {selectedItem.ShiftDate} • Route: {selectedItem.route_name} • Vehicle: {selectedItem.vehicle_number} • Driver: {selectedItem.driver_name}
                </Text>
              </div>

              <CloseButton
                size="md"
                onClick={() => {
                  setIsDetailOpen(false);
                  setSelectedItem(null);
                }}
              />
            </Group>

            <Stack gap="md">
              {/* Financial Reconcilation Cards (Matching Van Management) */}
              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <Box style={{ padding: '12px 16px', borderRight: '1px solid #e2e8f0' }}>
                  <Text size="10.5px" fw={700} c="#64748b" tt="uppercase">
                    GROSS COLLECTION
                  </Text>
                  <Text fw={700} size="md" c="#0f172a" mt={2}>
                    ₹{(selectedItem.gross_amount ?? (modalAmounts.cash + modalAmounts.bank)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text size="10px" c="#64748b" mt={2}>
                    Cash: ₹{modalAmounts.cash.toLocaleString('en-IN', { minimumFractionDigits: 0 })} • Bank: ₹{modalAmounts.bank.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </Text>
                </Box>
                <Box style={{ padding: '12px 16px', borderRight: '1px solid #e2e8f0' }}>
                  <Text size="10.5px" fw={700} c="#64748b" tt="uppercase">
                    TRIP EXPENSES
                  </Text>
                  <Text fw={700} size="md" c="#800020" mt={2}>
                    ₹{(selectedItem.trip_expenses ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text size="10px" c="#64748b" mt={2}>
                    Fuel, tolls & driver allowances
                  </Text>
                </Box>
                <Box style={{ padding: '12px 16px' }}>
                  <Text size="10.5px" fw={700} c="#64748b" tt="uppercase">
                    NET SETTLEMENT BALANCE
                  </Text>
                  <Text fw={700} size="md" c="#800020" mt={2}>
                    ₹{(selectedItem.net_balance ?? (modalAmounts.cash + modalAmounts.bank - (selectedItem.trip_expenses ?? 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text size="10px" c="#64748b" mt={2}>
                    Net cash & bank revenue in hand
                  </Text>
                </Box>
              </Box>

              {/* Remarks */}
              {selectedItem.Remarks && (
                <Paper p="xs" radius="sm" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Text size="xs" c="#334155">
                    <strong>Remarks:</strong> {selectedItem.Remarks}
                  </Text>
                </Paper>
              )}

              {/* Returned Stocks & Cylinders */}
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Text size="xs" fw={700} style={{ color: '#800020', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    VAN STOCK RECONCILIATION & GODOWN RETURNS
                  </Text>
                  <Group gap="xs">
                    <Badge variant="outline" radius="sm" size="sm" style={{ borderColor: '#0f172a', color: '#0f172a', fontWeight: 700 }}>
                      LOADED: {selectedItem.total_loaded ?? modalLines.reduce((s, l) => s + (l.LoadedQty ?? 0), 0)}
                    </Badge>
                    <Badge variant="outline" radius="sm" size="sm" style={{ borderColor: '#64748b', color: '#64748b', fontWeight: 700 }}>
                      DELIVERED: {selectedItem.total_delivered ?? modalLines.reduce((s, l) => s + (l.DeliveredQty ?? 0), 0)}
                    </Badge>
                    <Badge variant="outline" radius="sm" size="sm" style={{ borderColor: '#0f172a', color: '#0f172a', fontWeight: 700 }}>
                      UNSOLD FULL: {modalTotalFilled}
                    </Badge>
                    <Badge variant="outline" radius="sm" size="sm" style={{ borderColor: '#800020', color: '#800020', fontWeight: 700 }}>
                      EMPTIES RETURNED: {modalTotalEmpty}
                    </Badge>
                  </Group>
                </Group>

                {modalLines.length === 0 ? (
                  <Center p="md" style={{ border: '1px dashed #e2e8f0', borderRadius: 8 }}>
                    <Text size="xs" c="dimmed">
                      No physical cylinder returns recorded for this shift.
                    </Text>
                  </Center>
                ) : (
                  <Paper radius="sm" withBorder style={{ overflow: 'hidden', borderColor: '#e2e8f0' }}>
                    <Table verticalSpacing="xs" horizontalSpacing="sm">
                      <Table.Thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <Table.Tr>
                          <Table.Th style={{ fontSize: 11, color: '#0f172a', fontWeight: 700 }}>PRODUCT</Table.Th>
                          <Table.Th style={{ fontSize: 11, color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>LOADED</Table.Th>
                          <Table.Th style={{ fontSize: 11, color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>DELIVERED</Table.Th>
                          <Table.Th style={{ fontSize: 11, color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>UNSOLD (TO GODOWN)</Table.Th>
                          <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 700, textAlign: 'right' }}>EMPTIES (TO GODOWN)</Table.Th>
                          <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 700, width: 220 }}>GODOWN</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {modalLines.map((line) => {
                          const pid = line.Product || line.EndRouteDriverLineId;
                          return (
                            <Table.Tr key={line.EndRouteDriverLineId}>
                              <Table.Td style={{ fontWeight: 600, fontSize: 12.5, color: '#0f172a' }}>{line.product_name}</Table.Td>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12.5, color: '#0f172a' }}>{line.LoadedQty ?? '-'}</Table.Td>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12.5, color: '#64748b' }}>{line.DeliveredQty ?? '-'}</Table.Td>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>{line.FilledQty}</Table.Td>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#800020' }}>{line.EmptyQty}</Table.Td>
                              <Table.Td style={{ width: 220 }}>
                                {selectedItem.Status?.toUpperCase() === 'PENDING' ? (
                                  <Select
                                    size="xs"
                                    data={(godowns.length > 0 ? godowns : [
                                      { GodownId: 1, GodownName: 'Main Godown (Central)', IsCentral: true },
                                      { GodownId: 2, GodownName: 'Thalassery Godown', IsCentral: false },
                                    ]).map((g: any) => ({
                                      value: String(g.GodownId),
                                      label: `${g.GodownName}${g.IsCentral ? ' (Central)' : ''}`,
                                    }))}
                                    value={lineGodowns[pid] || '1'}
                                    onChange={(val) => {
                                      if (val) {
                                        setLineGodowns((prev) => ({ ...prev, [pid]: val }));
                                      }
                                    }}
                                    styles={{
                                      input: {
                                        fontWeight: 600,
                                        fontSize: 12,
                                        borderColor: '#800020',
                                      },
                                    }}
                                  />
                                ) : (
                                  <Badge variant="light" color="burgundy" size="sm">
                                    {godowns.find((g: any) => String(g.GodownId) === (lineGodowns[pid] || '1'))?.GodownName || 'Main Godown'}
                                  </Badge>
                                )}
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                      </Table.Tbody>
                      <Table.Tfoot style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                        <Table.Tr>
                          <Table.Td style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>TOTALS</Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#0f172a' }}>
                            {modalLines.reduce((s, l) => s + (l.LoadedQty ?? 0), 0)}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#64748b' }}>
                            {modalLines.reduce((s, l) => s + (l.DeliveredQty ?? 0), 0)}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#0f172a' }}>
                            {modalTotalFilled}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#800020' }}>
                            {modalTotalEmpty}
                          </Table.Td>
                          <Table.Td />
                        </Table.Tr>
                      </Table.Tfoot>
                    </Table>
                  </Paper>
                )}
              </Stack>

              {/* Action Buttons */}
              <Group justify="flex-end" gap="sm">
                <Button
                  variant="subtle"
                  color="red"
                  radius="sm"
                  size="sm"
                  leftSection={<IconTrash size={15} />}
                  onClick={() => setDeleteConfirmItem(selectedItem)}
                >
                  Delete Record
                </Button>
                <Button
                  variant="default"
                  radius="sm"
                  onClick={() => {
                    setIsDetailOpen(false);
                    setSelectedItem(null);
                  }}
                  style={{ borderColor: '#cbd5e1', color: '#475569', fontWeight: 600 }}
                >
                  Close
                </Button>

                {selectedItem.Status?.toUpperCase() === 'PENDING' ? (
                  <Button
                    color="burgundy"
                    radius="sm"
                    leftSection={<IconCheck size={16} />}
                    loading={settleMutation.isPending}
                    onClick={handleApproveSettlement}
                    style={{
                      backgroundColor: '#800020',
                      color: '#ffffff',
                      fontWeight: 700,
                      letterSpacing: '0.2px',
                    }}
                  >
                    Submit & Approve Settlement
                  </Button>
                ) : (
                  <Badge size="lg" radius="sm" variant="outline" color="green" style={{ fontWeight: 700 }}>
                    Settlement Verified & Approved
                  </Badge>
                )}
              </Group>
            </Stack>
          </Paper>
        )}
      </Collapse>

      {/* Main Table Container matching Receipt Notes Page */}
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
        {/* Table Toolbar */}
        <Group justify="space-between" align="center" p="sm" px="md" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <Group gap="xs" align="center">
              <Text fw={700} style={{ color: '#800020', fontSize: 16 }}>
                Driver Shift End Settlements
              </Text>
              <Badge
                variant="light"
                size="sm"
                radius="sm"
                styles={{
                  root: {
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: 11,
                  },
                }}
              >
                {filteredData.length} NOTES
              </Badge>
            </Group>
            <Text size="xs" c="#64748b">
              Review driver shift returns, verify empty cylinder counts, and accept inventory into Central Godown
            </Text>
          </div>

          <Group gap="sm" align="center">
            <SegmentedControl
              size="xs"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              color="burgundy"
              data={[
                {
                  label: (
                    <span
                      style={{
                        color: statusFilter === 'pending' ? '#ffffff' : '#64748b',
                        fontWeight: statusFilter === 'pending' ? 700 : 600,
                        fontSize: 12,
                        display: 'inline-block',
                        transition: 'color 150ms ease',
                      }}
                    >
                      Pending ({pendingCount})
                    </span>
                  ),
                  value: 'pending',
                },
                {
                  label: (
                    <span
                      style={{
                        color: statusFilter === 'settled' ? '#ffffff' : '#64748b',
                        fontWeight: statusFilter === 'settled' ? 700 : 600,
                        fontSize: 12,
                        display: 'inline-block',
                        transition: 'color 150ms ease',
                      }}
                    >
                      Settled ({settledCount})
                    </span>
                  ),
                  value: 'settled',
                },
                {
                  label: (
                    <span
                      style={{
                        color: statusFilter === 'all' ? '#ffffff' : '#64748b',
                        fontWeight: statusFilter === 'all' ? 700 : 600,
                        fontSize: 12,
                        display: 'inline-block',
                        transition: 'color 150ms ease',
                      }}
                    >
                      All ({endRouteDrivers.length})
                    </span>
                  ),
                  value: 'all',
                },
              ]}
              styles={{
                root: {
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  padding: 3,
                  borderRadius: 8,
                },
                indicator: {
                  backgroundColor: '#800020',
                  boxShadow: '0 1px 3px rgba(128, 0, 32, 0.25)',
                  borderRadius: 6,
                },
                label: {
                  padding: '4px 12px',
                },
              }}
            />

            <TextInput
              placeholder="Search driver, vehicle, route..."
              leftSection={<IconSearch size={14} color="#94a3b8" />}
              size="xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              style={{ width: 250 }}
            />
          </Group>
        </Group>

        {/* Table */}
        {isLoading ? (
          <Center py="xl">
            <Loader color="burgundy" />
          </Center>
        ) : filteredData.length === 0 ? (
          <Center py="xl">
            <Text size="sm" c="dimmed">
              No shift settlements found matching the selected filters.
            </Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={900}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                <Table.Tr>
                  <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#800020', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    SHIFT DATE & ID
                  </Table.Th>
                  <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#800020', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    VEHICLE & ROUTE
                  </Table.Th>
                  <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#800020', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    SETTLEMENT LEDGER
                  </Table.Th>
                  <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#800020', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    RETURNS
                  </Table.Th>
                  <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#800020', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    TOTAL COLLECTED
                  </Table.Th>
                  <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#800020', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                    STATUS
                  </Table.Th>
                  <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#800020', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>
                    ACTIONS
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredData.map((item) => {
                  const amounts = parseSettlementAmounts(item);
                  const isSettled = item.Status?.toUpperCase() === 'SETTLED';

                  return (
                    <Table.Tr
                      key={item.EndRouteDriverId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleOpenDetail(item)}
                    >
                      {/* 1. Date & ID */}
                      <Table.Td>
                        <Stack gap={2}>
                          <Text fw={700} style={{ color: '#800020', fontSize: 13 }}>
                            ERD-{item.EndRouteDriverId}
                          </Text>
                          <Text size="11px" c="#64748b">
                            {item.ShiftDate}
                          </Text>
                        </Stack>
                      </Table.Td>

                      {/* 2. Vehicle & Route */}
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <IconTruck size={18} color="#800020" style={{ flexShrink: 0 }} />
                          <div>
                            <Text fw={700} style={{ color: '#0f172a', fontSize: 13 }}>
                              {item.vehicle_number || 'Van'}
                            </Text>
                            <Text size="11px" c="#64748b">
                              {item.route_name || 'Route'} • Driver: <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.driver_name || 'Driver'}</span>
                            </Text>
                          </div>
                        </Group>
                      </Table.Td>

                      {/* 3. Settlement Ledger */}
                      <Table.Td>
                        <Badge
                          variant="outline"
                          size="sm"
                          radius="sm"
                          style={{
                            borderColor: '#e2e8f0',
                            color: '#0f172a',
                            fontWeight: 600,
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          {item.ledger_name || 'Cash / Bank Ledger'}
                        </Badge>
                      </Table.Td>

                      {/* 4. Returns */}
                      <Table.Td>
                        <Group gap={6} wrap="nowrap">
                          {(item.total_filled || 0) > 0 && (
                            <Badge
                              size="xs"
                              radius="sm"
                              variant="filled"
                              style={{ backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 700 }}
                            >
                              {item.total_filled} FILLED
                            </Badge>
                          )}
                          <Badge
                            size="xs"
                            radius="sm"
                            variant="filled"
                            style={{ backgroundColor: '#fdf2f4', color: '#800020', fontWeight: 700 }}
                          >
                            {item.total_empty || 0} EMPTY
                          </Badge>
                        </Group>
                      </Table.Td>

                      {/* 5. Total Collected */}
                      <Table.Td>
                        <Stack gap={1}>
                          <Text fw={700} style={{ color: '#0f172a', fontSize: 13 }}>
                            ₹{amounts.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                          {amounts.cash > 0 && (
                            <Text size="10.5px" c="#64748b">
                              Cash: ₹{amounts.cash.toLocaleString('en-IN')}
                            </Text>
                          )}
                          {amounts.bank > 0 && (
                            <Text size="10.5px" c="#64748b">
                              Bank: ₹{amounts.bank.toLocaleString('en-IN')}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>

                      {/* 6. Status */}
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Badge
                          size="sm"
                          radius="sm"
                          variant="filled"
                          style={{
                            backgroundColor: isSettled ? '#f1f5f9' : '#fdf2f4',
                            color: isSettled ? '#334155' : '#800020',
                            fontWeight: 700,
                            letterSpacing: '0.4px',
                          }}
                        >
                          {isSettled ? 'SETTLED' : 'PENDING'}
                        </Badge>
                      </Table.Td>

                      {/* 7. Actions */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="View Settlement Details" withArrow position="left">
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(item);
                              }}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Delete Settlement Record" withArrow position="left">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmItem(item);
                              }}
                            >
                              <IconTrash size={15} />
                            </ActionIcon>
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

      {/* Standard ERP Delete Confirmation Modal */}
      <DeleteConfirmModal
        opened={!!deleteConfirmItem}
        onClose={() => setDeleteConfirmItem(null)}
        title="Delete Shift Settlement"
        itemType="shift settlement"
        itemName={deleteConfirmItem ? `ERD-${deleteConfirmItem.EndRouteDriverId}` : ''}
        description={
          deleteConfirmItem ? (
            <Stack gap="xs">
              <Text size="sm" c="#334155" style={{ lineHeight: 1.5 }}>
                Are you sure you want to delete settlement record{' '}
                <strong style={{ color: '#800020' }}>ERD-{deleteConfirmItem.EndRouteDriverId}</strong> for driver{' '}
                <strong style={{ color: '#0f172a' }}>{deleteConfirmItem.driver_name}</strong> ({deleteConfirmItem.vehicle_number})?
              </Text>
              <Text size="xs" c="dimmed">
                This will reverse empty and filled cylinder unloads back to the vehicle, and restore the driver&apos;s shift to active state.
              </Text>
            </Stack>
          ) : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteConfirmItem) {
            deleteMutation.mutate(deleteConfirmItem.EndRouteDriverId, {
              onSettled: () => setDeleteConfirmItem(null),
            });
          }
        }}
      />

    </Stack>
  );
};
export default EndAllocationsPage;

