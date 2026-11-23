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
  NumberInput,
  ActionIcon,
  Divider,
  Collapse,
  CloseButton,
  SegmentedControl,
  Tooltip,
  Loader,
  Center,
  Select,
  Modal,
  Grid,
  ThemeIcon } from '@mantine/core';
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
  IconArrowLeft,
  IconReceipt,
  IconPrinter,
  IconHistory,
  IconArrowRight,
  IconArrowUpRight,
  IconBuildingWarehouse,
  IconPencil,
  IconX,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { formatDateDDMMYY, DateInputDDMMYY } from '../components/DateInputDDMMYY';

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

export interface ShiftSaleEdit {
  EditId: number;
  EditedAt?: string;
  EditedBy?: string;
  OldGrandTotal: number;
  NewGrandTotal: number;
  OldPaymentMethod: string;
  NewPaymentMethod: string;
  Notes: string;
}

export interface ShiftSaleItem {
  SalesId: number;
  InvoiceNo: string;
  CustomerName: string;
  GrandTotal: number;
  PaidAmount: number;
  PaymentMethod: string;
  Notes?: string;
  IsEdited: boolean;
  is_edited?: boolean;
  TotalDeliveredQty?: number;
  TotalEmptyQty?: number;
  delivered_qty?: number;
  empty_returned?: number;
  EditReason?: string;
  EditedBy?: string;
  EditedAt?: string;
  edit_history?: ShiftSaleEdit[];
}

interface EndRouteDriverItem {
  EndRouteDriverId: number;
  ShiftDate: string;
  RouteVehicleDriver: number;
  route_id?: number;
  driver_name: string;
  vehicle_number: string;
  route_name: string;
  source_godown_id?: number;
  source_godown_name?: string;
  Ledger: number;
  ledger_name: string;
  CompanyId: number;
  Remarks: string;
  Status: 'PENDING' | 'SETTLED' | string;
  CreatedAt: string;
  lines?: EndRouteDriverLineItem[];
  sales?: ShiftSaleItem[];
  total_loaded?: number;
  total_delivered?: number;
  total_filled?: number;
  total_unsold?: number;
  total_empty?: number;
  cash_amount?: number;
  bank_amount?: number;
  gross_amount?: number;
  trip_expenses?: number;
  cash_expense?: number;
  bank_expense?: number;
  net_balance?: number;
  net_cash?: number;
  net_bank?: number;
}

export const EndAllocationsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'settled' | 'all'>('pending');
  const [selectedItem, setSelectedItem] = useState<EndRouteDriverItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeAuditSale, setActiveAuditSale] = useState<ShiftSaleItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<EndRouteDriverItem | null>(null);

  // Per-line receiving godown selection for unsold full and empties
  const [selectedTargetGodown, setSelectedTargetGodown] = useState<string>('');
  const [unsoldGodowns, setUnsoldGodowns] = useState<Record<number, string>>({});
  const [emptyGodowns, setEmptyGodowns] = useState<Record<number, string>>({});
  const [printingId, setPrintingId] = useState<number | null>(null);

  // Manager Settlement Edit State
  const [isEditMode, setIsEditMode] = useState(false);
  const [adjustedLines, setAdjustedLines] = useState<Record<number, { filled_qty: number; empty_qty: number }>>({});
  const [adjustedCash, setAdjustedCash] = useState<number>(0);
  const [adjustedBank, setAdjustedBank] = useState<number>(0);
  const [adjustedExpenses, setAdjustedExpenses] = useState<number>(0);
  const [adjustedRemarks, setAdjustedRemarks] = useState<string>('');

  // Date Filter & Sort State (matching other screens)
  type DateFilterType = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');

  const isDateInFilter = (dateStr?: string | null) => {
    if (!dateStr || dateFilter === 'all') return true;
    const d = dateStr.slice(0, 10);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (dateFilter === 'today') {
      return d === todayStr;
    }
    if (dateFilter === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      const yesterdayStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
      return d === yesterdayStr;
    }
    if (dateFilter === 'this_week') {
      const day = today.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      return d >= mondayStr && d <= todayStr;
    }
    if (dateFilter === 'this_month') {
      const monthStartStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      return d >= monthStartStr && d <= todayStr;
    }
    if (dateFilter === 'custom') {
      if (customStartDate && d < customStartDate) return false;
      if (customEndDate && d > customEndDate) return false;
      return true;
    }
    return true;
  };

  const handlePrintTripSheet = async (item: EndRouteDriverItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setPrintingId(item.EndRouteDriverId);
      const res = await apiClient.get(`/end-route-drivers/${item.EndRouteDriverId}/trip-sheet-pdf/`, {
        responseType: 'blob',
      });
      const file = new Blob([res.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      const newWin = window.open(fileURL, '_blank');
      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        const link = document.createElement('a');
        link.href = fileURL;
        link.download = `Trip_Sheet_ERD_${item.EndRouteDriverId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      notifications.show({
        color: 'red',
        title: 'Error generating PDF',
        message: 'Failed to generate Route Trip Sheet PDF.',
      });
    } finally {
      setPrintingId(null);
    }
  };

  // Fetch Godowns
  const { data: godowns = [] } = useQuery<any[]>({
    queryKey: ['godowns'],
    queryFn: async () => {
      const res = await apiClient.get('/godowns/');
      return Array.isArray(res.data) ? res.data : [];
    } });

  // Fetch EndRouteDriver data from backend
  const { data: endRouteDrivers = [], isLoading, isRefetching, refetch } = useQuery<EndRouteDriverItem[]>({
    queryKey: ['end-route-drivers'],
    queryFn: async () => {
      const res = await apiClient.get('/end-route-drivers/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    } });

  // Approve & Settle Mutation
  // Delete / Revoke Shift End Mutation (Restores shift to active state for driver to edit)
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
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      setIsDetailOpen(false);
      setSelectedItem(null);
      notifications.show({
        title: 'Record Removed',
        message: 'Shift settlement record deleted and stock reversed.',
        color: 'burgundy' });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Delete Failed',
        message: err.response?.data?.detail || 'Could not delete settlement record.',
        color: 'red' });
    } });

  const settleMutation = useMutation({
    mutationFn: async ({
      id,
      godown_id,
      godown_splits,
      adjusted_lines,
      cash_amount,
      bank_amount,
      trip_expenses,
      remarks,
    }: {
      id: number;
      godown_id?: number;
      godown_splits?: any;
      adjusted_lines?: any[];
      cash_amount?: number;
      bank_amount?: number;
      trip_expenses?: number;
      remarks?: string;
    }) => {
      const res = await apiClient.post(`/end-route-drivers/${id}/settle/`, {
        godown_id,
        godown_splits,
        adjusted_lines,
        cash_amount,
        bank_amount,
        trip_expenses,
        remarks,
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
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      setIsDetailOpen(false);
      notifications.show({
        title: 'Settlement Approved',
        message: data.message || 'Driver shift end settlement approved and verified.',
        color: 'burgundy' });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Settlement Failed',
        message: err.response?.data?.message || err.message || 'Could not approve settlement.',
        color: 'red' });
    } });

  // Data filtered strictly by Date (connected to the date filter toggle)
  const dateFilteredData = useMemo(() => {
    return endRouteDrivers.filter((item) => isDateInFilter(item.ShiftDate || item.CreatedAt));
  }, [endRouteDrivers, dateFilter, customStartDate, customEndDate]);

  // Counts & Summaries dynamically connected to date range
  const pendingCount = useMemo(
    () => dateFilteredData.filter((i) => i.Status?.toUpperCase() === 'PENDING').length,
    [dateFilteredData]
  );
  const settledCount = useMemo(
    () => dateFilteredData.filter((i) => i.Status?.toUpperCase() === 'SETTLED').length,
    [dateFilteredData]
  );

  const totalFilled = useMemo(
    () => dateFilteredData.reduce((sum, item) => sum + (item.total_filled || 0), 0),
    [dateFilteredData]
  );
  const totalEmpty = useMemo(
    () => dateFilteredData.reduce((sum, item) => sum + (item.total_empty || 0), 0),
    [dateFilteredData]
  );
  const totalRouteCollections = useMemo(
    () => dateFilteredData.reduce((acc, item) => acc + parseSettlementAmounts(item).total, 0),
    [dateFilteredData]
  );

  // Filtered List with Date Range, Status & Sorting
  const filteredData = useMemo(() => {
    return dateFilteredData
      .filter((item) => {
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
      })
      .sort((a, b) => {
        const getTimestamp = (item: EndRouteDriverItem) => {
          if (item.CreatedAt) {
            const t = new Date(item.CreatedAt).getTime();
            if (!isNaN(t) && t > 0) return t;
          }
          if (item.ShiftDate) {
            const t = new Date(item.ShiftDate).getTime();
            if (!isNaN(t) && t > 0) return t;
          }
          return 0;
        };

        if (sortBy === 'oldest') {
          const diff = getTimestamp(a) - getTimestamp(b);
          if (diff !== 0) return diff;
          return (a.EndRouteDriverId || 0) - (b.EndRouteDriverId || 0);
        }
        if (sortBy === 'route_asc') {
          return (a.route_name || '').localeCompare(b.route_name || '');
        }
        if (sortBy === 'driver_asc') {
          return (a.driver_name || '').localeCompare(b.driver_name || '');
        }
        const diff = getTimestamp(b) - getTimestamp(a);
        if (diff !== 0) return diff;
        return (b.EndRouteDriverId || 0) - (a.EndRouteDriverId || 0);
      });
  }, [dateFilteredData, statusFilter, sortBy, searchQuery]);

  // Helper to extract amounts from backend API attributes or fallback remarks
  const parseSettlementAmounts = (item: EndRouteDriverItem | null) => {
    if (!item) return { cash: 0, bank: 0, total: 0, cashExpense: 0, bankExpense: 0, netCash: 0, netBank: 0, netBalance: 0 };

    let cash = Number(item.cash_amount) || 0;
    let bank = Number(item.bank_amount) || 0;
    const totalExp = Number(item.trip_expenses) || 0;
    let cashExpense = Number(item.cash_expense) || 0;
    let bankExpense = Number(item.bank_expense) || 0;

    if (item.cash_amount === undefined || item.cash_amount === null) {
      const remarks = item.Remarks || '';
      const cashMatch = remarks.match(/cash[\s:]*₹?\s*([\d,.]+)/i);
      const bankMatch = remarks.match(/(?:bank|upi)[\s:]*₹?\s*([\d,.]+)/i);
      if (cashMatch) cash = parseFloat(cashMatch[1].replace(/,/g, '')) || 0;
      if (bankMatch) bank = parseFloat(bankMatch[1].replace(/,/g, '')) || 0;
    }

    if (cashExpense === 0 && bankExpense === 0 && totalExp > 0) {
      cashExpense = totalExp;
    }

    const netCash = item.net_cash !== undefined ? Number(item.net_cash) : (cash - cashExpense);
    const netBank = item.net_bank !== undefined ? Number(item.net_bank) : (bank - bankExpense);
    const netBalance = item.net_balance !== undefined ? Number(item.net_balance) : (cash + bank - totalExp);

    return { cash, bank, total: cash + bank, cashExpense, bankExpense, netCash, netBank, netBalance };
  };

  // Handle open details modal
  const handleOpenDetail = (item: EndRouteDriverItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
    setIsEditMode(false);

    const defaultGid = String(item.source_godown_id || 1);
    setSelectedTargetGodown(defaultGid);
    const initialUnsold: Record<number, string> = {};
    const initialEmpty: Record<number, string> = {};
    const initialAdjusted: Record<number, { filled_qty: number; empty_qty: number }> = {};

    (item.lines || []).forEach((l) => {
      const pid = l.Product || l.EndRouteDriverLineId;
      initialUnsold[pid] = defaultGid;
      initialEmpty[pid] = defaultGid;
      initialAdjusted[pid] = {
        filled_qty: Number(l.FilledQty) || 0,
        empty_qty: Number(l.EmptyQty) || 0,
      };
    });
    setUnsoldGodowns(initialUnsold);
    setEmptyGodowns(initialEmpty);
    setAdjustedLines(initialAdjusted);

    const amounts = parseSettlementAmounts(item);
    setAdjustedCash(amounts.cash);
    setAdjustedBank(amounts.bank);
    setAdjustedExpenses(Number(item.trip_expenses) || 0);
    setAdjustedRemarks(item.Remarks || '');
  };

  const handleApproveSettlement = () => {
    if (!selectedItem) return;

    const modalLinesList = selectedItem.lines || [];
    const splitsPayload: Record<number, any[]> = {};
    const sourceGid = Number(selectedItem.source_godown_id || 1);
    const targetGid = Number(selectedTargetGodown || sourceGid);
    const isCross = targetGid !== sourceGid;

    for (const line of modalLinesList) {
      const pid = line.Product || line.EndRouteDriverLineId;
      const unsoldGid = Number(unsoldGodowns[pid] || targetGid);
      const emptyGid = Number(emptyGodowns[pid] || targetGid);
      const totalF = isEditMode && adjustedLines[pid] !== undefined ? Number(adjustedLines[pid].filled_qty) : (Number(line.FilledQty) || 0);
      const totalE = isEditMode && adjustedLines[pid] !== undefined ? Number(adjustedLines[pid].empty_qty) : (Number(line.EmptyQty) || 0);

      if (unsoldGid === emptyGid) {
        splitsPayload[pid] = [
          {
            godown_id: unsoldGid,
            filled_qty: totalF,
            empty_qty: totalE,
          },
        ];
      } else {
        splitsPayload[pid] = [
          {
            godown_id: unsoldGid,
            filled_qty: totalF,
            empty_qty: 0,
          },
          {
            godown_id: emptyGid,
            filled_qty: 0,
            empty_qty: totalE,
          },
        ];
      }
    }

    const adjustedPayload = Object.entries(adjustedLines).map(([pid, val]) => ({
      product_id: Number(pid),
      filled_qty: Number(val.filled_qty),
      empty_qty: Number(val.empty_qty),
    }));

    settleMutation.mutate({
      id: selectedItem.EndRouteDriverId,
      godown_id: targetGid,
      godown_splits: isCross ? undefined : splitsPayload,
      adjusted_lines: isEditMode || Object.keys(adjustedLines).length > 0 ? adjustedPayload : undefined,
      cash_amount: isEditMode ? adjustedCash : undefined,
      bank_amount: isEditMode ? adjustedBank : undefined,
      trip_expenses: isEditMode ? adjustedExpenses : undefined,
      remarks: isEditMode ? adjustedRemarks : undefined,
    });
  };

  const rawModalAmounts = parseSettlementAmounts(selectedItem);
  const modalAmounts = useMemo(() => {
    if (!isEditMode) return rawModalAmounts;
    const cash = Number(adjustedCash) || 0;
    const bank = Number(adjustedBank) || 0;
    const totalExp = Number(adjustedExpenses) || 0;
    const cashExp = rawModalAmounts.cashExpense;
    const bankExp = rawModalAmounts.bankExpense;
    const netCash = cash - cashExp;
    const netBank = bank - bankExp;
    const netBalance = (cash + bank) - totalExp;
    return {
      cash,
      bank,
      total: cash + bank,
      cashExpense: cashExp,
      bankExpense: bankExp,
      netCash,
      netBank,
      netBalance,
    };
  }, [isEditMode, adjustedCash, adjustedBank, adjustedExpenses, rawModalAmounts]);

  const modalLines = selectedItem?.lines || [];
  const modalTotalFilled = useMemo(() => {
    if (isEditMode) {
      return Object.values(adjustedLines).reduce((acc, l) => acc + (Number(l.filled_qty) || 0), 0);
    }
    return modalLines.reduce((acc, l) => acc + (Number(l.FilledQty) || 0), 0);
  }, [isEditMode, adjustedLines, modalLines]);

  const modalTotalEmpty = useMemo(() => {
    if (isEditMode) {
      return Object.values(adjustedLines).reduce((acc, l) => acc + (Number(l.empty_qty) || 0), 0);
    }
    return modalLines.reduce((acc, l) => acc + (Number(l.EmptyQty) || 0), 0);
  }, [isEditMode, adjustedLines, modalLines]);

  const sourceGodownId = selectedItem?.source_godown_id || 1;
  const targetGodownId = Number(selectedTargetGodown || sourceGodownId);
  const targetGodownObj = godowns.find((g: any) => Number(g.GodownId) === targetGodownId);
  const targetGodownName = targetGodownObj?.GodownName || 'Target Godown';
  const isCrossDepot = targetGodownId !== Number(sourceGodownId);

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
            End Allocation
          </Title>
      
        </div>

        <Group gap="xs" align="center" wrap="wrap">
          {/* Date Filter Pills matching other pages */}
          <SegmentedControl
            size="xs"
            radius="xl"
            color="burgundy"
            transitionDuration={250}
            transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
            value={dateFilter}
            onChange={(val) => setDateFilter(val as any)}
            data={[
              { label: 'All', value: 'all' },
              { label: 'Today', value: 'today' },
              { label: 'Yesterday', value: 'yesterday' },
              { label: 'This Week', value: 'this_week' },
              { label: 'This Month', value: 'this_month' },
              { label: 'Custom', value: 'custom' },
            ]}
            styles={{
              root: {
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                padding: 3,
                borderRadius: 9999,
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
              },
              control: {
                border: 'none',
              },
              indicator: {
                backgroundColor: '#800020',
                borderRadius: 9999,
                boxShadow: '0 2px 4px rgba(128, 0, 32, 0.25)',
                border: 'none',
                outline: 'none',
              },
              label: {
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 14px',
                transition: 'color 150ms ease, font-weight 150ms ease',
              },
            }}
          />

          {dateFilter === 'custom' && (
            <Group gap="xs" align="center">
              <Box style={{ width: 120 }}>
                <DateInputDDMMYY
                  placeholder="From Date"
                  value={customStartDate}
                  onChange={(val) => setCustomStartDate(val)}
                />
              </Box>
              <Text size="xs" c="dimmed">to</Text>
              <Box style={{ width: 120 }}>
                <DateInputDDMMYY
                  placeholder="To Date"
                  value={customEndDate}
                  onChange={(val) => setCustomEndDate(val)}
                />
              </Box>
            </Group>
          )}

          {/* Sort Select */}
          <Select
            size="xs"
            radius="xl"
            value={sortBy}
            onChange={(val) => setSortBy(val || 'newest')}
            data={[
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'route_asc', label: 'Route (A - Z)' },
              { value: 'driver_asc', label: 'Driver (A - Z)' },
            ]}
            style={{ width: 135 }}
            styles={{
              input: {
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                fontWeight: 600,
                fontSize: 12,
              },
            }}
          />

          <Button
            variant="default"
            size="xs"
            radius="xl"
            leftSection={<IconRefresh size={14} className={isRefetching ? 'animate-spin' : ''} />}
            onClick={() => refetch()}
            loading={isRefetching}
            style={{ borderColor: '#e2e8f0', color: '#800020', fontWeight: 600, backgroundColor: '#ffffff' }}
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
            height: '100%' }}
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
            height: '100%' }}
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
            height: '100%' }}
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
            height: '100%' }}
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
              {totalRouteCollections.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}
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
                      backgroundColor: selectedItem.Status?.toUpperCase() === 'SETTLED' ? '#fdf2f4' : '#fef3c7',
                      color: selectedItem.Status?.toUpperCase() === 'SETTLED' ? '#800020' : '#b45309',
                      border: selectedItem.Status?.toUpperCase() === 'SETTLED' ? '1px solid #fbcfe8' : '1px solid #fde68a',
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

              <Group gap="xs" align="center">
                {selectedItem.Status?.toUpperCase() === 'PENDING' && (
                  <Button
                    size="xs"
                    variant={isEditMode ? 'filled' : 'outline'}
                    color={isEditMode ? 'orange' : 'burgundy'}
                    radius="sm"
                    leftSection={isEditMode ? <IconX size={14} /> : <IconPencil size={14} />}
                    onClick={() => setIsEditMode(!isEditMode)}
                  >
                    {isEditMode ? 'Done Editing' : 'Edit Settlement Details'}
                  </Button>
                )}
                <CloseButton
                  size="md"
                  onClick={() => {
                    setIsDetailOpen(false);
                    setSelectedItem(null);
                    setIsEditMode(false);
                  }}
                />
              </Group>
            </Group>

            <Stack gap="md">
              {isEditMode && (
                <Paper p="xs" radius="sm" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                  <Group gap="xs" align="center">
                    <ThemeIcon size={24} color="yellow" variant="light">
                      <IconPencil size={14} />
                    </ThemeIcon>
                    <Text size="xs" c="#b45309" fw={600}>
                      <strong>Edit Mode Active:</strong> You can adjust unsold full cylinders, empty cylinder returns, cash and bank handover amounts, and settlement notes. When satisfied, click &quot;Approve &amp; Settle Shift&quot; below to record verified counts into the godown ledger.
                    </Text>
                  </Group>
                </Paper>
              )}

              {/* Financial Reconcilation Cards (Matching Van Management) */}
              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden' }}
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
                    ₹{modalAmounts.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text size="10px" c="#800020" fw={600} mt={2}>
                    Cash: ₹{modalAmounts.netCash.toLocaleString('en-IN', { minimumFractionDigits: 0 })} • Bank: ₹{modalAmounts.netBank.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </Text>
                </Box>
              </Box>

              {/* Cash & Bank Net Settlement Breakdown Strip */}
              {isEditMode ? (
                <Paper p="sm" radius="sm" style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}>
                  <Text size="xs" fw={700} c="#800020" tt="uppercase" mb="xs">
                    Adjust Handover Cash, Digital Bank &amp; Expenses
                  </Text>
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <NumberInput
                        size="xs"
                        label="Gross Cash Handover (₹)"
                        min={0}
                        value={adjustedCash}
                        onChange={(v) => setAdjustedCash(Number(v) || 0)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <NumberInput
                        size="xs"
                        label="Digital UPI / Bank (₹)"
                        min={0}
                        value={adjustedBank}
                        onChange={(v) => setAdjustedBank(Number(v) || 0)}
                      />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 4 }}>
                      <NumberInput
                        size="xs"
                        label="Trip Expenses (₹)"
                        min={0}
                        value={adjustedExpenses}
                        onChange={(v) => setAdjustedExpenses(Number(v) || 0)}
                      />
                    </Grid.Col>
                  </Grid>
                </Paper>
              ) : null}

              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <Paper p="xs" radius="sm" style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}>
                  <Text size="10px" fw={700} c="#1e293b" tt="uppercase">
                     Net Cash Desk Handover
                  </Text>
                  <Text size="md" fw={800} c="#0f172a" mt={2}>
                    ₹{modalAmounts.netCash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text size="9.5px" c="#64748b" mt={1}>
                    Gross Cash: ₹{modalAmounts.cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })} &bull; Less Cash Exp: -₹{modalAmounts.cashExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </Paper>
                <Paper p="xs" radius="sm" style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}>
                  <Text size="10px" fw={700} c="#64748b" tt="uppercase">
                     Net Digital UPI / Bank
                  </Text>
                  <Text size="md" fw={800} c="#64748b" mt={2}>
                    ₹{modalAmounts.netBank.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text size="9.5px" c="#64748b" mt={1}>
                    Gross UPI: ₹{modalAmounts.bank.toLocaleString('en-IN', { minimumFractionDigits: 2 })} &bull; Less Bank Exp: -₹{modalAmounts.bankExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </Paper>
              </Box>

              {/* Remarks */}
              {isEditMode ? (
                <Paper p="xs" radius="sm" style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1' }}>
                  <TextInput
                    size="xs"
                    label="Manager Settlement Remarks / Gate Adjustments"
                    placeholder="Enter manager settlement notes or reason for cylinder count adjustments..."
                    value={adjustedRemarks}
                    onChange={(e) => setAdjustedRemarks(e.currentTarget.value)}
                  />
                </Paper>
              ) : (
                selectedItem.Remarks && (
                  <Paper p="xs" radius="sm" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Text size="xs" c="#334155">
                      <strong>Remarks:</strong> {selectedItem.Remarks}
                    </Text>
                  </Paper>
                )
              )}

              {/* Target Godown Selection Card */}
              {selectedItem.Status?.toUpperCase() === 'PENDING' && (
                <Paper
                  p="sm"
                  radius="sm"
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <Grid align="center">
                    <Grid.Col span={{ base: 12, sm: 7 }}>
                      <Group gap="xs">
                        <ThemeIcon
                          size={32}
                          radius="md"
                          variant="light"
                          color="gray"
                        >
                          <IconBuildingWarehouse size={18} color="#475569" />
                        </ThemeIcon>
                        <div>
                          <Text size="xs" fw={700} c="#0f172a" tt="uppercase">
                            Receiving Godown / Depot
                          </Text>
                          <Text size="11px" c="#64748b">
                            Stock will be settled into {targetGodownName}{isCrossDepot ? ' (Cross-Godown Transfer)' : ''}.
                          </Text>
                        </div>
                      </Group>
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, sm: 5 }}>
                      <Select
                        size="xs"
                        placeholder="Select Receiving Godown"
                        data={godowns.map((g: any) => ({
                          value: String(g.GodownId),
                          label: `${g.GodownName}${Number(g.GodownId) === Number(sourceGodownId) ? ' (Shift Origin)' : ''}`,
                        }))}
                        value={selectedTargetGodown}
                        onChange={(val) => {
                          if (val) {
                            setSelectedTargetGodown(val);
                            const nextUnsold: Record<number, string> = {};
                            const nextEmpty: Record<number, string> = {};
                            (selectedItem?.lines || []).forEach((l) => {
                              const pid = l.Product || l.EndRouteDriverLineId;
                              nextUnsold[pid] = val;
                              nextEmpty[pid] = val;
                            });
                            setUnsoldGodowns(nextUnsold);
                            setEmptyGodowns(nextEmpty);
                          }
                        }}
                        styles={{
                          input: {
                            fontWeight: 600,
                            fontSize: 12,
                            borderColor: '#cbd5e1',
                            color: '#0f172a',
                          },
                        }}
                      />
                    </Grid.Col>
                  </Grid>
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
                    <Badge variant="outline" radius="sm" size="sm" style={{ borderColor: '#0f172a', color: '#0f172a', fontWeight: 700 }}>
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
                          <Table.Th style={{ fontSize: 11, color: '#0f172a', fontWeight: 700, paddingLeft: 16 }}>PRODUCT</Table.Th>
                          <Table.Th style={{ fontSize: 11, color: '#0f172a', fontWeight: 700, textAlign: 'center', width: 90 }}>LOADED</Table.Th>
                          <Table.Th style={{ fontSize: 11, color: '#0f172a', fontWeight: 700, textAlign: 'center', width: 90 }}>DELIVERED</Table.Th>
                          <Table.Th style={{ fontSize: 11, color: '#0f172a', fontWeight: 700, textAlign: 'center', width: 120 }}>UNSOLD FULL</Table.Th>
                          <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 700, textAlign: 'center', width: 120 }}>EMPTY RETURNED</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {modalLines.map((line) => {
                          const pid = line.Product || line.EndRouteDriverLineId;
                          const currentFilled = isEditMode && adjustedLines[pid] !== undefined ? adjustedLines[pid].filled_qty : line.FilledQty;
                          const currentEmpty = isEditMode && adjustedLines[pid] !== undefined ? adjustedLines[pid].empty_qty : line.EmptyQty;

                          return (
                            <Table.Tr key={line.EndRouteDriverLineId}>
                              <Table.Td style={{ fontWeight: 600, fontSize: 12.5, color: '#0f172a', paddingLeft: 16 }}>{line.product_name}</Table.Td>
                              <Table.Td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{line.LoadedQty ?? '-'}</Table.Td>
                              <Table.Td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{line.DeliveredQty ?? '-'}</Table.Td>
                              <Table.Td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                                {isEditMode ? (
                                  <NumberInput
                                    size="xs"
                                    min={0}
                                    value={currentFilled}
                                    onChange={(val) => {
                                      setAdjustedLines((prev) => ({
                                        ...prev,
                                        [pid]: {
                                          filled_qty: Math.max(0, Number(val) || 0),
                                          empty_qty: prev[pid]?.empty_qty ?? (Number(line.EmptyQty) || 0),
                                        },
                                      }));
                                    }}
                                    styles={{
                                      input: {
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        width: 85,
                                        margin: '0 auto',
                                        borderColor: '#800020',
                                        color: '#0f172a',
                                      },
                                    }}
                                  />
                                ) : (
                                  line.FilledQty
                                )}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13.5, color: '#800020' }}>
                                {isEditMode ? (
                                  <NumberInput
                                    size="xs"
                                    min={0}
                                    value={currentEmpty}
                                    onChange={(val) => {
                                      setAdjustedLines((prev) => ({
                                        ...prev,
                                        [pid]: {
                                          filled_qty: prev[pid]?.filled_qty ?? (Number(line.FilledQty) || 0),
                                          empty_qty: Math.max(0, Number(val) || 0),
                                        },
                                      }));
                                    }}
                                    styles={{
                                      input: {
                                        textAlign: 'center',
                                        fontWeight: 700,
                                        width: 85,
                                        margin: '0 auto',
                                        borderColor: '#800020',
                                        color: '#800020',
                                      },
                                    }}
                                  />
                                ) : (
                                  line.EmptyQty
                                )}
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                      </Table.Tbody>
                      <Table.Tfoot style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                        <Table.Tr>
                          <Table.Td style={{ fontWeight: 800, fontSize: 12, color: '#0f172a', paddingLeft: 16 }}>TOTALS</Table.Td>
                          <Table.Td style={{ textAlign: 'center', fontWeight: 800, fontSize: 13, color: '#0f172a' }}>
                            {modalLines.reduce((s, l) => s + (l.LoadedQty ?? 0), 0)}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center', fontWeight: 800, fontSize: 13, color: '#0f172a' }}>
                            {modalLines.reduce((s, l) => s + (l.DeliveredQty ?? 0), 0)}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center', fontWeight: 800, fontSize: 13.5, color: '#0f172a' }}>
                            {modalTotalFilled}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center', fontWeight: 800, fontSize: 13.5, color: '#800020' }}>
                            {modalTotalEmpty}
                          </Table.Td>
                        </Table.Tr>
                      </Table.Tfoot>
                    </Table>
                  </Paper>
                )}
              </Stack>

              {/* Trip Sales & Invoices with Edit History */}
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Text size="xs" fw={700} c="#800020" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                    Trip Sales & Invoices ({selectedItem.sales?.length || 0})
                  </Text>
                  <Text size="xs" c="dimmed">
                    Invoices created during this route shift with edit audit logs
                  </Text>
                </Group>

                {(!selectedItem.sales || selectedItem.sales.length === 0) ? (
                  <Paper p="md" radius="sm" withBorder style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0', textAlign: 'center' }}>
                    <Text size="xs" c="dimmed">No sales recorded during this delivery shift.</Text>
                  </Paper>
                ) : (
                  <Paper radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
                    <Table verticalSpacing="xs" horizontalSpacing="sm" highlightOnHover>
                      <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                        <Table.Tr>
                          <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 700, textTransform: 'uppercase' }}>Invoice #</Table.Th>
                          <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 700, textTransform: 'uppercase' }}>Customer</Table.Th>
                          <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 700, textTransform: 'uppercase' }}>Payment Mode</Table.Th>
                          <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Amount (₹)</Table.Th>
                          <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Edit Audit</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {selectedItem.sales.map((sale) => {
                          const hasEdits = Boolean(sale.IsEdited || sale.is_edited || (sale.edit_history && sale.edit_history.length > 0));
                          const inv = String(sale.InvoiceNo || `INV-${sale.SalesId}`);
                          const isEmtrtn = inv.startsWith('EMTRTN-');
                          const isRcpt = inv.startsWith('RCPT-');

                          return (
                            <Table.Tr key={sale.SalesId}>
                              <Table.Td>
                                <Group gap={6} wrap="nowrap" align="center">
                                  <Text fw={700} size="xs" c="#0f172a" ff="monospace">
                                    {inv}
                                  </Text>
                                  {isEmtrtn && (
                                    <Badge
                                      size="xs"
                                      variant="light"
                                      styles={{
                                        root: {
                                          backgroundColor: '#fdf2f4',
                                          color: '#800020',
                                          border: '1px solid #f5c2cb',
                                          fontWeight: 700,
                                          flexShrink: 0,
                                          overflow: 'visible',
                                          whiteSpace: 'nowrap'
                                        }
                                      }}
                                    >
                                      EMPTY RETURN
                                    </Badge>
                                  )}
                                  {isRcpt && (
                                    <Badge
                                      size="xs"
                                      color="teal"
                                      variant="light"
                                      styles={{
                                        root: {
                                          backgroundColor: '#ecfdf5',
                                          color: '#047857',
                                          border: '1px solid #a7f3d0',
                                          fontWeight: 700,
                                          flexShrink: 0,
                                          overflow: 'visible',
                                          whiteSpace: 'nowrap'
                                        }
                                      }}
                                    >
                                      RECEIPT
                                    </Badge>
                                  )}
                                  {hasEdits && (
                                    <Tooltip label="Click to inspect invoice revision history" withArrow position="top">
                                      <Badge
                                        size="xs"
                                        variant="filled"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveAuditSale(sale);
                                        }}
                                        styles={{
                                          root: {
                                            cursor: 'pointer',
                                            backgroundColor: '#800020',
                                            color: '#ffffff',
                                            fontWeight: 800,
                                            fontSize: 9,
                                            letterSpacing: '0.4px',
                                            height: 18,
                                            paddingLeft: 6,
                                            paddingRight: 6,
                                            borderRadius: 4,
                                            boxShadow: '0 1px 2px rgba(128, 0, 32, 0.25)',
                                            border: 'none',
                                            verticalAlign: 'middle',
                                            userSelect: 'none',
                                          },
                                          label: {
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 3.5,
                                            overflow: 'visible',
                                            lineHeight: 1,
                                          },
                                        }}
                                      >
                                        <span>EDITED</span>
                                        <IconArrowUpRight size={10} stroke={2.8} />
                                      </Badge>
                                    </Tooltip>
                                  )}
                                </Group>
                                {(sale as any).ReceiptNo && (
                                  <Group gap={4} mt={3} wrap="nowrap" align="center">
                                    <IconReceipt size={12} color={(sale as any).ReceiptStatus === 'APPROVED' ? '#047857' : '#d97706'} />
                                    <Text size="11px" fw={600} c={(sale as any).ReceiptStatus === 'APPROVED' ? '#047857' : '#b45309'} ff="monospace">
                                      {(sale as any).ReceiptNo.replace(/\s*\(Pending\)/i, '')} • {(sale as any).ReceiptStatus === 'APPROVED' ? 'Approved' : 'Pending'}
                                    </Text>
                                  </Group>
                                )}
                              </Table.Td>
                              <Table.Td>
                                <Text fw={600} size="xs" c="#334155" lineClamp={1}>
                                  {sale.CustomerName || 'Cash Customer'}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                {sale.PaymentMethod?.toUpperCase() === 'SPLIT' ? (
                                  <Stack gap={2}>
                                    <Badge
                                      size="xs"
                                      variant="light"
                                      radius="xs"
                                      styles={{
                                        root: {
                                          backgroundColor: '#fdf2f4',
                                          color: '#800020',
                                          border: '1px solid #fbcfe8',
                                          fontWeight: 700,
                                          padding: '0 5px',
                                          height: 18,
                                          alignSelf: 'flex-start',
                                        },
                                      }}
                                    >
                                      SPLIT
                                    </Badge>
                                    {sale.Notes && (sale.Notes.includes('Cash:') || sale.Notes.includes('UPI:') || sale.Notes.includes('Bank:')) && (
                                      <Text size="10px" c="#475569" style={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                                        {sale.Notes.replace(/^Payment:\s*SPLIT\s*\(/i, '').replace(/\)\s*\|\s*Customer.*$/i, '').trim()}
                                      </Text>
                                    )}
                                  </Stack>
                                ) : (
                                  <Badge
                                    size="xs"
                                    variant="light"
                                    color={isEmtrtn ? 'gray' : (sale.PaymentMethod?.toLowerCase() === 'cash' ? 'gray' : (sale.PaymentMethod?.toLowerCase() === 'credit' ? 'red' : 'blue'))}
                                    styles={{ root: { fontWeight: 600 } }}
                                  >
                                    {isEmtrtn ? 'N/A' : (sale.PaymentMethod || 'Cash')}
                                  </Badge>
                                )}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                                {isRcpt ? (
                                  <>
                                    <span style={{ color: '#047857' }}>
                                      ₹{Number(sale.PaidAmount || sale.GrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <div style={{ fontSize: 10, color: '#047857', fontWeight: 700 }}>
                                      COLLECTED
                                    </div>
                                  </>
                                ) : isEmtrtn ? (
                                  <>
                                    <span style={{ color: '#64748b' }}>₹0.00</span>
                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>RETURN ONLY</div>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      ₹{Number(sale.GrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    {Number(sale.PaidAmount || 0) > 0 && Number(sale.PaidAmount) !== Number(sale.GrandTotal) ? (
                                      <div style={{ fontSize: 10.5, color: '#047857', fontWeight: 600 }}>
                                        Collected: ₹{Number(sale.PaidAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </div>
                                    ) : Number(sale.PaidAmount || 0) > 0 ? (
                                      <div style={{ fontSize: 10, color: '#047857', fontWeight: 600 }}>
                                        PAID IN FULL
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 600 }}>
                                        UNPAID (CREDIT)
                                      </div>
                                    )}
                                  </>
                                )}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'center' }}>
                                {hasEdits ? (
                                  <Tooltip label="Click to inspect invoice revision history" withArrow position="top">
                                    <Badge
                                      size="xs"
                                      variant="filled"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveAuditSale(sale);
                                      }}
                                      styles={{
                                        root: {
                                          cursor: 'pointer',
                                          backgroundColor: '#800020',
                                          color: '#ffffff',
                                          fontWeight: 800,
                                          fontSize: 9,
                                          letterSpacing: '0.4px',
                                          height: 18,
                                          paddingLeft: 6,
                                          paddingRight: 6,
                                          borderRadius: 4,
                                          boxShadow: '0 1px 2px rgba(128, 0, 32, 0.25)',
                                          border: 'none',
                                          verticalAlign: 'middle',
                                          userSelect: 'none',
                                        },
                                        label: {
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 3.5,
                                          overflow: 'visible',
                                          lineHeight: 1,
                                        },
                                      }}
                                    >
                                      <span>EDITED</span>
                                      <IconArrowUpRight size={10} stroke={2.8} />
                                    </Badge>
                                  </Tooltip>
                                ) : (
                                  <Badge size="xs" variant="subtle" color="gray" styles={{ root: { color: '#64748b' } }}>
                                    Original
                                  </Badge>
                                )}
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                      </Table.Tbody>
                    </Table>
                  </Paper>
                )}
              </Stack>

              {/* Action Buttons */}
              <Group justify="flex-end" gap="sm">
                <Button
                  variant="outline"
                  radius="sm"
                  size="sm"
                  leftSection={<IconPrinter size={15} />}
                  loading={printingId === selectedItem.EndRouteDriverId}
                  onClick={() => handlePrintTripSheet(selectedItem)}
                  style={{ borderColor: '#800020', color: '#800020', fontWeight: 600 }}
                >
                  Print Trip Sheet
                </Button>
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
                    Approve &amp; Settle Shift
                  </Button>
                ) : (
                  <Badge size="lg" radius="sm" variant="light" color="burgundy" style={{ fontWeight: 700, borderColor: '#fbcfe8' }}>
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
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
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
                    fontSize: 11 } }}
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
                        transition: 'color 150ms ease' }}
                    >
                      Pending ({pendingCount})
                    </span>
                  ),
                  value: 'pending' },
                {
                  label: (
                    <span
                      style={{
                        color: statusFilter === 'settled' ? '#ffffff' : '#64748b',
                        fontWeight: statusFilter === 'settled' ? 700 : 600,
                        fontSize: 12,
                        display: 'inline-block',
                        transition: 'color 150ms ease' }}
                    >
                      Settled ({settledCount})
                    </span>
                  ),
                  value: 'settled' },
                {
                  label: (
                    <span
                      style={{
                        color: statusFilter === 'all' ? '#ffffff' : '#64748b',
                        fontWeight: statusFilter === 'all' ? 700 : 600,
                        fontSize: 12,
                        display: 'inline-block',
                        transition: 'color 150ms ease' }}
                    >
                      All ({dateFilteredData.length})
                    </span>
                  ),
                  value: 'all' },
              ]}
              radius="xl"
              transitionDuration={250}
              transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
              styles={{
                root: {
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  padding: 3,
                  borderRadius: 9999,
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                },
                control: {
                  border: 'none',
                },
                indicator: {
                  backgroundColor: '#800020',
                  boxShadow: '0 2px 4px rgba(128, 0, 32, 0.25)',
                  borderRadius: 9999,
                  border: 'none',
                  outline: 'none',
                },
                label: {
                  padding: '5px 14px',
                  fontWeight: 600,
                  fontSize: 12,
                  transition: 'color 150ms ease, font-weight 150ms ease',
                } }}
            />

            <Select
              size="xs"
              radius="xl"
              value={sortBy}
              onChange={(val) => setSortBy(val || 'newest')}
              data={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'route_asc', label: 'Route (A - Z)' },
                { value: 'driver_asc', label: 'Driver (A - Z)' },
              ]}
              style={{ width: 140 }}
              styles={{
                input: {
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  fontWeight: 600,
                  fontSize: 12,
                },
              }}
            />

            <TextInput
              placeholder="Search driver, vehicle, route..."
              leftSection={<IconSearch size={14} color="#94a3b8" />}
              size="xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              style={{ width: 230 }}
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
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" p="md">
            {filteredData.map((item) => {
              const amounts = parseSettlementAmounts(item);
              const isSettled = item.Status?.toUpperCase() === 'SETTLED';

              return (
                <Paper
                  key={item.EndRouteDriverId}
                  p="md"
                  radius="lg"
                  withBorder
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onClick={() => handleOpenDetail(item)}
                >
                  <Group justify="space-between" align="flex-start" mb="xs">
                    <div>
                      <Group gap={8} align="center">
                        <Text fw={800} style={{ color: '#800020', fontSize: 15, letterSpacing: '-0.01em' }}>
                          ERD-{item.EndRouteDriverId}
                        </Text>
                        <Badge
                          size="xs"
                          radius="sm"
                          variant="light"
                          color={isSettled ? 'burgundy' : 'orange'}
                          styles={{
                            root: {
                              backgroundColor: isSettled ? '#fdf2f4' : '#fef3c7',
                              color: isSettled ? '#800020' : '#b45309',
                              border: isSettled ? '1px solid #fbcfe8' : '1px solid #fde68a',
                              fontWeight: 700,
                            },
                          }}
                        >
                          {isSettled ? 'SETTLED' : 'PENDING'}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed" mt={2}>
                        {formatDateDDMMYY(item.ShiftDate)}
                      </Text>
                    </div>
                  </Group>

                  <Divider my="xs" style={{ borderColor: '#f1f5f9' }} />

                  {/* Vehicle & Driver */}
                  <Box
                    p="xs"
                    mb="xs"
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: 8,
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <Group gap="xs" wrap="nowrap" align="center">
                      <Box
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          backgroundColor: '#fdf2f4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <IconTruck size={18} color="#800020" />
                      </Box>
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <Text fw={700} size="sm" c="#0f172a" truncate>
                          {item.vehicle_number || 'Van'}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {item.route_name || 'Route'} &bull; Driver: <Text component="span" fw={600} c="#0f172a">{item.driver_name || 'Driver'}</Text>
                        </Text>
                        <Text size="11px" c="#64748b" mt={2} truncate>
                          Depot: <Text component="span" fw={700} style={{ color: '#800020' }}>{item.source_godown_name || (item as any).godown_name || 'Main Godown'}</Text>
                          {(item as any).created_by_name && (
                            <> &bull; By: <Text component="span" fw={600} c="#334155">{(item as any).created_by_name}</Text></>
                          )}
                        </Text>
                      </div>
                    </Group>
                  </Box>

                  {/* Balance (Unsold Full & Empties) */}
                  <Group justify="space-between" align="center" mb="xs">
                    <Text size="xs" c="#64748b" fw={600}>
                      Balance:
                    </Text>
                    <Group gap={6}>
                      <Badge
                        size="sm"
                        radius="sm"
                        variant="filled"
                        style={{ backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 700 }}
                      >
                        {item.total_filled || 0} Filled
                      </Badge>
                      <Badge
                        size="sm"
                        radius="sm"
                        variant="filled"
                        style={{ backgroundColor: '#fdf2f4', color: '#800020', fontWeight: 700 }}
                      >
                        {item.total_empty || 0} Empty
                      </Badge>
                    </Group>
                  </Group>

                  {/* Total Collected */}
                  <Box
                    p="xs"
                    mb="xs"
                    style={{
                      backgroundColor: '#fdf2f4',
                      borderRadius: 8,
                      border: '1px solid #fae8eb',
                    }}
                  >
                    <Group justify="space-between" align="baseline">
                      <div>
                        <Text size="xs" fw={700} c="#800020" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                          Total Collected
                        </Text>
                        <Group gap={6} mt={2} align="center">
                          <Text size="11px" fw={600} c="#475569">
                            Cash: ₹{amounts.cash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </Text>
                          <Text size="11px" c="dimmed">&bull;</Text>
                          <Text size="11px" fw={600} style={{ color: '#800020' }}>
                            Bank: ₹{amounts.bank.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </Text>
                        </Group>
                      </div>
                      <Text fw={800} style={{ color: '#800020', fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>
                        ₹{amounts.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </Group>
                  </Box>

                  {/* Actions */}
                  <Divider my="xs" style={{ borderColor: '#f1f5f9' }} />
                  <Group justify="flex-end" gap={6} onClick={(e) => e.stopPropagation()}>
                    <Tooltip label="Print Route Trip Sheet" withArrow position="top">
                      <ActionIcon
                        variant="subtle"
                        color="burgundy"
                        size="md"
                        radius="md"
                        style={{
                          color: '#800020',
                        }}
                        loading={printingId === item.EndRouteDriverId}
                        onClick={(e) => handlePrintTripSheet(item, e)}
                      >
                        <IconPrinter size={17} color="#800020" />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="View Settlement Details" withArrow position="top">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="md"
                        radius="md"
                        onClick={() => handleOpenDetail(item)}
                      >
                        <IconEye size={17} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete Settlement Record" withArrow position="top">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="md"
                        radius="md"
                        loading={deleteMutation.isPending && deleteConfirmItem?.EndRouteDriverId === item.EndRouteDriverId}
                        onClick={() => setDeleteConfirmItem(item)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Paper>
              );
            })}
          </SimpleGrid>
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
              onSettled: () => setDeleteConfirmItem(null) });
          }
        }}
      />

      {/* ── Invoice Edit History Audit Modal ── */}
      <Modal
        opened={!!activeAuditSale}
        onClose={() => setActiveAuditSale(null)}
        title={
          <Group gap="xs">
            <Box
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: '#fdf2f4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #f5c2cb',
              }}
            >
              <IconHistory size={18} color="#800020" />
            </Box>
            <div>
              <Text fw={800} style={{ color: '#800020', fontSize: 16 }}>
                Invoice Revision History
              </Text>
              <Text size="xs" c="dimmed">
                {activeAuditSale?.InvoiceNo || `INV-${activeAuditSale?.SalesId}`} &bull; {activeAuditSale?.CustomerName || 'Walk-in Customer'}
              </Text>
            </div>
          </Group>
        }
        size="96%"
        radius="lg"
        padding="xl"
        centered
        styles={{
          content: {
            maxWidth: '1060px',
            width: '92vw',
          },
          inner: {
            padding: '12px',
          },
        }}
      >
        {activeAuditSale && (
          <Stack gap="md">
            {/* Summary Information Card */}
            <Box p="md" style={{ backgroundColor: '#fdf2f4', borderRadius: 10, border: '1px solid #f5c2cb' }}>
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    CUSTOMER
                  </Text>
                  <Text fw={800} size="xs" c="#0f172a" truncate>
                    {activeAuditSale.CustomerName || 'Walk-in Customer'}
                  </Text>
                </div>
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    DELIVERED / EMPTY
                  </Text>
                  <Text fw={800} size="xs" c="#0f172a">
                    {activeAuditSale.TotalDeliveredQty ?? activeAuditSale.delivered_qty ?? 0} Cyl / {activeAuditSale.TotalEmptyQty ?? activeAuditSale.empty_returned ?? 0} Ret
                  </Text>
                </div>
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    INVOICE TOTAL
                  </Text>
                  <Text fw={800} size="xs" c="#0f172a">
                    ₹{Number(activeAuditSale.GrandTotal ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </div>
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    PAID / COLLECTED
                  </Text>
                  <Text fw={800} size="xs" style={{ color: '#800020' }}>
                    ₹{Number(activeAuditSale.PaidAmount ?? activeAuditSale.GrandTotal ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </div>
              </SimpleGrid>
            </Box>

            {/* Note / Reason outside the tab */}
            {activeAuditSale.EditReason && (
              <Text size="xs" c="#475569" px={4} style={{ marginTop: -4 }}>
                <Text component="span" fw={700} style={{ color: '#800020' }}>Latest Note / Reason:</Text>{' '}
                {activeAuditSale.EditReason}
              </Text>
            )}

            {(!activeAuditSale.edit_history || activeAuditSale.edit_history.length === 0) ? (
              <Box p="lg" style={{ textAlign: 'center', backgroundColor: '#fdf2f4', borderRadius: 10, border: '1px solid #f5c2cb' }}>
                <Text size="sm" style={{ color: '#800020', fontWeight: 700 }}>
                  Invoice record was marked as modified
                </Text>
                {activeAuditSale.EditedBy && (
                  <Text size="xs" c="dimmed" mt={4}>
                    Modified by: {activeAuditSale.EditedBy} {activeAuditSale.EditedAt ? `on ${formatDateDDMMYY(activeAuditSale.EditedAt)}` : ''}
                  </Text>
                )}
                {activeAuditSale.EditReason && (
                  <Text size="xs" fw={600} style={{ color: '#800020' }} mt={6}>
                    &ldquo;{activeAuditSale.EditReason}&rdquo;
                  </Text>
                )}
              </Box>
            ) : (
              <Table.ScrollContainer minWidth={600} style={{ width: '100%' }}>
                <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover withTableBorder style={{ borderRadius: 8, overflow: 'hidden', width: '100%' }}>
                  <Table.Thead style={{ backgroundColor: '#fdf2f4' }}>
                    <Table.Tr>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 160, whiteSpace: 'nowrap' }}>TIMESTAMP</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 180, whiteSpace: 'nowrap' }}>MODIFIED BY</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 210, whiteSpace: 'nowrap' }}>AMOUNT CHANGE</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 150, whiteSpace: 'nowrap' }}>PAYMENT MODE</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px' }}>REASON / NOTES</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {activeAuditSale.edit_history.map((eh: any, idx: number) => {
                      const editDate = eh.EditedAt || eh.edited_at;
                      const editor = eh.EditedBy || eh.edited_by || 'Driver / Admin';
                      const oldTotal = eh.OldGrandTotal ?? eh.old_grand_total ?? 0;
                      const newTotal = eh.NewGrandTotal ?? eh.new_grand_total ?? 0;
                      const oldMode = eh.OldPaymentMethod || eh.old_payment_method || '';
                      const newMode = eh.NewPaymentMethod || eh.new_payment_method || '';
                      const noteText = eh.Notes || eh.notes || 'Invoice details updated';

                      return (
                        <Table.Tr key={eh.EditId || eh.edit_id || idx}>
                          <Table.Td style={{ fontSize: 12, color: '#475569', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                            {editDate ? new Date(editDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </Table.Td>
                          <Table.Td style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                            {editor}
                          </Table.Td>
                          <Table.Td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                            <Group gap={6} wrap="nowrap">
                              <Text size="xs" td="line-through" c="dimmed">
                                ₹{Number(oldTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                              <IconArrowRight size={13} color="#800020" />
                              <Text size="sm" fw={800} style={{ color: '#800020' }}>
                                ₹{Number(newTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                            {oldMode && oldMode !== newMode ? (
                              <Group gap={4} wrap="nowrap">
                                <Text size="xs" c="dimmed">{oldMode}</Text>
                                <IconArrowRight size={12} color="#800020" />
                                <Text size="xs" fw={700} style={{ color: '#800020' }}>{newMode}</Text>
                              </Group>
                            ) : (
                              <Text size="xs" fw={600} c="#0f172a">{newMode || 'Cash'}</Text>
                            )}
                          </Table.Td>
                          <Table.Td style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>
                            {noteText}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}

            <Group justify="space-between" mt="xs">
              <Button
                variant="subtle"
                color="burgundy"
                size="xs"
                radius="md"
                leftSection={<IconReceipt size={14} />}
                onClick={() => {
                  const billNo = activeAuditSale.InvoiceNo || `INV-${activeAuditSale.SalesId}`;
                  const cleanTicket = String(billNo).replace(/^#/, '');
                  const baseUrl = apiClient.defaults.baseURL?.replace(/\/api\/v1\/?$/, '') || '';
                  window.open(`${baseUrl}/api/v1/sales/invoice-pdf/?ticket_id=${encodeURIComponent(cleanTicket)}&_t=${Date.now()}`, '_blank');
                }}
                styles={{
                  root: {
                    color: '#800020',
                    fontWeight: 600,
                  },
                }}
              >
                View Invoice PDF
              </Button>
              <Button
                variant="outline"
                color="burgundy"
                size="xs"
                radius="md"
                onClick={() => setActiveAuditSale(null)}
                styles={{
                  root: {
                    borderColor: '#800020',
                    color: '#800020',
                    fontWeight: 700,
                  },
                }}
              >
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

    </Stack>
  );
};
export default EndAllocationsPage;

