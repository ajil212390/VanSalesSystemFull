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
  TextInput,
  CloseButton,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconSearch,
  IconBuildingFactory2,
  IconTruck,
  IconTruckDelivery,
  IconCylinder,
  IconPackage,
  IconRefresh,
  IconArrowUpRight,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export const InventoryByLocationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Live Stock Analysis Query (5s refresh)
  const {
    data: stockAnalysis,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<any>({
    queryKey: ['stock-analysis'],
    queryFn: async () => {
      const res = await apiClient.get('/delivery-notes/stock-analysis/');
      return res.data;
    },
    refetchInterval: 5000,
  });

  const stockProducts = useMemo(() => {
    return stockAnalysis?.products || [];
  }, [stockAnalysis]);

  const activeVans = useMemo(() => {
    return stockAnalysis?.active_vans || [];
  }, [stockAnalysis]);

  // Compute Locations List (Central Godown + All Active Vans)
  const locations = useMemo(() => {
    const godownProducts = stockProducts
      .filter((product: any) => {
        const isCyl = product.IsCylinder !== false && (product.IsCylinder === true || /cylinder|lpg|kg/i.test(product.ProductName || ''));
        const emptyInGodown = product.GodownEmptyQty ?? (isCyl && (!product.Vans || product.Vans.every((v: any) => (v.EmptyQty || 0) === 0)) ? (product.EmptyQty || 0) : 0);
        return (product.GodownQty || 0) > 0 || emptyInGodown > 0;
      })
      .map((product: any) => {
        const isCyl = product.IsCylinder !== false && (product.IsCylinder === true || /cylinder|lpg|kg/i.test(product.ProductName || ''));
        const emptyInGodown = product.GodownEmptyQty ?? (isCyl && (!product.Vans || product.Vans.every((v: any) => (v.EmptyQty || 0) === 0)) ? (product.EmptyQty || 0) : 0);
        const filled = product.GodownQty || 0;
        return {
          ProductId: product.ProductId,
          ProductName: product.ProductName,
          ProductCode: product.ProductCode,
          filled: filled,
          empty: isCyl ? emptyInGodown : 0,
          Qty: filled + (isCyl ? emptyInGodown : 0),
        };
      });

    const godownFilled = godownProducts.reduce((total: number, p: any) => total + (p.filled || 0), 0);
    const godownEmpty = godownProducts.reduce((total: number, p: any) => total + (p.empty || 0), 0);

    const godown = {
      id: 'godown',
      name: 'Central Godown',
      type: 'godown',
      routeName: 'Primary Storage Hub',
      driverName: 'Warehouse Keeper',
      filledQuantity: godownFilled,
      emptyQuantity: godownEmpty,
      quantity: godownFilled + godownEmpty,
    };

    const vansList = activeVans.map((van: any) => {
      const vanFilled = (van.BalanceCylinders ?? van.TotalCylinders ?? 0) + (van.OtherProductsBalance ?? 0);
      const vanEmpty = van.EmptyCylinders ?? 0;
      return {
        id: `vehicle-${van.RouteVehicleDriverId}`,
        rawId: van.RouteVehicleDriverId,
        name: van.VehicleNumber || 'Delivery Van',
        type: 'vehicle',
        routeName: van.RouteName || 'Active Route',
        driverName: van.DriverName || 'Driver',
        filledQuantity: vanFilled,
        emptyQuantity: vanEmpty,
        quantity: vanFilled + vanEmpty,
      };
    });

    return [godown, ...vansList];
  }, [stockProducts, activeVans]);

  // Filter Locations
  const filteredLocations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return locations;
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.routeName && l.routeName.toLowerCase().includes(q)) ||
        (l.driverName && l.driverName.toLowerCase().includes(q))
    );
  }, [locations, searchQuery]);

  // Summary Metrics
  const godownCount = useMemo(() => locations.filter((l) => l.type === 'godown').length || 1, [locations]);
  const vanCount = useMemo(() => locations.filter((l) => l.type === 'vehicle').length, [locations]);

  const godownFilled = useMemo(() => {
    const g = locations.find((l) => l.type === 'godown');
    return g ? g.filledQuantity : 0;
  }, [locations]);

  const vansFilled = useMemo(() => {
    return locations
      .filter((l) => l.type === 'vehicle')
      .reduce((sum, l) => sum + (Number(l.filledQuantity) || 0), 0);
  }, [locations]);

  const totalEmpty = useMemo(() => {
    return locations.reduce((sum, l) => sum + (Number(l.emptyQuantity) || 0), 0);
  }, [locations]);

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* 1. Header with Back Button and Quick Actions */}
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <div>
          <Group gap="xs" align="center" mb={6}>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/')}
              styles={{ root: { paddingLeft: 4, paddingRight: 8 } }}
            >
              Back to Dashboard
            </Button>
          </Group>
          <Title order={2} style={{ color: '#800020', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Inventory by Location
          </Title>
          <Text size="sm" c="dimmed">
            Live stock distribution between Central Godown and active delivery fleet vans.
          </Text>
        </div>

        <Group gap="xs" align="center" wrap="wrap">
          <Tooltip label="Refresh live data" withArrow position="top">
            <ActionIcon
              variant="default"
              size="lg"
              radius="md"
              loading={isFetching}
              onClick={() => refetch()}
              style={{ borderColor: '#cbd5e1' }}
            >
              <IconRefresh size={18} color="#475569" />
            </ActionIcon>
          </Tooltip>

          <Button
            variant="outline"
            color="burgundy"
            radius="md"
            size="sm"
            fw={600}
            leftSection={<IconTruckDelivery size={16} />}
            rightSection={<IconArrowUpRight size={14} />}
            onClick={() => navigate('/van-management')}
            style={{
              backgroundColor: '#ffffff',
              borderColor: '#800020',
              color: '#800020',
            }}
          >
            Van Fleet Operations
          </Button>
        </Group>
      </Group>

      {/* 2. Top Summary KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Card 1: Total Locations */}
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
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Locations
            </Text>
            <IconBuildingFactory2 size={20} color="#800020" stroke={1.75} />
          </Group>
          <Group align="baseline" gap={6} mb={4}>
            <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {locations.length}
            </Text>
            <Text size="sm" fw={500} c="#64748b">
              locations
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {godownCount} godown · {vanCount} delivery van{vanCount !== 1 ? 's' : ''}
          </Text>
        </Paper>

        {/* Card 2: Central Godown Filled */}
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
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Godown Stock
            </Text>
            <IconPackage size={20} color="#800020" stroke={1.75} />
          </Group>
          <Group align="baseline" gap={6} mb={4}>
            <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {godownFilled.toLocaleString()}
            </Text>
            <Text size="sm" fw={500} c="#64748b">
              filled
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            Available in central warehouse storage
          </Text>
        </Paper>

        {/* Card 3: Vans Onboard Stock */}
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
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Vans Onboard
            </Text>
            <IconTruck size={20} color="#800020" stroke={1.75} />
          </Group>
          <Group align="baseline" gap={6} mb={4}>
            <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {vansFilled.toLocaleString()}
            </Text>
            <Text size="sm" fw={500} c="#64748b">
              filled
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            Loaded on {vanCount} active delivery vehicles
          </Text>
        </Paper>

        {/* Card 4: Total Empty Cylinders */}
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
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Empty Bottles
            </Text>
            <IconCylinder size={20} color="#800020" stroke={1.75} />
          </Group>
          <Group align="baseline" gap={6} mb={4}>
            <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {totalEmpty.toLocaleString()}
            </Text>
            <Text size="sm" fw={500} c="#64748b">
              empty
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            Returned bottles awaiting refilling
          </Text>
        </Paper>
      </SimpleGrid>

      {/* 3. Location Inventory Table Container */}
      <Paper
        radius="md"
        withBorder
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Table Filter Toolbar */}
        <Group justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #f1f5f9' }} wrap="wrap" gap="sm">
          <TextInput
            placeholder="Search location, van number, or driver..."
            size="sm"
            radius="md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            leftSection={<IconSearch size={15} color="#64748b" />}
            rightSection={searchQuery ? <CloseButton size="xs" onClick={() => setSearchQuery('')} /> : null}
            style={{ minWidth: 260, flexGrow: 1, maxWidth: 420 }}
          />

          <Badge
            variant="light"
            color="burgundy"
            size="md"
            radius="sm"
            styles={{
              root: {
                backgroundColor: '#fdf2f4',
                color: '#800020',
                fontWeight: 700,
              },
            }}
          >
            {filteredLocations.length} Active Hubs
          </Badge>
        </Group>

        {/* Location Table */}
        {isLoading ? (
          <Center py={60}>
            <Loader color="burgundy" size="md" />
          </Center>
        ) : filteredLocations.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap={6}>
              <IconBuildingFactory2 size={36} color="#cbd5e1" stroke={1.5} />
              <Text size="sm" c="#64748b" fw={600}>
                No locations match your search
              </Text>
              <Text size="xs" c="dimmed">
                Try searching for a different vehicle number or driver name.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={750}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover style={{ tableLayout: 'auto' }}>
              <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Location / Hub
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', width: 110 }}>
                    Type
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', width: 150 }}>
                    Route
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', width: 140 }}>
                    Driver
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 120 }}>
                    Filled Stock
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 120 }}>
                    Empty Bottles
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 130, paddingRight: 20 }}>
                    Total Units
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredLocations.map((location) => {
                  const isGodown = location.type === 'godown';
                  return (
                    <Table.Tr
                      key={location.id}
                      style={{ cursor: 'pointer', height: 48 }}
                      onClick={() => {
                        if (isGodown) {
                          navigate('/stock-analysis?location=godown');
                        } else {
                          navigate('/van-management');
                        }
                      }}
                    >
                      <Table.Td>
                        <Group gap={8} align="center" wrap="nowrap">
                          {isGodown ? (
                            <IconBuildingFactory2 size={18} color="#800020" style={{ flexShrink: 0 }} />
                          ) : (
                            <IconTruck size={18} color="#800020" style={{ flexShrink: 0 }} />
                          )}
                          <Text size="sm" fw={700} c="#0f172a">
                            {location.name}
                          </Text>
                        </Group>
                      </Table.Td>

                      <Table.Td>
                        <Badge
                          variant="outline"
                          color="gray"
                          size="sm"
                          radius="xs"
                          style={{
                            fontWeight: 600,
                            borderColor: '#cbd5e1',
                            color: '#475569',
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          {isGodown ? 'Godown' : 'Van'}
                        </Badge>
                      </Table.Td>

                      <Table.Td>
                        <Text size="xs" fw={600} c="#1e293b">
                          {location.routeName || '—'}
                        </Text>
                      </Table.Td>

                      <Table.Td>
                        <Text size="xs" c="#64748b" fw={500}>
                          {location.driverName || '—'}
                        </Text>
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {Number(location.filledQuantity || 0).toLocaleString()}
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                        {Number(location.emptyQuantity || 0).toLocaleString()}
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#800020', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                        {Number(location.quantity || 0).toLocaleString()}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>

              {/* Total Footer Row */}
              <Table.Tfoot style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <Table.Tr style={{ height: 46 }}>
                  <Table.Td colSpan={4}>
                    <Text fw={800} style={{ color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      TOTAL ({filteredLocations.length} HUBS)
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {filteredLocations.reduce((s, l) => s + (Number(l.filledQuantity) || 0), 0).toLocaleString()}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                    {filteredLocations.reduce((s, l) => s + (Number(l.emptyQuantity) || 0), 0).toLocaleString()}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 900, fontSize: 15, color: '#800020', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                    {filteredLocations.reduce((s, l) => s + (Number(l.quantity) || 0), 0).toLocaleString()}
                  </Table.Td>
                </Table.Tr>
              </Table.Tfoot>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>
    </Stack>
  );
};

export default InventoryByLocationPage;

