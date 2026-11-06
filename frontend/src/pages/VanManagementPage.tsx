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
  ActionIcon,
  TextInput,
  CloseButton,
} from '@mantine/core';
import {
  IconTruck,
  IconRoute,
  IconSearch,
  IconRefresh,
  IconChevronRight,
  IconUser,
  IconCylinder,
  IconReceipt,
  IconWallet,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RouteEntry {
  route_id: number;
  route_name: string;
  vehicle_number: string;
  driver_name: string;
  status: 'live' | 'idle';
  stock: {
    filled_quantity: number;
    empty_quantity: number;
    delivered_quantity: number;
    return_quantity: number;
  };
  collection: {
    total_collection: number;
    cash_collection: number;
    bank_collection: number;
  };
  expense?: {
    total_expense: number;
    cash_expense: number;
    bank_expense: number;
    net_collection: number;
  };
}

interface VanManagementData {
  total_route_count: number;
  routes: RouteEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtInr = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Main Page ─────────────────────────────────────────────────────────────────
export const VanManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [manualRefresh, setManualRefresh] = useState(0);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<VanManagementData>({
    queryKey: ['van-management', manualRefresh],
    queryFn: () => apiClient.get('/routes/van-management/').then((r) => r.data),
    refetchInterval: 15_000,
  });

  const handleRefresh = () => {
    setManualRefresh((v) => v + 1);
    refetch();
  };

  // Filtered routes
  const filteredRoutes = useMemo(() => {
    const list = data?.routes || [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.route_name.toLowerCase().includes(q) ||
        (r.vehicle_number && r.vehicle_number.toLowerCase().includes(q)) ||
        (r.driver_name && r.driver_name.toLowerCase().includes(q))
    );
  }, [data?.routes, searchQuery]);

  // Derived summary metrics
  const liveCount = data?.routes.filter((r) => r.status === 'live').length ?? 0;
  const totalDelivered = data?.routes.reduce((s, r) => s + (r.stock?.delivered_quantity ?? 0), 0) ?? 0;
  const totalGrossCollection = data?.routes.reduce((s, r) => s + (r.collection?.total_collection ?? 0), 0) ?? 0;
  const totalExpenses = data?.routes.reduce((s, r) => s + (r.expense?.total_expense ?? 0), 0) ?? 0;
  const totalNetBalance = totalGrossCollection - totalExpenses;

  return (
    <Stack gap="md" style={{ width: '100%' }}>
      {/* ── 1. Page Header matching Executive Design System ── */}
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
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Stack gap={4} style={{ flexGrow: 1, minWidth: 260 }}>
            <Group gap="xs" align="center" wrap="wrap">
              <Title order={2} style={{ color: '#800020', fontWeight: 700, fontSize: 21, letterSpacing: '-0.02em' }}>
                Van Management
              </Title>
              <Badge
                variant="dot"
                color={liveCount > 0 ? 'teal' : 'gray'}
                size="sm"
                radius="sm"
                style={{ fontWeight: 600 }}
              >
                {liveCount > 0 ? `${liveCount} Van${liveCount !== 1 ? 's' : ''} Live On Road` : 'Fleet Idle'}
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              Real-time route fleet tracking &bull; Cylinder inventory &bull; Cash &amp; Bank Collections &bull; Trip Expenses
            </Text>
          </Stack>

          {/* Search bar & Refresh action */}
          <Group gap="sm" align="center" wrap="wrap">
            <Box style={{ width: 260, minWidth: 180 }}>
              <TextInput
                placeholder="Search route, vehicle, driver..."
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

            <ActionIcon
              variant="outline"
              size="lg"
              radius={10}
              loading={isFetching}
              onClick={handleRefresh}
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1',
                color: '#800020',
              }}
              title="Refresh live data"
            >
              <IconRefresh size={18} stroke={1.75} />
            </ActionIcon>
          </Group>
        </Group>
      </Paper>

      {/* ── 2. Top Metric KPI Cards (Clean SaaS Design System) ── */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Card 1: Total Routes */}
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
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Routes
            </Text>
            <IconRoute size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {data?.total_route_count ?? '—'}
          </Text>
          <Text size="xs" c="dimmed" mt="xs">
            {liveCount} active on delivery duty
          </Text>
        </Paper>

        {/* Card 2: Cylinders Delivered */}
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
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Delivered Today
            </Text>
            <IconCylinder size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {totalDelivered} Cyl
          </Text>
          <Text size="xs" c="dimmed" mt="xs">
            Customer cylinder drops today
          </Text>
        </Paper>

        {/* Card 3: Gross Collection */}
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
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Gross Collections
            </Text>
            <IconReceipt size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {fmtInr(totalGrossCollection)}
          </Text>
          <Text size="xs" c="dimmed" mt="xs">
            Trip Expenses: {fmtInr(totalExpenses)}
          </Text>
        </Paper>

        {/* Card 4: Net Collection */}
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
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Net Fleet Balance
            </Text>
            <IconWallet size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {fmtInr(totalNetBalance)}
          </Text>
          <Text size="xs" c="dimmed" mt="xs">
            Net revenue in hand &amp; bank
          </Text>
        </Paper>
      </SimpleGrid>

      {/* ── 3. Routes Table Container matching DeliveryNotes & StockAnalysis ── */}
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
        <Group justify="space-between" align="center" p="md" px="lg" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <Text fw={700} style={{ color: '#0f172a', fontSize: 16, letterSpacing: '-0.01em' }}>
              Routes &amp; Fleet Operations ({filteredRoutes.length})
            </Text>
            <Text size="xs" c="dimmed">
              Click any route row to view live vehicle tracking, cylinder stocks, customer deliveries &amp; trip expenses
            </Text>
          </div>
          <Badge size="xs" variant="outline" color="gray" radius="sm">
            Auto-refreshes every 15s
          </Badge>
        </Group>

        {isLoading ? (
          <Center py="xl">
            <Stack align="center" gap="sm">
              <Loader size="sm" color="burgundy" />
              <Text size="sm" c="dimmed">
                Loading live fleet data…
              </Text>
            </Stack>
          </Center>
        ) : isError ? (
          <Center py="xl">
            <Stack align="center" gap="sm">
              <Text size="sm" c="red">
                Failed to load route fleet operations.
              </Text>
              <Button size="xs" variant="light" color="burgundy" onClick={handleRefresh}>
                Retry
              </Button>
            </Stack>
          </Center>
        ) : filteredRoutes.length === 0 ? (
          <Center py="xl">
            <Text size="sm" c="dimmed">
              {searchQuery ? 'No matching routes found.' : 'No routes available.'}
            </Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={900}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover withColumnBorders={false}>
              <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px' }}>
                    ROUTE NAME
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px' }}>
                    VEHICLE
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px' }}>
                    DRIVER
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center' }}>
                    STATUS
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>
                    FILLED STOCK
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>
                    DELIVERED
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>
                    GROSS COLL.
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>
                    TRIP EXPENSES
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>
                    NET BALANCE
                  </Table.Th>
                  <Table.Th style={{ width: 44 }} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredRoutes.map((route) => {
                  const grossColl = route.collection?.total_collection ?? 0;
                  const expAmt = route.expense?.total_expense ?? 0;
                  const netBal = grossColl - expAmt;
                  const isLive = route.status === 'live';

                  return (
                    <Table.Tr
                      key={route.route_id}
                      style={{ cursor: 'pointer', transition: 'background-color 120ms ease' }}
                      onClick={() => navigate(`/van-management/${route.route_id}`)}
                    >
                      <Table.Td>
                        <Group gap="xs">
                          <IconRoute size={16} color="#800020" stroke={1.75} />
                          <Text size="sm" fw={600} style={{ color: '#0f172a' }}>
                            {route.route_name}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        {route.vehicle_number && route.vehicle_number !== 'Not Assigned' ? (
                          <Group gap={5}>
                            <IconTruck size={14} color="#64748b" />
                            <Text size="sm" fw={600} style={{ color: '#334155' }}>
                              {route.vehicle_number}
                            </Text>
                          </Group>
                        ) : (
                          <Text size="sm" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {route.driver_name && route.driver_name !== 'Not Assigned' ? (
                          <Group gap={5}>
                            <IconUser size={14} color="#64748b" />
                            <Text size="sm" style={{ color: '#334155' }}>
                              {route.driver_name}
                            </Text>
                          </Group>
                        ) : (
                          <Text size="sm" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Badge
                          size="xs"
                          variant="dot"
                          color={isLive ? 'teal' : 'gray'}
                          radius="sm"
                          style={{ fontWeight: 600 }}
                        >
                          {isLive ? 'Live' : 'Idle'}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={600} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {route.stock?.filled_quantity ?? 0}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={600} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {route.stock?.delivered_quantity ?? 0}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={600} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtInr(grossColl)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text
                          size="sm"
                          fw={600}
                          style={{
                            color: expAmt > 0 ? '#0f172a' : '#94a3b8',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {fmtInr(expAmt)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text
                          size="sm"
                          fw={700}
                          style={{
                            color: '#0f172a',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {fmtInr(netBal)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          color="gray"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/van-management/${route.route_id}`);
                          }}
                          title="View Route Details"
                        >
                          <IconChevronRight size={16} />
                        </ActionIcon>
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
  );
};
