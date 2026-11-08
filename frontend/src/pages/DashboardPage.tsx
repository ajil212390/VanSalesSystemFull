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
  Box,
  TextInput,
  CloseButton,
  ScrollArea,
  Grid,
  ActionIcon,
  Collapse,
  Tooltip,
} from '@mantine/core';
import {
  IconReceipt,
  IconCreditCard,
  IconTruck,
  IconPlus,
  IconArrowUpRight,
  IconCalendar,
  IconSearch,
  IconChevronRight,
  IconBuildingFactory2,
  IconWallet,
  IconTruckDelivery,
  IconPackage,
  IconChevronDown,
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

  // Executive synchronized row collapse states with localStorage persistence
  const [isStockRowOpen, setIsStockRowOpen] = useState(() => {
    const s = localStorage.getItem('dash_stock_row_open');
    return s !== null ? s === 'true' : true;
  });
  const [isCommercialRowOpen, setIsCommercialRowOpen] = useState(() => {
    const s = localStorage.getItem('dash_comm_row_open');
    return s !== null ? s === 'true' : true;
  });

  const toggleStockRow = () => {
    setIsStockRowOpen((prev) => {
      localStorage.setItem('dash_stock_row_open', String(!prev));
      return !prev;
    });
  };
  const toggleCommercialRow = () => {
    setIsCommercialRowOpen((prev) => {
      localStorage.setItem('dash_comm_row_open', String(!prev));
      return !prev;
    });
  };

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
      filledQuantity: godownFilled,
      emptyQuantity: godownEmpty,
      emptyCylinders: godownEmpty,
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

  const totalLocationFilled = useMemo(() => {
    return filteredStockLocations.reduce((sum: number, l: any) => sum + (Number(l.filledQuantity) || 0), 0);
  }, [filteredStockLocations]);

  const totalLocationEmpty = useMemo(() => {
    return filteredStockLocations.reduce((sum: number, l: any) => sum + (Number(l.emptyQuantity) || 0), 0);
  }, [filteredStockLocations]);

  // Synchronized row height matching Stock Analysis (max items + 1 spacer row)
  const targetStockRows = useMemo(() => {
    const pCount = filteredStockProducts.length;
    const lCount = filteredStockLocations.length;
    const maxCount = Math.max(pCount, lCount);
    return maxCount > 0 ? maxCount + 1 : 0;
  }, [filteredStockProducts.length, filteredStockLocations.length]);

  const productSpacerCount = useMemo(() => {
    if (filteredStockProducts.length === 0) return 0;
    return Math.max(0, targetStockRows - filteredStockProducts.length);
  }, [targetStockRows, filteredStockProducts.length]);

  const locationSpacerCount = useMemo(() => {
    if (filteredStockLocations.length === 0) return 0;
    return Math.max(0, targetStockRows - filteredStockLocations.length);
  }, [targetStockRows, filteredStockLocations.length]);

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
  const { data: ledgers = [] } = useQuery<any[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 4. Fetch Routes for Van Management
  const { data: routes = [] } = useQuery<any[]>({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await apiClient.get('/routes/');
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

  const balancePayable = metrics.totalPurchases - metrics.totalPayments;

  const activeRoutesCount = useMemo(() => {
    return routes.filter(
      (r: any) =>
        r.IsActive &&
        r.RouteId !== 1 &&
        !r.RouteName?.toLowerCase().includes('godown')
    ).length;
  }, [routes]);

  const recentPurchases = useMemo(() => purchases.slice(0, 10), [purchases]);
  const recentPayments = useMemo(() => payments.slice(0, 10), [payments]);

  // Fixed 5-row height rule for commercial section (Recent Purchases & Payments)
  const commercialTargetRows = 5;
  const purchasesSpacerCount = Math.max(0, commercialTargetRows - recentPurchases.length);
  const paymentsSpacerCount = Math.max(0, commercialTargetRows - recentPayments.length);

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

        {/* Card 2: Total Payments */}
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
              Total Payments
            </Text>
            <IconCreditCard size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            ₹{metrics.totalPayments.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
              {metrics.paymentsCount} Payment voucher{metrics.paymentsCount !== 1 ? 's' : ''} recorded
            </Text>
            <IconArrowUpRight size={15} color="#800020" style={{ flexShrink: 0 }} />
          </Group>
        </Paper>

        {/* Card 3: Balance Payable (Outstanding to Suppliers) */}
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
              Balance Payable
            </Text>
            <IconWallet size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text
            fw={700}
            style={{
              color: '#800020',
              fontSize: '24px',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}
          >
            ₹{Math.abs(balancePayable).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <Text component="span" size="sm" c="#800020" fw={700}>
              {balancePayable >= 0 ? 'Cr' : 'Dr'}
            </Text>
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap" gap="xs">
            <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Outstanding supplier liability
            </Text>
            <IconArrowUpRight size={15} color="#800020" style={{ flexShrink: 0 }} />
          </Group>
        </Paper>

        {/* Card 4: Van Management */}
        <Paper
          p="md"
          radius="md"
          withBorder
          onClick={() => navigate('/van-management')}
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
              Van Management
            </Text>
            <IconTruckDelivery size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: '24px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {activeRoutesCount} Active Route{activeRoutesCount !== 1 ? 's' : ''}
          </Text>
          <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
              Live delivery fleet &amp; route operations
            </Text>
            <IconArrowUpRight size={15} color="#800020" style={{ flexShrink: 0 }} />
          </Group>
        </Paper>
      </SimpleGrid>

      {/* 3. Live Real-Time Stock & Inventory Overview */}
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
              transition: 'all 200ms ease',
            }}
          >
            <Group
              justify="space-between"
              align="center"
              p="sm"
              px="md"
              style={{
                borderBottom: isStockRowOpen ? '1px solid #f1f5f9' : 'none',
                cursor: 'pointer',
                userSelect: 'none',
                backgroundColor: '#ffffff',
                transition: 'background-color 150ms ease',
              }}
              onClick={toggleStockRow}
            >
              <Group gap="xs" align="center">
                <IconPackage size={18} color="#800020" stroke={1.75} />
                <Text fw={700} style={{ color: '#0f172a', fontSize: 15, letterSpacing: '-0.01em' }}>
                  Inventory by Product
                </Text>
                <Badge
                  variant="light"
                  color="burgundy"
                  size="sm"
                  radius="sm"
                  styles={{
                    root: {
                      backgroundColor: '#fdf2f4',
                      color: '#800020',
                      fontWeight: 700,
                    },
                  }}
                >
                  {filteredStockProducts.length}
                </Badge>
              </Group>

              <Group gap="sm" align="center" onClick={(e) => e.stopPropagation()}>
                <Box
                  style={{
                    maxWidth: isStockRowOpen ? 180 : 0,
                    opacity: isStockRowOpen ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'all 280ms cubic-bezier(0.16, 1, 0.3, 1)',
                    pointerEvents: isStockRowOpen ? 'auto' : 'none',
                  }}
                >
                  <TextInput
                    placeholder="Search products..."
                    size="xs"
                    radius="md"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.currentTarget.value)}
                    leftSection={<IconSearch size={14} stroke={1.5} color="#800020" />}
                    rightSection={productSearch ? <CloseButton size="xs" onClick={() => setProductSearch('')} /> : null}
                    style={{ width: 180 }}
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
                </Box>
                <Tooltip label={isStockRowOpen ? 'Collapse inventory row' : 'Expand inventory row'} withArrow position="top">
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
                      toggleStockRow();
                    }}
                  >
                    <IconChevronDown
                      size={20}
                      stroke={2}
                      style={{
                        transform: isStockRowOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            {/* Permanent Column Headers Row */}
            <Table
              verticalSpacing="xs"
              horizontalSpacing="md"
              style={{
                tableLayout: 'fixed',
                width: '100%',
                cursor: !isStockRowOpen ? 'pointer' : 'default',
                userSelect: !isStockRowOpen ? 'none' : 'auto',
              }}
              onClick={!isStockRowOpen ? toggleStockRow : undefined}
            >
              <colgroup>
                <col style={{ width: 75 }} />
                <col />
                <col style={{ width: 95 }} />
                <col style={{ width: 95 }} />
              </colgroup>
              <Table.Thead style={{ backgroundColor: '#ffffff' }}>
                <Table.Tr style={{ height: 38, borderBottom: '1px solid #f1f5f9' }}>
                  {isStockRowOpen ? (
                    <>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        CODE
                      </Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        PRODUCT
                      </Table.Th>
                    </>
                  ) : (
                    <Table.Th colSpan={2} style={{ color: '#64748b', fontWeight: 500, fontSize: 12 }}>
                      {filteredStockProducts.length} items catalogued
                    </Table.Th>
                  )}
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>
                    FILLED
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', paddingRight: 20 }}>
                    EMPTY
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
            </Table>

            <Collapse expanded={isStockRowOpen} transitionDuration={300} transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)">
              {isLoadingStock ? (
                <Center p="xl" style={{ minHeight: 180 }}>
                  <Loader color="burgundy" size="sm" />
                </Center>
              ) : filteredStockProducts.length === 0 ? (
                <Center p="xl" style={{ minHeight: 120 }}>
                  <Text c="dimmed" size="sm">
                    No products found matching query.
                  </Text>
                </Center>
              ) : (
                <ScrollArea.Autosize
                  mah={480}
                  scrollbars="y"
                  scrollbarSize={5}
                  type="hover"
                  styles={{
                    thumb: { backgroundColor: '#800020', borderRadius: 9999 },
                    scrollbar: { backgroundColor: 'transparent' },
                  }}
                >
                  <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: 75 }} />
                      <col />
                      <col style={{ width: 95 }} />
                      <col style={{ width: 95 }} />
                    </colgroup>
                    <Table.Tbody>
                      {filteredStockProducts.map((product: any) => {
                        const isCyl = product.IsCylinder !== false;
                        const filled = product.FilledQty ?? (product.GodownQty + (product.AllocatedQty || 0));
                        const empty = product.EmptyQty ?? 0;
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
                            <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: isCyl ? '#475569' : '#94a3b8', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                              {isCyl ? empty : '—'}
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                      {Array.from({ length: productSpacerCount }).map((_, idx) => (
                        <Table.Tr key={`prod-spacer-${idx}`} style={{ height: 44, borderBottom: '1px solid #f1f5f9', pointerEvents: 'none' }}>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea.Autosize>
              )}
            </Collapse>

            {/* Gliding Totals Footer */}
            <Box
              style={{
                backgroundColor: '#ffffff',
                borderTop: isStockRowOpen ? '2px solid #f1f5f9' : 'none',
                cursor: !isStockRowOpen ? 'pointer' : 'default',
              }}
              onClick={!isStockRowOpen ? toggleStockRow : undefined}
            >
              <Table verticalSpacing="sm" horizontalSpacing="md" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: 75 }} />
                  <col />
                  <col style={{ width: 95 }} />
                  <col style={{ width: 95 }} />
                </colgroup>
                <Table.Tbody>
                  <Table.Tr style={{ border: 'none', height: 42 }}>
                    <Table.Td colSpan={2} style={{ border: 'none' }}>
                      <Text fw={800} style={{ color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {totalProductFilled}
                    </Table.Td>
                    <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#475569', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                      {totalProductEmpty}
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Box>
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
              transition: 'all 200ms ease',
            }}
          >
            <Group
              justify="space-between"
              align="center"
              p="sm"
              px="md"
              style={{
                borderBottom: isStockRowOpen ? '1px solid #f1f5f9' : 'none',
                cursor: 'pointer',
                userSelect: 'none',
                backgroundColor: '#ffffff',
                transition: 'background-color 150ms ease',
              }}
              onClick={toggleStockRow}
            >
              <Group gap="xs" align="center">
                <IconBuildingFactory2 size={18} color="#800020" stroke={1.75} />
                <Text fw={700} style={{ color: '#0f172a', fontSize: 15, letterSpacing: '-0.01em' }}>
                  Inventory by Location
                </Text>
                <Badge
                  variant="light"
                  color="burgundy"
                  size="sm"
                  radius="sm"
                  styles={{
                    root: {
                      backgroundColor: '#fdf2f4',
                      color: '#800020',
                      fontWeight: 700,
                    },
                  }}
                >
                  {filteredStockLocations.length}
                </Badge>
              </Group>

              <Group gap="sm" align="center" onClick={(e) => e.stopPropagation()}>
                <Box
                  style={{
                    maxWidth: isStockRowOpen ? 180 : 0,
                    opacity: isStockRowOpen ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'all 280ms cubic-bezier(0.16, 1, 0.3, 1)',
                    pointerEvents: isStockRowOpen ? 'auto' : 'none',
                  }}
                >
                  <TextInput
                    placeholder="Search locations..."
                    size="xs"
                    radius="md"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.currentTarget.value)}
                    leftSection={<IconSearch size={14} stroke={1.5} color="#800020" />}
                    rightSection={locationSearch ? <CloseButton size="xs" onClick={() => setLocationSearch('')} /> : null}
                    style={{ width: 180 }}
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
                </Box>
                <Tooltip label={isStockRowOpen ? 'Collapse inventory row' : 'Expand inventory row'} withArrow position="top">
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
                      toggleStockRow();
                    }}
                  >
                    <IconChevronDown
                      size={20}
                      stroke={2}
                      style={{
                        transform: isStockRowOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            {/* Permanent Column Headers Row */}
            <Table
              verticalSpacing="xs"
              horizontalSpacing="md"
              style={{
                tableLayout: 'fixed',
                width: '100%',
                cursor: !isStockRowOpen ? 'pointer' : 'default',
                userSelect: !isStockRowOpen ? 'none' : 'auto',
              }}
              onClick={!isStockRowOpen ? toggleStockRow : undefined}
            >
              <colgroup>
                <col />
                <col style={{ width: 105 }} />
                <col style={{ width: 105 }} />
              </colgroup>
              <Table.Thead style={{ backgroundColor: '#ffffff' }}>
                <Table.Tr style={{ height: 38, borderBottom: '1px solid #f1f5f9' }}>
                  <Table.Th style={{ color: isStockRowOpen ? '#800020' : '#64748b', fontWeight: isStockRowOpen ? 600 : 500, fontSize: isStockRowOpen ? 11 : 12, textTransform: isStockRowOpen ? 'uppercase' : 'none', letterSpacing: isStockRowOpen ? '0.4px' : 'normal' }}>
                    {isStockRowOpen ? 'LOCATION' : `${filteredStockLocations.length} ACTIVE HUBS`}
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right' }}>
                    FILLED
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', paddingRight: 20 }}>
                    EMPTY
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
            </Table>

            <Collapse expanded={isStockRowOpen} transitionDuration={300} transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)">
              {isLoadingStock ? (
                <Center p="xl" style={{ minHeight: 180 }}>
                  <Loader color="burgundy" size="sm" />
                </Center>
              ) : filteredStockLocations.length === 0 ? (
                <Center p="xl" style={{ minHeight: 120 }}>
                  <Text c="dimmed" size="sm">
                    No stock locations found matching query.
                  </Text>
                </Center>
              ) : (
                <ScrollArea.Autosize
                  mah={480}
                  scrollbars="y"
                  scrollbarSize={5}
                  type="hover"
                  styles={{
                    thumb: { backgroundColor: '#800020', borderRadius: 9999 },
                    scrollbar: { backgroundColor: 'transparent' },
                  }}
                >
                  <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col />
                      <col style={{ width: 105 }} />
                      <col style={{ width: 105 }} />
                    </colgroup>
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
                          <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: '#475569', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                            {location.emptyQuantity ?? 0}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                      {Array.from({ length: locationSpacerCount }).map((_, idx) => (
                        <Table.Tr key={`loc-spacer-${idx}`} style={{ height: 44, borderBottom: '1px solid #f1f5f9', pointerEvents: 'none' }}>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea.Autosize>
              )}
            </Collapse>

            {/* Gliding Totals Footer */}
            <Box
              style={{
                backgroundColor: '#ffffff',
                borderTop: isStockRowOpen ? '2px solid #f1f5f9' : 'none',
                cursor: !isStockRowOpen ? 'pointer' : 'default',
              }}
              onClick={!isStockRowOpen ? toggleStockRow : undefined}
            >
              <Table verticalSpacing="sm" horizontalSpacing="md" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col />
                  <col style={{ width: 105 }} />
                  <col style={{ width: 105 }} />
                </colgroup>
                <Table.Tbody>
                  <Table.Tr style={{ border: 'none', height: 42 }}>
                    <Table.Td style={{ border: 'none' }}>
                      <Text fw={800} style={{ color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {totalLocationFilled}
                    </Table.Td>
                    <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#475569', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                      {totalLocationEmpty}
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Box>
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
            transition: 'all 200ms ease',
          }}
        >
          <Group
            justify="space-between"
            align="center"
            p="sm"
            px="md"
            style={{
              borderBottom: isCommercialRowOpen ? '1px solid #f1f5f9' : 'none',
              cursor: 'pointer',
              userSelect: 'none',
              backgroundColor: '#ffffff',
              transition: 'background-color 150ms ease',
            }}
            onClick={toggleCommercialRow}
          >
            <Group gap="xs" align="center">
              <IconReceipt size={18} color="#800020" stroke={1.75} />
              <Text fw={700} style={{ color: '#0f172a', fontSize: 15, letterSpacing: '-0.01em' }}>
                Recent Purchases
              </Text>
              <Badge
                variant="light"
                color="burgundy"
                size="sm"
                radius="sm"
                styles={{
                  root: {
                    backgroundColor: '#fdf2f4',
                    color: '#800020',
                    fontWeight: 700,
                  },
                }}
              >
                {purchases.length}
              </Badge>
              <Tooltip label="View all purchases" withArrow position="top">
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  color="burgundy"
                  style={{
                    color: '#800020',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    transition: 'transform 150ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translate(1px, -1px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/purchases');
                  }}
                >
                  <IconArrowUpRight size={15} stroke={2} />
                </ActionIcon>
              </Tooltip>
            </Group>

            <Tooltip label={isCommercialRowOpen ? 'Collapse commercial row' : 'Expand commercial row'} withArrow position="top">
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
                  toggleCommercialRow();
                }}
              >
                <IconChevronDown
                  size={20}
                  stroke={2}
                  style={{
                    transform: isCommercialRowOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </ActionIcon>
            </Tooltip>
          </Group>

          {/* Permanent Column Headers Row */}
          <Table.ScrollContainer
            minWidth={450}
            style={{
              cursor: !isCommercialRowOpen ? 'pointer' : 'default',
              userSelect: !isCommercialRowOpen ? 'none' : 'auto',
            }}
            onClick={!isCommercialRowOpen ? toggleCommercialRow : undefined}
          >
            <Table
              verticalSpacing="xs"
              horizontalSpacing="md"
              style={{ tableLayout: 'fixed', width: '100%' }}
            >
              <colgroup>
                <col style={{ width: 110 }} />
                <col style={{ width: 100 }} />
                <col />
                <col style={{ width: 130 }} />
              </colgroup>
              <Table.Thead style={{ backgroundColor: '#ffffff' }}>
                <Table.Tr style={{ height: 38, borderBottom: '1px solid #f1f5f9' }}>
                  {isCommercialRowOpen ? (
                    <>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        PURCHASE NO
                      </Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        DATE
                      </Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        SUPPLIER
                      </Table.Th>
                    </>
                  ) : (
                    <Table.Th colSpan={3} style={{ color: '#64748b', fontWeight: 500, fontSize: 12 }}>
                      {purchases.length} invoices recorded
                    </Table.Th>
                  )}
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', paddingRight: 16 }}>
                    {isCommercialRowOpen ? 'TOTAL (₹)' : 'TOTAL BILLED'}
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
            </Table>
          </Table.ScrollContainer>

          <Collapse expanded={isCommercialRowOpen} transitionDuration={300} transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)">
            {isLoadingPurchases ? (
              <Center py={40}>
                <Loader color="burgundy" size="sm" />
              </Center>
            ) : recentPurchases.length === 0 ? (
              <Center py={40}>
                <Stack align="center" gap={6}>
                  <IconReceipt size={30} color="#cbd5e1" stroke={1.5} />
                  <Text size="xs" c="#64748b" fw={600}>No purchases recorded yet</Text>
                </Stack>
              </Center>
            ) : (
              <Table.ScrollContainer minWidth={450}>
                <ScrollArea.Autosize mah={220} scrollbars="y" type="hover">
                  <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: 110 }} />
                      <col style={{ width: 100 }} />
                      <col />
                      <col style={{ width: 130 }} />
                    </colgroup>
                    <Table.Tbody>
                      {recentPurchases.map((p) => (
                        <Table.Tr key={p.PurchaseId} style={{ cursor: 'pointer', height: 44 }} onClick={() => navigate('/purchases')}>
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
                            <Text size="xs" fw={600} c="#1e293b" lineClamp={1}>
                              {p.supplier_name || `Supplier #${p.SupplierLedgerId}`}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', paddingRight: 16 }}>
                            <Text size="xs" fw={700} c="#000000" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              ₹{Number(p.GrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                      {/* Fixed 5-row spacer rows matching the 5-row rule */}
                      {Array.from({ length: purchasesSpacerCount }).map((_, idx) => (
                        <Table.Tr key={`purch-spacer-${idx}`} style={{ height: 44, borderBottom: '1px solid #f1f5f9', pointerEvents: 'none' }}>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea.Autosize>
              </Table.ScrollContainer>
            )}
          </Collapse>

          {/* Gliding Totals Footer */}
          <Box
            style={{
              backgroundColor: '#ffffff',
              borderTop: isCommercialRowOpen ? '2px solid #f1f5f9' : 'none',
              cursor: !isCommercialRowOpen ? 'pointer' : 'default',
            }}
            onClick={!isCommercialRowOpen ? toggleCommercialRow : undefined}
          >
            <Table.ScrollContainer minWidth={450}>
              <Table verticalSpacing="sm" horizontalSpacing="md" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: 110 }} />
                  <col style={{ width: 100 }} />
                  <col />
                  <col style={{ width: 130 }} />
                </colgroup>
                <Table.Tbody>
                  <Table.Tr style={{ border: 'none', height: 42 }}>
                    <Table.Td colSpan={3} style={{ border: 'none' }}>
                      <Text fw={800} style={{ color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#000000', fontVariantNumeric: 'tabular-nums', paddingRight: 16 }}>
                      ₹{metrics.totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Box>
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
            transition: 'all 200ms ease',
          }}
        >
          <Group
            justify="space-between"
            align="center"
            p="sm"
            px="md"
            style={{
              borderBottom: isCommercialRowOpen ? '1px solid #f1f5f9' : 'none',
              cursor: 'pointer',
              userSelect: 'none',
              backgroundColor: '#ffffff',
              transition: 'background-color 150ms ease',
            }}
            onClick={toggleCommercialRow}
          >
            <Group gap="xs" align="center">
              <IconCreditCard size={18} color="#800020" stroke={1.75} />
              <Text fw={700} style={{ color: '#0f172a', fontSize: 15, letterSpacing: '-0.01em' }}>
                Recent Payments
              </Text>
              <Badge
                variant="light"
                color="burgundy"
                size="sm"
                radius="sm"
                styles={{
                  root: {
                    backgroundColor: '#fdf2f4',
                    color: '#800020',
                    fontWeight: 700,
                  },
                }}
              >
                {payments.length}
              </Badge>
              <Tooltip label="View all payments" withArrow position="top">
                <ActionIcon
                  variant="subtle"
                  size="xs"
                  color="burgundy"
                  style={{
                    color: '#800020',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    transition: 'transform 150ms ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translate(1px, -1px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/payments');
                  }}
                >
                  <IconArrowUpRight size={15} stroke={2} />
                </ActionIcon>
              </Tooltip>
            </Group>

            <Tooltip label={isCommercialRowOpen ? 'Collapse commercial row' : 'Expand commercial row'} withArrow position="top">
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
                  toggleCommercialRow();
                }}
              >
                <IconChevronDown
                  size={20}
                  stroke={2}
                  style={{
                    transform: isCommercialRowOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </ActionIcon>
            </Tooltip>
          </Group>

          {/* Permanent Column Headers Row */}
          <Table.ScrollContainer
            minWidth={450}
            style={{
              cursor: !isCommercialRowOpen ? 'pointer' : 'default',
              userSelect: !isCommercialRowOpen ? 'none' : 'auto',
            }}
            onClick={!isCommercialRowOpen ? toggleCommercialRow : undefined}
          >
            <Table
              verticalSpacing="xs"
              horizontalSpacing="md"
              style={{ tableLayout: 'fixed', width: '100%' }}
            >
              <colgroup>
                <col style={{ width: 110 }} />
                <col style={{ width: 100 }} />
                <col />
                <col style={{ width: 130 }} />
              </colgroup>
              <Table.Thead style={{ backgroundColor: '#ffffff' }}>
                <Table.Tr style={{ height: 38, borderBottom: '1px solid #f1f5f9' }}>
                  {isCommercialRowOpen ? (
                    <>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        PAYMENT NO
                      </Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        DATE
                      </Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        PARTY
                      </Table.Th>
                    </>
                  ) : (
                    <Table.Th colSpan={3} style={{ color: '#64748b', fontWeight: 500, fontSize: 12 }}>
                      {payments.length} vouchers recorded
                    </Table.Th>
                  )}
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', paddingRight: 16 }}>
                    {isCommercialRowOpen ? 'AMOUNT (₹)' : 'TOTAL PAID'}
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
            </Table>
          </Table.ScrollContainer>

          <Collapse expanded={isCommercialRowOpen} transitionDuration={300} transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)">
            {isLoadingPayments ? (
              <Center style={{ height: 220 }}>
                <Loader color="burgundy" size="sm" />
              </Center>
            ) : recentPayments.length === 0 ? (
              <Center style={{ height: 220 }}>
                <Stack align="center" gap={6}>
                  <IconWallet size={30} color="#cbd5e1" stroke={1.5} />
                  <Text size="xs" c="#64748b" fw={600}>No payments recorded yet</Text>
                  <Text size="11px" c="dimmed">Settlement vouchers will appear here</Text>
                </Stack>
              </Center>
            ) : (
              <Table.ScrollContainer minWidth={450}>
                <ScrollArea.Autosize mah={220} scrollbars="y" type="hover">
                  <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: 110 }} />
                      <col style={{ width: 100 }} />
                      <col />
                      <col style={{ width: 130 }} />
                    </colgroup>
                    <Table.Tbody>
                      {recentPayments.map((p) => {
                        const dateStr = p.CreatedAt ? new Date(p.CreatedAt).toISOString().split('T')[0] : '—';
                        return (
                          <Table.Tr key={p.PaymentId} style={{ cursor: 'pointer', height: 44 }} onClick={() => navigate('/payments')}>
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
                              <Text size="xs" fw={600} c="#1e293b" lineClamp={1}>
                                {p.party_name || `Ledger #${p.PartyLedgerId}`}
                              </Text>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', paddingRight: 16 }}>
                              <Text size="xs" fw={700} c="#000000" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                ₹{Number(p.Amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                      {/* Fixed 5-row spacer rows matching the 5-row rule */}
                      {Array.from({ length: paymentsSpacerCount }).map((_, idx) => (
                        <Table.Tr key={`pay-spacer-${idx}`} style={{ height: 44, borderBottom: '1px solid #f1f5f9', pointerEvents: 'none' }}>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                          <Table.Td style={{ height: 44, border: 'none' }}>&nbsp;</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea.Autosize>
              </Table.ScrollContainer>
            )}
          </Collapse>

          {/* Gliding Totals Footer */}
          <Box
            style={{
              backgroundColor: '#ffffff',
              borderTop: isCommercialRowOpen ? '2px solid #f1f5f9' : 'none',
              cursor: !isCommercialRowOpen ? 'pointer' : 'default',
            }}
            onClick={!isCommercialRowOpen ? toggleCommercialRow : undefined}
          >
            <Table.ScrollContainer minWidth={450}>
              <Table verticalSpacing="sm" horizontalSpacing="md" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: 110 }} />
                  <col style={{ width: 100 }} />
                  <col />
                  <col style={{ width: 130 }} />
                </colgroup>
                <Table.Tbody>
                  <Table.Tr style={{ border: 'none', height: 42 }}>
                    <Table.Td colSpan={3} style={{ border: 'none' }}>
                      <Text fw={800} style={{ color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ border: 'none', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#000000', fontVariantNumeric: 'tabular-nums', paddingRight: 16 }}>
                      ₹{metrics.totalPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Box>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
};
