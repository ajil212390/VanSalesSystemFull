import React, { useMemo } from 'react';
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
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';

export const DashboardPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

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
              radius="sm"
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
              radius="sm"
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
            <ThemeIcon size={34} radius="md" variant="default" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
              <IconReceipt size={17} color="#800020" stroke={1.75} />
            </ThemeIcon>
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
            <ThemeIcon size={34} radius="md" variant="default" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
              <IconCreditCard size={17} color="#800020" stroke={1.75} />
            </ThemeIcon>
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
            <ThemeIcon size={34} radius="md" variant="default" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
              <IconBuildingBank size={17} color="#800020" stroke={1.75} />
            </ThemeIcon>
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
            <ThemeIcon size={34} radius="md" variant="default" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
              <IconTruck size={17} color="#800020" stroke={1.75} />
            </ThemeIcon>
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

      {/* 3. Middle Grid: Recent Purchases & Recent Payments */}
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
              <ThemeIcon size={32} radius="md" variant="default" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                <IconReceipt size={17} color="#800020" stroke={1.75} />
              </ThemeIcon>
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
              <ThemeIcon size={32} radius="md" variant="default" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                <IconCreditCard size={17} color="#800020" stroke={1.75} />
              </ThemeIcon>
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
              <ThemeIcon size={32} radius="md" variant="default" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                <IconBuildingBank size={17} color="#800020" stroke={1.75} />
              </ThemeIcon>
              <div>
                <Group gap={6} align="center">
                  <Text fw={700} size="sm" c="#1e293b">
                    Accounts & Liquidity
                  </Text>
                  <Badge size="xs" variant="light" color="burgundy" radius="sm" style={{ backgroundColor: '#fbf0f2', color: '#800020' }}>
                    {metrics.cashAndBankLedgers.length} Ledgers
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  Real-time balances for Cash & Bank ledgers
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
                        Net Liquid Funds:
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
              <ThemeIcon size={32} radius="md" variant="default" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                <IconTruck size={17} color="#800020" stroke={1.75} />
              </ThemeIcon>
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
                <Group justify="space-between" align="center" mb={8}>
                  <ThemeIcon size={34} radius="md" variant="default" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <IconUser size={18} color="#800020" stroke={1.75} />
                  </ThemeIcon>
                  <Badge size="sm" variant="light" color="burgundy" radius="sm" style={{ backgroundColor: '#fbf0f2', color: '#800020', fontWeight: 700 }}>
                    {drivers.length} Drivers
                  </Badge>
                </Group>
                <Text size="sm" fw={600} c="#0f172a">
                  Van Drivers
                </Text>
                <Text size="xs" c="#64748b" mt={2}>
                  Active driver roster & duty status
                </Text>
              </UnstyledButton>

              {/* Vehicles Card */}
              <UnstyledButton
                p="md"
                onClick={() => navigate('/vehicles')}
                style={{
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
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
                <Group justify="space-between" align="center" mb={8}>
                  <ThemeIcon size={34} radius="md" variant="default" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <IconTruck size={18} color="#800020" stroke={1.75} />
                  </ThemeIcon>
                  <Badge size="sm" variant="light" color="burgundy" radius="sm" style={{ backgroundColor: '#fbf0f2', color: '#800020', fontWeight: 700 }}>
                    {vehicles.length} Vans
                  </Badge>
                </Group>
                <Text size="sm" fw={600} c="#0f172a">
                  Distribution Fleet
                </Text>
                <Text size="xs" c="#64748b" mt={2}>
                  Delivery vans & godown inventory trucks
                </Text>
              </UnstyledButton>

              {/* Routes Card */}
              <UnstyledButton
                p="md"
                onClick={() => navigate('/routes')}
                style={{
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
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
                <Group justify="space-between" align="center" mb={8}>
                  <ThemeIcon size={34} radius="md" variant="default" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <IconRoute size={18} color="#800020" stroke={1.75} />
                  </ThemeIcon>
                  <Badge size="sm" variant="light" color="burgundy" radius="sm" style={{ backgroundColor: '#fbf0f2', color: '#800020', fontWeight: 700 }}>
                    {routes.length} Routes
                  </Badge>
                </Group>
                <Text size="sm" fw={600} c="#0f172a">
                  Delivery Routes
                </Text>
                <Text size="xs" c="#64748b" mt={2}>
                  Active regional service territories
                </Text>
              </UnstyledButton>

              {/* Products Card */}
              <UnstyledButton
                p="md"
                onClick={() => navigate('/products')}
                style={{
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
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
                <Group justify="space-between" align="center" mb={8}>
                  <ThemeIcon size={34} radius="md" variant="default" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <IconPackage size={18} color="#800020" stroke={1.75} />
                  </ThemeIcon>
                  <Badge size="sm" variant="light" color="burgundy" radius="sm" style={{ backgroundColor: '#fbf0f2', color: '#800020', fontWeight: 700 }}>
                    {products.length} Items
                  </Badge>
                </Group>
                <Text size="sm" fw={600} c="#0f172a">
                  Products Catalog
                </Text>
                <Text size="xs" c="#64748b" mt={2}>
                  LPG gas cylinders, regulators & inventory
                </Text>
              </UnstyledButton>
            </SimpleGrid>
          </Box>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
};
