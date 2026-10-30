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
  Loader,
  Center,
  Box,
  TextInput,
  CloseButton,
  Grid,
} from '@mantine/core';
import {
  IconBuildingWarehouse,
  IconTruckDelivery,
  IconPackage,
  IconSearch,
  IconRefresh,
  IconTruck,
  IconArrowUpRight,
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
  SalesPrice: number;
  PurchasePrice: number;
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
  };
  products: ProductStockItem[];
  active_vans: AllocatedVan[];
  idle_vans: AllocatedVan[];
  recent_notes: RecentDispatchNote[];
}

const EMPTY_PRODUCT_STOCK: ProductStockItem[] = [];

export const StockAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

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
    refetchInterval: 30000,
  });
  const products = data?.products ?? EMPTY_PRODUCT_STOCK;

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.ProductName.toLowerCase().includes(q) ||
        (p.AppProductName && p.AppProductName.toLowerCase().includes(q)) ||
        p.ProductCode.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

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
    const q = searchQuery.toLowerCase().trim();
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
  }, [inventoryLocations, searchQuery]);

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

  return (
    <Stack gap="lg">
      {/* 1. Page Header matching DeliveryNotesPage & AllocationsPage */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Stock Analysis
          </Title>
          <Text size="sm" c="dimmed">
            Central warehouse inventory balance and live van fleet allocations
          </Text>
        </div>

        {/* Right Actions: Search Bar + Buttons */}
        <Group gap="sm" align="center" wrap="wrap" style={{ flexGrow: 1, justifyContent: 'flex-end' }}>
          <Box style={{ width: 280, minWidth: 180, flexGrow: 1, maxWidth: 360 }}>
            <TextInput
              placeholder="Search products, routes, vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={16} stroke={1.5} color="#800020" />}
              rightSection={
                searchQuery ? (
                  <CloseButton size="sm" aria-label="Clear search" onClick={() => setSearchQuery('')} />
                ) : null
              }
              radius={10}
              size="sm"
            />
          </Box>

          <Button
            color="burgundy"
            radius={10}
            size="sm"
            leftSection={<IconRefresh size={16} />}
            loading={isRefetching}
            onClick={() => refetch()}
          >
            Refresh Stock
          </Button>
        </Group>
      </Group>

      {/* 2. Top Metric Cards matching Dashboard (Image 2) */}
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
              Est. Value ₹{summary.total_system_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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

      {/* Side-by-side Tables: Inventory by Product & Inventory by Location */}
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
              <Badge
                variant="outline"
                color="burgundy"
                size="sm"
                radius="xl"
                styles={{
                  root: {
                    borderColor: '#800020',
                    color: '#800020',
                    backgroundColor: '#fbf0f2',
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
              <Table.ScrollContainer minWidth={440} style={{ flex: 1 }}>
                <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="sm">
                  <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                    <Table.Tr>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.4px', width: 75 }}>
                        CODE
                      </Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        NAME
                      </Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 85 }}>
                        RATE
                      </Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 85 }}>
                        QUANTITY
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredProducts.map((product) => {
                      const isExpanded = expandedProductId === product.ProductId;
                      const toggleExpanded = () =>
                        setExpandedProductId((current) => (current === product.ProductId ? null : product.ProductId));

                      return (
                        <React.Fragment key={product.ProductId}>
                          <Table.Tr
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            onClick={toggleExpanded}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                toggleExpanded();
                              }
                            }}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: isExpanded ? '#fff8f9' : undefined,
                              transition: 'background-color 150ms ease',
                            }}
                          >
                            <Table.Td>
                              <Badge
                                variant="outline"
                                color="burgundy"
                                size="xs"
                                radius="sm"
                                styles={{
                                  root: {
                                    borderColor: '#f5c2cb',
                                    backgroundColor: '#fbf0f2',
                                    color: '#800020',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    fontSize: 11,
                                    letterSpacing: '0.3px',
                                  },
                                }}
                              >
                                {product.ProductCode || '—'}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={6} wrap="nowrap">
                                <Box
                                  style={{
                                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                                    display: 'inline-flex',
                                  }}
                                >
                                  <IconChevronRight size={14} color="#800020" />
                                </Box>
                                <Text size="xs" fw={700} c="#0f172a" lineClamp={1}>
                                  {product.ProductName}
                                </Text>
                              </Group>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontSize: 12, color: '#800020', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              ₹{product.SalesPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 12.5, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                              {product.TotalQty} Cyls
                            </Table.Td>
                          </Table.Tr>
                          {isExpanded && (
                            <Table.Tr style={{ borderTop: 'none', backgroundColor: '#fffbfc' }}>
                              <Table.Td colSpan={4} p={0} style={{ borderTop: 'none' }}>
                                <Box
                                  p="xs"
                                  px="sm"
                                  style={{
                                    backgroundColor: '#fffbfc',
                                    borderLeft: '3px solid #800020',
                                    borderTop: '1px solid #f9e2e6',
                                    borderBottom: '1px solid #f9e2e6',
                                  }}
                                >
                                  <Group justify="space-between" mb={6}>
                                    <Text size="xs" fw={800} c="#800020" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                                      Allocation Breakdown &bull; <span style={{ color: "#0f172a" }}>{product.ProductName}</span>
                                    </Text>
                                    <Text size="xs" c="dimmed" style={{ fontSize: 10.5 }}>
                                      Total: <strong style={{ color: '#800020' }}>{product.TotalQty} Cyls</strong>
                                    </Text>
                                  </Group>

                                  <Stack gap={4}>
                                    {product.GodownQty > 0 && (
                                      <Group
                                        justify="space-between"
                                        p="4px 8px"
                                        style={{ backgroundColor: '#ffffff', borderRadius: 6, border: '1px solid #f1f5f9' }}
                                      >
                                        <Group gap={6}>
                                          <IconBuildingWarehouse size={14} color="#800020" />
                                          <Text size="xs" fw={700} c="#0f172a">Central Godown</Text>
                                          
                                        </Group>
                                        <Text size="xs" fw={800} c="#800020" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                          {product.GodownQty} Cyls
                                        </Text>
                                      </Group>
                                    )}

                                    {product.Vans.map((van) => (
                                      <Group
                                        key={van.RouteVehicleDriverId}
                                        justify="space-between"
                                        p="4px 8px"
                                        style={{ backgroundColor: '#ffffff', borderRadius: 6, border: '1px solid #f1f5f9' }}
                                      >
                                        <Group gap={6} wrap="nowrap">
                                          <IconTruck size={14} color="#800020" style={{ flexShrink: 0 }} />
                                          <Text size="xs" fw={700} c="#0f172a">
                                            {van.VehicleNumber}
                                          </Text>
                                          {[van.RouteName, van.DriverName].filter(Boolean).length > 0 && (
                                            <Text size="xs" c="dimmed" style={{ fontSize: 11 }} truncate>
                                              ({[van.RouteName, van.DriverName].filter(Boolean).join(' • ')})
                                            </Text>
                                          )}
                                        </Group>
                                        <Text size="xs" fw={800} c="#800020" style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                                          {van.Qty} Cyls
                                        </Text>
                                      </Group>
                                    ))}

                                    {product.GodownQty <= 0 && product.Vans.length === 0 && (
                                      <Box p="xs" style={{ textAlign: 'center' }}>
                                        <Text size="xs" c="dimmed">
                                          No stock available in Godown or Vans.
                                        </Text>
                                      </Box>
                                    )}
                                  </Stack>
                                </Box>
                            </Table.Td>
                          </Table.Tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
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
              <Badge
                variant="outline"
                color="burgundy"
                size="sm"
                radius="xl"
                styles={{
                  root: {
                    borderColor: '#800020',
                    color: '#800020',
                    backgroundColor: '#fbf0f2',
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
              <Table.ScrollContainer minWidth={380} style={{ flex: 1 }}>
                <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="sm">
                  <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                    <Table.Tr>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        LOCATION
                      </Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 110 }}>
                        QUANTITY
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredLocations.map((location) => {
                      const isExpanded = expandedLocationId === location.id;
                      const toggleExpanded = () =>
                        setExpandedLocationId((current) => (current === location.id ? null : location.id));

                      return (
                        <React.Fragment key={location.id}>
                          <Table.Tr
                            role="button"
                            tabIndex={0}
                            aria-expanded={isExpanded}
                            onClick={toggleExpanded}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                toggleExpanded();
                              }
                            }}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: isExpanded ? '#fff8f9' : undefined,
                              transition: 'background-color 150ms ease',
                            }}
                          >
                            <Table.Td>
                              <Group gap={6} wrap="nowrap">
                                <Box
                                  style={{
                                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                                    display: 'inline-flex',
                                  }}
                                >
                                  <IconChevronRight size={14} color="#800020" />
                                </Box>
                                {location.type === 'godown' ? (
                                  <IconBuildingWarehouse size={16} color="#800020" style={{ flexShrink: 0 }} />
                                ) : (
                                  <IconTruck size={16} color="#800020" style={{ flexShrink: 0 }} />
                                )}
                                <Box style={{ minWidth: 0 }}>
                                  <Group gap={6} wrap="nowrap">
                                    <Text size="xs" fw={700} c="#0f172a">
                                      {location.name}
                                    </Text>
                                    <Badge
                                      size="xs"
                                      variant="outline"
                                      styles={{
                                        root: {
                                          borderColor: '#f5c2cb',
                                          backgroundColor: '#fbf0f2',
                                          color: '#800020',
                                          fontSize: 9.5,
                                          height: 16,
                                          padding: '0 6px',
                                        },
                                      }}
                                    >
                                      {location.type === 'godown' ? 'Godown' : 'Van Stock'}
                                    </Badge>
                                  </Group>
                                  {location.description && location.type === 'vehicle' && (
                                    <Text size="xs" c="dimmed" style={{ fontSize: 11 }} truncate>
                                      {location.description}
                                    </Text>
                                  )}
                                </Box>
                              </Group>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 12.5, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                              {location.quantity} Cyls
                            </Table.Td>
                          </Table.Tr>
                          {isExpanded && (
                            <Table.Tr style={{ borderTop: 'none', backgroundColor: '#fffbfc' }}>
                              <Table.Td colSpan={2} p={0} style={{ borderTop: 'none' }}>
                                <Box
                                  p="xs"
                                  px="sm"
                                  style={{
                                    backgroundColor: '#fffbfc',
                                    borderLeft: '3px solid #800020',
                                    borderTop: '1px solid #f9e2e6',
                                    borderBottom: '1px solid #f9e2e6',
                                  }}
                                >
                                  <Group justify="space-between" mb={6}>
                                    <Text size="xs" fw={800} c="#800020" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
                                      Cylinder Availability &bull; <span style={{ color: "#0f172a" }}>{location.name}</span>
                                    </Text>
                                    <Text size="xs" c="dimmed" style={{ fontSize: 10.5 }}>
                                      Total: <strong style={{ color: '#800020' }}>{location.quantity} Cylinders</strong>
                                    </Text>
                                  </Group>

                                  <Stack gap={4}>
                                    {location.products.map((product) => (
                                      <Group
                                        key={product.ProductId}
                                        justify="space-between"
                                        p="4px 8px"
                                        style={{ backgroundColor: '#ffffff', borderRadius: 6, border: '1px solid #f1f5f9' }}
                                      >
                                        <Group gap={6} wrap="nowrap">
                                          <Badge
                                            size="xs"
                                            variant="outline"
                                            styles={{
                                              root: {
                                                borderColor: '#f5c2cb',
                                                backgroundColor: '#fbf0f2',
                                                color: '#800020',
                                                fontFamily: 'monospace',
                                                fontWeight: 700,
                                                fontSize: 10.5,
                                              },
                                            }}
                                          >
                                            {product.ProductCode || '—'}
                                          </Badge>
                                          <Text size="xs" fw={700} c="#0f172a">
                                            {product.ProductName}
                                          </Text>
                                        </Group>
                                        <Text size="xs" fw={800} c="#800020" style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                                          {product.Qty} Cyls
                                        </Text>
                                      </Group>
                                    ))}

                                    {location.products.length === 0 && (
                                      <Box p="xs" style={{ textAlign: 'center' }}>
                                        <Text size="xs" c="dimmed">
                                          No cylinders currently stored at this location.
                                        </Text>
                                      </Box>
                                    )}
                                  </Stack>
                                </Box>
                            </Table.Td>
                          </Table.Tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Recent dispatches */}
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
        <Group justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <Text fw={700} style={{ color: '#800020', fontSize: 15 }}>
              Recent Morning Van Stock Dispatches
            </Text>
            <Text size="xs" c="dimmed">
             
            </Text>
          </div>
          <Button
            variant="subtle"
            color="gray"
            c="#800020"
            size="xs"
            fw={600}
            onClick={() => navigate('/delivery-notes')}
          >
            View All Delivery Notes &rarr;
          </Button>
        </Group>

        {(!data?.recent_notes || data.recent_notes.length === 0) ? (
          <Center p="xl">
            <Text c="dimmed" size="sm">
              No recent delivery notes recorded yet.
            </Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={750}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    DN NO
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    DATE
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    VEHICLE
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    ROUTE
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    DRIVER
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center' }}>
                    TOTAL CYLINDERS
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center' }}>
                    STATUS
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.recent_notes.map((dn) => (
                  <Table.Tr
                    key={dn.DeliveryNoteId}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/delivery-notes')}
                  >
                    <Table.Td fw={700} style={{ color: '#800020', fontSize: 13 }}>
                      {dn.DeliveryNoteNo}
                    </Table.Td>

                    <Table.Td style={{ fontSize: 13, color: '#334155' }}>
                      {dn.DeliveryDate}
                    </Table.Td>

                    <Table.Td>
                      <Text size="sm" fw={600} c="#0f172a">
                        {dn.VehicleNumber}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Text size="sm" c="#334155">
                        {dn.RouteName}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Text size="sm" c="#334155">
                        {dn.DriverName}
                      </Text>
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'center', fontWeight: 800, fontSize: 14, color: '#800020' }}>
                      {dn.TotalCylinders}
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'center' }}>
                      <Box
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '3px 10px',
                          borderRadius: 9999,
                          border: '1px solid #800020',
                          backgroundColor: '#fbf0f2',
                          color: '#800020',
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.4px',
                          lineHeight: 1.2,
                          textTransform: 'uppercase',
                        }}
                      >
                        {dn.Status || 'Allocated'}
                      </Box>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>
    </Stack>
  );
};

export default StockAnalysisPage;