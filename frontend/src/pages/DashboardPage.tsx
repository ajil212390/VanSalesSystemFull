import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Title,
  Text,
  SimpleGrid,
  Group,
  Stack,
  Box,
  Button,
  Modal,
  TextInput,
  SegmentedControl,
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
  IconCalendar,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';

// ── Smooth Animated Count-Up for Numbers ──
interface CountUpProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

const CountUp: React.FC<CountUpProps> = ({
  value,
  duration = 750,
  prefix = '',
  suffix = '',
  decimals = 0,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const startRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const endVal = Number(value) || 0;
    const startVal = displayValue;
    if (startVal === endVal) return;

    startTimeRef.current = null;
    startRef.current = startVal;

    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const current = startRef.current + (endVal - startRef.current) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, duration]);

  const formatted = useMemo(() => {
    return displayValue.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }, [displayValue, decimals]);

  return <>{prefix}{formatted}{suffix}</>;
};

// ── Clean Premium Dashboard Metric Card ──
interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  subtitle: React.ReactNode;
  onClick: () => void;
  valueColor?: string;
}

const DashboardMetricCard: React.FC<MetricCardProps> = ({
  title,
  icon,
  value,
  subtitle,
  onClick,
  valueColor,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <Box
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: '#ffffff',
        border: `1px solid ${isHovered ? '#cbd5e1' : '#eef2f6'}`,
        borderRadius: '18px',
        cursor: 'pointer',
        padding: '20px 22px',
        boxShadow: isHovered
          ? '0 12px 24px -4px rgba(15, 23, 42, 0.08), 0 4px 8px -2px rgba(15, 23, 42, 0.04)'
          : '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03)',
        transform: isHovered ? 'translateY(-3px)' : 'none',
        transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 148,
        outline: 'none',
      }}
    >
      {/* Card Header: Title + Icon */}
      <Group justify="space-between" align="center" mb="xs" wrap="nowrap">
        <Text
          size="xs"
          fw={700}
          c="#64748b"
          tt="uppercase"
          style={{ letterSpacing: '0.5px', fontSize: 11.5 }}
        >
          {title}
        </Text>
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transform: isHovered ? 'scale(1.08)' : 'none',
            transition: 'transform 200ms ease',
          }}
        >
          {icon}
        </Box>
      </Group>

      {/* Card Body: Metric Value */}
      <Box my={3}>
        {React.isValidElement(value) && (value.type === Text || (value.props as any)?.style?.fontSize || (value.props as any)?.gap !== undefined) ? (
          value
        ) : (
          <Text
            fw={700}
            style={{
              color: valueColor || '#0f172a',
              fontSize: '26px',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
            }}
          >
            {value}
          </Text>
        )}
      </Box>

      {/* Card Footer: Subtitle Pill + Light Neutral Arrow Box */}
      <Group justify="space-between" align="center" mt="xs" wrap="nowrap" gap="xs">
        <Box
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            border: '1px solid #f1f5f9',
            borderRadius: 9999,
            padding: '3px 10px',
            maxWidth: 'calc(100% - 36px)',
          }}
        >
          <Text
            size="xs"
            c="#64748b"
            fw={500}
            truncate
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: 11.5,
            }}
          >
            {subtitle}
          </Text>
        </Box>
        <Box
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: isHovered ? '#e2e8f0' : '#f1f5f9',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transform: isHovered ? 'translate(2px, -2px)' : 'none',
            transition: 'all 200ms ease',
          }}
        >
          <IconArrowUpRight size={16} stroke={2} />
        </Box>
      </Group>
    </Box>
  );
};

export const DashboardPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customDates, setCustomDates] = useState<{ from: string; to: string }>({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [customModalOpened, setCustomModalOpened] = useState(false);

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

  // ── Workable Date Range Calculation ──
  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (timeFilter === 'all') {
      return { start: '', end: '', label: 'All Time' };
    }

    if (timeFilter === 'today') {
      return { start: todayStr, end: todayStr, label: 'Today' };
    }

    if (timeFilter === 'week') {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      return {
        start: start.toISOString().split('T')[0],
        end: todayStr,
        label: 'This Week',
      };
    }

    if (timeFilter === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: start.toISOString().split('T')[0],
        end: todayStr,
        label: 'This Month',
      };
    }

    if (timeFilter === 'custom') {
      return {
        start: customDates.from || '2000-01-01',
        end: customDates.to || todayStr,
        label: customDates.from && customDates.to ? `${customDates.from} to ${customDates.to}` : 'Custom Range',
      };
    }

    return { start: '', end: '', label: 'All Time' };
  }, [timeFilter, customDates]);

  // ── Filtered Datasets According to Date Range ──
  const filteredPurchases = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return purchases;
    return purchases.filter((p: any) => {
      const pDate = p.PurchaseDate || p.InvoiceDate || p.CreatedAt?.split('T')[0];
      return pDate && pDate >= dateRange.start && pDate <= dateRange.end;
    });
  }, [purchases, dateRange]);

  const filteredSales = useMemo(() => {
    return sales.filter((s: any) => {
      if (s.Status === 'CANCELLED') return false;
      if (!dateRange.start || !dateRange.end) return true;
      const sDate = s.SalesDate || s.CreatedAt?.split('T')[0];
      return sDate && sDate >= dateRange.start && sDate <= dateRange.end;
    });
  }, [sales, dateRange]);

  const filteredSupplierPayments = useMemo(() => {
    return supplierPayments.filter((p: any) => {
      if (!dateRange.start || !dateRange.end) return true;
      const pDate = p.payment_date || p.CreatedAt?.split('T')[0] || p.VoucherDate;
      return pDate && pDate >= dateRange.start && pDate <= dateRange.end;
    });
  }, [supplierPayments, dateRange]);

  const filteredCustomerReceipts = useMemo(() => {
    return customerReceipts.filter((p: any) => {
      if (!dateRange.start || !dateRange.end) return true;
      const pDate = p.payment_date || p.CreatedAt?.split('T')[0] || p.VoucherDate;
      return pDate && pDate >= dateRange.start && pDate <= dateRange.end;
    });
  }, [customerReceipts, dateRange]);

  // Row 1 Calculations: Purchases & Payables
  const totalSupplierOpeningPayable = useMemo(() => {
    return ledgers
      .filter((l: any) => {
        const gName = (l.group_name || l.GroupName || '').toLowerCase();
        const gid = Number(l.GroupId ?? l.Group ?? 0);
        return gid === 20 || gName.includes('creditor') || gName.includes('supplier');
      })
      .reduce((sum: number, l: any) => {
        const op = Number(l.OpeningBalance || 0);
        const opType = (l.OpeningBalanceType || 'CR').toUpperCase();
        return sum + (opType === 'CR' ? op : -op);
      }, 0);
  }, [ledgers]);

  const totalPurchase = useMemo(() => {
    return filteredPurchases.reduce((sum: number, p: any) => sum + Number(p.GrandTotal || 0), 0);
  }, [filteredPurchases]);

  const totalSupplierPayments = useMemo(() => {
    return filteredSupplierPayments.reduce((sum: number, p: any) => sum + Number(p.Amount || 0), 0);
  }, [filteredSupplierPayments]);

  const payableBalance = totalSupplierOpeningPayable + totalPurchase - totalSupplierPayments;

  // Row 2 Calculations: Sales & Receivables
  const totalCustomerOpeningReceivable = useMemo(() => {
    return ledgers
      .filter((l: any) => {
        const gName = (l.group_name || l.GroupName || '').toLowerCase();
        const gid = Number(l.GroupId ?? l.Group ?? 0);
        const lName = (l.LedgerName || '').trim().toLowerCase();
        if (
          gid === 22 ||
          gid === 16 ||
          gid === 17 ||
          gName.includes('duties') ||
          gName.includes('tax') ||
          /^(cgst|sgst|igst|gst|tax|round off)/i.test(lName)
        ) {
          return false;
        }
        return gid === 21 || gName.includes('debtor') || gName.includes('customer');
      })
      .reduce((sum: number, l: any) => {
        const op = Number(l.OpeningBalance || 0);
        const opType = (l.OpeningBalanceType || 'DR').toUpperCase();
        return sum + (opType === 'DR' ? op : -op);
      }, 0);
  }, [ledgers]);

  const totalSales = useMemo(() => {
    return filteredSales.reduce((sum: number, s: any) => sum + Number(s.GrandTotal || 0), 0);
  }, [filteredSales]);

  const validSalesCount = useMemo(() => {
    return filteredSales.length;
  }, [filteredSales]);

  // Collections = Payment receipts + payments collected on sales in this period
  // Deduct receipt allocations from sales PaidAmount to avoid double counting
  const totalReceiptAllocatedToSales = useMemo(() => {
    let allocSum = 0;
    filteredCustomerReceipts.forEach((p: any) => {
      (p.lines || []).forEach((l: any) => {
        (l.allocations || []).forEach((a: any) => {
          allocSum += Number(a.AllocatedAmount || 0);
        });
      });
    });
    return allocSum;
  }, [filteredCustomerReceipts]);

  const salesPaidTotal = useMemo(() => {
    return filteredSales.reduce((sum: number, s: any) => sum + Number(s.PaidAmount || 0), 0);
  }, [filteredSales]);

  const netSalesPaid = Math.max(0, salesPaidTotal - totalReceiptAllocatedToSales);

  const totalCustomerReceipts = useMemo(() => {
    const directReceipts = filteredCustomerReceipts.reduce((sum: number, p: any) => sum + Number(p.Amount || 0), 0);
    return directReceipts + netSalesPaid;
  }, [filteredCustomerReceipts, netSalesPaid]);

  // Direct collections received on sales invoices (Cash, UPI, etc.)
  const salesWithPaidCount = useMemo(() => {
    return filteredSales.filter((s: any) => Number(s.PaidAmount || 0) > 0).length;
  }, [filteredSales]);

  const totalCollectionsCount = useMemo(() => {
    return filteredCustomerReceipts.length + salesWithPaidCount;
  }, [filteredCustomerReceipts.length, salesWithPaidCount]);

  const receivableBalance = totalCustomerOpeningReceivable + totalSales - totalCustomerReceipts;

  // Row 3 Calculations: Inventory & Van Operations
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
      {/* ── 1. Top Header: Title on Left (Centered Vertically) & Filters + Actions on Right ── */}
      <Box pt={6} pb={6}>
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          {/* Left: FUTURE GAS Branding & Overview (Centered Vertically in Header Section) */}
          <Box style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Title
              order={2}
              style={{
                color: '#800020',
                fontWeight: 900,
                fontSize: 26,
                letterSpacing: '0.01em',
                fontFamily: "",
              }}
            >
              {user?.company_name || 'Future Gas'}
            </Title>
            <Text size="xs" c="dimmed" mt={2} fw={500}>
              {todayFormatted} &bull; Executive Operations &amp; Commercial Overview &bull; Showing {dateRange.label}
            </Text>
          </Box>

          {/* Right: Smooth Sliding Filter Tabs & Action Pills Stacked and Aligned */}
          <Stack gap="xs" align="flex-end">
            {/* Smooth SegmentedControl Time Filter */}
            <SegmentedControl
              value={timeFilter}
              onChange={(val) => {
                if (val === 'custom') {
                  setCustomModalOpened(true);
                } else {
                  setTimeFilter(val as any);
                }
              }}
              color="burgundy"
              radius="xl"
              size="xs"
              transitionDuration={250}
              transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
              data={[
                { label: 'All', value: 'all' },
                { label: 'Today', value: 'today' },
                { label: 'This Week', value: 'week' },
                { label: 'This Month', value: 'month' },
                {
                  label: (
                    <Group gap={4} wrap="nowrap" align="center" style={{ display: 'inline-flex' }}>
                      <IconCalendar size={13} />
                      <span>Custom</span>
                    </Group>
                  ),
                  value: 'custom',
                },
              ]}
              styles={{
                root: {
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  padding: 3,
                },
                control: {
                  border: 'none',
                },
                indicator: {
                  backgroundColor: '#800020',
                  borderRadius: 9999,
                  boxShadow: 'none',
                  border: 'none',
                  outline: 'none',
                },
                label: {
                  fontSize: 12,
                  fontWeight: 500,
                  padding: '4px 14px',
                  transition: 'color 150ms ease, font-weight 150ms ease',
                },
              }}
            />

            {/* Action Buttons Row: Clean White Pills */}
            <Group justify="flex-end" gap="sm" wrap="wrap">
              {/* 1. New Sale */}
              <Button
                variant="default"
                size="sm"
                radius="xl"
                leftSection={<IconReceipt size={16} stroke={1.8} color="#800020" />}
                style={{
                  borderColor: '#e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  fontWeight: 600,
                  padding: '8px 16px',
                }}
                onClick={() => navigate('/sales/new')}
              >
                New Sale
              </Button>

              {/* 2. Record Receipt */}
              <Button
                variant="default"
                size="sm"
                radius="xl"
                leftSection={<IconCoins size={16} stroke={1.8} color="#800020" />}
                style={{
                  borderColor: '#e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  fontWeight: 600,
                  padding: '8px 16px',
                }}
                onClick={() => navigate('/receipts/new')}
              >
                Record Receipt
              </Button>

              {/* 3. New Purchase */}
              <Button
                variant="default"
                size="sm"
                radius="xl"
                leftSection={<IconPackage size={16} stroke={1.8} color="#800020" />}
                style={{
                  borderColor: '#e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  fontWeight: 600,
                  padding: '8px 16px',
                }}
                onClick={() => navigate('/purchases/new')}
              >
                New Purchase
              </Button>

              {/* 4. Load Van (Navigates to Delivery Notes / Add New Delivery Note) */}
              <Button
                variant="default"
                size="sm"
                radius="xl"
                leftSection={<IconTruckDelivery size={16} stroke={1.8} color="#800020" />}
                style={{
                  borderColor: '#e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  fontWeight: 600,
                  padding: '8px 16px',
                }}
                onClick={() => navigate('/delivery-notes?action=new')}
              >
                Load Van
              </Button>
            </Group>
          </Stack>
        </Group>
      </Box>

      {/* ── 2. Structured 3x3 Metric Cards Grid (Original Clean Theme) ── */}
      <Stack gap="xl">
        {/* ROW 1: Purchases & Payables */}
        <Stack gap="sm">
          <Group gap={10} align="center">
            <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: '#800020' }} />
            <Text size="xs" fw={700} c="#800020" tt="uppercase" style={{ letterSpacing: '0.8px', fontSize: 11.5 }}>
              Purchases &amp; Payables
            </Text>
            <Box style={{ flex: 1, height: 1, backgroundColor: '#f1f5f9' }} />
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            <DashboardMetricCard
              title="Total Purchase"
              icon={<IconReceipt size={22} color='#800020'/>}
              value={<CountUp value={totalPurchase} prefix="₹" decimals={2} />}
              subtitle={`${filteredPurchases.length} Invoice${filteredPurchases.length !== 1 ? 's' : ''} (${dateRange.label})`}
              onClick={() => navigate('/purchases')}
            />

            <DashboardMetricCard
              title="Supplier Payments"
              icon={<IconCreditCard size={22} color='#800020' />}
              value={<CountUp value={totalSupplierPayments} prefix="₹" decimals={2} />}
              subtitle={`${filteredSupplierPayments.length} Voucher${filteredSupplierPayments.length !== 1 ? 's' : ''} (${dateRange.label})`}
              onClick={() => navigate('/payments')}
            />

            <DashboardMetricCard
              title="Payable"
              icon={<IconWallet size={22} color='#800020' />}
              value={
                <Text
                  fw={800}
                  style={{
                    color: '#800020',
                    fontSize: '28px',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.03em',
                    lineHeight: 1.15,
                  }}
                >
                  <CountUp value={Math.abs(payableBalance)} prefix="₹" decimals={2} />{' '}
                  <Text component="span" size="sm" c="#800020" fw={700}>
                    {payableBalance >= 0 ? 'Cr' : 'Dr'}
                  </Text>
                </Text>
              }
              subtitle="Outstanding supplier liability"
              onClick={() => navigate('/payables')}
            />
          </SimpleGrid>
        </Stack>

        {/* ROW 2: Sales & Receivables */}
        <Stack gap="sm">
          <Group gap={10} align="center">
            <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: '#800020' }} />
            <Text size="xs" fw={700} c="#800020" tt="uppercase" style={{ letterSpacing: '0.8px', fontSize: 11.5 }}>
              Sales &amp; Receivables
            </Text>
            <Box style={{ flex: 1, height: 1, backgroundColor: '#f1f5f9' }} />
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            <DashboardMetricCard
              title="Sales"
              icon={<IconFileInvoice size={22} color='#800020' />}
              value={<CountUp value={totalSales} prefix="₹" decimals={2} />}
              subtitle={`${validSalesCount} Bill${validSalesCount !== 1 ? 's' : ''} (${dateRange.label})`}
              onClick={() => navigate('/sales')}
            />

            <DashboardMetricCard
              title="Collections"
              icon={<IconCash size={22} color='#800020' />}
              value={<CountUp value={totalCustomerReceipts} prefix="₹" decimals={2} />}
              subtitle={`${totalCollectionsCount} Collection${totalCollectionsCount !== 1 ? 's' : ''} (${dateRange.label})`}
              onClick={() => navigate('/collections')}
            />

            <DashboardMetricCard
              title="Receivable"
              icon={<IconCoins size={22} color='#800020' />}
              value={
                <Text
                  fw={800}
                  style={{
                    color: '#800020',
                    fontSize: '27px',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.2,
                  }}
                >
                  <CountUp value={Math.abs(receivableBalance)} prefix="₹" decimals={2} />{' '}
                  <Text component="span" size="sm" c="#800020" fw={700}>
                    {receivableBalance >= 0 ? 'Dr' : 'Cr'}
                  </Text>
                </Text>
              }
              subtitle="Outstanding customer balance"
              onClick={() => navigate('/receivables')}
            />
          </SimpleGrid>
        </Stack>

        {/* ROW 3: Inventory & Van Operations */}
        <Stack gap="sm">
          <Group gap={10} align="center">
            <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: '#800020' }} />
            <Text size="xs" fw={700} c="#800020" tt="uppercase" style={{ letterSpacing: '0.8px', fontSize: 11.5 }}>
              Inventory &amp; Van Operations
            </Text>
            <Box style={{ flex: 1, height: 1, backgroundColor: '#f1f5f9' }} />
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            <DashboardMetricCard
              title="Inventory by Product"
              icon={<IconPackage size={22} color='#800020' />}
              value={
                <Group align="baseline" gap={6}>
                  <Text
                    fw={800}
                    style={{
                      color: '#0f172a',
                      fontSize: '28px',
                      letterSpacing: '-0.03em',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.15,
                    }}
                  >
                    <CountUp value={totalProductFilled} decimals={0} />
                  </Text>
                  <Text size="sm" fw={600}>
                    filled
                  </Text>
                </Group>
              }
              subtitle={`${totalProductEmpty.toLocaleString()} empty • ${stockProducts.length} items`}
              onClick={() => navigate('/inventory/products')}
            />

            <DashboardMetricCard
              title="Inventory by Location"
              icon={<IconBuildingFactory2 size={22} color='#800020' />}
              value={
                <Group align="baseline" gap={6}>
                  <Text
                    fw={800}
                    style={{
                      color: '#0f172a',
                      fontSize: '28px',
                      letterSpacing: '-0.03em',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.15,
                    }}
                  >
                    <CountUp value={stockLocations.length} decimals={0} />
                  </Text>
                  <Text size="sm" fw={600} >
                    locations
                  </Text>
                </Group>
              }
              subtitle={`${godownCount} godown • ${vanCount} vans`}
              onClick={() => navigate('/inventory/locations')}
            />

            <DashboardMetricCard
              title="Van Management"
              icon={<IconTruckDelivery size={22} color='#800020' />}
              value={`${activeRoutesCount} Active Route${activeRoutesCount !== 1 ? 's' : ''}`}
              subtitle="Live delivery fleet &amp; route operations"
              onClick={() => navigate('/van-management')}
            />
          </SimpleGrid>
        </Stack>
      </Stack>

      {/* ── Custom Date Range Picker Modal ── */}
      <Modal
        opened={customModalOpened}
        onClose={() => setCustomModalOpened(false)}
        title="Select Custom Date Range"
        centered
        radius="md"
        overlayProps={{ backgroundOpacity: 0.35, blur: 3 }}
      >
        <Stack gap="md">
          <TextInput
            type="date"
            label="From Date"
            value={customDates.from}
            onChange={(e) => setCustomDates((prev) => ({ ...prev, from: e.target.value }))}
          />
          <TextInput
            type="date"
            label="To Date"
            value={customDates.to}
            onChange={(e) => setCustomDates((prev) => ({ ...prev, to: e.target.value }))}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setCustomModalOpened(false)}>
              Cancel
            </Button>
            <Button
              style={{ backgroundColor: '#800020' }}
              onClick={() => {
                setTimeFilter('custom');
                setCustomModalOpened(false);
              }}
            >
              Apply Filter
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default DashboardPage;
