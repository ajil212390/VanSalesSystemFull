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
} from '@mantine/core';
import {
  IconArrowLeft,
  IconTruck,
  IconRefresh,
  IconUser,
  IconCylinder,
  IconCash,
  IconBuildingBank,
  IconPackage,
  IconArrowBack,
  IconReceipt,
  IconTrash,
  IconWallet,
  IconArrowUpRight,
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
  const netBank = bankCollection - bankExpense;

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
                  {data.sales_count} delivery invoice{data.sales_count !== 1 ? 's' : ''} recorded today
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

      {/* ── 2. Stock KPI Cards (Clean SaaS Design System) ── */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Filled Stock */}
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
              Filled Van Stock
            </Text>
            <IconCylinder size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {data.stock?.filled_quantity ?? 0} Cyl
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed">
              Full cylinders currently on vehicle
            </Text>
            <IconArrowUpRight size={15} color="#800020" />
          </Group>
        </Paper>

        {/* Empty Cylinders */}
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
              Empty Cylinders
            </Text>
            <IconPackage size={20} color="#b45309" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {data.stock?.empty_quantity ?? 0} Cyl
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed">
              Collected &amp; in transit on van
            </Text>
            <IconArrowUpRight size={15} color="#b45309" />
          </Group>
        </Paper>

        {/* Delivered Today */}
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
            <IconTruck size={20} color="#15803d" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#15803d', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {data.stock?.delivered_quantity ?? 0} Cyl
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed">
              Delivered across customer routes
            </Text>
            <IconArrowUpRight size={15} color="#15803d" />
          </Group>
        </Paper>

        {/* Returns */}
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
              Customer Returns
            </Text>
            <IconArrowBack size={20} color="#1d4ed8" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {data.stock?.return_quantity ?? 0} Cyl
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed">
              Empty cylinders taken back
            </Text>
            <IconArrowUpRight size={15} color="#1d4ed8" />
          </Group>
        </Paper>
      </SimpleGrid>

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
          <Badge size="sm" variant="light" color="teal" radius="sm">
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
              <Text fw={700} style={{ color: '#800020', fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
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
                <IconCash size={17} color="#15803d" />
              </Group>
              <Text fw={700} style={{ color: '#15803d', fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
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
                <IconBuildingBank size={17} color="#1d4ed8" />
              </Group>
              <Text fw={700} style={{ color: '#1d4ed8', fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
                {fmtInr(netBank)}
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
                <IconWallet size={17} color="#dc2626" />
              </Group>
              <Text fw={700} style={{ color: totalExpense > 0 ? '#dc2626' : '#94a3b8', fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
                {fmtInr(totalExpense)}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Cash: {fmtInr(cashExpense)} &bull; Bank: {fmtInr(bankExpense)}
              </Text>
            </Paper>

            {/* 5. Net Route Balance */}
            <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <Group justify="space-between" align="center" mb={4}>
                <Text size="xs" fw={700} c="#166534" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Total Net Balance
                </Text>
                <IconWallet size={17} color="#15803d" />
              </Group>
              <Text fw={800} style={{ color: '#15803d', fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
                {fmtInr(netCollection)}
              </Text>
              <Text size="xs" c="#166534" mt={4}>
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
                    AMOUNT
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
                        variant="outline"
                        color={exp.payment_mode === 'Cash' ? 'teal' : 'blue'}
                        radius="sm"
                        style={{ fontWeight: 600 }}
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
                    AMOUNT
                  </Table.Th>
                  <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center' }}>
                    PAYMENT MODE
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
                  const amountVal = sale.amount ?? sale.grand_total ?? 0;
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
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Badge
                          size="xs"
                          variant="outline"
                          color={isCash ? 'teal' : 'blue'}
                          radius="sm"
                          style={{ fontWeight: 600, textTransform: 'capitalize' }}
                        >
                          {paymentModeVal}
                        </Badge>
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
