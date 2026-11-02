import React, { useMemo, useState } from 'react';
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
  ThemeIcon,
  UnstyledButton,
  Box,
  TextInput,
  CloseButton,
  ScrollArea,
  Grid,
} from '@mantine/core';
import {
  IconReceipt,
  IconCreditCard,
  IconBuildingBank,
  IconTruck,
  IconPlus,
  IconArrowRight,
  IconArrowUpRight,
  IconRoute,
  IconUser,
  IconPackage,
  IconWallet,
  IconCalendar,
  IconSearch,
  IconChevronRight,
  IconBuildingFactory2,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';

export const DashboardPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  // Stock inventory search states
  const [productSearch, setProductSearch] = useState<string>('');
  const [locationSearch, setLocationSearch] = useState<string>('');

  // Live Stock Analysis Query (5s refresh)
  const { data: stockAnalysis, isLoading: isLoadingStock } = useQuery<any>({
    queryKey: ['stock-analysis'],
    queryFn: async () => {
      const res = await apiClient.get('/delivery-notes/stock-analysis/');
      return res.data;
    },
    refetchInterval: 5000,
  });

  const stockProducts = stockAnalysis?.products || [];
  const filteredStockProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    const list = !q
      ? stockProducts
      : stockProducts.filter(
          (p: any) =>
            p.ProductName.toLowerCase().includes(q) ||
            (p.AppProductName && p.AppProductName.toLowerCase().includes(q)) ||
            (p.ProductCode && p.ProductCode.toLowerCase().includes(q))
        );
    return [...list].sort((a: any, b: any) => {
      const aIsCyl = a.IsCylinder !== false && (a.IsCylinder === true || /cylinder|lpg|kg/i.test(a.ProductName || ''));
      const bIsCyl = b.IsCylinder !== false && (b.IsCylinder === true || /cylinder|lpg|kg/i.test(b.ProductName || ''));
      if (aIsCyl && !bIsCyl) return -1;
      if (!aIsCyl && bIsCyl) return 1;
      return (a.ProductName || '').localeCompare(b.ProductName || '');
    });
  }, [stockProducts, productSearch]);

  const stockLocations = useMemo(() => {
    const godownProducts = stockProducts
      .filter((product: any) => product.GodownQty > 0)
      .map((product: any) => ({
        ProductId: product.ProductId,
        ProductName: product.ProductName,
        ProductCode: product.ProductCode,
        Qty: product.GodownQty,
      }));

    const godownFilled = godownProducts.reduce((total: number, p: any) => total + p.Qty, 0);
    const godownEmpty = 0;
    const godown = {
      id: 'godown',
      name: 'Central Godown',
      type: 'godown',
      filledQuantity: godownFilled,
      emptyQuantity: godownEmpty,
      quantity: godownFilled + godownEmpty,
    };

    const activeVansList = (stockAnalysis?.active_vans || []).map((van: any) => {
      const vanFilled = (van.BalanceCylinders ?? van.TotalCylinders ?? 0) + (van.OtherProductsBalance ?? 0);
      const vanEmpty = van.EmptyCylinders ?? 0;
      return {
        id: `vehicle-${van.RouteVehicleDriverId}`,
        name: van.VehicleNumber || 'Delivery Van',
        type: 'vehicle',
        filledQuantity: vanFilled,
        emptyQuantity: vanEmpty,
        quantity: vanFilled + vanEmpty,
      };
    });

    return [godown, ...activeVansList];
  }, [stockProducts, stockAnalysis?.active_vans]);

  const filteredStockLocations = useMemo(() => {
    const q = locationSearch.toLowerCase().trim();
    if (!q) return stockLocations;
    return stockLocations.filter((l: any) => l.name.toLowerCase().includes(q));
  }, [stockLocations, locationSearch]);

  const totalProductFilled = useMemo(() => {
    return filteredStockProducts.reduce((sum: number, p: any) => sum + (Number(p.FilledQty ?? (p.GodownQty + (p.AllocatedQty || 0))) || 0), 0);
  }, [filteredStockProducts]);

  const totalProductEmpty = useMemo(() => {
    return filteredStockProducts.reduce((sum: number, p: any) => sum + (Number(p.EmptyQty) || 0), 0);
  }, [filteredStockProducts]);

  const totalProductQuantity = useMemo(() => {
    return filteredStockProducts.reduce((sum: number, p: any) => {
      const filled = Number(p.FilledQty ?? (p.GodownQty + (p.AllocatedQty || 0))) || 0;
      const empty = Number(p.EmptyQty) || 0;
      return sum + (Number(p.TotalStockQty) || (filled + empty) || (Number(p.TotalQty) || 0));
    }, 0);
  }, [filteredStockProducts]);

  const totalLocationFilled = useMemo(() => {
    return filteredStockLocations.reduce((sum: number, l: any) => sum + (Number(l.filledQuantity) || 0), 0);
  }, [filteredStockLocations]);

  const totalLocationEmpty = useMemo(() => {
    return filteredStockLocations.reduce((sum: number, l: any) => sum + (Number(l.emptyQuantity) || 0), 0);
  }, [filteredStockLocations]);

  const totalLocationQuantity = useMemo(() => {
    return filteredStockLocations.reduce((sum: number, l: any) => sum + (Number(l.quantity) || 0), 0);
  }, [filteredStockLocations]);

  // Current Date Display
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  // 1. Fetch Purchases
  const { data: purchases = [], isLoading: isLoadingPurchases } = useQuery<any[]>({
    queryKey: ['purchases'],
    queryFn: async () => {
      const res = await apiClient.get('/purchases/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 2. Fetch Payments
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<any[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 3. Fetch Ledgers
  const { data: ledgers = [], isLoading: isLoadingLedgers } = useQuery<any[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 4. Fetch Fleet & Master Operations
  const { data: drivers = [] } = useQuery<any[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await apiClient.get('/drivers/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await apiClient.get('/vehicles/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  const { data: routes = [] } = useQuery<any[]>({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await apiClient.get('/routes/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // Financial Metrics & Account Categorization
  const metrics = useMemo(() => {
    const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.GrandTotal || 0), 0);
    const totalPayments = payments.reduce((sum, p) => sum + Number(p.Amount || 0), 0);

    const cashAndBankLedgers = ledgers.filter(
      (l) => l.group_name === 'Cash-in-Hand' || l.group_name === 'Bank Accounts'
    );

    const totalCash = ledgers
      .filter((l) => l.group_name === 'Cash-in-Hand')
      .reduce((sum, l) => sum + Number(l.CurrentBalance || 0), 0);

    const totalBank = ledgers
      .filter((l) => l.group_name === 'Bank Accounts')
      .reduce((sum, l) => sum + Number(l.CurrentBalance || 0), 0);

    const netLiquid = totalCash + totalBank;

    return {
      totalPurchases,
      totalPayments,
      purchasesCount: purchases.length,
      paymentsCount: payments.length,
      cashAndBankLedgers,
      totalCash,
      totalBank,
      netLiquid,
    };
  }, [purchases, payments, ledgers]);

  const recentPurchases = useMemo(() => purchases.slice(0, 5), [purchases]);
  const recentPayments = useMemo(() => payments.slice(0, 5), [payments]);

  return (
    <Stack gap="md" style={{ width: '100%' }}>
      {/* 1. Header: Modern Executive Greeting & Quick Action Bar */}
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
                {user?.company_name || 'Future Gas'}
              </Title>
              <Badge
                color="gray"
                variant="outline"
                size="sm"
                radius="sm"
                style={{ borderColor: '#cbd5e1', color: '#475569', backgroundColor: '#f8fafc', fontWeight: 600 }}
              >
                {user?.role || 'Administrator'}
              </Badge>
            </Group>
            <Group gap="xs" align="center" wrap="wrap">
              <Group gap={4} align="center">
                <Badge size="xs" variant="dot" color="teal" radius="sm">
                  System Active
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                &bull;
              </Text>
              <Group gap={4} align="center">
                <IconCalendar size={13} color="#94a3b8" />
                <Text size="xs" c="#64748b" fw={500}>
                  {todayFormatted}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                &bull;
              </Text>
              <Text size="xs" c="dimmed">
                Logged in as <strong>{user?.username}</strong> &bull; Gas Distribution & Management
              </Text>
            </Group>
          </Stack>

          {/* Quick Action Buttons */}
          <Group gap="xs" wrap="wrap">
            <Button
              color="burgundy"
              radius={10}
              size="sm"
              fw={600}
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate('/purchases/new')}
              style={{
                boxShadow: '0 2px 4px rgba(128, 0, 32, 0.15)',
              }}
            >
              Add Purchase
            </Button>
            <Button
              variant="outline"
              radius={10}
              size="sm"
              fw={600}
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate('/payments/new')}
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1',
                color: '#334155',
              }}
            >
              Add Payment
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* 2. Top 4 KPI Metric Cards (Refined SaaS Layout) */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Card 1: Total Purchases */}
        <Paper
          p="md"
          radius="md"
          withBorder
          onClick={() => navigate('/purchases')}
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            cursor: 'pointer',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
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
              Total Purchases
            </Text>
            <IconReceipt size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            ₹{metrics.totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
              {metrics.purchasesCount} Invoice{metrics.purchasesCount !== 1 ? 's' : ''} recorded
            </Text>
            <IconArrowUpRight size={15} color="#800020" style={{ flexShrink: 0 }} />
          </Group>
        </Paper>

        {/* Card 2: Total Payouts */}
        <Paper
          p="md"
          radius="md"
          withBorder
          onClick={() => navigate('/payments')}
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            cursor: 'pointer',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
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
              Total Payouts
            </Text>
            <IconCreditCard size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            ₹{metrics.totalPayments.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
              {metrics.paymentsCount} Payment{metrics.paymentsCount !== 1 ? 's' : ''} settled
            </Text>
            <IconArrowUpRight size={15} color="#800020" style={{ flexShrink: 0 }} />
          </Group>
        </Paper>

        {/* Card 3: Cash & Bank Balance */}
        <Paper
          p="md"
          radius="md"
          withBorder
          onClick={() => navigate('/accounts')}
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            cursor: 'pointer',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
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
              Cash & Bank Balance
            </Text>
            <IconBuildingBank size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text
            fw={700}
            style={{
              color: metrics.netLiquid >= 0 ? '#0f172a' : '#b91c1c',
              fontSize: '24px',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            ₹{Math.abs(metrics.netLiquid).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <Text component="span" size="sm" c={metrics.netLiquid >= 0 ? '#0284c7' : '#dc2626'} fw={600}>
              {metrics.netLiquid >= 0 ? 'Dr' : 'Cr'}
            </Text>
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap" gap="xs">
            <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Cash: ₹{Number(metrics.totalCash).toLocaleString('en-IN')} &bull; Bank: ₹{Number(metrics.totalBank).toLocaleString('en-IN')}
            </Text>
            <IconArrowUpRight size={15} color="#800020" style={{ flexShrink: 0 }} />
          </Group>
        </Paper>

        {/* Card 4: Van Operations */}
        <Paper
          p="md"
          radius="md"
          withBorder
          onClick={() => navigate('/allocations')}
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            cursor: 'pointer',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
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
              Van Operations
            </Text>
            <IconTruck size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.02em' }}>
            {vehicles.length} Van{vehicles.length !== 1 ? 's' : ''} &bull; {drivers.length} Driver{drivers.length !== 1 ? 's' : ''}
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
              {routes.length} Route{routes.length !== 1 ? 's' : ''} &bull; {products.length} Products
            </Text>
            <IconArrowUpRight size={15} color="#800020" style={{ flexShrink: 0 }} />
          </Group>
        </Paper>
      </SimpleGrid>

      {/* 3. Side-by-Side Dual Inventory Cards (Live Real-Time Stock) */}
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
                  {filteredStockProducts.length} Products
                </Badge>
              </Group>
            </Group>
            {isLoadingStock ? (
              <Center p="xl" style={{ flex: 1 }}>
                <Loader color="burgundy" />
              </Center>
            ) : filteredStockProducts.length === 0 ? (
              <Center p="xl" style={{ flex: 1 }}>
                <Text c="dimmed" size="sm">
                  No products found matching query.
                </Text>
              </Center>
            ) : (
              <Box style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <ScrollArea
                  h={320}
                  scrollbars="y"
                  scrollbarSize={5}
                  type="hover"
                  styles={{
                    thumb: { backgroundColor: '#800020', borderRadius: 9999 },
                    scrollbar: { backgroundColor: 'transparent' },
                  }}
                >
                  <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md" stickyHeader style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: 60 }} />
                      <col />
                      <col style={{ width: 85 }} />
                      <col style={{ width: 85 }} />
                      <col style={{ width: 95 }} />
                    </colgroup>
                    <Table.Thead style={{ backgroundColor: '#ffffff', zIndex: 1 }}>
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
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>
                          EMPTY
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', paddingRight: 20 }}>
                          TOTAL
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredStockProducts.map((product: any) => {
                        const isCyl = product.IsCylinder !== false;
                        const filled = product.FilledQty ?? (product.GodownQty + (product.AllocatedQty || 0));
                        const empty = product.EmptyQty ?? 0;
                        const total = product.TotalStockQty ?? (filled + empty);
                        return (
                          <Table.Tr
                            key={product.ProductId}
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/stock-analysis?product=${product.ProductId}`)}
                            style={{
                              cursor: 'pointer',
                              height: 44,
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
                            <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: isCyl ? '#475569' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                              {isCyl ? empty : '—'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#800020', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                              {total}
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                {/* Locked TOTAL Footer */}
                <Box style={{ marginTop: 'auto', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
                  <Table verticalSpacing="sm" horizontalSpacing="md" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: 60 }} />
                      <col />
                      <col style={{ width: 85 }} />
                      <col style={{ width: 85 }} />
                      <col style={{ width: 95 }} />
                    </colgroup>
                    <Table.Tbody>
                      <Table.Tr style={{ border: 'none', height: 44 }}>
                        <Table.Td colSpan={2} style={{ border: 'none', fontWeight: 800, color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Total
                        </Table.Td>
                        <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {totalProductFilled}
                        </Table.Td>
                        <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                          {totalProductEmpty}
                        </Table.Td>
                        <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#800020', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
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
                  {filteredStockLocations.length} Locations
                </Badge>
              </Group>
            </Group>
            {isLoadingStock ? (
              <Center p="xl" style={{ flex: 1 }}>
                <Loader color="burgundy" />
              </Center>
            ) : filteredStockLocations.length === 0 ? (
              <Center p="xl" style={{ flex: 1 }}>
                <Text c="dimmed" size="sm">
                  No stock locations found matching query.
                </Text>
              </Center>
            ) : (
              <Box style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <ScrollArea
                  h={320}
                  scrollbars="y"
                  scrollbarSize={5}
                  type="hover"
                  styles={{
                    thumb: { backgroundColor: '#800020', borderRadius: 9999 },
                    scrollbar: { backgroundColor: 'transparent' },
                  }}
                >
                  <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md" stickyHeader style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col />
                      <col style={{ width: 85 }} />
                      <col style={{ width: 85 }} />
                      <col style={{ width: 95 }} />
                    </colgroup>
                    <Table.Thead style={{ backgroundColor: '#ffffff', zIndex: 1 }}>
                      <Table.Tr>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          LOCATION
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>
                          FILLED
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>
                          EMPTY
                        </Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', paddingRight: 20 }}>
                          TOTAL
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredStockLocations.map((location: any) => (
                        <Table.Tr
                          key={location.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/stock-analysis?location=${location.id}`)}
                          style={{
                            cursor: 'pointer',
                            height: 44,
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
                          <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                            {location.emptyQuantity ?? 0}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#800020', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                            {location.quantity}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                {/* Locked TOTAL Footer */}
                <Box style={{ marginTop: 'auto', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
                  <Table verticalSpacing="sm" horizontalSpacing="md" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col />
                      <col style={{ width: 85 }} />
                      <col style={{ width: 85 }} />
                      <col style={{ width: 95 }} />
                    </colgroup>
                    <Table.Tbody>
                      <Table.Tr style={{ border: 'none', height: 44 }}>
                        <Table.Td style={{ border: 'none', fontWeight: 800, color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Total
                        </Table.Td>
                        <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {totalLocationFilled}
                        </Table.Td>
                        <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                          {totalLocationEmpty}
                        </Table.Td>
                        <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#800020', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
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

      {/* 4. Middle Grid: Recent Purchases & Recent Payments */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {/* Recent Purchases Card */}
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
          <Group justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <Group gap="xs" align="center">
              <IconReceipt size={20} color="#800020" stroke={1.75} />
              <div>
                <Group gap={6} align="center">
                  <Text fw={700} size="sm" c="#1e293b">
                    Recent Purchases
                  </Text>
                  <Badge size="xs" variant="light" color="burgundy" radius="sm" style={{ backgroundColor: '#fbf0f2', color: '#800020' }}>
                    {purchases.length} total
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  Latest supplier goods & tax invoices
                </Text>
              </div>
            </Group>
            <Button
              variant="subtle"
              color="gray"
              c="#800020"
              size="xs"
              fw={600}
              className="erp-subtle-btn"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => navigate('/purchases')}
            >
              View All
            </Button>
          </Group>

          {isLoadingPurchases ? (
            <Center py={40}>
              <Loader color="burgundy" size="sm" />
            </Center>
          ) : recentPurchases.length === 0 ? (
            <Center py={40}>
              <Text size="xs" c="dimmed">No purchases recorded yet.</Text>
            </Center>
          ) : (
            <Table.ScrollContainer minWidth={450}>
              <Table verticalSpacing="xs" horizontalSpacing="md" highlightOnHover>
                <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                  <Table.Tr>
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Purchase No</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Date</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Supplier</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>Total (₹)</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {recentPurchases.map((p) => (
                    <Table.Tr key={p.PurchaseId} style={{ cursor: 'pointer' }} onClick={() => navigate('/purchases')}>
                      <Table.Td>
                        <Badge
                          variant="outline"
                          color="gray"
                          size="sm"
                          radius="xs"
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            color: '#1e293b',
                            borderColor: '#e2e8f0',
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          #{p.PurchaseNo || String(p.PurchaseId).padStart(3, '0')}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ whiteSpace: 'nowrap' }}>
                        <Text size="xs" c="#475569" style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>
                          {p.PurchaseDate}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" fw={600} c="#1e293b">
                          {p.supplier_name || `Supplier #${p.SupplierLedgerId}`}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="xs" fw={700} c="#800020" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          ₹{Number(p.GrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Paper>

        {/* Recent Payments Card */}
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
          <Group justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <Group gap="xs" align="center">
              <IconCreditCard size={20} color="#800020" stroke={1.75} />
              <div>
                <Group gap={6} align="center">
                  <Text fw={700} size="sm" c="#1e293b">
                    Recent Payments
                  </Text>
                  <Badge size="xs" variant="light" color="burgundy" radius="sm" style={{ backgroundColor: '#fbf0f2', color: '#800020' }}>
                    {payments.length} total
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  Latest cash and bank settlements
                </Text>
              </div>
            </Group>
            <Button
              variant="subtle"
              color="gray"
              c="#800020"
              size="xs"
              fw={600}
              className="erp-subtle-btn"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => navigate('/payments')}
            >
              View All
            </Button>
          </Group>

          {isLoadingPayments ? (
            <Center py={40}>
              <Loader color="burgundy" size="sm" />
            </Center>
          ) : recentPayments.length === 0 ? (
            <Center py={40}>
              <Text size="xs" c="dimmed">No payments recorded yet.</Text>
            </Center>
          ) : (
            <Table.ScrollContainer minWidth={450}>
              <Table verticalSpacing="xs" horizontalSpacing="md" highlightOnHover>
                <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                  <Table.Tr>
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Payment No</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Date</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Party</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Account</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>Amount (₹)</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {recentPayments.map((p) => {
                    const firstLine = p.lines && p.lines.length > 0 ? p.lines[0] : null;
                    const dateStr = p.CreatedAt ? new Date(p.CreatedAt).toISOString().split('T')[0] : '—';

                    return (
                      <Table.Tr key={p.PaymentId} style={{ cursor: 'pointer' }} onClick={() => navigate('/payments')}>
                        <Table.Td>
                          <Badge
                            variant="outline"
                            color="gray"
                            size="sm"
                            radius="xs"
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              color: '#1e293b',
                              borderColor: '#e2e8f0',
                              backgroundColor: '#f8fafc',
                            }}
                          >
                            #{String(p.PaymentId).padStart(3, '0')}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ whiteSpace: 'nowrap' }}>
                          <Text size="xs" c="#475569" style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>
                            {dateStr}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={600} c="#1e293b">
                            {p.party_name || `Ledger #${p.PartyLedgerId}`}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" fw={500} c="#334155">
                            {firstLine?.ledger_name || '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="xs" fw={700} c="#800020" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            ₹{Number(p.Amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Paper>
      </SimpleGrid>

      {/* 4. Bottom Grid: Accounts & Liquidity + Van Operations Hub */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {/* Left Column: Accounts & Liquidity Overview Table */}
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
          <Group justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <Group gap="xs" align="center">
              <IconBuildingBank size={20} color="#800020" stroke={1.75} />
              <div>
                <Group gap={6} align="center">
                  <Text fw={700} size="sm" c="#1e293b">
                    Cash & Bank Accounts
                  </Text>
                  <Badge size="xs" variant="light" color="burgundy" radius="sm" style={{ backgroundColor: '#fbf0f2', color: '#800020' }}>
                    {metrics.cashAndBankLedgers.length} Ledgers
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  Real-time balances for Cash and Bank ledgers
                </Text>
              </div>
            </Group>
            <Button
              variant="subtle"
              color="gray"
              c="#800020"
              size="xs"
              fw={600}
              className="erp-subtle-btn"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => navigate('/accounts')}
            >
              Manage Accounts
            </Button>
          </Group>

          {isLoadingLedgers ? (
            <Center py={40}>
              <Loader color="burgundy" size="sm" />
            </Center>
          ) : metrics.cashAndBankLedgers.length === 0 ? (
            <Center py={40}>
              <Text size="xs" c="dimmed">No Cash or Bank accounts configured.</Text>
            </Center>
          ) : (
            <Table.ScrollContainer minWidth={450}>
              <Table verticalSpacing="xs" horizontalSpacing="md" highlightOnHover>
                <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                  <Table.Tr>
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Account Name</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Type</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>Current Balance</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {metrics.cashAndBankLedgers.map((l) => {
                    const bal = Number(l.CurrentBalance || 0);
                    const isDr = bal >= 0;
                    const isCash = l.group_name === 'Cash-in-Hand';

                    return (
                      <Table.Tr key={l.LedgerId} style={{ cursor: 'pointer' }} onClick={() => navigate('/accounts')}>
                        <Table.Td>
                          <Group gap={8} wrap="nowrap">
                            <ThemeIcon size={24} radius="sm" variant="light" color="burgundy" style={{ backgroundColor: '#fbf0f2' }}>
                              {isCash ? <IconWallet size={13} color="#800020" /> : <IconBuildingBank size={13} color="#800020" />}
                            </ThemeIcon>
                            <Text fw={600} size="xs" c="#1e293b">
                              {l.LedgerName}
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="xs"
                            variant="light"
                            radius="sm"
                            style={{
                              backgroundColor: isCash ? '#fef2f2' : '#f0fdf4',
                              color: isCash ? '#b91c1c' : '#15803d',
                              fontWeight: 600,
                            }}
                          >
                            {isCash ? 'Cash in Hand' : 'Bank Account'}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="xs" fw={700} c={isDr ? '#0f172a' : '#dc2626'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                            ₹{Math.abs(bal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                            <Text component="span" size="10px" c={isDr ? '#0284c7' : '#dc2626'} fw={600}>
                              {isDr ? 'Dr' : 'Cr'}
                            </Text>
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
                <Table.Tfoot style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                  <Table.Tr>
                    <Table.Td colSpan={2} style={{ padding: '12px 16px' }}>
                      <Text size="sm" fw={700} c="#1e293b" tt="uppercase" style={{ letterSpacing: '0.4px' }}>
                        Total Cash & Bank Balance:
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', padding: '12px 16px' }}>
                      <Text size="sm" fw={700} c={metrics.netLiquid >= 0 ? '#0f172a' : '#dc2626'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        ₹{Math.abs(metrics.netLiquid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                        <Text component="span" size="xs" c={metrics.netLiquid >= 0 ? '#0284c7' : '#dc2626'} fw={700}>
                          {metrics.netLiquid >= 0 ? 'Dr' : 'Cr'}
                        </Text>
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tfoot>
              </Table>
            </Table.ScrollContainer>
          )}
        </Paper>

        {/* Right Column: Van Operations Hub */}
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
          <Group justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <Group gap="xs" align="center">
              <IconTruck size={20} color="#800020" stroke={1.75} />
              <div>
                <Text fw={700} size="sm" c="#1e293b">
                  Van Operations Hub
                </Text>
                <Text size="xs" c="dimmed">
                  Fleet status, route distribution & catalog
                </Text>
              </div>
            </Group>
            <Button
              variant="subtle"
              color="gray"
              c="#800020"
              size="xs"
              fw={600}
              className="erp-subtle-btn"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => navigate('/allocations')}
            >
              View Allocations
            </Button>
          </Group>

          <Box p="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              {/* Drivers Card */}
              <UnstyledButton
                p="md"
                onClick={() => navigate('/drivers')}
                style={{
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  minHeight: 118,
                  transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <Group justify="space-between" align="center" mb={10}>
                  <Box style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                    <IconUser size={22} color="#800020" stroke={1.75} />
                  </Box>
                  <Badge
                    size="sm"
                    variant="light"
                    color="burgundy"
                    radius="sm"
                    style={{
                      backgroundColor: '#fbf0f2',
                      color: '#800020',
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      height: 24,
                    }}
                  >
                    {drivers.length} Drivers
                  </Badge>
                </Group>
                <div>
                  <Text size="sm" fw={600} c="#0f172a">
                    Van Drivers
                  </Text>
                  <Text size="xs" c="#64748b" mt={3} style={{ minHeight: 34, lineHeight: 1.35 }}>
                    Active driver roster & duty status
                  </Text>
                </div>
              </UnstyledButton>

              {/* Vehicles Card */}
              <UnstyledButton
                p="md"
                onClick={() => navigate('/vehicles')}
                style={{
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  minHeight: 118,
                  transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <Group justify="space-between" align="center" mb={10}>
                  <Box style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                    <IconTruck size={22} color="#800020" stroke={1.75} />
                  </Box>
                  <Badge
                    size="sm"
                    variant="light"
                    color="burgundy"
                    radius="sm"
                    style={{
                      backgroundColor: '#fbf0f2',
                      color: '#800020',
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      height: 24,
                    }}
                  >
                    {vehicles.length} Vans
                  </Badge>
                </Group>
                <div>
                  <Text size="sm" fw={600} c="#0f172a">
                    Distribution Fleet
                  </Text>
                  <Text size="xs" c="#64748b" mt={3} style={{ minHeight: 34, lineHeight: 1.35 }}>
                    Delivery vans & warehouse fleet
                  </Text>
                </div>
              </UnstyledButton>

              {/* Routes Card */}
              <UnstyledButton
                p="md"
                onClick={() => navigate('/routes')}
                style={{
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  minHeight: 118,
                  transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <Group justify="space-between" align="center" mb={10}>
                  <Box style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                    <IconRoute size={22} color="#800020" stroke={1.75} />
                  </Box>
                  <Badge
                    size="sm"
                    variant="light"
                    color="burgundy"
                    radius="sm"
                    style={{
                      backgroundColor: '#fbf0f2',
                      color: '#800020',
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      height: 24,
                    }}
                  >
                    {routes.length} Routes
                  </Badge>
                </Group>
                <div>
                  <Text size="sm" fw={600} c="#0f172a">
                    Delivery Routes
                  </Text>
                  <Text size="xs" c="#64748b" mt={3} style={{ minHeight: 34, lineHeight: 1.35 }}>
                    Regional delivery sales territories
                  </Text>
                </div>
              </UnstyledButton>

              {/* Products Card */}
              <UnstyledButton
                p="md"
                onClick={() => navigate('/products')}
                style={{
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  minHeight: 118,
                  transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <Group justify="space-between" align="center" mb={10}>
                  <Box style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                    <IconPackage size={22} color="#800020" stroke={1.75} />
                  </Box>
                  <Badge
                    size="sm"
                    variant="light"
                    color="burgundy"
                    radius="sm"
                    style={{
                      backgroundColor: '#fbf0f2',
                      color: '#800020',
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      height: 24,
                    }}
                  >
                    {products.length} Items
                  </Badge>
                </Group>
                <div>
                  <Text size="sm" fw={600} c="#0f172a">
                    Products Catalog
                  </Text>
                  <Text size="xs" c="#64748b" mt={3} style={{ minHeight: 34, lineHeight: 1.35 }}>
                    LPG cylinders & gas accessories
                  </Text>
                </div>
              </UnstyledButton>
            </SimpleGrid>
          </Box>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
};
