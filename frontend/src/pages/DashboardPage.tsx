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

  const role = (user?.role || '').toLowerCase();
  const isAdmin = !role || role.includes('admin');
  const isManager = role.includes('manager');
  const isAccountant = role.includes('accountant');

  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customDates, setCustomDates] = useState<{ from: string; to: string }>({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [customModalOpened, setCustomModalOpened] = useState(false);

  // Prevent browser back button from jumping out of Dashboard into previous screens or login
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Current Date Display
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  // 1. Fetch Purchases (Only for Admin & Accountant)
  const { data: purchases = [] } = useQuery<any[]>({
    queryKey: ['purchases'],
    queryFn: async () => {
      const res = await apiClient.get('/purchases/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
    enabled: !isManager,
  });

  // 2. Fetch Payments & Receipts (Only for Admin & Accountant)
  const { data: payments = [] } = useQuery<any[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
    enabled: !isManager,
  });

  // 3. Fetch Ledgers
  const { data: ledgers = [] } = useQuery<any[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 4. Fetch Sales (Only for Admin & Accountant)
  const { data: sales = [] } = useQuery<any[]>({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await apiClient.get('/sales/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
    enabled: !isManager,
  });

  // 5. Fetch Routes for Van Management (Only for Admin & Manager)
  const { data: routes = [] } = useQuery<any[]>({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await apiClient.get('/routes/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
    enabled: !isAccountant,
  });

  // 5b. Fetch Registered Vehicles & Godowns for Fleet Counts
  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await apiClient.get('/vehicles/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
    enabled: !isAccountant,
  });

  const { data: godownsList = [] } = useQuery<any[]>({
    queryKey: ['godowns'],
    queryFn: async () => {
      const res = await apiClient.get('/godowns/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 6. Live Stock Analysis Query (5s refresh, Only for Admin & Manager)
  const { data: stockAnalysis } = useQuery<any>({
    queryKey: ['stock-analysis'],
    queryFn: async () => {
      const res = await apiClient.get('/delivery-notes/stock-analysis/');
      return res.data;
    },
    enabled: !isAccountant,
    refetchInterval: 5000,
  });

  // Manager Operational Queries (End Allocations, Receipt Notes, Delivery Notes)
  const { data: managerEndAllocations = [] } = useQuery<any[]>({
    queryKey: ['manager-end-allocations'],
    queryFn: async () => {
      const res = await apiClient.get('/end-route-drivers/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
    enabled: isAdmin || isManager,
    refetchInterval: 10000,
  });

  const { data: managerReceiptNotes = [] } = useQuery<any[]>({
    queryKey: ['manager-receipt-notes'],
    queryFn: async () => {
      const res = await apiClient.get('/receipt-notes/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
    enabled: isAdmin || isManager,
    refetchInterval: 10000,
  });

  const { data: managerDeliveryNotes = [] } = useQuery<any[]>({
    queryKey: ['manager-delivery-notes'],
    queryFn: async () => {
      const res = await apiClient.get('/delivery-notes/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
    enabled: isAdmin || isManager,
    refetchInterval: 10000,
  });

  const pendingEndAllocationsCount = useMemo(() => {
    return managerEndAllocations.filter((e: any) => e.Status === 'PENDING').length;
  }, [managerEndAllocations]);

  const pendingReceiptNotesCount = useMemo(() => {
    return managerReceiptNotes.filter((r: any) => r.Status === 'RECEIPT_PENDING' || r.status === 'pending').length;
  }, [managerReceiptNotes]);

  const todayDispatchedCylinders = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return managerDeliveryNotes
      .filter((d: any) => d.DeliveryDate === todayStr)
      .reduce((sum: number, d: any) => sum + (Number(d.total_cylinders) || 0), 0);
  }, [managerDeliveryNotes]);

  const todayActiveVansCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDns = managerDeliveryNotes.filter((d: any) => d.DeliveryDate === todayStr);
    const vanSet = new Set(todayDns.map((d: any) => d.RouteVehicleDriver));
    return vanSet.size || (stockAnalysis?.active_vans?.length || 0);
  }, [managerDeliveryNotes, stockAnalysis]);

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
      if (p.voucher_type === 'PAYMENT') return false;
      return customerLedgerIds.has(Number(p.PartyLedgerId));
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
      // Van route sales are provisional until driver ends allocation and admin approves.
      // Unapproved sales (IsApproved === false and Status !== 'COMPLETED') must NOT count in official Sales & Collections
      const isApproved = s.IsApproved === true || s.is_approved === true || s.Status === 'COMPLETED';
      if (!isApproved) return false;

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

  // Collections = Payment receipts + cash/UPI payments collected directly on sales in this period
  // Map receipt allocations strictly by BillReference (InvoiceNo / SalesNo) to prevent double counting
  const receiptAllocBySale = useMemo(() => {
    const map = new Map<string, number>();
    filteredCustomerReceipts.forEach((p: any) => {
      (p.lines || []).forEach((l: any) => {
        (l.allocations || []).forEach((a: any) => {
          const amt = Number(a.AllocatedAmount || 0);
          if (amt > 0 && a.BillReference) {
            const bRef = String(a.BillReference).trim().toUpperCase();
            if (bRef && bRef !== 'CUSTOMER ADVANCE' && bRef !== 'ADVANCE') {
              map.set(bRef, (map.get(bRef) || 0) + amt);
            }
          }
        });
      });
    });
    return map;
  }, [filteredCustomerReceipts]);

  // Actual cash/UPI collected directly on sales (excluding advance adjustments and receipt allocations)
  const netSalesPaid = useMemo(() => {
    return filteredSales.reduce((sum: number, s: any) => {
      const rawPaid = Number(s.PaidAmount || 0);
      if (rawPaid <= 0) return sum;

      const advAdj = Number(s.advance_adjusted ?? s.AdvanceAdjusted ?? 0);
      const cashPaidOnSale = Math.max(0, rawPaid - advAdj);

      const invRef = s.InvoiceNo ? String(s.InvoiceNo).trim().toUpperCase() : '';
      const salRef = s.SalesNo ? String(s.SalesNo).trim().toUpperCase() : '';

      const allocFromReceipt = Math.max(
        invRef ? (receiptAllocBySale.get(invRef) || 0) : 0,
        salRef ? (receiptAllocBySale.get(salRef) || 0) : 0
      );

      const netSaleCash = Math.max(0, cashPaidOnSale - allocFromReceipt);
      return sum + netSaleCash;
    }, 0);
  }, [filteredSales, receiptAllocBySale]);

  const totalCustomerReceipts = useMemo(() => {
    return netSalesPaid;
  }, [netSalesPaid]);

  // Direct collections received on sales invoices (Cash, UPI, etc.)
  const salesWithPaidCount = useMemo(() => {
    return filteredSales.filter((s: any) => {
      const rawPaid = Number(s.PaidAmount || 0);
      const advAdj = Number(s.advance_adjusted ?? s.AdvanceAdjusted ?? 0);
      return (rawPaid - advAdj) > 0;
    }).length;
  }, [filteredSales]);

  const totalCollectionsCount = useMemo(() => {
    return salesWithPaidCount;
  }, [salesWithPaidCount]);

  const receivableBalance = totalCustomerOpeningReceivable + totalSales - totalCustomerReceipts;

  // Row 3 Calculations: Inventory & Van Operations
  const userGodownId = user?.godown_id || user?.GodownId;
  const stockProducts = stockAnalysis?.products || [];

  const stockLocations = useMemo(() => {
    // 1. Dynamic Godowns List (Central + Secondary Godowns)
    let godownList = (stockAnalysis?.godowns && stockAnalysis.godowns.length > 0)
      ? stockAnalysis.godowns
      : (godownsList && godownsList.length > 0 ? godownsList : []);

    if (userGodownId && !isAdmin) {
      godownList = godownList.filter((g: any) => Number(g.GodownId) === Number(userGodownId));
    }

    let godownEntries: any[] = [];

    if (godownList.length > 0) {
      godownEntries = godownList.map((g: any) => {
        let filled = Number(g.FilledQty || 0);
        let empty = Number(g.EmptyQty || 0);
        if (filled === 0 && empty === 0 && stockProducts.length > 0) {
          filled = stockProducts.reduce((sum: number, p: any) => {
            const mg = (p.Godowns || []).find((pg: any) => pg.GodownId === g.GodownId);
            return sum + (mg ? Number(mg.FilledQty || 0) : 0);
          }, 0);
          empty = stockProducts.reduce((sum: number, p: any) => {
            const mg = (p.Godowns || []).find((pg: any) => pg.GodownId === g.GodownId);
            return sum + (mg ? Number(mg.EmptyQty || 0) : 0);
          }, 0);
        }
        return {
          id: `godown-${g.GodownId}`,
          rawId: g.GodownId,
          name: g.GodownName || (g.IsCentral ? 'Central Godown' : 'Secondary Godown'),
          type: 'godown',
          filledQuantity: filled,
          emptyQuantity: empty,
          emptyCylinders: empty,
          quantity: filled + empty,
        };
      });
    } else {
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
      godownEntries = [{
        id: 'godown',
        name: 'Central Godown',
        type: 'godown',
        filledQuantity: godownFilled,
        emptyQuantity: godownEmpty,
        emptyCylinders: godownEmpty,
        quantity: godownFilled + godownEmpty,
      }];
    }

    // 2. Dynamic Delivery Vans List (Active + Idle Vans + Fleet Vehicles)
    const map = new Map<number | string, any>();
    (stockAnalysis?.all_vans || []).forEach((v: any) => {
      const id = v.RouteVehicleDriverId || v.VehicleId || v.VehicleNumber;
      if (id) map.set(id, { ...v });
    });
    (stockAnalysis?.active_vans || []).forEach((v: any) => {
      const id = v.RouteVehicleDriverId || v.VehicleId || v.VehicleNumber;
      if (id) map.set(id, { ...(map.get(id) || {}), ...v });
    });
    (stockAnalysis?.idle_vans || []).forEach((v: any) => {
      const id = v.RouteVehicleDriverId || v.VehicleId || v.VehicleNumber;
      if (id && !map.has(id)) map.set(id, { ...v });
    });

    // Ensure all fleet vehicles from Vehicle master (excluding internal Godown stock) are represented
    (vehicles || []).forEach((veh: any) => {
      const vNum = (veh.VehicleNumber || '').toLowerCase();
      const vName = (veh.VehicleName || '').toLowerCase();
      if (!vNum.includes('godown') && !vName.includes('godown')) {
        const id = veh.VehicleId || veh.VehicleNumber;
        if (!Array.from(map.values()).some((existing: any) => existing.VehicleNumber === veh.VehicleNumber)) {
          map.set(`veh-${id}`, {
            VehicleId: veh.VehicleId,
            VehicleNumber: veh.VehicleNumber,
            RouteName: 'Fleet Vehicle',
            BalanceCylinders: 0,
            EmptyCylinders: 0,
          });
        }
      }
    });

    const uniqueVansList = Array.from(map.values());

    const vansList = uniqueVansList.map((van: any) => {
      const vanFilled = (van.BalanceCylinders ?? van.TotalCylinders ?? 0) + (van.OtherProductsBalance ?? 0);
      const vanEmpty = van.EmptyCylinders ?? 0;
      return {
        id: `vehicle-${van.RouteVehicleDriverId || van.VehicleId || van.VehicleNumber}`,
        name: van.VehicleNumber || 'Delivery Van',
        type: 'vehicle',
        filledQuantity: vanFilled,
        emptyQuantity: vanEmpty,
        quantity: vanFilled + vanEmpty,
      };
    });

    return [...godownEntries, ...vansList];
  }, [stockProducts, stockAnalysis?.godowns, stockAnalysis?.all_vans, stockAnalysis?.active_vans, stockAnalysis?.idle_vans, godownsList, vehicles]);

  const totalProductFilled = useMemo(() => {
    if (userGodownId && !isAdmin) {
      return stockProducts.reduce((sum: number, p: any) => {
        const mg = (p.Godowns || []).find((pg: any) => Number(pg.GodownId) === Number(userGodownId));
        return sum + (mg ? Number(mg.FilledQty || 0) : 0);
      }, 0);
    }
    return stockProducts.reduce((sum: number, p: any) => sum + (Number(p.FilledQty ?? (p.GodownQty + (p.AllocatedQty || 0))) || 0), 0);
  }, [stockProducts, userGodownId, isAdmin]);

  const totalProductEmpty = useMemo(() => {
    if (userGodownId && !isAdmin) {
      return stockProducts.reduce((sum: number, p: any) => {
        const mg = (p.Godowns || []).find((pg: any) => Number(pg.GodownId) === Number(userGodownId));
        return sum + (mg ? Number(mg.EmptyQty || 0) : 0);
      }, 0);
    }
    return stockProducts.reduce((sum: number, p: any) => sum + (Number(p.EmptyQty) || 0), 0);
  }, [stockProducts, userGodownId, isAdmin]);

  const godownCount = useMemo(() => {
    return stockLocations.filter((l: any) => l.type === 'godown').length || (godownsList.length > 0 ? godownsList.length : 1);
  }, [stockLocations, godownsList]);

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
              {user?.godown_name && !isAdmin && (
                <Text component="span" size="md" fw={700} c="#800020" ml="xs">
                  ({user.godown_name})
                </Text>
              )}
            </Title>
            <Text size="xs" c="dimmed" mt={2} fw={500}>
              {todayFormatted} &bull; {user?.godown_name && !isAdmin ? `${user.godown_name} • ` : ''}{isManager ? 'Godown Stock & Fleet Operations Overview' : (isAccountant ? 'Commercial, Accounting & Cashflow Overview' : 'Executive Operations & Commercial Overview')} &bull; Showing {dateRange.label}
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
              {(isAdmin || isAccountant) && (
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
              )}

              {/* 2. Record Receipt */}
              {(isAdmin || isAccountant) && (
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
              )}

              {/* 3. New Purchase */}
              {(isAdmin || isAccountant) && (
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
              )}

              {/* 4. Load Van (Navigates to Delivery Notes / Add New Delivery Note) */}
              {(isAdmin || isManager) && (
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
              )}
            </Group>
          </Stack>
        </Group>
      </Box>

      {/* ── 2. Structured 3x3 Metric Cards Grid (Original Clean Theme) ── */}
      <Stack gap="xl">
        {/* ROW 1: Purchases & Payables */}
        {(isAdmin || isAccountant) && (
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
        )}

        {/* ROW 2: Sales & Receivables */}
        {(isAdmin || isAccountant) && (
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
        )}

        {/* ROW 3: Inventory & Van Operations */}
        {(isAdmin || isManager) && (
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
                    <Text size="sm" fw={600} c="dimmed">
                      Locations
                    </Text>
                  </Group>
                }
                subtitle={`${godownCount} godown${godownCount !== 1 ? 's' : ''} • ${vanCount} van${vanCount !== 1 ? 's' : ''}`}
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
        )}

        {/* ROW 4: Depot Gate & Fleet Operations (Manager & Admin) */}
        {(isAdmin || isManager) && (
          <Stack gap="sm">
            <Group gap={10} align="center">
              <Box style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: '#800020' }} />
              <Text size="xs" fw={700} c="#800020" tt="uppercase" style={{ letterSpacing: '0.8px', fontSize: 11.5 }}>
                Depot Gate &amp; Fleet Operations
              </Text>
              <Box style={{ flex: 1, height: 1, backgroundColor: '#f1f5f9' }} />
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <DashboardMetricCard
                title="Active Fleet Vans"
                icon={<IconTruckDelivery size={22} color='#800020' />}
                value={<CountUp value={todayActiveVansCount} decimals={0} />}
                subtitle={`${todayDispatchedCylinders} Cylinders Dispatched`}
                onClick={() => navigate('/van-management')}
              />

              <DashboardMetricCard
                title="Pending End Allocations"
                icon={<IconReceipt size={22} color='#800020' />}
                value={
                  <Text
                    fw={800}
                    style={{
                      color: pendingEndAllocationsCount > 0 ? '#800020' : '#0f172a',
                      fontSize: '28px',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.03em',
                      lineHeight: 1.15,
                    }}
                  >
                    <CountUp value={pendingEndAllocationsCount} decimals={0} />
                  </Text>
                }
                subtitle={pendingEndAllocationsCount > 0 ? 'Awaiting Gate Verification' : 'All Shifts Settled'}
                onClick={() => navigate('/end-allocations')}
              />

              <DashboardMetricCard
                title="Pending Depot Receipts"
                icon={<IconBuildingFactory2 size={22} color='#800020' />}
                value={
                  <Text
                    fw={800}
                    style={{
                      color: pendingReceiptNotesCount > 0 ? '#800020' : '#0f172a',
                      fontSize: '28px',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.03em',
                      lineHeight: 1.15,
                    }}
                  >
                    <CountUp value={pendingReceiptNotesCount} decimals={0} />
                  </Text>
                }
                subtitle={pendingReceiptNotesCount > 0 ? 'Awaiting Inward Acceptance' : 'Inward Stock Up to Date'}
                onClick={() => navigate('/receipt-notes')}
              />

              <DashboardMetricCard
                title="Today's Stock Outflow"
                icon={<IconPackage size={22} color='#800020' />}
                value={
                  <Group align="baseline" gap={4}>
                    <Text fw={800} style={{ color: '#0f172a', fontSize: '28px', fontVariantNumeric: 'tabular-nums' }}>
                      <CountUp value={todayDispatchedCylinders} decimals={0} />
                    </Text>
                    <Text size="xs" fw={700} c="#800020">
                      CYLS
                    </Text>
                  </Group>
                }
                subtitle="Dispatched on Delivery Notes"
                onClick={() => navigate('/delivery-notes')}
              />
            </SimpleGrid>
          </Stack>
        )}
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
