import React, { useState, useMemo, useEffect } from 'react';
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
  Select,
  CloseButton,
  ActionIcon,
  Modal,
  Divider,
  SegmentedControl,
  Tooltip,
  Loader,
  Center,
  Collapse,
  Transition } from '@mantine/core';
import {
  IconReceipt,
  IconSearch,
  IconRefresh,
  IconTruck,
  IconCheck,
  IconEye,
  IconPrinter,
  IconClock,
  IconPlus,
  IconArrowLeft,
  IconTrash,
  IconGasStation } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { DateInputDDMMYY, formatDateDDMMYY } from '../components/DateInputDDMMYY';

interface EmptyBreakdownItem {
  product: string;
  qty: number;
}

interface ReceiptNoteItem {
  id: string;
  receiptNoteId: number;
  deliveryNoteId?: number;
  noteNumber: string;
  date: string;
  time: string;
  vehicleNumber: string;
  routeName: string;
  driverName: string;
  deliveryNoteRef: string;
  loadedTotal?: number;
  deliveredTotal?: number;
  filledCylindersTotal?: number;
  filledBreakdown?: EmptyBreakdownItem[];
  emptyCylindersTotal: number;
  emptyBreakdown: EmptyBreakdownItem[];
  lines?: {
    product_name: string;
    LoadedQty?: number;
    DeliveredQty?: number;
    FilledQty?: number;
    EmptyQty?: number;
  }[];
  grossCollected?: number;
  cashCollected: number;
  bankCollected?: number;
  tripExpenses?: number;
  netBalance?: number;
  netCash?: number;
  netBank?: number;
  digitalCollected: number;
  godownId?: number;
  godownName?: string;
  sourceGodownId?: number;
  sourceGodownName?: string;
  canVerify?: boolean;
  status: 'pending' | 'settled';
  notes?: string;
}

export const ReceiptNotesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'settled' | 'all'>('pending');
  type DateFilterType = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedNote, setSelectedNote] = useState<ReceiptNoteItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteNote, setDeleteNote] = useState<ReceiptNoteItem | null>(null);
  const user = useAuthStore((s) => s.user);
  const isAdmin = !user?.role || user?.role.toLowerCase().includes('admin') || user?.role.toLowerCase().includes('manager');
  const defaultGodown = user?.GodownId && !isAdmin ? String(user.GodownId) : '1';

  const [selectedReceivingGodown, setSelectedReceivingGodown] = useState<string>(defaultGodown);

  useEffect(() => {
    if (selectedNote?.godownId) {
      setSelectedReceivingGodown(String(selectedNote.godownId));
    }
  }, [selectedNote]);

  // Fetch Godowns for receiving warehouse selection
  const { data: godowns = [] } = useQuery<any[]>({
    queryKey: ['godowns'],
    queryFn: async () => {
      const res = await apiClient.get('/godowns/');
      return Array.isArray(res.data) ? res.data : [];
    } });

  // Fetch Creditor Suppliers (Gas Suppliers)
  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ['supplier-ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/suppliers/?only_creditors=true');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    } });

  // Multi-Mode / Movement Purpose:
  // 1. SUPPLIER_REFILL: Outward empty cylinders sent to suppliers for refilling
  // 2. VAN_TO_GODOWN: Van shift-end returns to godown (e.g. cross-depot unloads)
  type ReceiptMode = 'SUPPLIER_REFILL' | 'VAN_TO_GODOWN';
  const [createMode, setCreateMode] = useState<ReceiptMode>('SUPPLIER_REFILL');
  const [createSourceType, setCreateSourceType] = useState<'VAN' | 'GODOWN'>('GODOWN');
  const [createSourceId, setCreateSourceId] = useState<string | null>(null);
  const [createDestType, setCreateDestType] = useState<'GODOWN' | 'SUPPLIER'>('SUPPLIER');
  const [createDestId, setCreateDestId] = useState<string | null>(null);

  // Form State for "Add Receipt Note"
  const [createAllocation, setCreateAllocation] = useState<string | null>(null);
  const [createDate, setCreateDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [createRemarks, setCreateRemarks] = useState('');

  // Fetch Active Allocations (vans, drivers, routes)
  const { data: allocations = [] } = useQuery<any[]>({
    queryKey: ['allocations'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/allocations/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    } });

  // Fetch Available Cylinder Products (all products fallback)
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/products/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    } });

  // Fetch Products allocated to the currently selected Van / Route
  const { data: allocatedProducts = [], isFetching: isFetchingAllocated } = useQuery<any[]>({
    queryKey: ['allocated-products', createAllocation],
    queryFn: async () => {
      if (!createAllocation) return [];
      const res = await apiClient.get<any>(`/receipt-notes/allocated-products/?allocation_id=${createAllocation}`);
      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw?.results || []);
    },
    enabled: Boolean(createAllocation) });

  // Fetch Available Empty Cylinders in Godown for Supplier Refill Outward
  const { data: godownEmptyStock = [], isFetching: isFetchingGodownEmpty } = useQuery<any[]>({
    queryKey: ['godown-empty-stock', createSourceId],
    queryFn: async () => {
      const gId = createSourceId || '';
      const res = await apiClient.get<any>(`/receipt-notes/godown-empty-stock/?godown_id=${gId}`);
      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw?.results || []);
    },
    enabled: isCreateModalOpen && createMode === 'SUPPLIER_REFILL'
  });

  // Helper to determine if product is a gas cylinder
  const isCylinderProduct = (p: any) => {
    if (typeof p.is_cylinder === 'boolean') {
      return p.is_cylinder;
    }
    const name = (p.ProductName || p.name || p.product_name || '').toLowerCase();
    const cat = (p.CategoryName || p.category_name || (p.Category && p.Category.CategoryName) || '').toLowerCase();

    // Explicit non-cylinder checks
    if (
      name.includes('stove') ||
      name.includes('burner') ||
      name.includes('regulator') ||
      name.includes('pipe') ||
      name.includes('lighter') ||
      name.includes('hose') ||
      name.includes('trolley') ||
      cat.includes('stove') ||
      cat.includes('accessory') ||
      cat.includes('accessories')
    ) {
      return false;
    }
    return cat.includes('cylinder') || name.includes('cylinder') || name.includes('kg') || name.includes('lpg');
  };

  const allocationOptions = useMemo(() => {
    const list = Array.isArray(allocations) ? allocations : (allocations as any)?.results || [];
    return list
      .filter((a: any) => a.RouteVehicleDriverId !== 1 && (a.IsActive ?? true))
      .map((a: any) => {
        const vNum = a.VehicleNumber || a.vehicle_number || (a.Vehicle && a.Vehicle.VehicleNumber) || 'Van';
        const dName = a.DriverName || a.driver_name || (a.Driver && a.Driver.DriverName) || 'Driver';
        const rName = a.RouteName || a.route_name || (a.Route && a.Route.RouteName) || 'Route';
        return {
          value: String(a.RouteVehicleDriverId),
          label: `${vNum} • ${dName} (${rName})`.trim() };
      });
  }, [allocations]);

  const godownOptions = useMemo(() => {
    return godowns.map((g: any) => ({
      value: String(g.GodownId),
      label: g.GodownName.includes('(Central)') || !g.IsCentral ? g.GodownName : `${g.GodownName} (Central Godown)`,
    }));
  }, [godowns]);

  const supplierOptions = useMemo(() => {
    return (suppliers || [])
      .filter((s: any) => {
        const gid = Number(s.group_id ?? s.Group ?? 0);
        const gName = (s.group_name || s.GroupName || '').toLowerCase();
        const name = (s.LedgerName || s.name || '').toLowerCase();
        // Strictly exclude Cash and Bank accounts
        if (gid === 16 || gid === 17) return false;
        if (gName.includes('cash') || gName.includes('bank')) return false;
        if (name === 'cash' || name.includes('bank') || name === 'sbi') return false;
        return true;
      })
      .map((s: any) => ({
        value: String(s.LedgerId || s.id),
        label: s.LedgerName || s.name,
      }));
  }, [suppliers]);

  // Unified Dropdown options with all allocated products (or all products fallback)
  const productOptions = useMemo(() => {
    if (createMode === 'SUPPLIER_REFILL') {
      const withStock = (godownEmptyStock || []).filter((p: any) => (p.empty_qty ?? 0) > 0);
      const listToUse = withStock.length > 0 ? withStock : (godownEmptyStock || []);
      return listToUse.map((p: any) => ({
        value: String(p.product_id),
        label: p.product_name,
        product_name: p.product_name,
        empty_qty: p.empty_qty,
        is_cylinder: true,
      }));
    }

    const sourceList = (createAllocation && allocatedProducts.length > 0)
      ? allocatedProducts.map((ap: any) => ({
          ProductId: ap.product_id || ap.ProductId,
          ProductName: ap.product_name || ap.ProductName,
          is_cylinder: ap.is_cylinder ?? isCylinderProduct(ap) }))
      : (Array.isArray(products) ? products : (products as any)?.results || []).map((p: any) => ({
          ProductId: p.ProductId || p.id,
          ProductName: p.ProductName || p.name,
          is_cylinder: isCylinderProduct(p) }));

    return sourceList.map((p: any) => ({
      value: String(p.ProductId),
      label: p.ProductName || `Product ${p.ProductId}`,
      product_name: p.ProductName,
      empty_qty: 0,
      is_cylinder: Boolean(p.is_cylinder) }));
  }, [products, allocatedProducts, createAllocation, createMode, godownEmptyStock]);

  const [createLines, setCreateLines] = useState<
    Array<{ productId: number; productName?: string; filledQty: number | string; emptyQty: number | string; isCylinder?: boolean }>
  >([{ productId: 0, filledQty: '', emptyQty: '', isCylinder: true }]);

  const handleOpenCreateModal = () => {
    setCreateMode('SUPPLIER_REFILL');
    setCreateSourceType('GODOWN');
    const defaultG = godowns.find((g: any) => g.IsCentral) || godowns[0];
    setCreateSourceId(defaultG ? String(defaultG.GodownId) : null);
    setCreateAllocation(null);
    setCreateDestType('SUPPLIER');
    setCreateDestId(suppliers[0] ? String(suppliers[0].LedgerId || suppliers[0].id) : null);
    setCreateDate(new Date().toISOString().split('T')[0]);
    setCreateRemarks('');
    setCreateLines([{ productId: 0, filledQty: '', emptyQty: '', isCylinder: true }]);
    setIsCreateModalOpen(true);
  };

  const handleModeChange = (val: string) => {
    const m = val as ReceiptMode;
    setCreateMode(m);
    if (m === 'SUPPLIER_REFILL') {
      setCreateSourceType('GODOWN');
      const defaultG = godowns.find((g: any) => g.IsCentral) || godowns[0];
      setCreateSourceId(defaultG ? String(defaultG.GodownId) : null);
      setCreateAllocation(null);
      setCreateDestType('SUPPLIER');
      setCreateDestId(suppliers[0] ? String(suppliers[0].LedgerId || suppliers[0].id) : null);
    } else {
      setCreateSourceType('VAN');
      setCreateSourceId(null);
      setCreateAllocation(null);
      setCreateDestType('GODOWN');
      const defaultG = godowns.find((g: any) => g.IsCentral) || godowns[0];
      setCreateDestId(defaultG ? String(defaultG.GodownId) : null);
    }
  };

  const handleAllocationChange = (val: string | null) => {
    setCreateAllocation(val);
    setCreateSourceId(val);
    setCreateLines([{ productId: 0, filledQty: '', emptyQty: '', isCylinder: true }]);
  };

  const handleAddLine = () => {
    setCreateLines((prev) => [...prev, { productId: 0, filledQty: '', emptyQty: '', isCylinder: true }]);
  };

  const handleRemoveLine = (index: number) => {
    setCreateLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineProductChange = (index: number, val: string | null) => {
    const pId = val ? Number(val) : 0;
    const pOpt = productOptions.find((p: any) => Number(p.value) === pId);
    setCreateLines((prev) =>
      prev.map((l, i) => (i === index ? {
        ...l,
        productId: pId,
        productName: (pOpt as any)?.product_name || pOpt?.label,
        isCylinder: pOpt?.is_cylinder ?? true,
        emptyQty: l.emptyQty === 0 || l.emptyQty === '0' ? '' : (l.emptyQty ?? ''),
      } : l))
    );
  };

  const handleLineFilledQtyChange = (index: number, val: number | string) => {
    const qty = typeof val === 'number' ? val : val === '' ? '' : Number(val) || 0;
    setCreateLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, filledQty: qty } : l))
    );
  };

  const handleLineEmptyQtyChange = (index: number, val: number | string) => {
    const qty = typeof val === 'number' ? val : val === '' ? '' : Number(val) || 0;
    setCreateLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, emptyQty: qty } : l))
    );
  };

  // 1. Fetch Real Receipt Notes from Backend (populated via mobile driver shift ends)
  const {
    data: receiptNotes = [],
    isLoading,
    isRefetching,
    refetch } = useQuery<ReceiptNoteItem[]>({
    queryKey: ['receipt-notes', user?.id, user?.GodownId],
    queryFn: async () => {
      const res = await apiClient.get<ReceiptNoteItem[]>('/receipt-notes/');
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchInterval: 10000 });

  // Mutation: Verify and Settle Pending Receipt Note into Selected Godown
  const verifyNoteMutation = useMutation({
    mutationFn: async (payload: number | { noteId: number; godownId?: number }) => {
      const noteId = typeof payload === 'number' ? payload : payload.noteId;
      const godownId = typeof payload === 'object' ? payload.godownId : undefined;
      const res = await apiClient.post('/receipt-notes/process_receipt_note/', {
        receipt_note_id: noteId,
        godown_id: godownId });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receipt-notes'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
      queryClient.invalidateQueries({ queryKey: ['stock-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['godown-stock'] });
      queryClient.invalidateQueries({ queryKey: ['van-management'] });
      setIsDetailOpen(false);
      setSelectedNote(null);
      notifications.show({
        title: 'Receipt Note Verified',
        message: data.message || 'Returned cylinders verified and accepted into godown.',
        color: 'burgundy' });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Verification Failed',
        message: err.response?.data?.message || err.message || 'Could not verify receipt note.',
        color: 'red' });
    } });

  // Mutation: Create Receipt Note manually (Van Return, Supplier Refill Challan, or Godown Transfer)
  const createReceiptNoteMutation = useMutation({
    mutationFn: async (autoSettle: boolean) => {
      if (createMode === 'VAN_TO_GODOWN' && !createSourceId) {
        throw new Error('Please select an active vehicle / route allocation.');
      }
      if (createMode === 'VAN_TO_GODOWN' && !createDestId) {
        throw new Error('Please select a receiving godown.');
      }
      if (createMode === 'SUPPLIER_REFILL' && !createSourceId) {
        throw new Error('Please select a dispatching godown.');
      }
      if (createMode === 'SUPPLIER_REFILL' && !createDestId) {
        throw new Error('Please select a supplier.');
      }

      const items = createLines
        .filter((l) => l.productId > 0 && ((Number(l.filledQty) || 0) > 0 || (Number(l.emptyQty) || 0) > 0))
        .map((l) => ({
          product_id: l.productId,
          filled_qty: Number(l.filledQty) || 0,
          empty_qty: Number(l.emptyQty) || 0 }));

      if (items.length === 0) {
        throw new Error('Please enter at least one item quantity.');
      }

      const payload = {
        source_type: createSourceType,
        source_id: createSourceId ? Number(createSourceId) : (createAllocation ? Number(createAllocation) : 1),
        destination_type: createDestType,
        destination_id: createDestId ? Number(createDestId) : 1,
        movement_purpose: createMode === 'SUPPLIER_REFILL' ? 'SUPPLIER_REFILL' : 'RETURN',
        allocation_id: createSourceType === 'VAN' && createSourceId ? Number(createSourceId) : (createAllocation ? Number(createAllocation) : 1),
        delivery_date: createDate,
        items,
        cash_collected: 0,
        digital_collected: 0,
        remarks: createRemarks,
        auto_settle: autoSettle };
      const res = await apiClient.post('/receipt-notes/', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receipt-notes'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
      queryClient.invalidateQueries({ queryKey: ['stock-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['godown-stock'] });
      queryClient.invalidateQueries({ queryKey: ['van-management'] });
      setIsCreateModalOpen(false);
      const noteId = data.receiptNoteId || data.id;
      if (noteId && createMode === 'SUPPLIER_REFILL') {
        window.open(`${apiClient.defaults.baseURL}/receipt-notes/${noteId}/pdf/?_t=${Date.now()}`, '_blank');
      }
      notifications.show({
        title: createMode === 'SUPPLIER_REFILL' ? 'Refill Challan Created' : 'Receipt Note Created',
        message: data.message || 'Challan / Receipt note created successfully.',
        color: 'burgundy' });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Failed to Create Receipt Note',
        message: err.response?.data?.detail || err.response?.data?.message || err.message || 'Could not create receipt note.',
        color: 'red' });
    } });

  // Mutation: Delete Receipt Note
  const deleteReceiptNoteMutation = useMutation({
    mutationFn: async (id: number | string) => {
      await apiClient.delete(`/receipt-notes/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt-notes'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
      queryClient.invalidateQueries({ queryKey: ['stock-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['godown-stock'] });
      queryClient.invalidateQueries({ queryKey: ['van-management'] });
      setDeleteNote(null);
      notifications.show({
        title: 'Receipt Note Deleted',
        message: 'Receipt note and stock movements removed.',
        color: 'burgundy' });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Delete Failed',
        message: err.response?.data?.detail || err.message || 'Could not delete receipt note.',
        color: 'red' });
    } });

  const isDateInFilter = (dateStr: string) => {
    if (!dateStr || dateFilter === 'all') return true;
    const d = dateStr.slice(0, 10);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (dateFilter === 'today') {
      return d === todayStr;
    }
    if (dateFilter === 'yesterday') {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      return d === y.toISOString().split('T')[0];
    }
    if (dateFilter === 'this_week') {
      const day = today.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      const mondayStr = monday.toISOString().split('T')[0];
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

  // Filtered Notes: Settled first, then pending, then remaining
  const filteredNotes = useMemo(() => {
    const list = receiptNotes.filter((n) => {
      // 1. Date filter
      if (!isDateInFilter(n.date)) return false;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (n.noteNumber || '').toLowerCase().includes(q) ||
        (n.vehicleNumber || '').toLowerCase().includes(q) ||
        (n.driverName || '').toLowerCase().includes(q) ||
        (n.routeName || '').toLowerCase().includes(q) ||
        (n.deliveryNoteRef || '').toLowerCase().includes(q);

      const matchStatus = statusFilter === 'all' || n.status === statusFilter;

      return matchSearch && matchStatus;
    });

    return [...list].sort((a, b) => {
      if (a.status === 'settled' && b.status !== 'settled') return -1;
      if (a.status !== 'settled' && b.status === 'settled') return 1;
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      const bId = b.receiptNoteId || b.deliveryNoteId || Number(b.id) || 0;
      const aId = a.receiptNoteId || a.deliveryNoteId || Number(a.id) || 0;
      return bId - aId;
    });
  }, [receiptNotes, searchQuery, statusFilter, dateFilter, customStartDate, customEndDate]);

  // Real KPI Metrics derived from live backend data
  const settledCount = receiptNotes.filter((n) => n.status === 'settled').length;
  const pendingCount = receiptNotes.filter((n) => n.status === 'pending').length;

  return (
    <Stack gap="md">
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
            Receipt Notes
          </Title>
          <Text size="sm" c="dimmed">
            Driver route returns, empty cylinder receipts & settlement verification into {user?.godown_name || 'Warehouse Depot'}
          </Text>
        </div>

        <Group gap="sm" align="center">
          <Transition mounted={!isCreateModalOpen} transition="fade" duration={200}>
            {(btnStyles) => (
              <Group gap="sm" align="center" style={btnStyles}>
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

                <Button
                  color="burgundy"
                  size="sm"
                  radius={10}
                  leftSection={<IconPlus size={16} />}
                  onClick={handleOpenCreateModal}
                  style={{ backgroundColor: '#800020', color: '#ffffff', fontWeight: 600 }}
                >
                  Add Receipt Note
                </Button>
              </Group>
            )}
          </Transition>
        </Group>
      </Group>

      {/* Smooth Slide-Down Form Panel */}
      <Collapse expanded={isCreateModalOpen} transitionDuration={250} transitionTimingFunction="ease">
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
                <Text fw={700} style={{ color: '#800020', fontSize: 16 }}>
                  {createMode === 'SUPPLIER_REFILL'
                    ? 'Outward Empty Cylinder Refill Challan (To Supplier)'
                    : 'Van Stock Return Receipt Note'}
                </Text>
                <Text size="xs" c="dimmed">
                  {createMode === 'SUPPLIER_REFILL'
                    ? 'Dispatch empty cylinders from godown to supplier for refilling. Generates official Refill Challan PDF.'
                    : `Receive unsold full & empty cylinders returned by route delivery van into ${user?.godown_name || 'Central Godown'}.`}
                </Text>
              </div>
              <CloseButton
                size="md"
                onClick={() => setIsCreateModalOpen(false)}
              />
            </Group>

            <Stack gap="md">
              {/* Mode / Purpose Selector */}
              <Box>
                <Text size="xs" fw={700} c="#475569" mb={4}>
                  MOVEMENT PURPOSE / NOTE TYPE
                </Text>
                <SegmentedControl
                  value={createMode}
                  onChange={handleModeChange}
                  fullWidth
                  radius="xl"
                  color="burgundy"
                  data={[
                    { label: 'Outward to Supplier (Refilling)', value: 'SUPPLIER_REFILL' },
                    { label: 'Van to Godown Return', value: 'VAN_TO_GODOWN' },
                  ]}
                  styles={{
                    root: {
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: 9999,
                      padding: 4,
                    },
                    indicator: {
                      backgroundColor: '#800020',
                      borderRadius: 9999,
                      boxShadow: '0 1px 3px rgba(128, 0, 32, 0.25)',
                    },
                    label: {
                      fontWeight: 700,
                      fontSize: 12,
                      padding: '6px 14px',
                    },
                  }}
                />
              </Box>

              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                {/* Source Selection */}
                {createMode === 'VAN_TO_GODOWN' ? (
                  <Select
                    label="Source Van / Allocation"
                    placeholder="Select Delivery Van"
                    data={allocationOptions}
                    value={createSourceId}
                    onChange={(val) => {
                      setCreateSourceId(val);
                      handleAllocationChange(val);
                    }}
                    searchable
                    clearable
                    nothingFoundMessage="No active allocations found"
                    comboboxProps={{ withinPortal: true, zIndex: 1000 }}
                    required
                  />
                ) : (
                  <Select
                    label="Dispatching Godown"
                    placeholder="Select Source Godown"
                    data={godownOptions}
                    value={createSourceId}
                    onChange={(val) => setCreateSourceId(val)}
                    searchable
                    clearable
                    comboboxProps={{ withinPortal: true, zIndex: 1000 }}
                    required
                  />
                )}

                {/* Destination Selection */}
                {createMode === 'SUPPLIER_REFILL' ? (
                  <Select
                    label="Supplier (Refilling Plant)"
                    placeholder="Select Supplier (Super Gas, Hari Gas...)"
                    data={supplierOptions}
                    value={createDestId}
                    onChange={(val) => setCreateDestId(val)}
                    searchable
                    clearable
                    nothingFoundMessage="No suppliers found"
                    comboboxProps={{ withinPortal: true, zIndex: 1000 }}
                    required
                  />
                ) : (
                  <Select
                    label="Receiving Godown"
                    placeholder="Select Receiving Godown"
                    data={godownOptions}
                    value={createDestId}
                    onChange={(val) => setCreateDestId(val)}
                    searchable
                    clearable
                    comboboxProps={{ withinPortal: true, zIndex: 1000 }}
                    required
                  />
                )}

                <DateInputDDMMYY
                  label="Challan / Receipt Date"
                  value={createDate}
                  onChange={(val) => setCreateDate(val)}
                  required
                />
              </SimpleGrid>

              {/* Products Section Header */}
              <Divider
                label={
                  <Group gap="xs">
                    <IconGasStation size={16} color="#800020" />
                    <Text size="xs" fw={700} style={{ color: '#800020', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {createMode === 'SUPPLIER_REFILL'
                        ? 'Empty Cylinders Dispatched for Refilling'
                        : 'Products Returned / Unloaded into Godown'}
                    </Text>
                    {createMode === 'SUPPLIER_REFILL' && isFetchingGodownEmpty && (
                      <Group gap={4}>
                        <Loader size={12} color="#800020" />
                        <Text size="11px" c="#800020" fw={500}>Checking godown empty stock...</Text>
                      </Group>
                    )}
                    {createMode !== 'SUPPLIER_REFILL' && isFetchingAllocated && (
                      <Group gap={4}>
                        <Loader size={12} color="#800020" />
                        <Text size="11px" c="#800020" fw={500}>Fetching van products...</Text>
                      </Group>
                    )}
                  </Group>
                }
                labelPosition="left"
              />

              {/* Single Unified Returned Products List */}
              <Stack gap="xs">
                {createLines.map((line, idx) => {
                  const pOpt = productOptions.find((p: any) => Number(p.value) === line.productId);
                  const availEmpty = (pOpt as any)?.empty_qty;

                  return (
                    <Group key={idx} align="flex-start" wrap="nowrap" gap="sm">
                      <Box style={{ flex: 1, minWidth: 240 }}>
                        <Select
                          label={idx === 0 ? (createMode === 'SUPPLIER_REFILL' ? 'Empty Cylinder Product' : 'Product (Cylinders & Accessories)') : undefined}
                          placeholder={createMode === 'SUPPLIER_REFILL' ? 'Choose Empty Cylinder' : 'Choose Product'}
                          data={productOptions}
                          value={line.productId > 0 ? String(line.productId) : null}
                          onChange={(val) => handleLineProductChange(idx, val)}
                          searchable
                          nothingFoundMessage={createMode === 'SUPPLIER_REFILL' ? 'No cylinder products found' : 'No products found'}
                          comboboxProps={{ withinPortal: true, zIndex: 1000 }}
                          renderOption={createMode === 'SUPPLIER_REFILL' ? ({ option }) => {
                            const p = productOptions.find((item: any) => String(item.value) === option.value);
                            const count = (p as any)?.empty_qty;
                            return (
                              <Group justify="space-between" wrap="nowrap" style={{ width: '100%' }}>
                                <Text size="sm">{(p as any)?.product_name || option.label}</Text>
                                {count !== undefined && (
                                  <Badge size="xs" variant="light" color={count > 0 ? 'burgundy' : 'gray'} styles={{ root: { fontWeight: 700 } }}>
                                    {count} Empty Avail
                                  </Badge>
                                )}
                              </Group>
                            );
                          } : undefined}
                          rightSection={
                            createMode === 'SUPPLIER_REFILL' && line.productId > 0 && availEmpty !== undefined ? (
                              <Badge size="xs" variant="light" color={availEmpty > 0 ? 'burgundy' : 'gray'} mr={4} styles={{ root: { fontWeight: 700 } }}>
                                {availEmpty} Empty
                              </Badge>
                            ) : undefined
                          }
                          rightSectionWidth={createMode === 'SUPPLIER_REFILL' && line.productId > 0 && availEmpty !== undefined ? 92 : undefined}
                        />
                      </Box>
                      {createMode !== 'SUPPLIER_REFILL' && (
                        <Box style={{ width: 180, minWidth: 120 }}>
                          <NumberInput
                            label={idx === 0 ? 'Unsold Full / Return Qty' : undefined}
                            placeholder="0"
                            min={0}
                            value={line.filledQty}
                            onChange={(val) => handleLineFilledQtyChange(idx, val)}
                          />
                        </Box>
                      )}
                      <Box style={{ width: createMode === 'SUPPLIER_REFILL' ? 220 : 180, minWidth: 120 }}>
                        <NumberInput
                          label={idx === 0 ? (createMode === 'SUPPLIER_REFILL' ? 'Empty Cylinders to Refill' : 'Empty Returns Qty') : undefined}
                          placeholder={line.isCylinder ? 'Enter qty' : '—'}
                          disabled={!line.isCylinder}
                          min={0}
                          max={createMode === 'SUPPLIER_REFILL' && availEmpty !== undefined && availEmpty > 0 ? availEmpty : undefined}
                          value={line.isCylinder ? (line.emptyQty === 0 || line.emptyQty === '0' || line.emptyQty === '' ? '' : line.emptyQty) : ''}
                          onChange={(val) => handleLineEmptyQtyChange(idx, val)}
                        />
                      </Box>
                      {createLines.length > 1 ? (
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={() => handleRemoveLine(idx)}
                          style={{ marginTop: idx === 0 ? 25 : 2 }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      ) : (
                        <Box style={{ width: 28 }} />
                      )}
                    </Group>
                  );
                })}

                <Button
                  variant="subtle"
                  size="xs"
                  color="burgundy"
                  leftSection={<IconPlus size={14} />}
                  onClick={handleAddLine}
                  style={{ alignSelf: 'flex-start', color: '#800020', fontWeight: 600, marginTop: 4 }}
                >
                  Add Product Line
                </Button>
              </Stack>

            {/* Remarks / Gate Notes */}
            <TextInput
              label="Remarks / Gate Notes"
              placeholder={createMode === 'SUPPLIER_REFILL' ? 'e.g. Empty cylinders dispatched to supplier for refilling' : 'e.g. Route settlement, cylinders inspected at godown'}
              value={createRemarks}
              onChange={(e) => setCreateRemarks(e.currentTarget.value)}
            />

            {/* Bottom Actions matching Vehicles & Allocations page */}
            <Group justify="space-between" mt="md">
              <Button variant="default" onClick={() => setIsCreateModalOpen(false)} radius={10}>
                Cancel
              </Button>
              <Group gap="sm">
                <Button
                  color="burgundy"
                  radius={10}
                  style={{ backgroundColor: '#800020', color: '#ffffff', fontWeight: 600 }}
                  loading={createReceiptNoteMutation.isPending}
                  onClick={() => createReceiptNoteMutation.mutate(true)}
                >
                  {createMode === 'SUPPLIER_REFILL' ? 'Dispatch & Settle Challan' : 'Save & Settle Note'}
                </Button>
              </Group>
            </Group>
          </Stack>
        </Paper>
      </Collapse>

      {/* Smooth Slide-Down Receipt Verification Panel */}
      <Collapse expanded={isDetailOpen && !!selectedNote} transitionDuration={250} transitionTimingFunction="ease">
        {selectedNote && (
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
                              Receipt Note Verification &amp; Inward Inspection
                            </Text>
                            <Badge size="sm" variant="light" color="burgundy" radius="sm">
                              {selectedNote.noteNumber}
                            </Badge>
                            <Badge
                              size="sm"
                              radius="sm"
                              variant="filled"
                              style={{
                                backgroundColor: selectedNote.status === 'settled' ? '#fdf2f4' : '#fef3c7',
                                color: selectedNote.status === 'settled' ? '#800020' : '#b45309',
                                border: selectedNote.status === 'settled' ? '1px solid #fbcfe8' : '1px solid #fde68a',
                                fontWeight: 700,
                              }}
                            >
                              {selectedNote.status === 'settled' ? 'SETTLED' : 'RECEIPT PENDING'}
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed" mt={2}>
                            Receipt Date: {selectedNote.date} • Vehicle: {selectedNote.vehicleNumber} • Driver: {selectedNote.driverName} • Route: {selectedNote.routeName || '—'} • Shift DN Ref: {selectedNote.deliveryNoteRef}
                          </Text>
                        </div>

                        <CloseButton
                          size="md"
                          onClick={() => {
                            setIsDetailOpen(false);
                            setSelectedNote(null);
                          }}
                        />
                      </Group>

                      <Stack gap="md">
                        <Paper p="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
                            <div>
                              <Text size="xs" c="dimmed">Vehicle Number</Text>
                              <Text fw={700} size="sm" c="#0f172a">{selectedNote.vehicleNumber}</Text>
                            </div>
                            <div>
                              <Text size="xs" c="dimmed">Assigned Driver</Text>
                              <Text fw={700} size="sm" c="#0f172a">{selectedNote.driverName}</Text>
                            </div>
                            <div>
                              <Text size="xs" c="dimmed">Route</Text>
                              <Text fw={600} size="xs" c="#0f172a">{selectedNote.routeName || '—'}</Text>
                            </div>
                            <div>
                              <Text size="xs" c="dimmed">Delivery Note Ref</Text>
                              <Text fw={700} size="sm" style={{ color: '#800020' }}>{selectedNote.deliveryNoteRef}</Text>
                            </div>
                          </SimpleGrid>
                        </Paper>

                        {/* Financial Reconciliation Cards */}
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
                          <Box style={{ padding: '10px 14px', borderRight: '1px solid #e2e8f0' }}>
                            <Text size="10px" fw={700} c="#64748b" tt="uppercase">
                              GROSS COLLECTION
                            </Text>
                            <Text fw={700} size="sm" c="#0f172a" mt={2}>
                              ₹{(selectedNote.grossCollected ?? (selectedNote.cashCollected + (selectedNote.bankCollected || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                            <Text size="10px" c="#64748b" mt={2}>
                              Cash: ₹{(selectedNote.cashCollected || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })} • Bank: ₹{(selectedNote.bankCollected || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                            </Text>
                          </Box>
                          <Box style={{ padding: '10px 14px', borderRight: '1px solid #e2e8f0' }}>
                            <Text size="10px" fw={700} c="#64748b" tt="uppercase">
                              TRIP EXPENSES
                            </Text>
                            <Text fw={700} size="sm" c="#800020" mt={2}>
                              ₹{(selectedNote.tripExpenses ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                            <Text size="10px" c="#64748b" mt={2}>
                              Fuel, tolls &amp; allowances
                            </Text>
                          </Box>
                          <Box style={{ padding: '10px 14px' }}>
                            <Text size="10px" fw={700} c="#64748b" tt="uppercase">
                              NET SETTLEMENT BALANCE
                            </Text>
                            <Text fw={700} size="sm" c="#800020" mt={2}>
                              ₹{(selectedNote.netBalance ?? ((selectedNote.grossCollected || selectedNote.cashCollected) - (selectedNote.tripExpenses || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                            <Text size="10px" c="#800020" fw={600} mt={2}>
                              Cash: ₹{(selectedNote.netCash ?? selectedNote.cashCollected).toLocaleString('en-IN', { minimumFractionDigits: 0 })} • Bank: ₹{(selectedNote.netBank ?? (selectedNote.bankCollected || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                            </Text>
                          </Box>
                        </Box>

                        {/* Cash & Bank Net Settlement Breakdown Strip */}
                        <Box
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                          }}
                        >
                          <Paper p="xs" radius="sm" style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}>
                            <Text size="10px" fw={700} c="#1e293b" tt="uppercase">
                              Net Cash Desk Handover
                            </Text>
                            <Text size="sm" fw={800} c="#0f172a" mt={2}>
                              ₹{(selectedNote.netCash ?? selectedNote.cashCollected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                            <Text size="9.5px" c="#64748b" mt={1}>
                              Driver cash handover
                            </Text>
                          </Paper>
                          <Paper p="xs" radius="sm" style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}>
                            <Text size="10px" fw={700} c="#64748b" tt="uppercase">
                              Net Digital UPI / Bank
                            </Text>
                            <Text size="sm" fw={800} c="#64748b" mt={2}>
                              ₹{(selectedNote.netBank ?? (selectedNote.bankCollected || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                            <Text size="9.5px" c="#64748b" mt={1}>
                              Direct digital collection
                            </Text>
                          </Paper>
                        </Box>

                        <Divider label="Returned Cylinders" labelPosition="left" />

                        <Table withTableBorder withColumnBorders>
                          <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                            <Table.Tr>
                              <Table.Th style={{ fontSize: 11, color: '#475569' }}>PRODUCT</Table.Th>
                              <Table.Th style={{ fontSize: 11, color: '#0f172a', textAlign: 'center', width: 85 }}>LOADED</Table.Th>
                              <Table.Th style={{ fontSize: 11, color: '#0f172a', textAlign: 'center', width: 85 }}>DELIVERED</Table.Th>
                              <Table.Th style={{ fontSize: 11, color: '#0f172a', textAlign: 'center', width: 95 }}>FILLED (UNSOLD)</Table.Th>
                              <Table.Th style={{ fontSize: 11, color: '#800020', textAlign: 'center', width: 95 }}>EMPTY RETURNED</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {(() => {
                              const lines = selectedNote.lines || [];
                              if (lines.length > 0) {
                                return lines.map((l: any, idx: number) => (
                                  <Table.Tr key={idx}>
                                    <Table.Td style={{ fontWeight: 600, fontSize: 12.5, color: '#0f172a' }}>{l.product_name}</Table.Td>
                                    <Table.Td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{l.LoadedQty ?? '-'}</Table.Td>
                                    <Table.Td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{l.DeliveredQty ?? '-'}</Table.Td>
                                    <Table.Td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{l.FilledQty ?? 0}</Table.Td>
                                    <Table.Td style={{ textAlign: 'center', fontWeight: 700, color: '#800020' }}>{l.EmptyQty ?? 0}</Table.Td>
                                  </Table.Tr>
                                ));
                              }
                              const prods = Array.from(new Set([
                                ...(selectedNote.emptyBreakdown || []).map((e) => e.product),
                                ...(selectedNote.filledBreakdown || []).map((f) => f.product),
                              ]));
                              if (prods.length === 0) {
                                return (
                                  <Table.Tr>
                                    <Table.Td colSpan={5} style={{ textAlign: 'center' }}>
                                      <Text size="xs" c="dimmed">No specific cylinder lines recorded.</Text>
                                    </Table.Td>
                                  </Table.Tr>
                                );
                              }
                              return prods.map((pName, idx) => {
                                const eItem = selectedNote.emptyBreakdown?.find((e) => e.product === pName);
                                const fItem = selectedNote.filledBreakdown?.find((f) => f.product === pName);
                                const fQty = fItem ? fItem.qty : 0;
                                const eQty = eItem ? eItem.qty : 0;
                                return (
                                  <Table.Tr key={idx}>
                                    <Table.Td style={{ fontWeight: 600, fontSize: 12.5, color: '#0f172a' }}>{pName}</Table.Td>
                                    <Table.Td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>-</Table.Td>
                                    <Table.Td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>-</Table.Td>
                                    <Table.Td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{fQty}</Table.Td>
                                    <Table.Td style={{ textAlign: 'center', fontWeight: 700, color: '#800020' }}>{eQty}</Table.Td>
                                  </Table.Tr>
                                );
                              });
                            })()}
                          </Table.Tbody>
                          <Table.Tfoot style={{ backgroundColor: '#f8fafc' }}>
                            <Table.Tr>
                              <Table.Td style={{ fontWeight: 800, fontSize: 11.5, color: '#0f172a' }}>TOTALS</Table.Td>
                              <Table.Td style={{ textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                                {selectedNote.loadedTotal ?? (selectedNote.lines ? selectedNote.lines.reduce((s: number, l: any) => s + (l.LoadedQty || 0), 0) : '-')}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                                {selectedNote.deliveredTotal ?? (selectedNote.lines ? selectedNote.lines.reduce((s: number, l: any) => s + (l.DeliveredQty || 0), 0) : '-')}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                                {selectedNote.filledCylindersTotal ?? (selectedNote.lines ? selectedNote.lines.reduce((s: number, l: any) => s + (l.FilledQty || 0), 0) : 0)}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'center', fontWeight: 800, color: '#800020' }}>
                                {selectedNote.emptyCylindersTotal ?? (selectedNote.lines ? selectedNote.lines.reduce((s: number, l: any) => s + (l.EmptyQty || 0), 0) : 0)}
                              </Table.Td>
                            </Table.Tr>
                          </Table.Tfoot>
                        </Table>

                        {selectedNote.cashCollected > 0 && (
                          <Paper p="xs" radius="sm" withBorder style={{ backgroundColor: '#fdf2f4', borderColor: '#f5c2cb' }}>
                            <Group justify="space-between" align="center">
                              <Text size="xs" fw={700} c="#800020">Driver Cash Collection Handover:</Text>
                              <Text size="sm" fw={800} c="#800020">₹{selectedNote.cashCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                            </Group>
                          </Paper>
                        )}

                        {selectedNote.notes && (
                          <Text size="xs" c="dimmed">
                            <strong>Gate Remarks:</strong> {selectedNote.notes}
                          </Text>
                        )}

                        {/* Receiving Destination Godown Card */}
                        <Paper p="xs" radius="sm" withBorder style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                          <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                            <div>
                              <Text size="xs" fw={700} c="#1e293b">Receiving Destination Godown</Text>
                              <Text size="11px" c="dimmed">
                                {selectedNote.sourceGodownName
                                  ? `Incoming shift transfer from ${selectedNote.sourceGodownName}`
                                  : 'Stock will be accepted into this godown location upon verification'}
                              </Text>
                            </div>
                            <Badge
                              size="md"
                              variant="filled"
                              radius="sm"
                              styles={{ root: { backgroundColor: '#800020', color: '#ffffff', fontWeight: 700 } }}
                            >
                              {selectedNote.godownName || (godowns.find((g: any) => String(g.GodownId) === selectedReceivingGodown)?.GodownName) || 'Main Godown (Central)'}
                            </Badge>
                          </Group>
                          {isAdmin && !selectedNote.godownId && (
                            <Select
                              mt="xs"
                              label="Select Destination Godown"
                              size="xs"
                              value={selectedReceivingGodown}
                              onChange={(val) => setSelectedReceivingGodown(val || '1')}
                              data={godowns.map((g: any) => ({
                                value: String(g.GodownId),
                                label: `${g.GodownName}${g.IsCentral ? ' (Central)' : ''}`,
                              }))}
                            />
                          )}
                        </Paper>

                        {selectedNote.status === 'pending' && selectedNote.canVerify === false && (
                          <Paper p="xs" radius="sm" withBorder style={{ backgroundColor: '#fffbeb', borderColor: '#fef3c7' }}>
                            <Group gap="xs">
                              <IconClock size={16} color="#d97706" />
                              <Text size="xs" fw={600} c="#92400e">
                                Awaiting verification by {selectedNote.godownName || 'Destination Godown'} Manager. You do not have custody permission to verify receipts for this depot.
                              </Text>
                            </Group>
                          </Paper>
                        )}

                        <Group justify="space-between" mt="sm" wrap="wrap" gap="sm">
                          <Button
                            variant="outline"
                            color="burgundy"
                            size="xs"
                            leftSection={<IconPrinter size={16} />}
                            onClick={() => {
                              const noteId = selectedNote.receiptNoteId || selectedNote.deliveryNoteId || selectedNote.id;
                              window.open(`${apiClient.defaults.baseURL}/receipt-notes/${noteId}/pdf/?_t=${Date.now()}`, '_blank');
                            }}
                            styles={{ root: { borderColor: '#800020', color: '#800020', fontWeight: 600 } }}
                          >
                            Print Challan / Note PDF
                          </Button>

                          <Group gap="xs">
                            <Button
                              variant="default"
                              size="xs"
                              onClick={() => {
                                setIsDetailOpen(false);
                                setSelectedNote(null);
                              }}
                            >
                              Close
                            </Button>
                            {selectedNote.status === 'pending' && (
                              <Button
                                color="burgundy"
                                size="xs"
                                leftSection={<IconCheck size={16} />}
                                onClick={() => verifyNoteMutation.mutate({
                                  noteId: selectedNote.receiptNoteId || selectedNote.deliveryNoteId || Number(selectedNote.id),
                                  godownId: Number(selectedReceivingGodown || selectedNote.godownId || 1),
                                })}
                                loading={verifyNoteMutation.isPending}
                                disabled={selectedNote.canVerify === false}
                              >
                                Verify &amp; Accept into {selectedNote.godownName || 'Godown'}
                              </Button>
                            )}
                          </Group>
                        </Group>
                      </Stack>
                    </Paper>
                  )}
                </Collapse>

                {/* Main Table Container matching System Tables */}
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
        <Group justify="space-between" align="center" p="sm" px="md" wrap="wrap" gap="sm" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <Group gap="xs" align="center">
              <Text fw={700} style={{ color: '#800020', fontSize: 16 }}>
                Incoming Route Receipts & Driver Returns
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
                    height: 22 } }}
              >
                {filteredNotes.length} Notes
              </Badge>
              {user?.godown_name && (
                <Badge
                  variant="outline"
                  size="xs"
                  styles={{
                    root: {
                      borderColor: '#cbd5e1',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: 10.5,
                      height: 20
                    }
                  }}
                >
                   {user.godown_name}
                </Badge>
              )}
            </Group>
            <Text size="xs" c="dimmed" mt={2}>
              Review driver returns, verify empty cylinder counts, and accept inventory into {user?.godown_name || 'depot'}
            </Text>
          </div>

          {/* Search Input */}
          <TextInput
            placeholder="Search receipt notes, vehicles, drivers..."
            size="xs"
            radius="md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            leftSection={<IconSearch size={14} stroke={1.5} color="#800020" />}
            rightSection={searchQuery ? <CloseButton size="xs" onClick={() => setSearchQuery('')} /> : null}
            style={{ width: 260 }}
            styles={{
              input: {
                height: 34,
                minHeight: 34,
                fontSize: 12,
                borderColor: '#e2e8f0',
                backgroundColor: '#f8fafc',
              }
            }}
          />
        </Group>

        {/* Filter Controls Row */}
        <Box px="md" py="xs" style={{ backgroundColor: '#fafbfc', borderBottom: '1px solid #e2e8f0' }}>
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            {/* Left: Status Toggle (Pending, Settled, All) */}
            <SegmentedControl
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
                      All ({receiptNotes.length})
                    </span>
                  ),
                  value: 'all' },
              ]}
              radius="xl"
              size="xs"
              transitionDuration={250}
              transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
              styles={{
                root: {
                  backgroundColor: '#f1f5f9',
                  padding: 3,
                  borderRadius: 9999,
                  border: '1px solid #e2e8f0' },
                indicator: {
                  backgroundColor: '#800020',
                  boxShadow: '0 2px 4px rgba(128, 0, 32, 0.25)',
                  borderRadius: 9999 },
                label: {
                  padding: '5px 14px' } }}
            />

            {/* Right: Date Filter Pills */}
            <Group gap="xs" align="center" wrap="wrap">
              <Text size="xs" fw={700} c="#475569" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                Date Filter:
              </Text>
              <SegmentedControl
                value={dateFilter}
                onChange={(val) => setDateFilter(val as any)}
                color="burgundy"
                data={[
                  { label: 'All', value: 'all' },
                  { label: 'Today', value: 'today' },
                  { label: 'Yesterday', value: 'yesterday' },
                  { label: 'This Week', value: 'this_week' },
                  { label: 'This Month', value: 'this_month' },
                  { label: 'Custom', value: 'custom' },
                ]}
                radius="xl"
                size="xs"
                transitionDuration={250}
                transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
                styles={{
                  root: {
                    backgroundColor: '#f1f5f9',
                    padding: 3,
                    borderRadius: 9999,
                    border: '1px solid #e2e8f0',
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
                  }
                }}
              />

              {dateFilter === 'custom' && (
                <Group gap="xs" align="center">
                  <Box style={{ width: 125 }}>
                    <DateInputDDMMYY
                      placeholder="From Date"
                      value={customStartDate}
                      onChange={(val) => setCustomStartDate(val)}
                    />
                  </Box>
                  <Text size="xs" c="dimmed">to</Text>
                  <Box style={{ width: 125 }}>
                    <DateInputDDMMYY
                      placeholder="To Date"
                      value={customEndDate}
                      onChange={(val) => setCustomEndDate(val)}
                    />
                  </Box>
                </Group>
              )}
            </Group>
          </Group>
        </Box>

        {/* Table Content */}
        {isLoading ? (
          <Center p="xl" style={{ minHeight: 240 }}>
            <Loader color="burgundy" />
          </Center>
        ) : filteredNotes.length === 0 ? (
          <Center p="xl" style={{ minHeight: 240 }}>
            <Stack align="center" gap="xs">
              <IconReceipt size={36} color="#cbd5e1" stroke={1.25} />
              <Text size="sm" c="dimmed">
                No receipt notes found matching the selected filters.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={900}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', width: 140 }}>
                    RECEIPT NOTE #
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    VEHICLE & ROUTE
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', width: 160 }}>
                    RECEIVING DEPOT
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', width: 130 }}>
                    DELIVERY REF
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 170 }}>
                    RETURNS
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', width: 120 }}>
                    STATUS
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 130 }}>
                    ACTIONS
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredNotes.map((note) => {
                  const isPending = note.status === 'pending';
                  const isSuppRefill = note.deliveryNoteRef === 'Refill Outward' ||
                    (note.notes || '').includes('SUPPLIER REFILL') ||
                    (note.vehicleNumber || '').includes('Supplier');

                  return (
                    <Table.Tr key={note.id} style={{ height: 46 }}>
                      {/* Note # & Time */}
                      <Table.Td>
                        <Stack gap={1}>
                          <Group gap={6} align="center">
                            <Text size="sm" fw={700} style={{ color: '#800020' }}>
                              {note.noteNumber}
                            </Text>
                            {isSuppRefill && (
                              <Badge size="xs" variant="light" styles={{ root: { backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa', border: '1px solid', fontWeight: 700 } }}>
                                REFILL
                              </Badge>
                            )}
                          </Group>
                          <Group gap={4} wrap="nowrap">
                            <IconClock size={11} color="#64748b" />
                            <Text size="xs" c="dimmed">
                              {note.time ? `${note.time} • ` : ''}{formatDateDDMMYY(note.date)}
                            </Text>
                          </Group>
                        </Stack>
                      </Table.Td>

                      {/* Vehicle & Route */}
                      <Table.Td>
                        <Group gap={8} wrap="nowrap">
                          <IconTruck size={16} color="#800020" style={{ flexShrink: 0 }} />
                          <div>
                            <Text size="sm" fw={700} c="#0f172a">
                              {note.vehicleNumber}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {note.routeName} • Driver: <strong style={{ color: '#334155' }}>{note.driverName}</strong>
                            </Text>
                          </div>
                        </Group>
                      </Table.Td>

                      {/* Receiving Depot */}
                      <Table.Td>
                        <Stack gap={2}>
                          <Badge
                            variant="light"
                            size="xs"
                            styles={{
                              root: {
                                backgroundColor: note.godownId === 2 ? '#fdf2f4' : '#f1f5f9',
                                color: note.godownId === 2 ? '#800020' : '#334155',
                                borderColor: note.godownId === 2 ? '#f5c2cb' : '#cbd5e1',
                                border: '1px solid',
                                fontWeight: 700,
                                fontSize: 10.5,
                                height: 20
                              }
                            }}
                          >
                            {note.godownName || (godowns.find((g: any) => Number(g.GodownId) === Number(note.godownId))?.GodownName || 'Godown')}
                          </Badge>
                          {note.sourceGodownName && (
                            <Text size="xs" c="dimmed" style={{ fontSize: 10 }}>
                              From: {note.sourceGodownName}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>

                      {/* Delivery Ref */}
                      <Table.Td>
                        <Badge
                          variant="outline"
                          size="xs"
                          styles={{
                            root: {
                              borderColor: '#e2e8f0',
                              backgroundColor: '#f8fafc',
                              color: '#334155',
                              fontWeight: 600 } }}
                        >
                          {note.deliveryNoteRef}
                        </Badge>
                      </Table.Td>

                      {/* Returns: Filled & Empty Badges */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap={6} justify="flex-end" align="center" wrap="nowrap">
                          <Badge
                            variant="outline"
                            size="xs"
                            styles={{
                              root: {
                                borderColor: '#e2e8f0',
                                backgroundColor: '#f8fafc',
                                color: '#0f172a',
                                fontWeight: 700,
                                fontSize: 10.5,
                                height: 20 } }}
                          >
                            {note.filledCylindersTotal || 0} Filled
                          </Badge>
                          <Badge
                            variant="outline"
                            size="xs"
                            styles={{
                              root: {
                                borderColor: '#f5c2cb',
                                backgroundColor: '#fdf2f4',
                                color: '#800020',
                                fontWeight: 700,
                                fontSize: 10.5,
                                height: 20 } }}
                          >
                            {note.emptyCylindersTotal || 0} Empty
                          </Badge>
                        </Group>
                        {note.emptyBreakdown && note.emptyBreakdown.length > 0 && (
                          <Text size="xs" c="dimmed" truncate style={{ maxWidth: 200, marginLeft: 'auto', marginTop: 3 }}>
                            {note.emptyBreakdown
                              .slice(0, 2)
                              .map((b) => `${b.qty}x ${b.product.replace('GAS CYLINDER', '').replace('LPG', '').trim()}`)
                              .join(' • ')}
                          </Text>
                        )}
                      </Table.Td>

                      {/* Status */}
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Badge
                          variant="outline"
                          color="burgundy"
                          size="sm"
                          radius="sm"
                          styles={{
                            root: {
                              borderColor: isPending ? '#f5c2cb' : '#e2e8f0',
                              backgroundColor: isPending ? '#fdf2f4' : '#f8fafc',
                              color: isPending ? '#800020' : '#0f172a',
                              fontWeight: 700,
                              fontSize: 11,
                              height: 22,
                              letterSpacing: '0.3px' } }}
                        >
                          {isPending ? 'Pending Review' : 'Settled'}
                        </Badge>
                      </Table.Td>

                      {/* Actions */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap={6} justify="flex-end" wrap="nowrap">
                          <Tooltip label={isDetailOpen && selectedNote?.id === note.id ? "Hide Details" : "Inspect & Verify Note"} withArrow position="top">
                            <ActionIcon
                              variant={isDetailOpen && selectedNote?.id === note.id ? "filled" : "light"}
                              color="burgundy"
                              size="sm"
                              onClick={() => {
                                if (isDetailOpen && selectedNote?.id === note.id) {
                                  setIsDetailOpen(false);
                                  setSelectedNote(null);
                                } else {
                                  setSelectedNote(note);
                                  if (note.godownId) {
                                    setSelectedReceivingGodown(String(note.godownId));
                                  }
                                  setIsDetailOpen(true);
                                }
                              }}
                              style={{
                                color: isDetailOpen && selectedNote?.id === note.id ? '#ffffff' : '#800020',
                                backgroundColor: isDetailOpen && selectedNote?.id === note.id ? '#800020' : '#fdf2f4',
                              }}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Print Note / Challan PDF" withArrow position="top">
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              onClick={() => {
                                const noteId = note.receiptNoteId || note.deliveryNoteId || note.id;
                                window.open(`${apiClient.defaults.baseURL}/receipt-notes/${noteId}/pdf/?_t=${Date.now()}`, '_blank');
                              }}
                              style={{ color: '#475569' }}
                            >
                              <IconPrinter size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Delete Note" withArrow position="top">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => setDeleteNote(note)}
                              style={{ color: '#dc2626' }}
                            >
                              <IconTrash size={16} />
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

      {/* 5. Delete Confirmation Modal */}
      <Modal
        opened={Boolean(deleteNote)}
        onClose={() => setDeleteNote(null)}
        title={
          <Group gap="xs">
            <IconTrash size={20} color="#dc2626" />
            <Text fw={700} style={{ color: '#0f172a', fontSize: 16 }}>
              Delete Receipt Note
            </Text>
          </Group>
        }
        size="sm"
        radius="md"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="#475569">
            Are you sure you want to delete Receipt Note{' '}
            <strong style={{ color: '#800020' }}>{deleteNote?.noteNumber}</strong>?
            This will also reverse associated stock check-ins. This action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDeleteNote(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => {
                if (deleteNote) {
                  deleteReceiptNoteMutation.mutate(deleteNote.receiptNoteId || deleteNote.deliveryNoteId || deleteNote.id);
                }
              }}
              loading={deleteReceiptNoteMutation.isPending}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default ReceiptNotesPage;
