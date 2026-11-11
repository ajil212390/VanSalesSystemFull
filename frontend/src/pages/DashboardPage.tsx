import React, { useMemo } from 'react';
import {
  Title,
  Text,
  SimpleGrid,
  Group,
  Stack,
  Box,
  Button,
} from '@mantine/core';
import {
  IconReceipt,
  IconCreditCard,
  IconArrowUpRight,
  IconWallet,
  IconTruckDelivery,
  IconFileInvoice,
  IconCash,
  IconCoins,
  IconPackage,
  IconBuildingFactory2,
  IconShoppingCart,
  IconPlus,
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
  const { data: purchases = [] } = useQuery<any[]>({
    queryKey: ['purchases'],
    queryFn: async () => {
      const res = await apiClient.get('/purchases/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 2. Fetch Payments & Receipts
  const { data: payments = [] } = useQuery<any[]>({
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

  // 4. Fetch Sales
  const { data: sales = [] } = useQuery<any[]>({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await apiClient.get('/sales/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 5. Fetch Routes for Van Management
  const { data: routes = [] } = useQuery<any[]>({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await apiClient.get('/routes/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 6. Live Stock Analysis Query (5s refresh)
  const { data: stockAnalysis } = useQuery<any>({
    queryKey: ['stock-analysis'],
    queryFn: async () => {
      const res = await apiClient.get('/delivery-notes/stock-analysis/');
      return res.data;
    },
    refetchInterval: 5000,
  });

  // Separate Customers & Suppliers
  const customerLedgerIds = useMemo(() => {
    return new Set(
      ledgers
        .filter((l: any) => {
          const gName = (l.group_name || l.GroupName || '').toLowerCase();
          const gid = Number(l.GroupId ?? l.Group ?? 0);
          return gid === 21 || gName.includes('debtor') || gName.includes('customer');
        })
        .map((l: any) => l.LedgerId)
    );
  }, [ledgers]);

  // Supplier Payments vs Customer Receipts
  const supplierPayments = useMemo(() => {
    return payments.filter((p: any) => {
      if (p.voucher_type === 'PAYMENT') return true;
      if (p.voucher_type === 'RECEIPT') return false;
      if (customerLedgerIds.has(p.PartyLedgerId)) return false;
      return true;
    });
  }, [payments, customerLedgerIds]);

  const customerReceipts = useMemo(() => {
    return payments.filter((p: any) => {
      if (p.voucher_type === 'RECEIPT') return true;
      if (p.voucher_type === 'PAYMENT') return false;
      if (customerLedgerIds.has(p.PartyLedgerId)) return true;
      return false;
    });
  }, [payments, customerLedgerIds]);

  // Row 1 Calculations: Purchases & Payables
  const totalPurchase = useMemo(() => {
    return purchases.reduce((sum: number, p: any) => sum + Number(p.GrandTotal || 0), 0);
  }, [purchases]);

  const totalSupplierPayments = useMemo(() => {
    return supplierPayments.reduce((sum: number, p: any) => sum + Number(p.Amount || 0), 0);
  }, [supplierPayments]);

  const payableBalance = totalPurchase - totalSupplierPayments;

  // Row 2 Calculations: Sales & Receivables
  const totalSales = useMemo(() => {
    return sales
      .filter((s: any) => s.Status !== 'CANCELLED')
      .reduce((sum: number, s: any) => sum + Number(s.GrandTotal || 0), 0);
  }, [sales]);

  const validSalesCount = useMemo(() => {
    return sales.filter((s: any) => s.Status !== 'CANCELLED').length;
  }, [sales]);

  const totalCustomerReceipts = useMemo(() => {
    return customerReceipts.reduce((sum: number, p: any) => sum + Number(p.Amount || 0), 0);
  }, [customerReceipts]);

  const receivableBalance = totalSales - totalCustomerReceipts;

  // Row 3 Calculations: Inventory & Van Management
  const stockProducts = stockAnalysis?.products || [];

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

  const totalProductFilled = useMemo(() => {
    return stockProducts.reduce((sum: number, p: any) => sum + (Number(p.FilledQty ?? (p.GodownQty + (p.AllocatedQty || 0))) || 0), 0);
  }, [stockProducts]);

  const totalProductEmpty = useMemo(() => {
    return stockProducts.reduce((sum: number, p: any) => sum + (Number(p.EmptyQty) || 0), 0);
  }, [stockProducts]);

  const godownCount = useMemo(() => {
    return stockLocations.filter((l: any) => l.type === 'godown').length || 1;
  }, [stockLocations]);

  const vanCount = useMemo(() => {
    return stockLocations.filter((l: any) => l.type === 'vehicle').length;
  }, [stockLocations]);

  const activeRoutesCount = useMemo(() => {
    return routes.filter(
      (r: any) =>
        r.IsActive &&
        r.RouteId !== 1 &&
        !r.RouteName?.toLowerCase().includes('godown')
    ).length;
  }, [routes]);

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* 1. Header with Canvas Greeting & Quick Actions */}
      <Box pt={4} pb={2}>
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <div>
            <Title order={2} style={{ color: '#800020', fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em' }}>
              {user?.company_name || 'Future Gas'}
            </Title>
            <Text size="xs" c="dimmed" mt={2}>
              {todayFormatted} &bull; Executive Operations &amp; Commercial Overview
            </Text>
          </div>

          <Group gap="xs" wrap="wrap">
            <Button
              variant="outline"
              color="burgundy"
              size="sm"
              radius="md"
              leftSection={<IconShoppingCart size={16} />}
              style={{ borderColor: '#800020', color: '#800020', fontWeight: 600 }}
              onClick={() => navigate('/purchases/new')}
            >
              Add Purchase
            </Button>
            <Button
              variant="outline"
              color="burgundy"
              size="sm"
              radius="md"
              leftSection={<IconCreditCard size={16} />}
              style={{ borderColor: '#800020', color: '#800020', fontWeight: 600 }}
              onClick={() => navigate('/payments/new')}
            >
              Add Payment
            </Button>
            <Button
              variant="filled"
              size="sm"
              radius="md"
              leftSection={<IconPlus size={16} />}
              style={{ backgroundColor: '#800020', fontWeight: 600 }}
              onClick={() => navigate('/sales/new')}
            >
              Add Sale
            </Button>
          </Group>
        </Group>
      </Box>

      {/* 2. Structured 3x3 Metric Cards Grid */}
      <Stack gap="lg">
        {/* ROW 1: Purchases & Payables */}
        <Stack gap="xs">
          <Group gap={8} align="center">
            <Box style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: '#800020' }} />
            <Text size="xs" fw={700} c="#800020" tt="uppercase" style={{ letterSpacing: '0.6px', fontSize: 11 }}>
              Purchases &amp; Payables
            </Text>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {/* Card 1: Total Purchase */}
            <Box
              onClick={() => navigate('/purchases')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #eef2f6',
                borderRadius: '16px',
                cursor: 'pointer',
                padding: '20px 22px',
                boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)',
                transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 16px 30px -4px rgba(128, 0, 32, 0.09), 0 6px 14px -2px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(128, 0, 32, 0.16)';
                e.currentTarget.style.borderColor = '#f5c2cb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)';
                e.currentTarget.style.borderColor = '#eef2f6';
              }}
            >
              <Group justify="space-between" align="center" mb="xs">
                <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Total Purchase
                </Text>
                <IconReceipt size={22} color="#800020" stroke={1.75} />
              </Group>
              <Text fw={700} style={{ color: '#0f172a', fontSize: '25px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                ₹{totalPurchase.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
                <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
                  {purchases.length} Invoice{purchases.length !== 1 ? 's' : ''} recorded
                </Text>
                <IconArrowUpRight size={16} color="#800020" stroke={2} style={{ flexShrink: 0 }} />
              </Group>
            </Box>

            {/* Card 2: Supplier Payments */}
            <Box
              onClick={() => navigate('/payments')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #eef2f6',
                borderRadius: '16px',
                cursor: 'pointer',
                padding: '20px 22px',
                boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)',
                transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 16px 30px -4px rgba(128, 0, 32, 0.09), 0 6px 14px -2px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(128, 0, 32, 0.16)';
                e.currentTarget.style.borderColor = '#f5c2cb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)';
                e.currentTarget.style.borderColor = '#eef2f6';
              }}
            >
              <Group justify="space-between" align="center" mb="xs">
                <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Supplier Payments
                </Text>
                <IconCreditCard size={22} color="#800020" stroke={1.75} />
              </Group>
              <Text fw={700} style={{ color: '#0f172a', fontSize: '25px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                ₹{totalSupplierPayments.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
                <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
                  {supplierPayments.length} Payment voucher{supplierPayments.length !== 1 ? 's' : ''} recorded
                </Text>
                <IconArrowUpRight size={16} color="#800020" stroke={2} style={{ flexShrink: 0 }} />
              </Group>
            </Box>

            {/* Card 3: Payable */}
            <Box
              onClick={() => navigate('/payables')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #eef2f6',
                borderRadius: '16px',
                cursor: 'pointer',
                padding: '20px 22px',
                boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)',
                transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 16px 30px -4px rgba(128, 0, 32, 0.09), 0 6px 14px -2px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(128, 0, 32, 0.16)';
                e.currentTarget.style.borderColor = '#f5c2cb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)';
                e.currentTarget.style.borderColor = '#eef2f6';
              }}
            >
              <Group justify="space-between" align="center" mb="xs">
                <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Payable
                </Text>
                <IconWallet size={22} color="#800020" stroke={1.75} />
              </Group>
              <Text
                fw={700}
                style={{
                  color: '#800020',
                  fontSize: '25px',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25,
                }}
              >
                ₹{Math.abs(payableBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <Text component="span" size="sm" c="#800020" fw={700}>
                  {payableBalance >= 0 ? 'Cr' : 'Dr'}
                </Text>
              </Text>
              <Group justify="space-between" align="center" mt="xs" wrap="nowrap" gap="xs">
                <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Outstanding supplier liability
                </Text>
                <IconArrowUpRight size={16} color="#800020" stroke={2} style={{ flexShrink: 0 }} />
              </Group>
            </Box>
          </SimpleGrid>
        </Stack>

        {/* ROW 2: Sales & Receivables */}
        <Stack gap="xs" mt={4}>
          <Group gap={8} align="center">
            <Box style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: '#800020' }} />
            <Text size="xs" fw={700} c="#800020" tt="uppercase" style={{ letterSpacing: '0.6px', fontSize: 11 }}>
              Sales &amp; Receivables
            </Text>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {/* Card 4: Sales */}
            <Box
              onClick={() => navigate('/sales')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #eef2f6',
                borderRadius: '16px',
                cursor: 'pointer',
                padding: '20px 22px',
                boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)',
                transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 16px 30px -4px rgba(128, 0, 32, 0.09), 0 6px 14px -2px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(128, 0, 32, 0.16)';
                e.currentTarget.style.borderColor = '#f5c2cb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)';
                e.currentTarget.style.borderColor = '#eef2f6';
              }}
            >
              <Group justify="space-between" align="center" mb="xs">
                <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Sales
                </Text>
                <IconFileInvoice size={22} color="#800020" stroke={1.75} />
              </Group>
              <Text fw={700} style={{ color: '#0f172a', fontSize: '25px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                ₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
                <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
                  {validSalesCount} Delivery &amp; sales bill{validSalesCount !== 1 ? 's' : ''}
                </Text>
                <IconArrowUpRight size={16} color="#800020" stroke={2} style={{ flexShrink: 0 }} />
              </Group>
            </Box>

            {/* Card 5: Receipts */}
            <Box
              onClick={() => navigate('/receipts')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #eef2f6',
                borderRadius: '16px',
                cursor: 'pointer',
                padding: '20px 22px',
                boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)',
                transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 16px 30px -4px rgba(128, 0, 32, 0.09), 0 6px 14px -2px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(128, 0, 32, 0.16)';
                e.currentTarget.style.borderColor = '#f5c2cb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)';
                e.currentTarget.style.borderColor = '#eef2f6';
              }}
            >
              <Group justify="space-between" align="center" mb="xs">
                <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Receipts
                </Text>
                <IconCash size={22} color="#800020" stroke={1.75} />
              </Group>
              <Text fw={700} style={{ color: '#0f172a', fontSize: '25px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                ₹{totalCustomerReceipts.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
                <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
                  {customerReceipts.length} Collection voucher{customerReceipts.length !== 1 ? 's' : ''} recorded
                </Text>
                <IconArrowUpRight size={16} color="#800020" stroke={2} style={{ flexShrink: 0 }} />
              </Group>
            </Box>

            {/* Card 6: Receivable */}
            <Box
              onClick={() => navigate('/receivables')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #eef2f6',
                borderRadius: '16px',
                cursor: 'pointer',
                padding: '20px 22px',
                boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)',
                transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 16px 30px -4px rgba(128, 0, 32, 0.09), 0 6px 14px -2px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(128, 0, 32, 0.16)';
                e.currentTarget.style.borderColor = '#f5c2cb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)';
                e.currentTarget.style.borderColor = '#eef2f6';
              }}
            >
              <Group justify="space-between" align="center" mb="xs">
                <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Receivable
                </Text>
                <IconCoins size={22} color="#800020" stroke={1.75} />
              </Group>
              <Text
                fw={700}
                style={{
                  color: '#800020',
                  fontSize: '25px',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25,
                }}
              >
                ₹{Math.abs(receivableBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <Text component="span" size="sm" c="#800020" fw={700}>
                  {receivableBalance >= 0 ? 'Dr' : 'Cr'}
                </Text>
              </Text>
              <Group justify="space-between" align="center" mt="xs" wrap="nowrap" gap="xs">
                <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Outstanding customer balance
                </Text>
                <IconArrowUpRight size={16} color="#800020" stroke={2} style={{ flexShrink: 0 }} />
              </Group>
            </Box>
          </SimpleGrid>
        </Stack>

        {/* ROW 3: Inventory & Van Operations */}
        <Stack gap="xs" mt={4}>
          <Group gap={8} align="center">
            <Box style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: '#800020' }} />
            <Text size="xs" fw={700} c="#800020" tt="uppercase" style={{ letterSpacing: '0.6px', fontSize: 11 }}>
              Inventory &amp; Van Operations
            </Text>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {/* Card 7: Inventory by Product */}
            <Box
              onClick={() => navigate('/inventory/products')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #eef2f6',
                borderRadius: '16px',
                cursor: 'pointer',
                padding: '20px 22px',
                boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)',
                transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 16px 30px -4px rgba(128, 0, 32, 0.09), 0 6px 14px -2px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(128, 0, 32, 0.16)';
                e.currentTarget.style.borderColor = '#f5c2cb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)';
                e.currentTarget.style.borderColor = '#eef2f6';
              }}
            >
              <Group justify="space-between" align="center" mb="xs">
                <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Inventory by Product
                </Text>
                <IconPackage size={22} color="#800020" stroke={1.75} />
              </Group>
              <Group align="baseline" gap={6} mb={4}>
                <Text
                  fw={700}
                  style={{
                    color: '#0f172a',
                    fontSize: 25,
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.25,
                  }}
                >
                  {totalProductFilled.toLocaleString()}
                </Text>
                <Text size="sm" fw={500} c="#64748b">
                  filled
                </Text>
              </Group>
              <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
                <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
                  {totalProductEmpty.toLocaleString()} empty &bull; {stockProducts.length} items
                </Text>
                <IconArrowUpRight size={16} color="#800020" stroke={2} style={{ flexShrink: 0 }} />
              </Group>
            </Box>

            {/* Card 8: Inventory by Location */}
            <Box
              onClick={() => navigate('/inventory/locations')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #eef2f6',
                borderRadius: '16px',
                cursor: 'pointer',
                padding: '20px 22px',
                boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)',
                transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 16px 30px -4px rgba(128, 0, 32, 0.09), 0 6px 14px -2px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(128, 0, 32, 0.16)';
                e.currentTarget.style.borderColor = '#f5c2cb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)';
                e.currentTarget.style.borderColor = '#eef2f6';
              }}
            >
              <Group justify="space-between" align="center" mb="xs">
                <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Inventory by Location
                </Text>
                <IconBuildingFactory2 size={22} color="#800020" stroke={1.75} />
              </Group>
              <Group align="baseline" gap={6} mb={4}>
                <Text
                  fw={700}
                  style={{
                    color: '#0f172a',
                    fontSize: 25,
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.25,
                  }}
                >
                  {stockLocations.length}
                </Text>
                <Text size="sm" fw={500} c="#64748b">
                  locations
                </Text>
              </Group>
              <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
                <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
                  {godownCount} godown &bull; {vanCount} vans
                </Text>
                <IconArrowUpRight size={16} color="#800020" stroke={2} style={{ flexShrink: 0 }} />
              </Group>
            </Box>

            {/* Card 9: Van Management */}
            <Box
              onClick={() => navigate('/van-management')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #eef2f6',
                borderRadius: '16px',
                cursor: 'pointer',
                padding: '20px 22px',
                boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)',
                transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 16px 30px -4px rgba(128, 0, 32, 0.09), 0 6px 14px -2px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(128, 0, 32, 0.16)';
                e.currentTarget.style.borderColor = '#f5c2cb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)';
                e.currentTarget.style.borderColor = '#eef2f6';
              }}
            >
              <Group justify="space-between" align="center" mb="xs">
                <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                  Van Management
                </Text>
                <IconTruckDelivery size={22} color="#800020" stroke={1.75} />
              </Group>
              <Text fw={700} style={{ color: '#0f172a', fontSize: '25px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                {activeRoutesCount} Active Route{activeRoutesCount !== 1 ? 's' : ''}
              </Text>
              <Group justify="space-between" align="center" mt="xs" wrap="nowrap">
                <Text size="xs" c="dimmed" truncate style={{ whiteSpace: 'nowrap' }}>
                  Live delivery fleet &amp; route operations
                </Text>
                <IconArrowUpRight size={16} color="#800020" stroke={2} style={{ flexShrink: 0 }} />
              </Group>
            </Box>
          </SimpleGrid>
        </Stack>
      </Stack>
    </Stack>
  );
};

export default DashboardPage;
