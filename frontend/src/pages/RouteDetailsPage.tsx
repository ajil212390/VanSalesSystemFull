import React, { useState } from 'react';
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
  Collapse,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconTruck,
  IconRefresh,
  IconUser,
  IconCash,
  IconBuildingBank,
  IconReceipt,
  IconTrash,
  IconWallet,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SalesLineItem {
  product_name: string;
  quantity: number;
  empty_quantity: number;
  rate: number;
  total: number;
}

interface RecentSale {
  sale_id?: number;
  sales_id?: number;
  bill_number?: string;
  sales_no?: string;
  invoice_no?: string;
  time?: string;
  created_at?: string;
  customer?: string;
  customer_name?: string;
  delivered_qty?: number;
  empty_returned?: number;
  empty_qty?: number;
  amount?: number;
  paid_amount?: number;
  grand_total?: number;
  payment_mode?: string;
  payment_method?: string;
  status?: string;
  lines?: SalesLineItem[];
}

interface RouteExpenseItem {
  expense_id: number | string;
  category: string;
  amount: number;
  payment_mode: string;
  notes?: string;
  time?: string;
  created_at?: string;
  source?: string;
}

interface ProductDetail {
  ProductId: number;
  ProductName: string;
  ProductCode: string;
  CategoryName?: string;
  IsCylinder?: boolean;
  AllocatedQty: number;
  DeliveredQty: number;
  BalanceQty: number;
  EmptyQty: number;
  Qty: number;
}

interface RouteDetails {
  route_id: number;
  route_name: string;
  vehicle: { vehicle_number: string };
  driver: { name: string };
  status: 'live' | 'idle';
  stock: {
    allocated_quantity: number;
    filled_quantity: number;
    empty_quantity: number;
    delivered_quantity: number;
    return_quantity: number;
    allocated_cylinders?: number;
    delivered_cylinders?: number;
    balance_van_stock?: number;
    empty_cylinders?: number;
    other_products?: number;
  };
  products?: ProductDetail[];
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
    net_cash: number;
    net_bank: number;
    recent_expenses: RouteExpenseItem[];
  };
  recent_sales: RecentSale[];
  sales_count: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtInr = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtTime = (val?: string) => {
  if (!val) return '—';
  if (val.includes('AM') || val.includes('PM')) return val;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return val;
  }
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const RouteDetailsPage: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [manualRefresh, setManualRefresh] = useState(0);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<RouteDetails>({
    queryKey: ['route-live-details', routeId, manualRefresh],
    queryFn: () => apiClient.get(`/routes/${routeId}/live-details/`).then((r) => r.data),
    enabled: !!routeId,
    refetchInterval: 10_000,
  });

  const handleRefresh = () => {
    setManualRefresh((v) => v + 1);
    refetch();
  };

  // Delete Expense
  const handleDeleteExpense = async (expenseId: number | string) => {
    if (!window.confirm('Are you sure you want to delete this trip expense entry?')) return;
    try {
      await apiClient.delete(`/routes/${routeId}/delete-expense/${expenseId}/`);
      notifications.show({
        title: 'Expense Removed',
        message: 'Trip expense deleted.',
        color: 'blue',
      });
      queryClient.invalidateQueries({ queryKey: ['route-live-details', routeId] });
      refetch();
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.detail || 'Failed to delete expense.',
        color: 'red',
      });
    }
  };

  if (isLoading) {
    return (
      <Center style={{ minHeight: 400 }}>
        <Stack align="center" gap="sm">
          <Loader size="sm" color="burgundy" />
          <Text size="sm" c="dimmed">
            Loading route operations…
          </Text>
        </Stack>
      </Center>
    );
  }

  if (isError || !data) {
    return (
      <Center style={{ minHeight: 400 }}>
        <Stack align="center" gap="md">
          <Text size="sm" c="red">
            Failed to load route details.
          </Text>
          <Group gap="sm">
            <Button
              size="xs"
              variant="light"
              color="burgundy"
              leftSection={<IconArrowLeft size={14} />}
              onClick={() => navigate('/van-management')}
            >
              Back to Routes
            </Button>
            <Button size="xs" variant="light" color="gray" onClick={handleRefresh}>
              Retry
            </Button>
          </Group>
        </Stack>
      </Center>
    );
  }

  const isLive = data.status === 'live';
  const expenses = data.expense?.recent_expenses || [];
  const totalExpense = data.expense?.total_expense ?? 0;
  const cashExpense = data.expense?.cash_expense ?? 0;
  const bankExpense = data.expense?.bank_expense ?? 0;

  const totalCollection = data.collection?.total_collection ?? 0;
  const cashCollection = data.collection?.cash_collection ?? 0;
  const bankCollection = data.collection?.bank_collection ?? 0;

  const netCollection = totalCollection - totalExpense;
  const netCash = cashCollection - cashExpense;

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
          <Group gap="sm" align="center">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="md"
              onClick={() => navigate('/van-management')}
              style={{ color: '#0f172a' }}
              title="Back to Van Management"
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Group gap="xs" align="center" wrap="wrap">
                <Title order={2} style={{ color: '#800020', fontWeight: 700, fontSize: 21, letterSpacing: '-0.02em' }}>
                  {data.route_name}
                </Title>
                <Badge
                  size="xs"
                  variant="dot"
                  color={isLive ? 'teal' : 'gray'}
                  radius="sm"
                  style={{ fontWeight: 600 }}
                >
                  {isLive ? 'Live Active' : 'Idle'}
                </Badge>
              </Group>

              <Group gap="xs" align="center" wrap="wrap" mt={2}>
                <Group gap={4} align="center">
                  <IconTruck size={13} color="#64748b" />
                  <Text size="xs" c="#334155" fw={600}>
                    {data.vehicle?.vehicle_number || 'Not Assigned'}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  &bull;
                </Text>
                <Group gap={4} align="center">
                  <IconUser size={13} color="#64748b" />
                  <Text size="xs" c="#334155" fw={600}>
                    {data.driver?.name || 'Not Assigned'}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  &bull;
                </Text>
                <Text size="xs" c="dimmed">
                  {isLive
                    ? `${data.sales_count} delivery invoice${data.sales_count !== 1 ? 's' : ''} recorded on this shift`
                    : 'Shift Completed • Idle'}
                </Text>
              </Group>
            </div>
          </Group>

          <Group gap="xs" wrap="wrap">
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
              title="Refresh live route details"
            >
              <IconRefresh size={18} stroke={1.75} />
            </ActionIcon>
          </Group>
        </Group>
      </Paper>

      {/* ── 2. Vehicle Stock Breakdown (Matching Stock Analysis System) ── */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
        {/* Allocated Cylinders */}
        <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
            Allocated Cylinders
          </Text>
          <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
            {data.stock?.allocated_cylinders ?? data.stock?.allocated_quantity ?? 0}
          </Text>
          <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
            Morning loaded stock
          </Text>
        </Paper>

        {/* Delivered Cylinders */}
        <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
            Delivered Cylinders
          </Text>
          <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
            {data.stock?.delivered_cylinders ?? data.stock?.delivered_quantity ?? 0}
          </Text>
          <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
            Delivered on route
          </Text>
        </Paper>

        {/* Balance Van Stock */}
        <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
            Balance Van Stock
          </Text>
          <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
            {data.stock?.balance_van_stock ?? data.stock?.filled_quantity ?? 0}
          </Text>
          <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
            Filled cylinders on van
          </Text>
        </Paper>

        {/* Empty Cylinders Onboard */}
        <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
            Empty Cylinders Onboard
          </Text>
          <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
            {data.stock?.empty_cylinders ?? data.stock?.empty_quantity ?? 0}
          </Text>
          <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
            Collected empty returns
          </Text>
        </Paper>

        {/* Other Products */}
        <Paper p="sm" px="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 10.5 }}>
            Other Products
          </Text>
          <Text fw={800} style={{ color: '#0f172a', fontSize: '22px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }} mt={2}>
            {data.stock?.other_products ?? 0}
          </Text>
          <Text size="xs" c="dimmed" mt={2} style={{ fontSize: 11 }}>
            Non-cylinder items balance
          </Text>
        </Paper>
      </SimpleGrid>

      {/* ── 2b. Van Product Inventory Table ── */}
      {data.products && data.products.length > 0 && (() => {
        const prodAllocTotal = data.products.reduce((s, p) => s + (p.AllocatedQty || 0), 0);
        const prodDelivTotal = data.products.reduce((s, p) => s + (p.DeliveredQty || 0), 0);
        const prodBalTotal = data.products.reduce((s, p) => s + (p.BalanceQty || 0), 0);
        const prodEmptyTotal = data.products.reduce((s, p) => s + (p.IsCylinder ? (p.EmptyQty || 0) : 0), 0);

        return (
          <Paper radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
            <Group
              justify="space-between"
              align="center"
              pt={10}
              pb={4}
              px="md"
              style={{
                borderBottom: isInventoryOpen ? '1px solid #f1f5f9' : 'none',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background-color 150ms ease',
              }}
              onClick={() => setIsInventoryOpen((prev) => !prev)}
            >
              <Text fw={700} style={{ color: '#0f172a', fontSize: 16.5, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                Vehicle Product Inventory
              </Text>

              <Tooltip label={isInventoryOpen ? 'Collapse inventory table' : 'Expand inventory table'} withArrow position="top">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  style={{
                    color: '#800020',
                    backgroundColor: 'transparent',
                    border: 'none',
                    transition: 'transform 200ms ease',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsInventoryOpen((prev) => !prev);
                  }}
                >
                  {isInventoryOpen ? <IconChevronUp size={18} stroke={2} /> : <IconChevronDown size={18} stroke={2} />}
                </ActionIcon>
              </Tooltip>
            </Group>

            {/* Permanent Column Headers Row */}
            <Table.ScrollContainer minWidth={700}>
              <Table style={{ tableLayout: 'fixed', width: '100%' }} verticalSpacing={4} horizontalSpacing="md">
                <colgroup>
                  <col style={{ width: 120 }} />
                  <col />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 90 }} />
                </colgroup>
                <Table.Thead style={{ backgroundColor: '#ffffff' }}>
                  <Table.Tr style={{ height: 30, borderBottom: '1px solid #f1f5f9' }}>
                    {isInventoryOpen ? (
                      <>
                        <Table.Th style={{ color: '#800020', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', paddingTop: 2, paddingBottom: 6 }}>
                          PRODUCT CODE
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', paddingTop: 2, paddingBottom: 6 }}>
                          PRODUCT NAME
                        </Table.Th>
                      </>
                    ) : (
                      <Table.Th colSpan={2} style={{ color: '#800020', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', paddingTop: 2, paddingBottom: 6 }}>
                        {data.products.length} PRODUCT{data.products.length !== 1 ? 'S' : ''} ON VEHICLE
                      </Table.Th>
                    )}
                    <Table.Th style={{ color: '#800020', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right', paddingTop: 2, paddingBottom: 6 }}>
                      ALLOCATED
                    </Table.Th>
                    <Table.Th style={{ color: '#800020', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right', paddingTop: 2, paddingBottom: 6 }}>
                      DELIVERED
                    </Table.Th>
                    <Table.Th style={{ color: '#800020', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right', paddingTop: 2, paddingBottom: 6 }}>
                      BALANCE
                    </Table.Th>
                    <Table.Th style={{ color: '#800020', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right', paddingRight: 20, paddingTop: 2, paddingBottom: 6 }}>
                      EMPTY
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
              </Table>
            </Table.ScrollContainer>

            <Collapse
              expanded={isInventoryOpen}
              transitionDuration={300}
              transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
            >
              <Table.ScrollContainer minWidth={700}>
                <Table style={{ tableLayout: 'fixed', width: '100%' }} verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
                  <colgroup>
                    <col style={{ width: 120 }} />
                    <col />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 90 }} />
                  </colgroup>
                  <Table.Tbody>
                    {data.products.map((p) => (
                      <Table.Tr key={p.ProductId} style={{ height: 44 }}>
                        <Table.Td style={{ fontSize: 12.5, color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                          {p.ProductCode || '—'}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={700} style={{ color: '#0f172a' }}>
                            {p.ProductName}
                          </Text>
                          {p.CategoryName && (
                            <Text size="xs" c="dimmed">
                              {p.CategoryName}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {p.AllocatedQty}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {p.DeliveredQty}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                          {p.BalanceQty}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: p.IsCylinder ? '#475569' : '#94a3b8', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                          {p.IsCylinder ? p.EmptyQty : '—'}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Collapse>

            {/* Gliding Totals Footer Row */}
            <Box
              style={{
                backgroundColor: '#ffffff',
                borderTop: isInventoryOpen ? '2px solid #f1f5f9' : 'none',
                cursor: !isInventoryOpen ? 'pointer' : 'default',
              }}
              onClick={!isInventoryOpen ? () => setIsInventoryOpen(true) : undefined}
            >
              <Table.ScrollContainer minWidth={700}>
                <Table style={{ tableLayout: 'fixed', width: '100%' }} verticalSpacing="sm" horizontalSpacing="md">
                  <colgroup>
                    <col style={{ width: 120 }} />
                    <col />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 90 }} />
                  </colgroup>
                  <Table.Tbody>
                    <Table.Tr style={{ border: 'none', height: 42 }}>
                      <Table.Td colSpan={2} style={{ border: 'none' }}>
                        <Text fw={800} style={{ color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Total
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {prodAllocTotal}
                      </Table.Td>
                      <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {prodDelivTotal}
                      </Table.Td>
                      <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                        {prodBalTotal}
                      </Table.Td>
                      <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#475569', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                        {prodEmptyTotal}
                      </Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Box>
          </Paper>
        );
      })()}

      {/* ── 3. Revenue & Settlement Overview ── */}
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
              Route Revenue &amp; Cash Settlement
            </Text>
            <Text size="xs" c="dimmed">
              Reconcile gross bill collections against driver trip expenses and net cash in hand
            </Text>
          </div>
          <Badge
            size="sm"
            variant="light"
            radius="sm"
            style={{
              backgroundColor: '#fdf2f4',
              color: '#800020',
              border: '1px solid #fce7ec',
              fontWeight: 700,
            }}
          >
            Net Revenue: {fmtInr(netCollection)}
          </Badge>
        </Group>

        <Box p="lg">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
            {/* 1. Gross Collection */}
            <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#fafbfc', borderColor: '#e2e8f0' }}>
              <Group justify="space-between" align="center" mb={4}>
                <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Gross Collection
                </Text>
                <IconReceipt size={17} color="#800020" />
              </Group>
              <Text fw={700} style={{ color: '#0f172a', fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
                {fmtInr(totalCollection)}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Cash: {fmtInr(cashCollection)} &bull; Bank: {fmtInr(bankCollection)}
              </Text>
            </Paper>

            {/* 2. Cash Handover to Depot */}
            <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#fafbfc', borderColor: '#e2e8f0' }}>
              <Group justify="space-between" align="center" mb={4}>
                <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Net Cash In Hand
                </Text>
                <IconCash size={17} color="#800020" />
              </Group>
              <Text fw={700} style={{ color: '#0f172a', fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
                {fmtInr(netCash)}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Cash coll. minus cash exp.
              </Text>
            </Paper>

            {/* 3. Bank / UPI Collection */}
            <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#fafbfc', borderColor: '#e2e8f0' }}>
              <Group justify="space-between" align="center" mb={4}>
                <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Bank / UPI Revenue
                </Text>
                <IconBuildingBank size={17} color="#800020" />
              </Group>
              <Text fw={700} style={{ color: '#0f172a', fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
                {fmtInr(bankCollection)}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Direct QR / Bank payments
              </Text>
            </Paper>

            {/* 4. Trip Expenses */}
            <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#fafbfc', borderColor: '#e2e8f0' }}>
              <Group justify="space-between" align="center" mb={4}>
                <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Trip Expenses
                </Text>
                <IconWallet size={17} color="#800020" />
              </Group>
              <Text fw={700} style={{ color: '#0f172a', fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
                {fmtInr(totalExpense)}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Cash: {fmtInr(cashExpense)} &bull; Bank: {fmtInr(bankExpense)}
              </Text>
            </Paper>

            {/* 5. Net Route Balance */}
            <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#fafbfc', borderColor: '#e2e8f0' }}>
              <Group justify="space-between" align="center" mb={4}>
                <Text size="xs" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Total Net Balance
                </Text>
                <IconWallet size={17} color="#800020" />
              </Group>
              <Text fw={700} style={{ color: '#800020', fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
                {fmtInr(netCollection)}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Total profit/net settlement
              </Text>
            </Paper>
          </SimpleGrid>
        </Box>
      </Paper>

      {/* ── 4. Trip Expenses & Fuel Table Container ── */}
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
              Trip Expenses &amp; Fuel ({expenses.length})
            </Text>
            <Text size="xs" c="dimmed">
              Recorded under Travelling Expense ledger (fuel, highway toll charges, driver allowances)
            </Text>
          </div>
        </Group>

        {expenses.length === 0 ? (
          <Center py="xl">
            <Text size="sm" c="dimmed">
              No trip expenses recorded for this route today.
            </Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={700}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover withColumnBorders={false}>
              <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', width: 130 }}>
                    TIME
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px' }}>
                    CATEGORY / REASON
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px' }}>
                    NOTES &amp; REMARKS
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center' }}>
                    PAID VIA
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>
                    AMOUNT (COLLECTED)
                  </Table.Th>
                  <Table.Th style={{ width: 44 }} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {expenses.map((exp) => (
                  <Table.Tr key={exp.expense_id}>
                    <Table.Td>
                      <Text size="xs" c="dimmed" ff="monospace">
                        {fmtTime(exp.time || exp.created_at)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600} style={{ color: '#0f172a' }}>
                        {exp.category}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {exp.notes || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Badge
                        size="xs"
                        variant="light"
                        radius="sm"
                        style={{
                          fontWeight: 700,
                          backgroundColor: exp.payment_mode === 'Cash' ? '#fdf2f4' : '#f8fafc',
                          color: exp.payment_mode === 'Cash' ? '#800020' : '#334155',
                          border: `1px solid ${exp.payment_mode === 'Cash' ? '#fce7ec' : '#e2e8f0'}`,
                        }}
                      >
                        {exp.payment_mode}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" fw={700} style={{ color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtInr(exp.amount)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        onClick={() => handleDeleteExpense(exp.expense_id)}
                        title="Delete expense"
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      {/* ── 5. Live Sales Feed Table Container ── */}
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
              Live Sales &amp; Delivery Feed ({data.recent_sales?.length ?? 0})
            </Text>
            <Text size="xs" c="dimmed">
              Real-time invoices delivered to retail customers &amp; commercial spots along this route
            </Text>
          </div>
          {isLive && (
            <Badge size="xs" variant="dot" color="teal" radius="sm">
              Updating every 10s
            </Badge>
          )}
        </Group>

        {!data.recent_sales?.length ? (
          <Center py="xl">
            <Text size="sm" c="dimmed">
              No sales recorded yet for this route today.
            </Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={750}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover withColumnBorders={false}>
              <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', width: 110 }}>
                    TIME
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px' }}>
                    BILL / INVOICE #
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px' }}>
                    CUSTOMER
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>
                    DELIVERED
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>
                    EMPTY RET.
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>
                    AMOUNT (COLLECTED)
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center' }}>
                    PAYMENT MODE
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center' }}>
                    INVOICE PDF
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.recent_sales.map((sale, idx) => {
                  const billNo =
                    sale.bill_number ||
                    sale.invoice_no ||
                    sale.sales_no ||
                    (sale.sale_id ? `#${sale.sale_id}` : sale.sales_id ? `#${sale.sales_id}` : `#${idx + 1}`);

                  const customerName = sale.customer || sale.customer_name || 'Walk-in Customer';
                  const amountVal = (sale.paid_amount !== undefined && sale.paid_amount !== null)
                    ? Number(sale.paid_amount)
                    : Number(sale.amount ?? sale.grand_total ?? 0);
                  const grandTotalVal = Number(sale.grand_total ?? 0);
                  const deliveredQty = sale.delivered_qty ?? 0;
                  const emptyReturned = sale.empty_returned ?? sale.empty_qty ?? 0;
                  const paymentModeVal = sale.payment_mode || sale.payment_method || 'Cash';
                  const isCash = paymentModeVal.toLowerCase() === 'cash';

                  return (
                    <Table.Tr key={sale.sale_id || sale.sales_id || idx}>
                      <Table.Td>
                        <Text size="xs" c="dimmed" ff="monospace">
                          {fmtTime(sale.time || sale.created_at)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={700} ff="monospace" style={{ color: '#800020' }}>
                          {billNo}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600} style={{ color: '#0f172a' }}>
                          {customerName}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={600} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {deliveredQty}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={600} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {emptyReturned}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={700} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtInr(amountVal)}
                        </Text>
                        {grandTotalVal > 0 && Math.abs(grandTotalVal - amountVal) > 0.01 && (
                          <Text size="10px" c="dimmed">
                            Bill: {fmtInr(grandTotalVal)}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Badge
                          size="xs"
                          variant="light"
                          radius="sm"
                          style={{
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            backgroundColor: isCash ? '#fdf2f4' : '#f8fafc',
                            color: isCash ? '#800020' : '#334155',
                            border: `1px solid ${isCash ? '#fce7ec' : '#e2e8f0'}`,
                          }}
                        >
                          {paymentModeVal}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          radius="sm"
                          title="View / Print Tax Invoice PDF"
                          onClick={() => {
                            const baseUrl = apiClient.defaults.baseURL?.replace(/\/api\/v1\/?$/, '') || '';
                            const cleanTicket = billNo.replace(/^#/, '');
                            window.open(`${baseUrl}/api/v1/sales/invoice-pdf/?ticket_id=${encodeURIComponent(cleanTicket)}`, '_blank');
                          }}
                        >
                          <IconReceipt size={16} />
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
