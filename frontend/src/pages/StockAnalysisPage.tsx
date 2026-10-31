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
} from '@mantine/core';
import {
  IconBuildingWarehouse,
  IconTruckDelivery,
  IconPackage,
  IconSearch,
  IconRefresh,
  IconTruck,
  IconArrowUpRight,
  IconArrowLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
interface VanProduct {
  ProductId: number;
  ProductName: string;
  AppProductName?: string;
  Qty: number;
  SalesPrice: number;
}
interface AllocatedVan {
  RouteVehicleDriverId: number;
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
  AllocatedQty: number;
  TotalQty: number;
  TotalValue: number;
  AllocationRate: number;
  Vans: ProductVanDetail[];
}
interface StockLocationProduct {
  ProductId: number;
  ProductName: string;
  ProductCode: string;
  UnitName: string;
  Qty: number;
}
interface StockLocation {
  id: string;
  name: string;
  description: string;
  type: 'godown' | 'vehicle';
  quantity: number;
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
  // Section-specific search states (compact, non-spoiling inputs)
  const [productSearch, setProductSearch] = useState<string>('');
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [allocationSearch, setAllocationSearch] = useState<string>('');
  const [storedProductSearch, setStoredProductSearch] = useState<string>('');


  // Drilldown states for clicking rows
  const [selectedProduct, setSelectedProduct] = useState<ProductStockItem | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<StockLocation | null>(null);
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
    refetchInterval: 10000,
  });
  const products = data?.products ?? EMPTY_PRODUCT_STOCK;
  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.ProductName.toLowerCase().includes(q) ||
        (p.AppProductName && p.AppProductName.toLowerCase().includes(q)) ||
        p.ProductCode.toLowerCase().includes(q)
    );
  }, [products, productSearch]);
  const inventoryLocations = useMemo<StockLocation[]>(() => {
    const godownProducts = products
      .filter((product) => product.GodownQty > 0)
      .map((product) => ({
        ProductId: product.ProductId,
        ProductName: product.ProductName,
        ProductCode: product.ProductCode,
        UnitName: product.UnitName,
        Qty: product.GodownQty,
      }));
    const godown: StockLocation = {
      id: 'godown',
      name: 'Central Godown',
      description: 'Main warehouse',
      type: 'godown',
      quantity: godownProducts.reduce((total, product) => total + product.Qty, 0),
      products: godownProducts,
    };
    const vehicles = new Map<number, StockLocation>();
    products.forEach((product) => {
      product.Vans.forEach((van) => {
        let location = vehicles.get(van.RouteVehicleDriverId);
        if (!location) {
          location = {
            id: `vehicle-${van.RouteVehicleDriverId}`,
            name: van.VehicleNumber,
            description: [van.RouteName, van.DriverName].filter(Boolean).join(' - '),
            type: 'vehicle',
            quantity: 0,
            products: [],
          };
          vehicles.set(van.RouteVehicleDriverId, location);
        }
        location.quantity += van.Qty;
        location.products.push({
          ProductId: product.ProductId,
          ProductName: product.ProductName,
          ProductCode: product.ProductCode,
          UnitName: product.UnitName,
          Qty: van.Qty,
        });
      });
    });
    return [godown, ...vehicles.values()];
  }, [products]);
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
  // Table totals
  const totalProductQuantity = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + (Number(p.TotalQty) || 0), 0);
  }, [filteredProducts]);
  const totalLocationQuantity = useMemo(() => {
    return filteredLocations.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
  }, [filteredLocations]);


  // ==========================================
  // DETAIL SCREEN 1: PRODUCT ALLOCATION BREAKDOWN
  // ==========================================
  if (selectedProduct) {
    const altTotal = selectedProduct.AltQty ?? ((selectedProduct.TotalQty || 0) * (selectedProduct.UnitConversion || 1));
    const altUnit = selectedProduct.AltUnitName || 'KG';
    const totalQty = selectedProduct.TotalQty || 0;

    const isGodownMatch = selectedProduct.GodownQty > 0 && (
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
    const filteredAllocationsTotalQty = (isGodownMatch ? selectedProduct.GodownQty : 0) + filteredVans.reduce((sum, v) => sum + v.Qty, 0);

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
                setSelectedProduct(null);
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
            <Text fw={700} style={{ color: '#800020', fontSize: '24px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={4}>
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
          <Group justify="space-between" align="center" p="sm" px="md" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <Text fw={700} style={{ color: '#800020', fontSize: 15 }}>
                Location Allocation Breakdown
              </Text>
              <Text size="xs" c="dimmed">
                Exact cylinder stock count inside Central Godown and active route delivery vans
              </Text>
            </div>
            <Group gap="xs" align="center">
              <TextInput
                placeholder="Search locations..."
                size="xs"
                radius="md"
                value={allocationSearch}
                onChange={(e) => setAllocationSearch(e.currentTarget.value)}
                leftSection={<IconSearch size={14} stroke={1.5} color="#800020" />}
                rightSection={allocationSearch ? <CloseButton size="xs" onClick={() => setAllocationSearch('')} /> : null}
                style={{ width: 175 }}
                styles={{
                  input: {
                    height: 28,
                    minHeight: 28,
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
                {filteredAllocationsCount} Locations
              </Badge>
            </Group>
          </Group>
          <Table.ScrollContainer minWidth={600}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead style={{ backgroundColor: '#ffffff' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    LOCATION
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    ROUTE / DRIVER
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>
                    QUANTITY
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isGodownMatch && (
                  <Table.Tr>
                    <Table.Td>
                      <Group gap={8}>
                        <IconBuildingWarehouse size={18} color="#800020" />
                        <Text size="sm" fw={700} c="#0f172a">Central Godown</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">Main Storage Godown</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                      {selectedProduct.GodownQty}
                    </Table.Td>
                  </Table.Tr>
                )}
                {filteredVans.map((van) => (
                  <Table.Tr key={van.RouteVehicleDriverId}>
                    <Table.Td>
                      <Group gap={8}>
                        <IconTruck size={18} color="#800020" />
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
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                      {van.Qty}
                    </Table.Td>
                  </Table.Tr>
                ))}
                {!isGodownMatch && filteredVans.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={3}>
                      <Center p="xl">
                        <Text size="sm" c="dimmed">No stock locations match your search query.</Text>
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
              <Table.Tfoot style={{ backgroundColor: '#ffffff', borderBottom: 'none' }}>
                <Table.Tr style={{ borderBottom: 'none' }}>
                  <Table.Td colSpan={2} style={{ borderBottom: 'none', fontWeight: 800, color: '#800020', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total
                  </Table.Td>
                  <Table.Td style={{ borderBottom: 'none', textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
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
    const filteredLocationProducts = selectedLocation.products.filter((p) => {
      const q = storedProductSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        p.ProductName.toLowerCase().includes(q) ||
        (p.ProductCode && p.ProductCode.toLowerCase().includes(q))
      );
    });

    const filteredLocationTotalQty = filteredLocationProducts.reduce((sum, p) => sum + p.Qty, 0);

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
                setSelectedLocation(null);
                setStoredProductSearch('');
              }}
              title="Back to Stock Analysis"
              style={{ color: '#0f172a' }}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Group gap="xs" align="center">
                {selectedLocation.type === 'godown' ? (
                  <IconBuildingWarehouse size={22} color="#800020" />
                ) : (
                  <IconTruck size={22} color="#800020" />
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
                  {selectedLocation.type === 'godown' ? 'Godown' : 'Van Stock'}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {selectedLocation.description || 'Cylinder availability and stored product inventory breakdown'}
              </Text>
            </div>
          </Group>
        </Group>
        {/* Location Summary Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Cylinders Onboard / In Stock
            </Text>
            <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={4}>
              {selectedLocation.quantity}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Available across {selectedLocation.products.length} product category types
            </Text>
          </Paper>
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Location Status
            </Text>
            <Text fw={700} style={{ color: '#800020', fontSize: '24px', letterSpacing: '-0.02em' }} mt={4}>
              {selectedLocation.type === 'godown' ? 'Primary Warehouse' : 'Active On Route'}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {selectedLocation.description || 'Central storage facility'}
            </Text>
          </Paper>
        </SimpleGrid>
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
          <Group justify="space-between" align="center" p="sm" px="md" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <Text fw={700} style={{ color: '#800020', fontSize: 15 }}>
                Stored Cylinders Availability
              </Text>
              <Text size="xs" c="dimmed">
                Breakdown of cylinders by product stored at this location
              </Text>
            </div>
            <Group gap="xs" align="center">
              <TextInput
                placeholder="Search products..."
                size="xs"
                radius="md"
                value={storedProductSearch}
                onChange={(e) => setStoredProductSearch(e.currentTarget.value)}
                leftSection={<IconSearch size={14} stroke={1.5} color="#800020" />}
                rightSection={storedProductSearch ? <CloseButton size="xs" onClick={() => setStoredProductSearch('')} /> : null}
                style={{ width: 175 }}
                styles={{
                  input: {
                    height: 28,
                    minHeight: 28,
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
                {filteredLocationProducts.length} Products
              </Badge>
            </Group>
          </Group>
          <Table.ScrollContainer minWidth={500}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead style={{ backgroundColor: '#ffffff' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', width: 100 }}>
                    CODE
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    PRODUCT
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>
                    QUANTITY
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredLocationProducts.map((p) => (
                  <Table.Tr key={p.ProductId}>
                    <Table.Td>
                      <Text size="xs" c="#64748b" ff="monospace" fw={700}>
                        {p.ProductCode || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td fw={700} style={{ color: '#0f172a', fontSize: 13.5 }}>
                      {p.ProductName}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                      {p.Qty}
                    </Table.Td>
                  </Table.Tr>
                ))}
                {filteredLocationProducts.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={3}>
                      <Center p="xl">
                        <Text size="sm" c="dimmed">No cylinders found matching search query.</Text>
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
              <Table.Tfoot style={{ backgroundColor: '#ffffff', borderBottom: 'none' }}>
                <Table.Tr style={{ borderBottom: 'none' }}>
                  <Table.Td colSpan={2} style={{ borderBottom: 'none', fontWeight: 800, color: '#800020', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Total
                  </Table.Td>
                  <Table.Td style={{ borderBottom: 'none', textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                    {filteredLocationTotalQty}
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
            <IconBuildingWarehouse size={20} color="#800020" stroke={1.75} />
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
              Allocated to Fleet
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
                <Text fw={700} style={{ color: '#800020', fontSize: 15 }}>
                  Inventory by Product
                </Text>
                <Text size="xs" c="dimmed">
                 
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
                      height: 28,
                      minHeight: 28,
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
                {/* 5-row fixed scrollable table container with Mantine custom Burgundy scrollbar (Zero native arrows) */}
                <ScrollArea
                  h={215}
                  scrollbars="y"
                  scrollbarSize={5}
                  type="hover"
                  styles={{
                    thumb: { backgroundColor: '#800020', borderRadius: 9999 },
                    scrollbar: { backgroundColor: 'transparent' },
                  }}
                >
                  <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="sm" stickyHeader style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: 55 }} />
                      <col />
                      <col style={{ width: 85 }} />
                      <col style={{ width: 120 }} />
                    </colgroup>
                    <Table.Thead style={{ backgroundColor: '#ffffff', zIndex: 1 }}>
                      <Table.Tr>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          CODE
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          NAME
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>
                          RATE
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', paddingRight: 24 }}>
                          QUANTITY
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredProducts.map((product) => (
                        <Table.Tr
                          key={product.ProductId}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedProduct(product)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedProduct(product);
                            }
                          }}
                          style={{
                            cursor: 'pointer',
                            height: 36,
                            transition: 'background-color 150ms ease',
                          }}
                        >
                          <Table.Td>
                            <Text size="xs" c="#64748b" ff="monospace" fw={700}>
                              {product.ProductCode || '—'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap={6} wrap="nowrap">
                              <IconChevronRight size={14} color="#800020" style={{ flexShrink: 0 }} />
                              <Text size="xs" fw={700} c="#0f172a" lineClamp={1}>
                                {product.ProductName}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontSize: 12, color: '#800020', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            ₹{(product.Rate ?? product.PurchasePrice ?? product.SalesPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#800020', fontVariantNumeric: 'tabular-nums', paddingRight: 24 }}>
                            {product.TotalQty}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                {/* Locked TOTAL Footer */}
                <Box style={{ marginTop: 'auto', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
                  <Table verticalSpacing="xs" horizontalSpacing="sm" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: 55 }} />
                      <col />
                      <col style={{ width: 85 }} />
                      <col style={{ width: 120 }} />
                    </colgroup>
                    <Table.Tbody>
                      <Table.Tr style={{ border: 'none', height: 38 }}>
                        <Table.Td colSpan={3} style={{ border: 'none', fontWeight: 800, color: '#800020', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Total
                        </Table.Td>
                        <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#800020', fontVariantNumeric: 'tabular-nums', paddingRight: 24 }}>
                          {totalProductQuantity}
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
                <Text fw={700} style={{ color: '#800020', fontSize: 15 }}>
                  Inventory by Location
                </Text>
                <Text size="xs" c="dimmed">
                  
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
                      height: 28,
                      minHeight: 28,
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
                {/* 5-row fixed scrollable table container with Mantine custom Burgundy scrollbar (Zero native arrows) */}
                <ScrollArea
                  h={215}
                  scrollbars="y"
                  scrollbarSize={5}
                  type="hover"
                  styles={{
                    thumb: { backgroundColor: '#800020', borderRadius: 9999 },
                    scrollbar: { backgroundColor: 'transparent' },
                  }}
                >
                  <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="sm" stickyHeader style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col />
                      <col style={{ width: 120 }} />
                    </colgroup>
                    <Table.Thead style={{ backgroundColor: '#ffffff', zIndex: 1 }}>
                      <Table.Tr>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          LOCATION
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', paddingRight: 24 }}>
                          QUANTITY
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredLocations.map((location) => (
                        <Table.Tr
                          key={location.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedLocation(location)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedLocation(location);
                            }
                          }}
                          style={{
                            cursor: 'pointer',
                            height: 36,
                            transition: 'background-color 150ms ease',
                          }}
                        >
                          <Table.Td>
                            <Group gap={6} wrap="nowrap">
                              <IconChevronRight size={14} color="#800020" style={{ flexShrink: 0 }} />
                              {location.type === 'godown' ? (
                                <IconBuildingWarehouse size={16} color="#800020" style={{ flexShrink: 0 }} />
                              ) : (
                                <IconTruck size={16} color="#800020" style={{ flexShrink: 0 }} />
                              )}
                              <Text size="xs" fw={700} c="#0f172a">
                                {location.name}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#800020', fontVariantNumeric: 'tabular-nums', paddingRight: 24 }}>
                            {location.quantity}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                {/* Locked TOTAL Footer */}
                <Box style={{ marginTop: 'auto', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
                  <Table verticalSpacing="xs" horizontalSpacing="sm" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col />
                      <col style={{ width: 120 }} />
                    </colgroup>
                    <Table.Tbody>
                      <Table.Tr style={{ border: 'none', height: 38 }}>
                        <Table.Td style={{ border: 'none', fontWeight: 800, color: '#800020', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Total
                        </Table.Td>
                        <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#800020', fontVariantNumeric: 'tabular-nums', paddingRight: 24 }}>
                          {totalLocationQuantity}
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
    </Stack>
  );
};
export default StockAnalysisPage;