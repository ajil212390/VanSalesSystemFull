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
  Transition,
} from '@mantine/core';
import {
  IconReceipt,
  IconSearch,
  IconRefresh,
  IconTruck,
  IconCheck,
  IconEye,
  IconPrinter,
  IconPackage,
  IconCash,
  IconClock,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';

interface EmptyBreakdownItem {
  product: string;
  qty: number;
}

interface ReceiptNoteItem {
  id: string;
  deliveryNoteId: number;
  noteNumber: string;
  date: string;
  time: string;
  vehicleNumber: string;
  routeName: string;
  driverName: string;
  deliveryNoteRef: string;
  filledCylindersTotal?: number;
  filledBreakdown?: EmptyBreakdownItem[];
  emptyCylindersTotal: number;
  emptyBreakdown: EmptyBreakdownItem[];
  cashCollected: number;
  digitalCollected: number;
  status: 'pending' | 'settled';
  notes?: string;
}

export const ReceiptNotesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'settled' | 'pending' | 'all'>('settled');
  const [selectedNote, setSelectedNote] = useState<ReceiptNoteItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State for "Add Receipt Note"
  const [createAllocation, setCreateAllocation] = useState<string | null>(null);
  const [createDate, setCreateDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [createRemarks, setCreateRemarks] = useState('');
  const [createCash, setCreateCash] = useState<number | string>('');
  const [createDigital, setCreateDigital] = useState<number | string>('');
  const [createCylinderLines, setCreateCylinderLines] = useState<
    Array<{ productId: number; productName?: string; filledQty: number | ''; emptyQty: number | '' }>
  >([{ productId: 0, filledQty: 0, emptyQty: 0 }]);
  const [createOtherLines, setCreateOtherLines] = useState<
    Array<{ productId: number; productName?: string; qty: number | '' }>
  >([]);

  // Fetch Active Allocations (vans, drivers, routes)
  const { data: allocations = [] } = useQuery<any[]>({
    queryKey: ['allocations'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/allocations/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  // Fetch Available Cylinder Products (all products fallback)
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/products/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  // Fetch Products allocated to the currently selected Van / Route
  const { data: allocatedProducts = [], isFetching: isFetchingAllocated } = useQuery<any[]>({
    queryKey: ['allocated-products', createAllocation],
    queryFn: async () => {
      if (!createAllocation) return [];
      const res = await apiClient.get<any>(`/delivery-notes/allocated-products/?allocation_id=${createAllocation}`);
      const raw = res.data;
      return Array.isArray(raw) ? raw : (raw?.results || []);
    },
    enabled: Boolean(createAllocation),
  });

  // Helper to determine if product is a gas cylinder
  const isCylinderProduct = (p: any) => {
    const cat = (p.CategoryName || p.category_name || (p.Category && p.Category.CategoryName) || '').toLowerCase();
    const name = (p.ProductName || p.name || p.product_name || '').toLowerCase();
    return Boolean(p.is_cylinder) || cat.includes('cylinder') || name.includes('cylinder') || name.includes('kg') || name.includes('lpg');
  };

  // Auto-populate return lines when a Van / Route is selected: Cylinders first, other products second
  useEffect(() => {
    if (allocatedProducts.length > 0 && isCreateModalOpen) {
      const cyls = allocatedProducts.filter((p: any) => p.is_cylinder ?? isCylinderProduct(p));
      const others = allocatedProducts.filter((p: any) => !(p.is_cylinder ?? isCylinderProduct(p)));

      if (cyls.length > 0) {
        setCreateCylinderLines(
          cyls.map((p: any) => ({
            productId: p.product_id || p.ProductId,
            productName: p.product_name || p.ProductName,
            filledQty: 0,
            emptyQty: 0,
          }))
        );
      }
      setCreateOtherLines(
        others.map((p: any) => ({
          productId: p.product_id || p.ProductId,
          productName: p.product_name || p.ProductName,
          qty: 0,
        }))
      );
    }
  }, [allocatedProducts, isCreateModalOpen]);

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
          label: `${vNum} • ${dName} (${rName})`.trim(),
        };
      });
  }, [allocations]);

  const cylinderProductOptions = useMemo(() => {
    const list = Array.isArray(products) ? products : (products as any)?.results || [];
    return list
      .filter((p: any) => isCylinderProduct(p))
      .map((p: any) => ({
        value: String(p.ProductId || p.id),
        label: p.ProductName || p.name || `Cylinder ${p.ProductId}`,
      }));
  }, [products]);

  const otherProductOptions = useMemo(() => {
    const list = Array.isArray(products) ? products : (products as any)?.results || [];
    return list
      .filter((p: any) => !isCylinderProduct(p))
      .map((p: any) => ({
        value: String(p.ProductId || p.id),
        label: p.ProductName || p.name || `Product ${p.ProductId}`,
      }));
  }, [products]);

  const handleOpenCreateModal = () => {
    setCreateAllocation(null);
    setCreateDate(new Date().toISOString().split('T')[0]);
    setCreateRemarks('');
    setCreateCash('');
    setCreateDigital('');
    setCreateCylinderLines([{ productId: 0, filledQty: 0, emptyQty: 0 }]);
    setCreateOtherLines([]);
    setIsCreateModalOpen(true);
  };

  const handleAddCylinderLine = () => {
    setCreateCylinderLines((prev) => [...prev, { productId: 0, filledQty: 0, emptyQty: 0 }]);
  };

  const handleRemoveCylinderLine = (index: number) => {
    setCreateCylinderLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineProductChange = (index: number, val: string | null) => {
    const pId = val ? Number(val) : 0;
    const pObj = products.find((p: any) => p.ProductId === pId);
    setCreateCylinderLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, productId: pId, productName: pObj?.ProductName } : l))
    );
  };

  const handleLineFilledQtyChange = (index: number, val: number | string) => {
    const qty = typeof val === 'number' ? val : val === '' ? '' : Number(val) || 0;
    setCreateCylinderLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, filledQty: qty } : l))
    );
  };

  const handleLineEmptyQtyChange = (index: number, val: number | string) => {
    const qty = typeof val === 'number' ? val : val === '' ? '' : Number(val) || 0;
    setCreateCylinderLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, emptyQty: qty } : l))
    );
  };

  // Handlers for Other Products (Stoves, Accessories)
  const handleAddOtherLine = () => {
    setCreateOtherLines((prev) => [...prev, { productId: 0, qty: 0 }]);
  };

  const handleRemoveOtherLine = (index: number) => {
    setCreateOtherLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOtherProductChange = (index: number, val: string | null) => {
    const pId = val ? Number(val) : 0;
    const pObj = products.find((p: any) => p.ProductId === pId);
    setCreateOtherLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, productId: pId, productName: pObj?.ProductName } : l))
    );
  };

  const handleOtherQtyChange = (index: number, val: number | string) => {
    const qty = typeof val === 'number' ? val : val === '' ? '' : Number(val) || 0;
    setCreateOtherLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, qty } : l))
    );
  };

  const totalModalFilled = useMemo(() => {
    return createCylinderLines.reduce((sum, l) => sum + (Number(l.filledQty) || 0), 0);
  }, [createCylinderLines]);

  const totalModalEmpty = useMemo(() => {
    return createCylinderLines.reduce((sum, l) => sum + (Number(l.emptyQty) || 0), 0);
  }, [createCylinderLines]);

  const totalModalOther = useMemo(() => {
    return createOtherLines.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
  }, [createOtherLines]);

  // 1. Fetch Real Receipt Notes from Backend (populated via mobile driver shift ends)
  const {
    data: receiptNotes = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<ReceiptNoteItem[]>({
    queryKey: ['receipt-notes'],
    queryFn: async () => {
      const res = await apiClient.get<ReceiptNoteItem[]>('/delivery-notes/receipt-notes/');
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchInterval: 10000,
  });

  // Mutation: Verify and Settle Pending Receipt Note into Central Godown
  const verifyNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const res = await apiClient.post('/delivery-notes/process_receipt_note/', {
        delivery_note_id: noteId,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receipt-notes'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
      queryClient.invalidateQueries({ queryKey: ['stock-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['godown-stock'] });
      setIsDetailModalOpen(false);
      notifications.show({
        title: 'Receipt Note Verified',
        message: data.message || 'Returned empty cylinders verified and accepted into Central Godown.',
        color: 'burgundy',
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Verification Failed',
        message: err.response?.data?.message || err.message || 'Could not verify receipt note.',
        color: 'red',
      });
    },
  });

  // Mutation: Create Receipt Note manually
  const createReceiptNoteMutation = useMutation({
    mutationFn: async (autoSettle: boolean) => {
      if (!createAllocation) {
        throw new Error('Please select an active vehicle / route allocation.');
      }
      const items = createCylinderLines
        .filter((l) => l.productId > 0 && ((Number(l.filledQty) || 0) > 0 || (Number(l.emptyQty) || 0) > 0))
        .map((l) => ({
          product_id: l.productId,
          filled_qty: Number(l.filledQty) || 0,
          empty_qty: Number(l.emptyQty) || 0,
        }));

      const other_items = createOtherLines
        .filter((l) => l.productId > 0 && (Number(l.qty) || 0) > 0)
        .map((l) => ({
          product_id: l.productId,
          qty: Number(l.qty) || 0,
        }));

      const payload = {
        allocation_id: Number(createAllocation),
        delivery_date: createDate,
        items,
        other_items,
        cash_collected: Number(createCash) || 0,
        digital_collected: Number(createDigital) || 0,
        remarks: createRemarks,
        auto_settle: autoSettle,
      };
      const res = await apiClient.post('/delivery-notes/receipt-notes/', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receipt-notes'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
      queryClient.invalidateQueries({ queryKey: ['stock-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['godown-stock'] });
      setIsCreateModalOpen(false);
      notifications.show({
        title: 'Receipt Note Created',
        message: data.message || 'Receipt note created successfully.',
        color: 'burgundy',
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Failed to Create Receipt Note',
        message: err.response?.data?.detail || err.response?.data?.message || err.message || 'Could not create receipt note.',
        color: 'red',
      });
    },
  });

  // Filtered Notes: Settled first, then pending, then remaining
  const filteredNotes = useMemo(() => {
    const list = receiptNotes.filter((n) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        n.noteNumber.toLowerCase().includes(q) ||
        n.vehicleNumber.toLowerCase().includes(q) ||
        n.driverName.toLowerCase().includes(q) ||
        n.routeName.toLowerCase().includes(q) ||
        n.deliveryNoteRef.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'all' || n.status === statusFilter;

      return matchSearch && matchStatus;
    });

    return [...list].sort((a, b) => {
      if (a.status === 'settled' && b.status !== 'settled') return -1;
      if (a.status !== 'settled' && b.status === 'settled') return 1;
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return b.deliveryNoteId - a.deliveryNoteId;
    });
  }, [receiptNotes, searchQuery, statusFilter]);

  // Real KPI Metrics derived from live backend data
  const settledCount = receiptNotes.filter((n) => n.status === 'settled').length;
  const pendingCount = receiptNotes.filter((n) => n.status === 'pending').length;
  const totalFilledReceived = receiptNotes.reduce((sum, n) => sum + (n.filledCylindersTotal || 0), 0);
  const totalEmptiesReceived = receiptNotes.reduce((sum, n) => sum + (n.emptyCylindersTotal || 0), 0);
  const totalCollections = receiptNotes.reduce(
    (sum, n) => sum + (Number(n.cashCollected) || 0) + (Number(n.digitalCollected) || 0),
    0
  );

  return (
    <Stack gap="lg">
      {/* Page Header */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Receipt Notes
          </Title>
          <Text size="sm" c="dimmed">
            Driver route returns, empty cylinder receipts & settlement verification into Central Godown
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
                  + Add Receipt Note
                </Button>
              </Group>
            )}
          </Transition>
        </Group>
      </Group>

      {/* Seamless Form & Table Container */}
      <Box>
        {/* Smooth Slide-Down Form Panel */}
        <Collapse expanded={isCreateModalOpen} transitionDuration={250} transitionTimingFunction="ease">
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
                  New Receipt Note Details
                </Text>
                <Text size="xs" c="dimmed">
                  Record unsold full & empty cylinders and cash/digital route collections unloaded into Central Godown.
                </Text>
              </div>
              <CloseButton
                size="md"
                onClick={() => setIsCreateModalOpen(false)}
              />
            </Group>

            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
              <Select
                label="Van / Route Allocation"
                placeholder="Select Vehicle • Driver (Route)"
                data={allocationOptions}
                value={createAllocation}
                onChange={setCreateAllocation}
                searchable
                clearable
                nothingFoundMessage="No active allocations found"
                comboboxProps={{ withinPortal: true, zIndex: 1000 }}
                required
              />
              <TextInput
                label="Receipt Date"
                type="date"
                value={createDate}
                onChange={(e) => setCreateDate(e.currentTarget.value)}
                required
              />
              <TextInput
                label="Remarks / Gate Notes"
                placeholder="e.g. Route settlement, cylinders inspected at godown"
                value={createRemarks}
                onChange={(e) => setCreateRemarks(e.currentTarget.value)}
              />
            </SimpleGrid>

            {/* Section 1: Cylinders Returned (Filled & Empty) */}
            <Divider
              label={
                <Group gap="xs">
                  <Text size="xs" fw={700} style={{ color: '#800020' }}>
                    1. Cylinders Returned to Godown (Filled & Empty)
                  </Text>
                  {isFetchingAllocated && (
                    <Group gap={4}>
                      <Loader size={12} color="#800020" />
                      <Text size="11px" c="#800020" fw={500}>Fetching van products...</Text>
                    </Group>
                  )}
                </Group>
              }
              labelPosition="left"
            />

            <Stack gap="xs">
              {createCylinderLines.map((line, idx) => (
                <Group key={idx} align="flex-end" wrap="nowrap" gap="sm">
                  <Box style={{ flex: 5 }}>
                    <Select
                      label={idx === 0 ? 'Cylinder Product' : undefined}
                      placeholder="Choose Cylinder Product"
                      data={cylinderProductOptions}
                      value={line.productId > 0 ? String(line.productId) : null}
                      onChange={(val) => handleLineProductChange(idx, val)}
                      searchable
                      nothingFoundMessage="No cylinder products found"
                      comboboxProps={{ withinPortal: true, zIndex: 1000 }}
                    />
                  </Box>
                  <Box style={{ flex: 3 }}>
                    <NumberInput
                      label={idx === 0 ? 'Filled Qty (Unsold Full)' : undefined}
                      placeholder="Unsold Full"
                      min={0}
                      value={line.filledQty}
                      onChange={(val) => handleLineFilledQtyChange(idx, val)}
                    />
                  </Box>
                  <Box style={{ flex: 3 }}>
                    <NumberInput
                      label={idx === 0 ? 'Empty Qty (Empties Returned)' : undefined}
                      placeholder="Empties"
                      min={0}
                      value={line.emptyQty}
                      onChange={(val) => handleLineEmptyQtyChange(idx, val)}
                    />
                  </Box>
                  {createCylinderLines.length > 1 && (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => handleRemoveCylinderLine(idx)}
                      style={{ marginBottom: 4 }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </Group>
              ))}

              <Button
                variant="subtle"
                size="xs"
                color="burgundy"
                leftSection={<IconPlus size={14} />}
                onClick={handleAddCylinderLine}
                style={{ alignSelf: 'flex-start', color: '#800020', fontWeight: 600 }}
              >
                + Add Cylinder Line
              </Button>

              {/* Cylinder Totals Card (Mobile App End Shift Summary Segmented Style) */}
              <Box
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  backgroundColor: '#f8fafc',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  marginTop: 6,
                  overflow: 'hidden',
                }}
              >
                {/* 1. Filled Cylinders */}
                <Box style={{ padding: '8px 14px', borderRight: '1px solid #e2e8f0' }}>
                  <Text size="10px" fw={800} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                    FILLED CYLINDERS
                  </Text>
                  <Group gap={6} align="baseline" mt={2}>
                    <Text size="lg" fw={800} c="#0f172a" style={{ lineHeight: 1 }}>
                      {totalModalFilled}
                    </Text>
                    <Text size="xs" fw={700} c="#64748b">
                      Full
                    </Text>
                  </Group>
                </Box>

                {/* 2. Empty Returns */}
                <Box style={{ padding: '8px 14px', borderRight: '1px solid #e2e8f0' }}>
                  <Text size="10px" fw={800} c="#800020" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                    EMPTY RETURNS
                  </Text>
                  <Group gap={6} align="baseline" mt={2}>
                    <Text size="lg" fw={800} c="#800020" style={{ lineHeight: 1 }}>
                      {totalModalEmpty}
                    </Text>
                    <Text size="xs" fw={700} c="#800020">
                      Empties
                    </Text>
                  </Group>
                </Box>

                {/* 3. Total Check-in */}
                <Box style={{ padding: '8px 14px' }}>
                  <Text size="10px" fw={800} c="#0f172a" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                    TOTAL CHECK-IN
                  </Text>
                  <Group gap={6} align="baseline" mt={2}>
                    <Text size="lg" fw={800} c="#0f172a" style={{ lineHeight: 1 }}>
                      {totalModalFilled + totalModalEmpty}
                    </Text>
                    <Text size="xs" fw={700} c="#64748b">
                      Cylinders
                    </Text>
                  </Group>
                </Box>
              </Box>
            </Stack>

            {/* Section 2: Other Products / Appliances Returned */}
            <Divider
              label={
                <Text size="xs" fw={700} style={{ color: '#800020' }}>
                  2. Other Products Returned (Stoves & Accessories)
                </Text>
              }
              labelPosition="left"
            />

            <Stack gap="xs">
              {createOtherLines.map((line, idx) => (
                <Group key={idx} align="flex-end" wrap="nowrap" gap="sm">
                  <Box style={{ flex: 6 }}>
                    <Select
                      label={idx === 0 ? 'Product (Stove / Accessory)' : undefined}
                      placeholder="Choose Product"
                      data={otherProductOptions}
                      value={line.productId > 0 ? String(line.productId) : null}
                      onChange={(val) => handleOtherProductChange(idx, val)}
                      searchable
                      nothingFoundMessage="No other products found"
                      comboboxProps={{ withinPortal: true, zIndex: 1000 }}
                    />
                  </Box>
                  <Box style={{ flex: 4 }}>
                    <NumberInput
                      label={idx === 0 ? 'Remaining Qty Returned' : undefined}
                      placeholder="Count"
                      min={0}
                      value={line.qty}
                      onChange={(val) => handleOtherQtyChange(idx, val)}
                    />
                  </Box>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={() => handleRemoveOtherLine(idx)}
                    style={{ marginBottom: 4 }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}

              <Button
                variant="subtle"
                size="xs"
                color="burgundy"
                leftSection={<IconPlus size={14} />}
                onClick={handleAddOtherLine}
                style={{ alignSelf: 'flex-start', color: '#800020', fontWeight: 600 }}
              >
                + Add Other Product
              </Button>

              {createOtherLines.length > 0 && (
                <Box
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    backgroundColor: '#f8fafc',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    marginTop: 6,
                    overflow: 'hidden',
                  }}
                >
                  {/* 1. SKUs Count */}
                  <Box style={{ padding: '8px 14px', borderRight: '1px solid #e2e8f0' }}>
                    <Text size="10px" fw={800} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                      PRODUCTS COUNT
                    </Text>
                    <Group gap={6} align="baseline" mt={2}>
                      <Text size="lg" fw={800} c="#0f172a" style={{ lineHeight: 1 }}>
                        {createOtherLines.filter((l) => (Number(l.qty) || 0) > 0).length}
                      </Text>
                      <Text size="xs" fw={700} c="#64748b">
                        Active SKUs
                      </Text>
                    </Group>
                  </Box>

                  {/* 2. Total Units Returned */}
                  <Box style={{ padding: '8px 14px' }}>
                    <Text size="10px" fw={800} c="#800020" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                      TOTAL ITEMS RETURNED
                    </Text>
                    <Group gap={6} align="baseline" mt={2}>
                      <Text size="lg" fw={800} c="#800020" style={{ lineHeight: 1 }}>
                        {totalModalOther}
                      </Text>
                      <Text size="xs" fw={700} c="#800020">
                        Units
                      </Text>
                    </Group>
                  </Box>
                </Box>
              )}
            </Stack>

            {/* Section 3: Route Collections & Settlement */}
            <Divider
              label={
                <Text size="xs" fw={700} style={{ color: '#800020' }}>
                  3. Route Collections & Settlement
                </Text>
              }
              labelPosition="left"
            />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <NumberInput
                label="Cash Collected (₹)"
                placeholder="0.00"
                min={0}
                decimalScale={2}
                value={createCash}
                onChange={setCreateCash}
              />
              <NumberInput
                label="Digital / UPI Collected (₹)"
                placeholder="0.00"
                min={0}
                decimalScale={2}
                value={createDigital}
                onChange={setCreateDigital}
              />
            </SimpleGrid>

            {/* Route Collections KPI summary card matching mobile app */}
            <Box
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                backgroundColor: '#f8fafc',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                marginTop: 4,
                overflow: 'hidden',
              }}
            >
              {/* Cash */}
              <Box style={{ padding: '8px 14px', borderRight: '1px solid #e2e8f0' }}>
                <Text size="10px" fw={800} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                  CASH IN HAND
                </Text>
                <Group gap={4} align="baseline" mt={2}>
                  <Text size="lg" fw={800} c="#800020" style={{ lineHeight: 1 }}>
                    ₹{Number(createCash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Group>
              </Box>

              {/* Digital */}
              <Box style={{ padding: '8px 14px', borderRight: '1px solid #e2e8f0' }}>
                <Text size="10px" fw={800} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                  BANK / UPI
                </Text>
                <Group gap={4} align="baseline" mt={2}>
                  <Text size="lg" fw={800} c="#0f172a" style={{ lineHeight: 1 }}>
                    ₹{Number(createDigital || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Group>
              </Box>

              {/* Total Settlement */}
              <Box style={{ padding: '8px 14px' }}>
                <Text size="10px" fw={800} c="#0f172a" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                  TOTAL SETTLEMENT
                </Text>
                <Group gap={4} align="baseline" mt={2}>
                  <Text size="lg" fw={800} c="#0f172a" style={{ lineHeight: 1 }}>
                    ₹{(Number(createCash || 0) + Number(createDigital || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </Group>
              </Box>
            </Box>

            {/* Bottom Actions matching Vehicles page */}
            <Group justify="flex-end" mt="md" gap="sm">
              <Button variant="default" onClick={() => setIsCreateModalOpen(false)} radius={10}>
                Cancel
              </Button>
              <Button
                variant="outline"
                radius={10}
                style={{ borderColor: '#800020', color: '#800020', fontWeight: 600 }}
                loading={createReceiptNoteMutation.isPending}
                onClick={() => createReceiptNoteMutation.mutate(false)}
              >
                Save as Pending
              </Button>
              <Button
                color="burgundy"
                radius={10}
                style={{ backgroundColor: '#800020', color: '#ffffff', fontWeight: 600 }}
                loading={createReceiptNoteMutation.isPending}
                onClick={() => createReceiptNoteMutation.mutate(true)}
              >
                Save & Settle Note
              </Button>
            </Group>
          </Stack>
        </Paper>
        </Collapse>

        {/* Animated KPI Cards & Table (fade in/out matching Vehicles page) */}
        <Transition mounted={!isCreateModalOpen} transition="fade" duration={250} timingFunction="ease">
          {(styles) => (
            <Box style={styles} mt={isCreateModalOpen ? 0 : 'md'}>
              <Stack gap="lg">
                {/* Top 4 Metric KPI Cards: Settled First, Pending Second, Returns (Filled & Empty) Third */}
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
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(0, 0, 0, 0.06)';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div>
            <Group justify="space-between" align="center" mb="xs">
              <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                Settled Notes
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
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(0, 0, 0, 0.06)';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div>
            <Group justify="space-between" align="center" mb="xs">
              <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                Pending Verification
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
            {pendingCount > 0 && (
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
                    height: 20,
                    padding: '0 6px',
                  },
                }}
              >
                Action Req.
              </Badge>
            )}
          </Group>
        </Paper>

        {/* Card 3: Returns (Split into Filled and Empty) */}
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
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(0, 0, 0, 0.06)';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div>
            <Group justify="space-between" align="center" mb="xs">
              <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                Returns
              </Text>
              <IconPackage size={20} color="#800020" stroke={1.75} />
            </Group>
            <Group gap="md" align="baseline" wrap="nowrap">
              <Group gap={6} align="baseline" wrap="nowrap">
                <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {totalFilledReceived.toLocaleString()}
                </Text>
                <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ fontSize: 10, letterSpacing: '0.4px' }}>
                  Filled
                </Text>
              </Group>

              <Divider orientation="vertical" style={{ borderColor: '#e2e8f0', height: 18, alignSelf: 'center' }} />

              <Group gap={6} align="baseline" wrap="nowrap">
                <Text fw={700} style={{ color: '#800020', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {totalEmptiesReceived.toLocaleString()}
                </Text>
                <Text size="xs" fw={700} style={{ color: '#800020', fontSize: 10, letterSpacing: '0.4px' }} tt="uppercase">
                  Empty
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
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(0, 0, 0, 0.06)';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div>
            <Group justify="space-between" align="center" mb="xs">
              <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                Route Collections
              </Text>
              <IconCash size={20} color="#800020" stroke={1.75} />
            </Group>
            <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              ₹{totalCollections.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </div>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate>
              Cash and digital route collections
            </Text>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* 3. Main Table Container matching System Tables */}
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
                    height: 22,
                  },
                }}
              >
                {filteredNotes.length} Notes
              </Badge>
            </Group>
            <Text size="xs" c="dimmed" mt={2}>
              Review driver returns, verify empty cylinder counts, and accept inventory into Central Godown
            </Text>
          </div>

          <Group gap="xs" align="center" wrap="wrap">
            {/* Filter Toggle: Settled first, then Pending, then All */}
            <SegmentedControl
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              data={[
                {
                  label: (
                    <span
                      style={{
                        color: statusFilter === 'settled' ? '#800020' : '#475569',
                        fontWeight: statusFilter === 'settled' ? 700 : 500,
                        fontSize: 12,
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
                        color: statusFilter === 'pending' ? '#800020' : '#475569',
                        fontWeight: statusFilter === 'pending' ? 700 : 500,
                        fontSize: 12,
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
                        color: statusFilter === 'all' ? '#800020' : '#475569',
                        fontWeight: statusFilter === 'all' ? 700 : 500,
                        fontSize: 12,
                        transition: 'color 150ms ease',
                      }}
                    >
                      All ({receiptNotes.length})
                    </span>
                  ),
                  value: 'all',
                },
              ]}
              radius="sm"
              size="xs"
              transitionDuration={250}
              transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
              styles={{
                root: {
                  backgroundColor: '#f1f5f9',
                  padding: 3,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                },
                indicator: {
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
                  borderRadius: 6,
                },
                label: {
                  padding: '4px 12px',
                },
              }}
            />

            {/* Search Input matching System */}
            <TextInput
              placeholder="Search receipt notes, vehicles, drivers..."
              size="xs"
              radius="md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={14} stroke={1.5} color="#800020" />}
              rightSection={searchQuery ? <CloseButton size="xs" onClick={() => setSearchQuery('')} /> : null}
              style={{ width: 230 }}
              styles={{
                input: {
                  height: 32,
                  minHeight: 32,
                  fontSize: 12,
                  borderColor: '#e2e8f0',
                  backgroundColor: '#ffffff',
                  '&:focus': { borderColor: '#800020' },
                },
              }}
            />
          </Group>
        </Group>

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
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', width: 130 }}>
                    DELIVERY REF
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 170 }}>
                    RETURNS
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 150 }}>
                    TOTAL COLLECTED
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', width: 120 }}>
                    STATUS
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 110 }}>
                    ACTIONS
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredNotes.map((note) => {
                  const isPending = note.status === 'pending';

                  return (
                    <Table.Tr key={note.id} style={{ height: 46 }}>
                      {/* Note # & Time */}
                      <Table.Td>
                        <Stack gap={1}>
                          <Text size="sm" fw={700} style={{ color: '#800020' }}>
                            {note.noteNumber}
                          </Text>
                          <Group gap={4} wrap="nowrap">
                            <IconClock size={11} color="#64748b" />
                            <Text size="xs" c="dimmed">
                              {note.time ? `${note.time} • ` : ''}{note.date}
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
                              fontWeight: 600,
                            },
                          }}
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
                                height: 20,
                              },
                            }}
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
                                height: 20,
                              },
                            }}
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

                      {/* Total Collections */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text fw={700} size="sm" style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          ₹{(note.cashCollected + note.digitalCollected).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Cash: ₹{note.cashCollected.toLocaleString('en-IN')}
                          {note.digitalCollected > 0 && ` • Bank: ₹${note.digitalCollected.toLocaleString('en-IN')}`}
                        </Text>
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
                              letterSpacing: '0.3px',
                            },
                          }}
                        >
                          {isPending ? 'Pending Review' : 'Settled'}
                        </Badge>
                      </Table.Td>

                      {/* Actions */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="View Details" withArrow position="top">
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              onClick={() => {
                                setSelectedNote(note);
                                setIsDetailModalOpen(true);
                              }}
                              style={{ color: '#475569' }}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>

                          {isPending && (
                            <Tooltip label="Verify & Settle into Godown" withArrow position="top">
                              <ActionIcon
                                variant="subtle"
                                color="burgundy"
                                size="sm"
                                onClick={() => verifyNoteMutation.mutate(note.deliveryNoteId)}
                                loading={verifyNoteMutation.isPending}
                                style={{ color: '#800020' }}
                              >
                                <IconCheck size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}

                          <Tooltip label="Print Note" withArrow position="top">
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              onClick={() => {
                                notifications.show({
                                  message: `Receipt Note ${note.noteNumber} prepared for printing.`,
                                  color: 'burgundy',
                                });
                              }}
                              style={{ color: '#475569' }}
                            >
                              <IconPrinter size={16} />
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
            </Stack>
          </Box>
        )}
      </Transition>
    </Box>

      {/* 4. Detail & Verification Modal */}
      <Modal
        opened={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={
          <Group gap="xs">
            <IconReceipt size={20} color="#800020" />
            <Text fw={700} style={{ color: '#800020', fontSize: 16 }}>
              Receipt Note - {selectedNote?.noteNumber}
            </Text>
          </Group>
        }
        size="lg"
        radius="md"
      >
        {selectedNote && (
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

            <Divider label="Returned Cylinders" labelPosition="left" />

            <Table withTableBorder withColumnBorders>
              <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                <Table.Tr>
                  <Table.Th style={{ fontSize: 11.5, color: '#475569' }}>PRODUCT</Table.Th>
                  <Table.Th style={{ fontSize: 11.5, color: '#0f172a', textAlign: 'right' }}>FILLED (UNSOLD)</Table.Th>
                  <Table.Th style={{ fontSize: 11.5, color: '#800020', textAlign: 'right' }}>EMPTY RETURNED</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(() => {
                  const prods = Array.from(new Set([
                    ...(selectedNote.emptyBreakdown || []).map((e) => e.product),
                    ...(selectedNote.filledBreakdown || []).map((f) => f.product),
                  ]));
                  if (prods.length === 0) {
                    return (
                      <Table.Tr>
                        <Table.Td colSpan={3} style={{ textAlign: 'center' }}>
                          <Text size="xs" c="dimmed">No specific cylinder lines recorded.</Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  }
                  return prods.map((pName, idx) => {
                    const eItem = selectedNote.emptyBreakdown?.find((e) => e.product === pName);
                    const fItem = selectedNote.filledBreakdown?.find((f) => f.product === pName);
                    return (
                      <Table.Tr key={idx}>
                        <Table.Td style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{pName}</Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {fItem ? fItem.qty : 0}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 700, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                          {eItem ? eItem.qty : 0}
                        </Table.Td>
                      </Table.Tr>
                    );
                  });
                })()}
              </Table.Tbody>
            </Table>

            <Divider label="Collections & Settlements" labelPosition="left" />

            <SimpleGrid cols={2} spacing="sm">
              <Paper p="xs" radius="sm" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                <Text size="xs" c="dimmed">Cash Collections</Text>
                <Text fw={700} size="md" c="#0f172a">
                  ₹{selectedNote.cashCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </Paper>
              <Paper p="xs" radius="sm" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                <Text size="xs" c="dimmed">Digital / Bank Collections</Text>
                <Text fw={700} size="md" c="#0f172a">
                  ₹{selectedNote.digitalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </Paper>
            </SimpleGrid>

            {selectedNote.notes && (
              <Text size="xs" c="dimmed">
                <strong>Gate Remarks:</strong> {selectedNote.notes}
              </Text>
            )}

            <Group justify="space-between" mt="sm">
              <Button variant="default" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
              {selectedNote.status === 'pending' && (
                <Button
                  color="burgundy"
                  leftSection={<IconCheck size={16} />}
                  onClick={() => verifyNoteMutation.mutate(selectedNote.deliveryNoteId)}
                  loading={verifyNoteMutation.isPending}
                  styles={{ root: { backgroundColor: '#800020', fontWeight: 600 } }}
                >
                  Verify & Accept into Godown
                </Button>
              )}
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default ReceiptNotesPage;
