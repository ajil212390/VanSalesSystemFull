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
  Modal,
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
  IconPrinter,
  IconHistory,
  IconArrowRight,
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

interface SaleEditHistoryItem {
  edit_id?: number;
  EditId?: number;
  edited_by?: string;
  EditedBy?: string;
  edited_at?: string;
  EditedAt?: string;
  old_grand_total?: number;
  OldGrandTotal?: number;
  new_grand_total?: number;
  NewGrandTotal?: number;
  old_payment_method?: string;
  OldPaymentMethod?: string;
  new_payment_method?: string;
  NewPaymentMethod?: string;
  notes?: string;
  Notes?: string;
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
  is_approved?: boolean;
  is_edited?: boolean;
  IsEdited?: boolean;
  is_receipt?: boolean;
  edited_by?: string;
  edited_at?: string;
  edit_reason?: string;
  lines?: SalesLineItem[];
  edit_history?: SaleEditHistoryItem[];
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeAuditSale, setActiveAuditSale] = useState<RecentSale | null>(null);

  const handlePrintTripSheet = async () => {
    if (!routeId) return;
    try {
      setIsGeneratingPdf(true);
      const res = await apiClient.get(`/routes/${routeId}/trip-sheet-pdf/`, {
        responseType: 'blob',
      });
      const file = new Blob([res.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    } catch (err: any) {
      notifications.show({
        color: 'red',
        title: 'Error generating PDF',
        message: err?.response?.data?.detail || 'Failed to generate Route Trip Sheet PDF.',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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
        color: 'burgundy',
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
              <Group gap="xs" align="center" mb={2}>
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={() => navigate('/van-management')}
                  styles={{ root: { paddingLeft: 0, paddingRight: 6, height: 22, fontSize: 11 } }}
                >
                  Van Management
                </Button>
              </Group>
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
            <Button
              variant="outline"
              size="sm"
              radius={8}
              loading={isGeneratingPdf}
              leftSection={<IconPrinter size={16} />}
              onClick={handlePrintTripSheet}
              style={{
                borderColor: '#800020',
                color: '#800020',
                fontWeight: 600,
                backgroundColor: '#ffffff',
              }}
            >
              Print Trip Sheet PDF
            </Button>
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
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsInventoryOpen((prev) => !prev);
                  }}
                >
                  <IconChevronDown
                    size={18}
                    stroke={2}
                    style={{
                      transform: isInventoryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </ActionIcon>
              </Tooltip>
            </Group>

            {/* Permanent Column Headers Row */}
            <Table.ScrollContainer
              minWidth={700}
              style={{
                cursor: !isInventoryOpen ? 'pointer' : 'default',
                userSelect: !isInventoryOpen ? 'none' : 'auto',
              }}
              onClick={!isInventoryOpen ? () => setIsInventoryOpen(true) : undefined}
            >
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
                        <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: '#000000', fontVariantNumeric: 'tabular-nums' }}>
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
                      <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#000000', fontVariantNumeric: 'tabular-nums' }}>
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
              Live Deliveries &amp; Collections Feed ({data.recent_sales?.length ?? 0})
            </Text>
            <Text size="xs" c="dimmed">
              Real-time invoices delivered and payment collections received from customers along this route
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

                  const isReceipt = Boolean(
                    sale.is_receipt ||
                    billNo.startsWith('TREC-') ||
                    billNo.startsWith('RCPT-') ||
                    billNo.startsWith('REC-')
                  );

                  const customerName = sale.customer || sale.customer_name || 'Walk-in Customer';
                  const paymentModeVal = sale.payment_mode || sale.payment_method || 'Cash';
                  const pmLower = paymentModeVal.toLowerCase();
                  const isCash = pmLower === 'cash';
                  const isCredit = pmLower === 'credit';
                  const isSplit = pmLower === 'split';
                  const rawAmountVal = (sale.paid_amount !== undefined && sale.paid_amount !== null)
                    ? Number(sale.paid_amount)
                    : Number(sale.amount ?? 0);
                  const amountVal = isCredit ? 0 : rawAmountVal;
                  const grandTotalVal = Number(sale.grand_total ?? 0);
                  const deliveredQty = sale.delivered_qty ?? 0;
                  const emptyReturned = sale.empty_returned ?? sale.empty_qty ?? 0;

                  return (
                    <Table.Tr key={`${isReceipt ? 'REC' : 'SALE'}-${sale.sale_id || sale.sales_id || billNo}-${idx}`}>
                      <Table.Td>
                        <Text size="xs" c="dimmed" ff="monospace">
                          {fmtTime(sale.time || sale.created_at)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6} wrap="nowrap" align="center">
                          <Text size="sm" fw={700} ff="monospace" style={{ color: '#800020' }}>
                            {billNo}
                          </Text>
                          {isReceipt && (
                            <Badge
                              size="xs"
                              variant="light"
                              styles={{
                                root: {
                                  backgroundColor: '#fdf2f4',
                                  color: '#800020',
                                  fontWeight: 800,
                                  fontSize: 9,
                                  letterSpacing: '0.4px',
                                  height: 18,
                                  paddingLeft: 6,
                                  paddingRight: 6,
                                  borderRadius: 4,
                                  border: '1px solid #f5c2cb',
                                },
                              }}
                            >
                              RECEIPT
                            </Badge>
                          )}
                          {(sale.is_edited || sale.IsEdited || (sale.edit_history && sale.edit_history.length > 0)) && (
                            <Tooltip
                              label="Click to inspect invoice revision history"
                              withArrow
                              position="top"
                            >
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
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600} style={{ color: '#0f172a' }}>
                          {customerName}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={600} style={{ color: isReceipt ? '#94a3b8' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {isReceipt ? '—' : deliveredQty}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={600} style={{ color: isReceipt ? '#94a3b8' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {isReceipt ? '—' : emptyReturned}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={700} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtInr(amountVal)}
                        </Text>
                        {!isReceipt && grandTotalVal > 0 && Math.abs(grandTotalVal - amountVal) > 0.01 && (
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
                            backgroundColor: isCash
                              ? '#fdf2f4'
                              : isCredit
                                ? '#fef3c7'
                                : isSplit
                                  ? '#eef2ff'
                                  : '#f8fafc',
                            color: isCash
                              ? '#800020'
                              : isCredit
                                ? '#92400e'
                                : isSplit
                                  ? '#4338ca'
                                  : '#334155',
                            border: `1px solid ${
                              isCash
                                ? '#fce7ec'
                                : isCredit
                                  ? '#fde68a'
                                  : isSplit
                                    ? '#c7d2fe'
                                    : '#e2e8f0'
                            }`,
                          }}
                        >
                          {paymentModeVal}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          radius="sm"
                          style={{ color: '#800020' }}
                          title={isReceipt ? 'View / Print Official Receipt PDF' : 'View / Print Tax Invoice PDF'}
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

      {/* ── Invoice Edit Revision History Audit Modal ── */}
      <Modal
        opened={!!activeAuditSale}
        onClose={() => setActiveAuditSale(null)}
        title={
          <Group gap="xs">
            <Box
              p={6}
              style={{
                backgroundColor: '#fdf2f4',
                borderRadius: 8,
                border: '1px solid #f5c2cb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconHistory size={18} color="#800020" />
            </Box>
            <div>
              <Text fw={800} style={{ color: '#800020', fontSize: 16, letterSpacing: '-0.2px' }}>
                Invoice Revision History
              </Text>
              <Text size="11px" c="dimmed">
                {activeAuditSale?.bill_number || activeAuditSale?.invoice_no || activeAuditSale?.sales_no || 'Invoice'} &bull; {activeAuditSale?.customer || activeAuditSale?.customer_name || 'Customer'}
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
                    {activeAuditSale.customer || activeAuditSale.customer_name || 'Walk-in Customer'}
                  </Text>
                </div>
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    DELIVERED / EMPTY
                  </Text>
                  <Text fw={800} size="xs" c="#0f172a">
                    {activeAuditSale.delivered_qty ?? 0} Cyl / {activeAuditSale.empty_returned ?? activeAuditSale.empty_qty ?? 0} Ret
                  </Text>
                </div>
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    INVOICE TOTAL
                  </Text>
                  <Text fw={800} size="xs" c="#0f172a">
                    ₹{Number(activeAuditSale.grand_total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </div>
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    PAID / COLLECTED
                  </Text>
                  <Text fw={900} size="sm" style={{ color: '#800020' }}>
                    ₹{Number(activeAuditSale.paid_amount ?? activeAuditSale.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </div>
              </SimpleGrid>
            </Box>

            {/* Note / Reason outside the tab */}
            {activeAuditSale.edit_reason && (
              <Text size="xs" c="#475569" px={4} style={{ marginTop: -4 }}>
                <Text component="span" fw={700} style={{ color: '#800020' }}>Latest Note / Reason:</Text>{' '}
                {activeAuditSale.edit_reason}
              </Text>
            )}

            {/* Revision Audit Rows */}
            {(!activeAuditSale.edit_history || activeAuditSale.edit_history.length === 0) ? (
              <Box p="lg" style={{ textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <Text size="sm" fw={700} style={{ color: '#800020' }}>
                  Invoice modified by {activeAuditSale.edited_by || 'Driver / Admin'}
                </Text>
                {activeAuditSale.edited_at && (
                  <Text size="xs" c="dimmed" mt={4}>
                    Modified at {new Date(activeAuditSale.edited_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>
                )}
                {activeAuditSale.edit_reason && (
                  <Text size="xs" fw={600} style={{ color: '#800020' }} mt={6}>
                    &ldquo;{activeAuditSale.edit_reason}&rdquo;
                  </Text>
                )}
              </Box>
            ) : (
              <Table.ScrollContainer minWidth={680} style={{ width: '100%' }}>
                <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover withTableBorder style={{ borderRadius: 8, overflow: 'hidden', width: '100%' }}>
                  <Table.Thead style={{ backgroundColor: '#fdf2f4' }}>
                    <Table.Tr>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 52, whiteSpace: 'nowrap' }}>EDIT #</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 155, whiteSpace: 'nowrap' }}>TIMESTAMP</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 165, whiteSpace: 'nowrap' }}>MODIFIED BY</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 220, whiteSpace: 'nowrap' }}>AMOUNT CHANGE</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 145, whiteSpace: 'nowrap' }}>PAYMENT MODE</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px' }}>REASON / NOTES</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {activeAuditSale.edit_history.map((eh: any, idx: number) => {
                      const revNum = (activeAuditSale.edit_history?.length ?? 0) - idx;
                      const editDate = eh.edited_at || eh.EditedAt;
                      const editor = eh.edited_by || eh.EditedBy || 'Driver / Admin';
                      const oldTotal = eh.old_grand_total ?? eh.OldGrandTotal ?? 0;
                      const newTotal = eh.new_grand_total ?? eh.NewGrandTotal ?? 0;
                      const oldMode = eh.old_payment_method || eh.OldPaymentMethod || '';
                      const newMode = eh.new_payment_method || eh.NewPaymentMethod || '';
                      const noteText = eh.notes || eh.Notes || 'Invoice details updated';
                      const paidMatch = String(noteText).match(/(?:Paid|Collected)\s*[:\s]*[₹Rs\.]*\s*([\d,]+\.?\d*)/i);
                      const wasMatch = String(noteText).match(/was\s*[₹Rs\.]*\s*([\d,]+\.?\d*)/i);
                      const paidAfter = paidMatch ? parseFloat(paidMatch[1].replace(/,/g, '')) : null;
                      const paidBefore = wasMatch ? parseFloat(wasMatch[1].replace(/,/g, '')) : null;

                      return (
                        <Table.Tr key={`rev-${eh.edit_id || eh.EditId || idx}-${idx}`}>
                          <Table.Td style={{ whiteSpace: 'nowrap' }}>
                            <Badge size="xs" variant="light" color="burgundy" radius="sm" style={{ fontWeight: 800 }}>
                              #{revNum}
                            </Badge>
                          </Table.Td>
                          <Table.Td style={{ fontSize: 12, color: '#475569', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                            {editDate ? new Date(editDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </Table.Td>
                          <Table.Td style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                            {editor}
                          </Table.Td>
                          <Table.Td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                            {paidAfter !== null ? (
                              <div>
                                <Group gap={6} wrap="nowrap">
                                  {paidBefore !== null && (
                                    <>
                                      <Text size="xs" td="line-through" c="dimmed">
                                        ₹{paidBefore.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </Text>
                                      <IconArrowRight size={13} color="#800020" />
                                    </>
                                  )}
                                  <Text size="sm" fw={800} style={{ color: '#800020' }}>
                                    Paid ₹{paidAfter.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </Text>
                                </Group>
                                {Number(oldTotal) !== Number(newTotal) && (
                                  <Text size="10px" c="dimmed">
                                    Bill: ₹{Number(oldTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} → ₹{Number(newTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </Text>
                                )}
                              </div>
                            ) : (
                              <Group gap={6} wrap="nowrap">
                                <Text size="xs" td="line-through" c="dimmed">
                                  ₹{Number(oldTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </Text>
                                <IconArrowRight size={13} color="#800020" />
                                <Text size="sm" fw={800} style={{ color: '#800020' }}>
                                  ₹{Number(newTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </Text>
                              </Group>
                            )}
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
                  const billNo = activeAuditSale.bill_number || activeAuditSale.invoice_no || activeAuditSale.sales_no || '';
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
