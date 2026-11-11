import React, { useState, useMemo } from 'react';
import {
  Title,
  Text,
  Paper,
  SimpleGrid,
  Group,
  Stack,
  Badge,
  Button,
  Table,
  ScrollArea,
  Loader,
  Center,
  Box,
  TextInput,
  CloseButton,
  Grid,
  ActionIcon,
  SegmentedControl,
  Modal,
  Select,
  NumberInput,
} from '@mantine/core';
import {
  IconBuildingFactory2,
  IconTruckDelivery,
  IconPackage,
  IconSearch,
  IconRefresh,
  IconTruck,
  IconArrowUpRight,
  IconArrowLeft,
  IconChevronRight,
  IconPlus,
  IconCheck,
} from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
interface VanProduct {
  ProductId: number;
  ProductName: string;
  AppProductName?: string;
  Qty: number;
  SalesPrice: number;
}
interface AllocatedVan {
  RouteVehicleDriverId?: number | null;
  VehicleId?: number;
  VehicleNumber: string;
  RouteName: string;
  DriverName: string;
  TotalCylinders: number;
  EstimatedValue: number;
  Products: VanProduct[];
}
interface ProductVanDetail {
  RouteVehicleDriverId: number;
  VehicleNumber: string;
  RouteName: string;
  DriverName: string;
  AllocatedQty?: number;
  DeliveredQty?: number;
  BalanceQty?: number;
  EmptyQty?: number;
  Qty: number;
}
interface ProductStockItem {
  ProductId: number;
  ProductName: string;
  AppProductName?: string;
  ProductCode: string;
  UnitName: string;
  AltUnitName?: string;
  UnitConversion?: number;
  AltQty?: number;
  SalesPrice: number;
  PurchasePrice: number;
  Rate: number;
  GodownQty: number;
  GodownFilledQty?: number;
  GodownEmptyQty?: number;
  AllocatedQty: number;
  FilledQty?: number;
  EmptyQty?: number;
  TotalStockQty?: number;
  TotalQty: number;
  TotalValue: number;
  AllocationRate: number;
  IsCylinder?: boolean;
  Vans: ProductVanDetail[];
}
interface StockLocationProduct {
  ProductId: number;
  ProductName: string;
  ProductCode: string;
  UnitName: string;
  CategoryName?: string;
  IsCylinder?: boolean;
  AllocatedQty?: number;
  DeliveredQty?: number;
  BalanceQty?: number;
  EmptyQty?: number;
  Qty: number;
}
interface StockLocation {
  id: string;
  name: string;
  description: string;
  type: 'godown' | 'vehicle';
  driverName?: string;
  routeName?: string;
  quantity: number;
  filledQuantity?: number;
  emptyQuantity?: number;
  allocatedCylinders?: number;
  deliveredCylinders?: number;
  balanceCylinders?: number;
  emptyCylinders?: number;
  otherProductsAllocated?: number;
  otherProductsDelivered?: number;
  otherProductsBalance?: number;
  products: StockLocationProduct[];
}
interface RecentDispatchNote {
  DeliveryNoteId: number;
  DeliveryNoteNo: string;
  DeliveryDate: string;
  VehicleNumber: string;
  RouteName: string;
  DriverName: string;
  TotalCylinders: number;
  Status: string;
}
interface PendingReceiptLine {
  LineId: number;
  ProductId: number | null;
  ProductName: string;
  Quantity: number;
  EmptyReturnedQty: number;
}

interface PendingReceiptNote {
  DeliveryNoteId: number;
  DeliveryNoteNo: string;
  DeliveryDate: string;
  AllocationId: number;
  VehicleNumber: string;
  DriverName: string;
  RouteName: string;
  TotalFull: number;
  TotalEmpties: number;
  Remarks: string;
  Lines: PendingReceiptLine[];
  CreatedTime: string;
}

interface TodayDeliveryItem {
  ProductName: string;
  Qty: number;
  Rate: number;
}

interface TodayDelivery {
  TicketNumber: string;
  AllocationId: number;
  VehicleNumber: string;
  DriverName: string;
  CustomerName: string;
  PaymentMethod: string;
  DeliveredCylinders: number;
  EmptyReturns: number;
  TotalAmount: number;
  Time: string;
  Items: TodayDeliveryItem[];
}

interface StockAnalysisResponse {
  summary: {
    total_system_cylinders: number;
    total_godown_cylinders: number;
    total_allocated_cylinders: number;
    total_system_value: number;
    active_vans_count: number;
    total_registered_vans: number;
    godown_percentage: number;
    allocated_percentage: number;
    today_deliveries_count?: number;
    pending_receipts_count?: number;
    last_sync_time?: string;
  };
  products: ProductStockItem[];
  all_vans?: AllocatedVan[];
  active_vans: AllocatedVan[];
  idle_vans: AllocatedVan[];
  recent_notes: RecentDispatchNote[];
  pending_receipt_notes?: PendingReceiptNote[];
  today_deliveries?: TodayDelivery[];
  last_sync_time?: string;
}
const EMPTY_PRODUCT_STOCK: ProductStockItem[] = [];
export const StockAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const productParam = searchParams.get('product');
  const locationParam = searchParams.get('location');

  // Section-specific search states (compact, non-spoiling inputs)
  const [productSearch, setProductSearch] = useState<string>('');
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [allocationSearch, setAllocationSearch] = useState<string>('');
  const [storedProductSearch, setStoredProductSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'cylinders' | 'other'>('all');
  const queryClient = useQueryClient();

  // Add Godown Stock / Opening Stock Modal State
  const [addStockModalOpened, setAddStockModalOpened] = useState(false);
  const [selectedStockProdId, setSelectedStockProdId] = useState<string | null>(null);
  const [filledStockInput, setFilledStockInput] = useState<number | ''>('');
  const [emptyStockInput, setEmptyStockInput] = useState<number | ''>('');
  const [stockRemarks, setStockRemarks] = useState('Initial Godown Opening Stock');
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);

  const handleSaveGodownStock = async () => {
    if (!selectedStockProdId) {
      notifications.show({ title: 'Validation', message: 'Please select a product/cylinder.', color: 'red' });
      return;
    }
    const fQty = Number(filledStockInput) || 0;
    const eQty = Number(emptyStockInput) || 0;
    if (fQty <= 0 && eQty <= 0) {
      notifications.show({ title: 'Validation', message: 'Please enter at least a filled or empty quantity.', color: 'red' });
      return;
    }

    try {
      setIsSubmittingStock(true);
      const res = await apiClient.post('/delivery-notes/add-godown-stock/', {
        product_id: Number(selectedStockProdId),
        filled_quantity: fQty,
        empty_quantity: eQty,
        remarks: stockRemarks,
      });

      notifications.show({
        title: 'Stock Added to Godown',
        message: res.data?.message || 'Successfully deposited stock to Central Godown.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setAddStockModalOpened(false);
      setSelectedStockProdId(null);
      setFilledStockInput('');
      setEmptyStockInput('');
      setStockRemarks('Initial Godown Opening Stock');

      queryClient.invalidateQueries({ queryKey: ['stock-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['godown-stock'] });
      refetch();
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.detail || 'Failed to add godown stock.',
        color: 'red',
      });
    } finally {
      setIsSubmittingStock(false);
    }
  };
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<StockAnalysisResponse>({
    queryKey: ['stock-analysis'],
    queryFn: async () => {
      const res = await apiClient.get<StockAnalysisResponse>('/delivery-notes/stock-analysis/');
      return res.data;
    },
    refetchInterval: 5000,
  });
  const products = data?.products ?? EMPTY_PRODUCT_STOCK;
  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    const list = !q
      ? products
      : products.filter(
          (p) =>
            p.ProductName.toLowerCase().includes(q) ||
            (p.AppProductName && p.AppProductName.toLowerCase().includes(q)) ||
            p.ProductCode.toLowerCase().includes(q)
        );
    return [...list].sort((a: any, b: any) => {
      const aIsCyl = a.IsCylinder !== false && (a.IsCylinder === true || /cylinder|lpg|kg/i.test(a.ProductName || ''));
      const bIsCyl = b.IsCylinder !== false && (b.IsCylinder === true || /cylinder|lpg|kg/i.test(b.ProductName || ''));
      if (aIsCyl && !bIsCyl) return -1;
      if (!aIsCyl && bIsCyl) return 1;
      return (a.ProductName || '').localeCompare(b.ProductName || '');
    });
  }, [products, productSearch]);
  const inventoryLocations = useMemo<StockLocation[]>(() => {
    const godownProducts: StockLocationProduct[] = products
      .filter((product) => {
        const isCyl = product.IsCylinder !== false && (product.IsCylinder === true || /cylinder|lpg|kg/i.test(product.ProductName || ''));
        const emptyInGodown = product.GodownEmptyQty ?? (isCyl && (!product.Vans || product.Vans.every(v => (v.EmptyQty || 0) === 0)) ? (product.EmptyQty || 0) : 0);
        return (product.GodownQty || 0) > 0 || emptyInGodown > 0;
      })
      .map((product) => {
        const isCyl = product.IsCylinder !== false && (product.IsCylinder === true || /cylinder|lpg|kg/i.test(product.ProductName || ''));
        const emptyInGodown = product.GodownEmptyQty ?? (isCyl && (!product.Vans || product.Vans.every(v => (v.EmptyQty || 0) === 0)) ? (product.EmptyQty || 0) : 0);
        const filled = product.GodownQty || 0;
        return {
          ProductId: product.ProductId,
          ProductName: product.ProductName,
          ProductCode: product.ProductCode,
          UnitName: isCyl ? 'Cyl' : (product.UnitName || 'Nos'),
          Qty: filled + (isCyl ? emptyInGodown : 0),
          AllocatedQty: filled,
          DeliveredQty: 0,
          BalanceQty: filled,
          EmptyQty: isCyl ? emptyInGodown : 0,
          IsCylinder: isCyl,
        };
      })
      .sort((a, b) => {
        const aIsCyl = a.IsCylinder !== false;
        const bIsCyl = b.IsCylinder !== false;
        if (aIsCyl && !bIsCyl) return -1;
        if (!aIsCyl && bIsCyl) return 1;
        return (a.ProductName || '').localeCompare(b.ProductName || '');
      });

    const godownFilled = godownProducts.reduce((total, product) => total + (product.BalanceQty || 0), 0);
    const godownEmpty = godownProducts.reduce((total, product) => total + (product.EmptyQty || 0), 0);
    const godown: StockLocation = {
      id: 'godown',
      name: 'Central Godown',
      description: 'Main warehouse facility',
      type: 'godown',
      filledQuantity: godownFilled,
      emptyQuantity: godownEmpty,
      emptyCylinders: godownEmpty,
      quantity: godownFilled + godownEmpty,
      products: godownProducts,
    };

    const vansSource = (data?.all_vans && data.all_vans.length > 0)
      ? data.all_vans
      : [...(data?.active_vans || []), ...(data?.idle_vans || [])];

    // Ensure uniqueness by RouteVehicleDriverId or VehicleNumber
    const seenKeys = new Set<string>();
    const uniqueVans: any[] = [];
    for (const v of vansSource) {
      const key = String(v.RouteVehicleDriverId || v.VehicleNumber || v.VehicleId);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueVans.push(v);
      }
    }

    const allVansList: StockLocation[] = uniqueVans.map((van: any) => {
      const vanFilled = (van.BalanceCylinders ?? van.TotalCylinders ?? 0) + (van.OtherProductsBalance ?? 0);
      const vanEmpty = van.EmptyCylinders ?? 0;
      return {
        id: `vehicle-${van.RouteVehicleDriverId || van.VehicleNumber}`,
        name: van.VehicleNumber || 'Delivery Van',
        description: [van.RouteName, van.DriverName].filter(Boolean).join(' - ') || 'Delivery Vehicle',
        type: 'vehicle' as const,
        driverName: van.DriverName || 'Unassigned',
        routeName: van.RouteName || 'Unassigned',
        filledQuantity: vanFilled,
        emptyQuantity: vanEmpty,
        quantity: vanFilled + vanEmpty,
        allocatedCylinders: van.AllocatedCylinders ?? 0,
        deliveredCylinders: van.DeliveredCylinders ?? 0,
        balanceCylinders: van.BalanceCylinders ?? van.TotalCylinders ?? 0,
        emptyCylinders: van.EmptyCylinders ?? 0,
        otherProductsAllocated: van.OtherProductsAllocated ?? 0,
        otherProductsDelivered: van.OtherProductsDelivered ?? 0,
        otherProductsBalance: van.OtherProductsBalance ?? 0,
        products: (van.Products || []).map((p: any) => ({
          ProductId: p.ProductId,
          ProductName: p.ProductName,
          ProductCode: p.ProductCode || '—',
          UnitName: p.IsCylinder ? 'Cyl' : 'Nos',
          CategoryName: p.CategoryName,
          IsCylinder: p.IsCylinder ?? true,
          AllocatedQty: p.AllocatedQty ?? p.Qty,
          DeliveredQty: p.DeliveredQty ?? 0,
          BalanceQty: p.BalanceQty ?? p.Qty,
          EmptyQty: p.EmptyQty ?? 0,
          Qty: (p.BalanceQty ?? p.Qty) + (p.EmptyQty ?? 0),
        })),
      };
    });

    return [godown, ...allVansList];
  }, [products, data?.active_vans, data?.idle_vans, data?.all_vans]);

  const filteredLocations = useMemo(() => {
    const q = locationSearch.toLowerCase().trim();
    if (!q) return inventoryLocations;
    return inventoryLocations.filter(
      (location) =>
        location.name.toLowerCase().includes(q) ||
        location.description.toLowerCase().includes(q) ||
        location.products.some(
          (product) =>
            product.ProductName.toLowerCase().includes(q) ||
            product.ProductCode.toLowerCase().includes(q)
        )
    );
  }, [inventoryLocations, locationSearch]);

  const selectedProduct = useMemo(() => {
    if (!productParam) return null;
    return products.find((p) => String(p.ProductId) === productParam) || null;
  }, [productParam, products]);

  const selectedLocation = useMemo(() => {
    if (!locationParam) return null;
    return inventoryLocations.find((l) => l.id === locationParam) || null;
  }, [locationParam, inventoryLocations]);

  const totalProductFilled = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + (Number(p.FilledQty ?? (p.GodownQty + (p.AllocatedQty || 0))) || 0), 0);
  }, [filteredProducts]);

  const totalProductEmpty = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + (Number(p.EmptyQty) || 0), 0);
  }, [filteredProducts]);

  const totalLocationFilled = useMemo(() => {
    return filteredLocations.reduce((sum, l) => sum + (Number(l.filledQuantity) || 0), 0);
  }, [filteredLocations]);

  const totalLocationEmpty = useMemo(() => {
    return filteredLocations.reduce((sum, l) => sum + (Number(l.emptyQuantity) || 0), 0);
  }, [filteredLocations]);

  const summary = data?.summary || {
    total_system_cylinders: 0,
    total_godown_cylinders: 0,
    total_allocated_cylinders: 0,
    total_system_value: 0,
    active_vans_count: 0,
    total_registered_vans: 0,
    godown_percentage: 0,
    allocated_percentage: 0,
  };



  // ==========================================
  // DETAIL SCREEN 1: PRODUCT ALLOCATION BREAKDOWN
  // ==========================================
  if (selectedProduct) {
    const altTotal = selectedProduct.AltQty ?? ((selectedProduct.TotalQty || 0) * (selectedProduct.UnitConversion || 1));
    const altUnit = selectedProduct.AltUnitName || 'KG';
    const totalQty = selectedProduct.TotalQty || 0;
    const isCyl = selectedProduct.IsCylinder !== false && (selectedProduct.IsCylinder === true || /cylinder|lpg|kg/i.test(selectedProduct.ProductName || ''));

    const godownEmptyForSelected = selectedProduct.GodownEmptyQty ?? (
      isCyl && (!selectedProduct.Vans || selectedProduct.Vans.every((v) => (v.EmptyQty || 0) === 0))
        ? (selectedProduct.EmptyQty || 0)
        : 0
    );

    const isGodownMatch = ((selectedProduct.GodownQty || 0) > 0 || godownEmptyForSelected > 0) && (
      !allocationSearch.trim() ||
      'central godown'.includes(allocationSearch.toLowerCase().trim()) ||
      'main storage godown'.includes(allocationSearch.toLowerCase().trim()) ||
      'godown'.includes(allocationSearch.toLowerCase().trim())
    );

    const filteredVans = selectedProduct.Vans.filter((van) => {
      const q = allocationSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        van.VehicleNumber.toLowerCase().includes(q) ||
        (van.RouteName && van.RouteName.toLowerCase().includes(q)) ||
        (van.DriverName && van.DriverName.toLowerCase().includes(q))
      );
    });

    const filteredAllocationsCount = (isGodownMatch ? 1 : 0) + filteredVans.length;
    const totalFilledAlloc = (isGodownMatch ? (selectedProduct.GodownQty || 0) : 0) + filteredVans.reduce((sum, v) => sum + (v.BalanceQty ?? v.Qty), 0);
    const totalEmptyAlloc = (isGodownMatch ? godownEmptyForSelected : 0) + filteredVans.reduce((sum, v) => sum + (v.EmptyQty ?? 0), 0);
    const filteredAllocationsTotalQty = totalFilledAlloc + totalEmptyAlloc;

    return (
      <Stack gap="lg">
        {/* Navigation & Header */}
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="sm" align="center">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={() => {
                setSearchParams({});
                setAllocationSearch('');
              }}
              title="Back to Stock Analysis"
              style={{ color: '#0f172a' }}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Group gap="xs" align="center">
                <Text size="sm" c="#64748b" ff="monospace" fw={700}>
                  {selectedProduct.ProductCode || '—'}
                </Text>
                <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
                  {selectedProduct.ProductName}
                </Title>
              </Group>
              <Text size="xs" c="dimmed">
                Detailed cylinder stock and allocation across central warehouse & delivery fleet
              </Text>
            </div>
          </Group>
        </Group>
        {/* Product Metric KPI Cards */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Stock Available
            </Text>
            <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={4}>
              {totalQty}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Converted weight: <strong style={{ color: '#800020' }}>{altTotal} {altUnit}</strong>
            </Text>
          </Paper>
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Purchase Rate & Cost
            </Text>
            <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={4}>
              ₹{(selectedProduct.Rate ?? selectedProduct.PurchasePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              <Text component="span" size="xs" c="dimmed" fw={600} ml={4}>/ {altUnit}</Text>
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Unit conversion: <strong style={{ color: '#800020' }}>{selectedProduct.UnitConversion || 1} {altUnit} / Cyl</strong>
            </Text>
          </Paper>
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Stock Valuation
            </Text>
            <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={4}>
              ₹{selectedProduct.TotalValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Formula: {altTotal} {altUnit} &times; ₹{(selectedProduct.Rate ?? selectedProduct.PurchasePrice).toFixed(2)}
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Detailed Allocations Table */}
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
          <Group justify="space-between" align="center" p="md" px="lg" style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
            <div>
              <Group gap="xs" align="center">
                <Text fw={700} style={{ color: '#0f172a', fontSize: 16.5, letterSpacing: '-0.01em' }}>
                  Storage & Distribution Allocation
                </Text>
                <Badge
                  variant="light"
                  color="gray"
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
                  {filteredAllocationsCount} Locations
                </Badge>
              </Group>
              <Text size="xs" c="#64748b" mt={2}>
                Live stock presence across Central Godown and active delivery vehicles
              </Text>
            </div>
            <Group gap="xs" align="center">
              <TextInput
                placeholder="Search allocations..."
                size="xs"
                radius="md"
                value={allocationSearch}
                onChange={(e) => setAllocationSearch(e.currentTarget.value)}
                leftSection={<IconSearch size={14} stroke={1.5} color="#64748b" />}
                rightSection={allocationSearch ? <CloseButton size="xs" onClick={() => setAllocationSearch('')} /> : null}
                style={{ width: 210 }}
                styles={{
                  input: {
                    height: 34,
                    minHeight: 34,
                    fontSize: 12.5,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#ffffff',
                    '&:focus': { borderColor: '#800020' },
                  },
                }}
              />
            </Group>
          </Group>

          <Table.ScrollContainer minWidth={600}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    LOCATION
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ROUTE / DRIVER
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 110 }}>
                    FILLED
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 110 }}>
                    EMPTY
                  </Table.Th>
                  <Table.Th style={{ color: '#0f172a', fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 120 }}>
                    TOTAL
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isGodownMatch && (
                  <Table.Tr style={{ height: 44 }}>
                    <Table.Td>
                      <Group gap={8}>
                        <IconBuildingFactory2 size={16} color="#800020" />
                        <Text size="sm" fw={700} c="#0f172a">Central Godown</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">Main Storage Godown</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {selectedProduct.GodownQty || 0}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: isCyl ? '#475569' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {isCyl ? godownEmptyForSelected : '—'}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#000000', fontVariantNumeric: 'tabular-nums' }}>
                      {(selectedProduct.GodownQty || 0) + (isCyl ? godownEmptyForSelected : 0)}
                    </Table.Td>
                  </Table.Tr>
                )}
                {filteredVans.map((van) => {
                  const filled = van.BalanceQty ?? van.Qty;
                  const empty = van.EmptyQty ?? 0;
                  const total = filled + empty;
                  return (
                    <Table.Tr key={van.RouteVehicleDriverId} style={{ height: 44 }}>
                      <Table.Td>
                        <Group gap={8}>
                          <IconTruck size={16} color="#800020" />
                          <Text size="sm" fw={700} c="#0f172a">{van.VehicleNumber}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="#0f172a" fw={600}>
                          {van.RouteName || '—'}
                        </Text>
                        {van.DriverName && (
                          <Text size="xs" c="dimmed">
                            Driver: {van.DriverName}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {filled}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: isCyl ? '#475569' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                        {isCyl ? empty : '—'}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#000000', fontVariantNumeric: 'tabular-nums' }}>
                        {total}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
                {!isGodownMatch && filteredVans.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Center p="xl">
                        <Text size="sm" c="dimmed">No stock locations match your search query.</Text>
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
              <Table.Tfoot style={{ backgroundColor: '#ffffff', borderTop: '2px solid #e2e8f0' }}>
                <Table.Tr style={{ height: 44 }}>
                  <Table.Td colSpan={2} style={{ padding: '10px 16px' }}>
                    <Text fw={800} style={{ color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Total
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                    {totalFilledAlloc}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                    {totalEmptyAlloc}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#000000', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                    {filteredAllocationsTotalQty}
                  </Table.Td>
                </Table.Tr>
              </Table.Tfoot>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      </Stack>
    );
  }

  // ==========================================
  // DETAIL SCREEN 2: LOCATION CYLINDER AVAILABILITY
  // ==========================================
  if (selectedLocation) {
    const isVehicle = selectedLocation.type === 'vehicle';
    const filteredLocationProducts = selectedLocation.products.filter((p) => {
      const q = storedProductSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        p.ProductName.toLowerCase().includes(q) ||
        (p.ProductCode && p.ProductCode.toLowerCase().includes(q))
      );
    });

    // Separate Cylinders from Other Products
    const cylProducts = filteredLocationProducts.filter((p) => p.IsCylinder !== false);
    const otherProducts = filteredLocationProducts.filter((p) => p.IsCylinder === false);

    const rawDisplayed =
      categoryFilter === 'cylinders'
        ? cylProducts
        : categoryFilter === 'other'
        ? otherProducts
        : filteredLocationProducts;

    const displayedProducts = [...rawDisplayed].sort((a, b) => {
      const aIsCyl = a.IsCylinder !== false;
      const bIsCyl = b.IsCylinder !== false;
      if (aIsCyl && !bIsCyl) return -1;
      if (!aIsCyl && bIsCyl) return 1;
      return (a.ProductName || '').localeCompare(b.ProductName || '');
    });

    const cylBalTotal = cylProducts.reduce((sum, p) => sum + (p.BalanceQty ?? p.Qty), 0);
    const otherBalTotal = otherProducts.reduce((sum, p) => sum + (p.BalanceQty ?? p.Qty), 0);

    const totalAllocated = displayedProducts.reduce((sum, p) => sum + (p.AllocatedQty ?? p.Qty), 0);
    const totalDelivered = displayedProducts.reduce((sum, p) => sum + (p.DeliveredQty ?? 0), 0);
    const totalBalance = displayedProducts.reduce((sum, p) => sum + (p.BalanceQty ?? p.Qty), 0);
    const totalEmpty = displayedProducts.reduce((sum, p) => sum + (p.EmptyQty ?? 0), 0);

    return (
      <Stack gap="lg">
        {/* Navigation & Header */}
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="sm" align="center">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={() => {
                setSearchParams({});
                setStoredProductSearch('');
                setCategoryFilter('all');
              }}
              title="Back to Stock Analysis"
              style={{ color: '#0f172a' }}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Group gap="xs" align="center">
                {isVehicle ? (
                  <IconTruck size={22} color="#800020" />
                ) : (
                  <IconBuildingFactory2 size={22} color="#800020" />
                )}
                <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
                  {selectedLocation.name}
                </Title>
                <Badge
                  size="sm"
                  variant="outline"
                  styles={{
                    root: {
                      borderColor: '#f5c2cb',
                      backgroundColor: '#ffffff',
                      color: '#800020',
                      fontWeight: 700,
                    },
                  }}
                >
                  {isVehicle ? 'Van Stock' : 'Godown'}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {selectedLocation.description || 'Cylinder availability and stored product inventory breakdown'}
              </Text>
            </div>
          </Group>
        </Group>

        {/* Location Summary Cards */}
        {isVehicle ? (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Allocated Cylinders
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {selectedLocation.allocatedCylinders ?? selectedLocation.quantity}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Morning loaded stock
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Delivered Cylinders
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {selectedLocation.deliveredCylinders ?? 0}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Delivered on route today
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Balance Cylinders
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {selectedLocation.balanceCylinders ?? selectedLocation.quantity}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Full cylinders on van
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Empty Cylinders
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {selectedLocation.emptyCylinders ?? selectedLocation.emptyQuantity ?? 0}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Empties collected
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Other Products
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {selectedLocation.otherProductsBalance ?? selectedLocation.otherProductsAllocated ?? 0}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Stoves / Burners onboard
              </Text>
            </Paper>
          </SimpleGrid>
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Total Warehouse Stock
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {selectedLocation.quantity}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Stored inventory on hand
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Filled Cylinders
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {cylBalTotal}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Full cylinders ready for dispatch
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Empty Cylinders
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {selectedLocation.emptyCylinders ?? selectedLocation.emptyQuantity ?? 0}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Empties awaiting refill
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Other Products
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
                {otherBalTotal}
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Stoves / Burners in warehouse
              </Text>
            </Paper>

            <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                Facility Status
              </Text>
              <Text fw={800} style={{ color: '#0f172a', fontSize: '20px', letterSpacing: '-0.02em' }} mt={2}>
                Primary Warehouse
              </Text>
              <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
                Central storage facility
              </Text>
            </Paper>
          </SimpleGrid>
        )}

        {/* Stored Products Table */}
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
          <Group justify="space-between" align="center" p="md" px="lg" style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
            <div>
              <Group gap="xs" align="center">
                <Text fw={700} style={{ color: '#0f172a', fontSize: 16.5, letterSpacing: '-0.01em' }}>
                  {isVehicle ? 'Onboard Van Stock Breakdown' : 'Stored Warehouse Stock Breakdown'}
                </Text>
                <Badge
                  variant="light"
                  color="gray"
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
                  {displayedProducts.length} Items
                </Badge>
              </Group>
              <Text size="xs" c="#64748b" mt={2}>
                {isVehicle
                  ? 'Live morning load, deliveries, balance and empty returns for this route'
                  : 'Breakdown of cylinders by product stored at this location'}
              </Text>
            </div>
            <Group gap="sm" align="center" wrap="wrap">
              <SegmentedControl
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val as any)}
                data={[
                  {
                    label: (
                      <span
                        style={{
                          color: categoryFilter === 'all' ? '#800020' : '#475569',
                          fontWeight: categoryFilter === 'all' ? 700 : 500,
                          fontSize: 12,
                          transition: 'color 150ms ease',
                        }}
                      >
                        All ({filteredLocationProducts.length})
                      </span>
                    ),
                    value: 'all',
                  },
                  {
                    label: (
                      <span
                        style={{
                          color: categoryFilter === 'cylinders' ? '#800020' : '#475569',
                          fontWeight: categoryFilter === 'cylinders' ? 700 : 500,
                          fontSize: 12,
                          transition: 'color 150ms ease',
                        }}
                      >
                        Cylinders ({cylProducts.length})
                      </span>
                    ),
                    value: 'cylinders',
                  },
                  {
                    label: (
                      <span
                        style={{
                          color: categoryFilter === 'other' ? '#800020' : '#475569',
                          fontWeight: categoryFilter === 'other' ? 700 : 500,
                          fontSize: 12,
                          transition: 'color 150ms ease',
                        }}
                      >
                        Other ({otherProducts.length})
                      </span>
                    ),
                    value: 'other',
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
              <TextInput
                placeholder={isVehicle ? 'Search onboard products...' : 'Search warehouse products...'}
                size="xs"
                radius="md"
                value={storedProductSearch}
                onChange={(e) => setStoredProductSearch(e.currentTarget.value)}
                leftSection={<IconSearch size={14} stroke={1.5} color="#64748b" />}
                rightSection={storedProductSearch ? <CloseButton size="xs" onClick={() => setStoredProductSearch('')} /> : null}
                style={{ width: 210 }}
                styles={{
                  input: {
                    height: 34,
                    minHeight: 34,
                    fontSize: 12.5,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#ffffff',
                    '&:focus': { borderColor: '#800020' },
                  },
                }}
              />
            </Group>
          </Group>

          <Table.ScrollContainer minWidth={600}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', width: 90 }}>
                    CODE
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    PRODUCT
                  </Table.Th>
                  {isVehicle ? (
                    <>
                      <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 110 }}>
                        ALLOCATED
                      </Table.Th>
                      <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 110 }}>
                        DELIVERED
                      </Table.Th>
                      <Table.Th style={{ color: '#0f172a', fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 130 }}>
                        BALANCE (FULL)
                      </Table.Th>
                      <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 130 }}>
                        EMPTY RETURNED
                      </Table.Th>
                    </>
                  ) : (
                    <>
                      <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 110 }}>
                        FILLED
                      </Table.Th>
                      <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 110 }}>
                        EMPTY
                      </Table.Th>
                      <Table.Th style={{ color: '#0f172a', fontWeight: 700, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right', width: 120 }}>
                        TOTAL
                      </Table.Th>
                    </>
                  )}
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {isVehicle ? (
                  <>
                    {displayedProducts.map((p) => {
                      const isCyl = p.IsCylinder !== false;
                      return (
                        <Table.Tr key={p.ProductId}>
                          <Table.Td>
                            <Text style={{ fontSize: 12.5 }} c="#64748b" ff="monospace" fw={700}>
                              {p.ProductCode || '—'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={8} wrap="nowrap" align="center">
                              <Text fw={700} style={{ color: '#0f172a', fontSize: 13 }}>
                                {p.ProductName}
                              </Text>

                            </Group>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                            {p.AllocatedQty ?? p.Qty}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                            {p.DeliveredQty ?? 0}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {p.BalanceQty ?? p.Qty}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: isCyl ? '#334155' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                            {isCyl ? (p.EmptyQty ?? 0) : '—'}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </>
                ) : (
                  /* Godown Table Body */
                  <>
                    {displayedProducts.map((p) => {
                      const isCyl = p.IsCylinder !== false;
                      const filled = p.BalanceQty ?? p.Qty;
                      const empty = p.EmptyQty ?? 0;
                      const total = filled + empty;
                      return (
                        <Table.Tr key={p.ProductId} style={{ height: 44 }}>
                          <Table.Td>
                            <Text style={{ fontSize: 12.5 }} c="#64748b" ff="monospace" fw={700}>
                              {p.ProductCode || '—'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={8} wrap="nowrap" align="center">
                              <Text fw={700} style={{ color: '#0f172a', fontSize: 13.5 }}>
                                {p.ProductName}
                              </Text>

                            </Group>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {filled}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: isCyl ? '#475569' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                            {isCyl ? empty : '—'}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#000000', fontVariantNumeric: 'tabular-nums' }}>
                            {total}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </>
                )}

                {displayedProducts.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={isVehicle ? 6 : 3}>
                      <Center p="xl">
                        <Text size="sm" c="dimmed">No products found matching query.</Text>
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>

              <Table.Tfoot style={{ backgroundColor: '#ffffff', borderTop: '2px solid #e2e8f0' }}>
                {isVehicle ? (
                  <Table.Tr>
                    <Table.Td colSpan={2} style={{ padding: '10px 16px' }}>
                      <Text fw={800} style={{ color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                      {totalAllocated}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                      {totalDelivered}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                      {totalBalance}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                      {totalEmpty}
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={2} style={{ padding: '10px 16px' }}>
                      <Text fw={800} style={{ color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                      {totalBalance}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                      {totalEmpty}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#000000', fontVariantNumeric: 'tabular-nums', padding: '10px 16px' }}>
                      {totalBalance + totalEmpty}
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tfoot>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      </Stack>
    );
  }
  // ==========================================
  // MAIN VIEW: SIDE-BY-SIDE DUAL TABLES
  // ==========================================
  return (
    <Stack gap="lg">
      {/* 1. Page Header */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Stock Analysis
          </Title>
          <Text size="sm" c="dimmed">
            Central warehouse inventory balance and live van fleet allocations
          </Text>
        </div>
        {/* Right Actions: Live Sync & Refresh */}
        <Group gap="sm" align="center" wrap="wrap" style={{ flexGrow: 1, justifyContent: 'flex-end' }}>
          <Badge
            variant="outline"
            size="md"
            radius="xl"
            styles={{
              root: {
                borderColor: '#e2e8f0',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontWeight: 600,
                height: 32,
                padding: '0 12px',
                textTransform: 'none',
              },
            }}
          >
            <Group gap={6} align="center">
              <Box
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
                }}
              />
              <Text size="xs" fw={600} c="#0f172a">
                Last Sync: {data?.last_sync_time || 'Just now'}
              </Text>
            </Group>
          </Badge>
          <Button
            variant="filled"
            color="burgundy"
            size="sm"
            leftSection={<IconPlus size={15} />}
            onClick={() => navigate('/stock-analysis/add-inventory')}
            style={{ fontWeight: 600 }}
          >
            Add Godown Stock
          </Button>
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
      {/* 2. Top 4 Metric KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Card 1: Total System Stock */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
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
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total System Stock
            </Text>
            <IconPackage size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {summary.total_system_cylinders.toLocaleString()}
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
              Est. Value ₹{summary.total_system_value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <IconArrowUpRight size={15} color="#800020" style={{ flexShrink: 0 }} />
          </Group>
        </Paper>
        {/* Card 2: Central Godown Stock */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
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
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Central Godown Stock
            </Text>
            <IconBuildingFactory2 size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {summary.total_godown_cylinders.toLocaleString()}
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
              {summary.godown_percentage}% ready for loading
            </Text>
            <IconArrowUpRight size={15} color="#800020" style={{ flexShrink: 0 }} />
          </Group>
        </Paper>
        {/* Card 3: Allocated to Van Fleet */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
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
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Allocated to Van
            </Text>
            <IconTruckDelivery size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {summary.total_allocated_cylinders.toLocaleString()}
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
              {summary.allocated_percentage}% onboard active vans
            </Text>
            <IconArrowUpRight size={15} color="#800020" style={{ flexShrink: 0 }} />
          </Group>
        </Paper>
        {/* Card 4: Active Delivery Vans */}
        <Paper
          p="md"
          radius="md"
          withBorder
          onClick={() => navigate('/allocations')}
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
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
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Active Delivery Vans
            </Text>
            <IconTruck size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.02em' }}>
            {summary.active_vans_count}{' '}
            <Text component="span" size="sm" c="dimmed" fw={600}>
              Vans &bull; {summary.total_registered_vans} Total
            </Text>
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
              Holding active route stock
            </Text>
            <IconArrowUpRight size={15} color="#800020" style={{ flexShrink: 0 }} />
          </Group>
        </Paper>
      </SimpleGrid>
      {/* 3. Side-by-side Tables: Inventory by Product & Inventory by Location */}
      <Grid gap="md" align="stretch">
        {/* Table 1: Inventory by Product */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper
            radius="md"
            withBorder
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <Group justify="space-between" align="center" p="sm" px="md" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <Text fw={700} style={{ color: '#800020', fontSize: 16 }}>
                  Inventory by Product
                </Text>
              </div>
              <Group gap="xs" align="center">
                <TextInput
                  placeholder="Search products..."
                  size="xs"
                  radius="md"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.currentTarget.value)}
                  leftSection={<IconSearch size={14} stroke={1.5} color="#800020" />}
                  rightSection={productSearch ? <CloseButton size="xs" onClick={() => setProductSearch('')} /> : null}
                  style={{ width: 175 }}
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
                <Badge
                  variant="outline"
                  color="burgundy"
                  size="sm"
                  radius="xl"
                  styles={{
                    root: {
                      borderColor: '#800020',
                      color: '#800020',
                      backgroundColor: '#ffffff',
                      fontWeight: 600,
                      letterSpacing: '0.4px',
                      padding: '0 8px',
                      height: 22,
                    },
                  }}
                >
                  {filteredProducts.length} Products
                </Badge>
              </Group>
            </Group>
            {isLoading ? (
              <Center p="xl" style={{ flex: 1 }}>
                <Loader color="burgundy" />
              </Center>
            ) : filteredProducts.length === 0 ? (
              <Center p="xl" style={{ flex: 1 }}>
                <Text c="dimmed" size="sm">
                  No products found matching query.
                </Text>
              </Center>
            ) : (
              <Box style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <ScrollArea
                  h={265}
                  scrollbars="y"
                  scrollbarSize={6}
                  type="hover"
                  styles={{
                    thumb: { backgroundColor: '#800020', borderRadius: 9999 },
                    scrollbar: { backgroundColor: 'transparent' },
                  }}
                >
                  <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="md" stickyHeader style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: 75 }} />
                      <col />
                      <col style={{ width: 95 }} />
                      <col style={{ width: 95 }} />
                    </colgroup>
                    <Table.Thead style={{ backgroundColor: '#ffffff', zIndex: 2, borderBottom: '1px solid #e2e8f0' }}>
                      <Table.Tr>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          CODE
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          PRODUCT
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>
                          FILLED
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', paddingRight: 20 }}>
                          EMPTY
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredProducts.map((product) => {
                        const isCyl = product.IsCylinder !== false;
                        const filled = product.FilledQty ?? (product.GodownQty + (product.AllocatedQty || 0));
                        const empty = product.EmptyQty ?? 0;
                        return (
                          <Table.Tr
                            key={product.ProductId}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSearchParams({ product: String(product.ProductId) })}
                            style={{
                              cursor: 'pointer',
                              height: 42,
                              transition: 'background-color 150ms ease',
                            }}
                          >
                            <Table.Td>
                              <Text style={{ fontSize: 12.5 }} c="#64748b" ff="monospace" fw={700}>
                                {product.ProductCode || '—'}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={6} wrap="nowrap">
                                <IconChevronRight size={14} color="#800020" style={{ flexShrink: 0 }} />
                                <Text style={{ fontSize: 13.5 }} fw={700} c="#0f172a" lineClamp={1}>
                                  {product.ProductName}
                                </Text>
                              </Group>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                              {filled}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: isCyl ? '#475569' : '#94a3b8', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                              {isCyl ? empty : '—'}
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                {/* Permanent Total Footer locked cleanly outside ScrollArea */}
                <Box style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <Table verticalSpacing="xs" horizontalSpacing="md" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: 75 }} />
                      <col />
                      <col style={{ width: 95 }} />
                      <col style={{ width: 95 }} />
                    </colgroup>
                    <Table.Tbody>
                      <Table.Tr style={{ height: 42 }}>
                        <Table.Td colSpan={2} style={{ fontWeight: 800, color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Total
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {totalProductFilled}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#475569', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                          {totalProductEmpty}
                        </Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid.Col>

        {/* Table 2: Inventory by Location */}
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Paper
            radius="md"
            withBorder
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <Group justify="space-between" align="center" p="sm" px="md" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <Text fw={700} style={{ color: '#800020', fontSize: 16 }}>
                  Inventory by Location
                </Text>
              </div>
              <Group gap="xs" align="center">
                <TextInput
                  placeholder="Search locations..."
                  size="xs"
                  radius="md"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.currentTarget.value)}
                  leftSection={<IconSearch size={14} stroke={1.5} color="#800020" />}
                  rightSection={locationSearch ? <CloseButton size="xs" onClick={() => setLocationSearch('')} /> : null}
                  style={{ width: 175 }}
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
                <Badge
                  variant="outline"
                  color="burgundy"
                  size="sm"
                  radius="xl"
                  styles={{
                    root: {
                      borderColor: '#800020',
                      color: '#800020',
                      backgroundColor: '#ffffff',
                      fontWeight: 600,
                      letterSpacing: '0.4px',
                      padding: '0 8px',
                      height: 22,
                    },
                  }}
                >
                  {filteredLocations.length} Locations
                </Badge>
              </Group>
            </Group>
            {isLoading ? (
              <Center p="xl" style={{ flex: 1 }}>
                <Loader color="burgundy" />
              </Center>
            ) : filteredLocations.length === 0 ? (
              <Center p="xl" style={{ flex: 1 }}>
                <Text c="dimmed" size="sm">
                  No stock locations found matching query.
                </Text>
              </Center>
            ) : (
              <Box style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <ScrollArea
                  h={265}
                  scrollbars="y"
                  scrollbarSize={6}
                  type="hover"
                  styles={{
                    thumb: { backgroundColor: '#800020', borderRadius: 9999 },
                    scrollbar: { backgroundColor: 'transparent' },
                  }}
                >
                  <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="md" stickyHeader style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col />
                      <col style={{ width: 105 }} />
                      <col style={{ width: 105 }} />
                    </colgroup>
                    <Table.Thead style={{ backgroundColor: '#ffffff', zIndex: 2, borderBottom: '1px solid #e2e8f0' }}>
                      <Table.Tr>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          LOCATION
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>
                          FILLED
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', paddingRight: 20 }}>
                          EMPTY
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredLocations.map((location) => (
                        <Table.Tr
                          key={location.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSearchParams({ location: location.id })}
                          style={{
                            cursor: 'pointer',
                            height: 42,
                            transition: 'background-color 150ms ease',
                          }}
                        >
                          <Table.Td>
                            <Group gap={6} wrap="nowrap">
                              <IconChevronRight size={14} color="#800020" style={{ flexShrink: 0 }} />
                              {location.type === 'godown' ? (
                                <IconBuildingFactory2 size={15} color="#800020" style={{ flexShrink: 0 }} />
                              ) : (
                                <IconTruck size={15} color="#800020" style={{ flexShrink: 0 }} />
                              )}
                              <Text style={{ fontSize: 13.5 }} fw={700} c="#0f172a" lineClamp={1}>
                                {location.name}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {location.filledQuantity ?? location.quantity}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: '#475569', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                            {location.emptyQuantity ?? 0}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                {/* Permanent Total Footer locked cleanly outside ScrollArea */}
                <Box style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <Table verticalSpacing="xs" horizontalSpacing="md" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col />
                      <col style={{ width: 105 }} />
                      <col style={{ width: 105 }} />
                    </colgroup>
                    <Table.Tbody>
                      <Table.Tr style={{ height: 42 }}>
                        <Table.Td style={{ fontWeight: 800, color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Total
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {totalLocationFilled}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#475569', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                          {totalLocationEmpty}
                        </Table.Td>
                      </Table.Tr>
                    </Table.Tbody>
                  </Table>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Add Godown Opening Stock Modal */}
      <Modal
        opened={addStockModalOpened}
        onClose={() => {
          setAddStockModalOpened(false);
          setSelectedStockProdId(null);
          setFilledStockInput('');
          setEmptyStockInput('');
          setStockRemarks('Initial Godown Opening Stock');
        }}
        title={
          <Group gap="xs">
            <IconBuildingFactory2 size={18} color="#800020" />
            <Text fw={700} style={{ color: '#0f172a', fontSize: 16 }}>
              Add Godown Inventory (Opening Stock)
            </Text>
          </Group>
        }
        radius="md"
        centered
      >
        <Stack gap="md" mt="xs">
          <Text size="xs" c="dimmed">
            Directly deposit filled cylinders or empties into <b>Central Godown</b> without needing a purchase invoice.
          </Text>

          <Select
            label="Product / Cylinder"
            placeholder="Select product..."
            data={products.map((p) => ({
              value: String(p.ProductId),
              label: `${p.ProductName} (${p.ProductCode || 'Cyl'})`,
            }))}
            value={selectedStockProdId}
            onChange={setSelectedStockProdId}
            searchable
            required
          />

          <NumberInput
            label="Filled Quantity (Full Stock)"
            placeholder="0"
            min={0}
            hideControls
            value={filledStockInput}
            onChange={(val) => setFilledStockInput(val === '' ? '' : Number(val))}
            description="Number of filled cylinders ready in warehouse"
          />

          <NumberInput
            label="Empty Cylinders Quantity"
            placeholder="0"
            min={0}
            hideControls
            value={emptyStockInput}
            onChange={(val) => setEmptyStockInput(val === '' ? '' : Number(val))}
            description="Number of empty cylinders on hand in godown"
          />

          <TextInput
            label="Remarks / Reference"
            placeholder="e.g. Initial Opening Stock"
            value={stockRemarks}
            onChange={(e) => setStockRemarks(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setAddStockModalOpened(false)}>
              Cancel
            </Button>
            <Button
              color="burgundy"
              loading={isSubmittingStock}
              onClick={handleSaveGodownStock}
              leftSection={<IconCheck size={16} />}
            >
              Deposit to Godown
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
export default StockAnalysisPage;