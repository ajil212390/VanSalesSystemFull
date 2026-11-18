import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Group,
  Stack,
  Title,
  Text,
  Paper,
  Table,
  Badge,
  TextInput,
  Select,
  SegmentedControl,
  SimpleGrid,
  ActionIcon,
  Tooltip,
  Modal,
  Divider,
  Loader,
  Center,
  CloseButton,
} from '@mantine/core';
import {
  IconCash,
  IconReceipt2,
  IconSearch,
  IconEye,
  IconWallet,
  IconRefresh,
  IconPrinter,
  IconArrowLeft,
  IconPackages,
  IconTruckDelivery,
  IconFilter,
  IconEdit,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { formatDateDDMMYY } from '../components/DateInputDDMMYY';

interface CollectionItem {
  id: string;
  source: 'SALE';
  isConnection: boolean;
  date: string;
  ref: string;
  rawRef: string;
  partyName: string;
  partyMobile?: string;
  partyId?: number | null;
  driverName: string;
  driverId?: number | null;
  vehicleNumber?: string;
  routeName: string;
  paymentMode: string;
  amount: number;
  totalBillAmount?: number;
  notes: string;
  packageName?: string;
  raw: any;
}

export const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'SALES' | 'CONNECTIONS'>('ALL');
  const [selectedDriver, setSelectedDriver] = useState<string>('ALL');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePrintReceiptPdf = (item: CollectionItem) => {
    const salesId = item.raw?.SalesId;
    if (!salesId) {
      notifications.show({ message: 'Invoice ID not found.', color: 'red' });
      return;
    }
    const url = `${apiClient.defaults.baseURL}/sales/${salesId}/invoice-pdf/?_t=${Date.now()}`;
    window.open(url, '_blank');
  };

  // 1. Fetch Sales Invoices
  const { data: sales = [], isLoading: isLoadingSales, refetch: refetchSales } = useQuery<any[]>({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await apiClient.get('/sales/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // 2. Fetch Drivers for Driver-wise Filter & Cards
  const { data: drivers = [] } = useQuery<any[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await apiClient.get('/drivers/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // 3. Fetch Ledgers for party metadata
  const { data: ledgers = [] } = useQuery<any[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // Ledger Lookup Map
  const ledgerMap = useMemo(() => {
    const map = new Map<number, any>();
    ledgers.forEach((l: any) => {
      map.set(Number(l.LedgerId), l);
    });
    return map;
  }, [ledgers]);

  // Construct Unified Collections Register (Direct payments on Sales Invoices & New Connections)
  const allCollections = useMemo(() => {
    const list: CollectionItem[] = [];

    sales.forEach((s: any) => {
      if (s.Status === 'CANCELLED') return;
      // In Future Gas workflow, unapproved van sales are provisional until driver ends allocation and admin approves
      const isApproved = s.IsApproved === true || s.is_approved === true || s.Status === 'COMPLETED';
      if (!isApproved) return;

      const rawPaid = Number(s.PaidAmount || 0);
      if (rawPaid <= 0) return;

      const advAdj = Number(s.advance_adjusted ?? s.AdvanceAdjusted ?? 0);
      const cashPaidOnSale = Math.max(0, rawPaid - advAdj);
      if (cashPaidOnSale <= 0) return;

      const sRef = String(s.InvoiceNo || s.SalesNo || `INV-${s.SalesId}`).trim();
      const custId = s.CustomerLedger ? Number(s.CustomerLedger.LedgerId || s.CustomerLedger) : null;
      const custObj = custId ? ledgerMap.get(custId) : null;
      const partyName = custObj?.LedgerName || s.CustomerLedger?.LedgerName || s.CustomerName || s.PartyName || 'Cash Sale Buyer';
      const partyMobile = custObj?.Mobile || s.CustomerLedger?.Mobile || '';

      const notesStr = s.Notes || '';
      const notesLower = notesStr.toLowerCase();
      const refLower = sRef.toLowerCase();

      // Check if this sale is a New Connection / Package sale
      const isConnection = Boolean(
        s.is_package ||
        s.isPackage ||
        s.SalesType === 'CONNECTION' ||
        s.sales_type === 'CONNECTION' ||
        refLower.startsWith('pk-') ||
        notesLower.includes('new connection') ||
        notesLower.includes('connection') ||
        notesLower.includes('package') ||
        (s.lines && s.lines.some((l: any) =>
          l.is_package ||
          (l.product_name || l.ProductName || '').toLowerCase().includes('connection') ||
          (l.product_name || l.ProductName || '').toLowerCase().includes('package')
        ))
      );

      // Extract human-readable package name if available
      let pkgName = '';
      if (isConnection) {
        const pkgMatch = /New Connection:\s*([^|]+)/i.exec(notesStr);
        if (pkgMatch) {
          pkgName = pkgMatch[1].trim();
        } else {
          const pkgLine = (s.lines || []).find((l: any) =>
            l.is_package ||
            (l.product_name || l.ProductName || '').toLowerCase().includes('connection') ||
            (l.product_name || l.ProductName || '').toLowerCase().includes('package')
          );
          pkgName = pkgLine?.product_name || pkgLine?.ProductName || 'New Connection Package';
        }
      }

      // Determine Driver, Vehicle & Route
      const dName =
        s.driver_name ||
        s.DriverName ||
        s.RouteVehicleDriver?.Driver?.DriverName ||
        (s.route_name?.toLowerCase().includes('office') || s.RouteName?.toLowerCase().includes('office') ? 'Office Staff' : 'Direct Office');
      const dId = s.RouteVehicleDriver?.Driver?.DriverId || s.DriverId || s.driver_id || null;
      const vNum = s.vehicle_number || s.VehicleName || s.RouteVehicleDriver?.Vehicle?.VehicleNumber || '';
      const rName =
        s.route_name ||
        s.RouteName ||
        s.RouteVehicleDriver?.Route?.RouteName ||
        (vNum ? 'Van Route Delivery' : 'Office Sale Point');

      list.push({
        id: `sale-${s.SalesId}`,
        source: 'SALE',
        isConnection,
        date: s.SalesDate || (s.CreatedAt ? s.CreatedAt.split('T')[0] : ''),
        ref: sRef.startsWith('INV-') ? `PAY-${sRef}` : `PAY-${sRef}`,
        rawRef: sRef,
        partyName,
        partyMobile,
        partyId: custId,
        driverName: dName,
        driverId: dId,
        vehicleNumber: vNum,
        routeName: rName,
        paymentMode: (s.PaymentMethod || 'CASH').toUpperCase(),
        amount: cashPaidOnSale,
        totalBillAmount: Number(s.GrandTotal || 0),
        notes: s.Notes ? s.Notes : (isConnection ? `New Connection on bill ${sRef}` : `Direct counter collection on bill ${sRef}`),
        packageName: pkgName,
        raw: s,
      });
    });

    // Sort chronologically (newest first)
    list.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });

    return list;
  }, [sales, ledgerMap]);

  // Compute Date Boundaries based on preset
  const dateBounds = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (datePreset === 'TODAY') {
      return { start: todayStr, end: todayStr };
    }
    if (datePreset === 'YESTERDAY') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      return { start: yStr, end: yStr };
    }
    if (datePreset === 'THIS_WEEK') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return { start: monday.toISOString().split('T')[0], end: todayStr };
    }
    if (datePreset === 'THIS_MONTH') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      return { start: startOfMonth, end: todayStr };
    }
    if (datePreset === 'CUSTOM') {
      return { start: customFromDate || null, end: customToDate || null };
    }
    return { start: null, end: null };
  }, [datePreset, customFromDate, customToDate]);

  // New Connections Collection Items
  const connectionCollections = useMemo(() => {
    return allCollections.filter((c) => c.isConnection);
  }, [allCollections]);

  // Regular Refill Sales Collection Items
  const regularSalesCollections = useMemo(() => {
    return allCollections.filter((c) => !c.isConnection);
  }, [allCollections]);

  // Compute Driver-Wise Aggregation for New Connections
  const driverSummaryList = useMemo(() => {
    const map = new Map<string, {
      driverName: string;
      driverId?: number | null;
      vehicleNumber: string;
      routeName: string;
      count: number;
      totalAmount: number;
      cashAmount: number;
      digitalAmount: number;
    }>();

    // Populate registered active drivers first so they appear in selector
    drivers.forEach((d: any) => {
      const name = d.DriverName || d.name;
      if (name && !map.has(name)) {
        map.set(name, {
          driverName: name,
          driverId: d.DriverId || d.id,
          vehicleNumber: '',
          routeName: '',
          count: 0,
          totalAmount: 0,
          cashAmount: 0,
          digitalAmount: 0,
        });
      }
    });

    // Filter connections matching date bounds if active
    const dateFiltered = connectionCollections.filter((c) => {
      if (dateBounds.start && c.date && c.date < dateBounds.start) return false;
      if (dateBounds.end && c.date && c.date > dateBounds.end) return false;
      return true;
    });

    dateFiltered.forEach((c) => {
      const dName = c.driverName || 'Direct Office';
      const existing = map.get(dName) || {
        driverName: dName,
        driverId: c.driverId,
        vehicleNumber: c.vehicleNumber || '',
        routeName: c.routeName || '',
        count: 0,
        totalAmount: 0,
        cashAmount: 0,
        digitalAmount: 0,
      };

      existing.count += 1;
      existing.totalAmount += c.amount;
      if (!existing.vehicleNumber && c.vehicleNumber) {
        existing.vehicleNumber = c.vehicleNumber;
      }
      if (!existing.routeName && c.routeName) {
        existing.routeName = c.routeName;
      }

      const pm = (c.paymentMode || '').toUpperCase();
      if (pm === 'SPLIT') {
        const raw = c.raw || {};
        const cVal = Number(raw.cash_amount ?? 0);
        const uVal = Number(raw.upi_amount ?? raw.bank_amount ?? 0);
        existing.cashAmount += cVal;
        existing.digitalAmount += uVal;
      } else if (pm.includes('CASH')) {
        existing.cashAmount += c.amount;
      } else {
        existing.digitalAmount += c.amount;
      }

      map.set(dName, existing);
    });

    // Return sorted: drivers with new connections first (by count descending), then alphabetically
    return Array.from(map.values()).sort((a, b) => b.count - a.count || b.totalAmount - a.totalAmount);
  }, [connectionCollections, drivers, dateBounds]);

  // Filtered Collections Dataset
  const filteredCollections = useMemo(() => {
    return allCollections.filter((item) => {
      // Category filter (ALL vs SALES vs CONNECTIONS)
      if (categoryFilter === 'SALES' && item.isConnection) {
        return false;
      }
      if (categoryFilter === 'CONNECTIONS' && !item.isConnection) {
        return false;
      }

      // Driver filter (when in CONNECTIONS mode or general driver filtering)
      if (categoryFilter === 'CONNECTIONS' && selectedDriver !== 'ALL') {
        const itemDriver = (item.driverName || '').toLowerCase().trim();
        const targetDriver = selectedDriver.toLowerCase().trim();
        if (itemDriver !== targetDriver && !itemDriver.includes(targetDriver)) {
          return false;
        }
      }

      // Payment Mode filter dropdown
      if (modeFilter !== 'ALL') {
        const itemMode = item.paymentMode.toLowerCase();
        const target = modeFilter.toLowerCase();
        if (itemMode === 'split') {
          // Split payment includes both Cash and Bank/UPI components
          if (target !== 'cash' && target !== 'bank' && target !== 'upi') {
            return false;
          }
        } else if (target === 'bank' && !itemMode.includes('bank') && !itemMode.includes('upi') && !itemMode.includes('card')) {
          return false;
        } else if (target !== 'bank' && !itemMode.includes(target)) {
          return false;
        }
      }

      // Date bounds
      if (dateBounds.start && item.date && item.date < dateBounds.start) {
        return false;
      }
      if (dateBounds.end && item.date && item.date > dateBounds.end) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRef = item.ref.toLowerCase().includes(q) || item.rawRef.toLowerCase().includes(q);
        const matchParty = item.partyName.toLowerCase().includes(q);
        const matchMobile = (item.partyMobile || '').includes(q);
        const matchRoute = item.routeName.toLowerCase().includes(q);
        const matchDriver = item.driverName.toLowerCase().includes(q);
        const matchPackage = (item.packageName || '').toLowerCase().includes(q);
        const matchNotes = item.notes.toLowerCase().includes(q);
        if (!matchRef && !matchParty && !matchMobile && !matchRoute && !matchDriver && !matchPackage && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [allCollections, categoryFilter, selectedDriver, modeFilter, dateBounds, searchQuery]);

  // Aggregate Metrics for Filtered Dataset
  const stats = useMemo(() => {
    let totAmt = 0;
    let saleAmt = 0;
    let saleCount = 0;
    let cashAmt = 0;
    let digitalAmt = 0;

    filteredCollections.forEach((c) => {
      totAmt += c.amount;
      saleAmt += c.amount;
      saleCount++;

      if (c.paymentMode === 'SPLIT') {
        const raw = c.raw || {};
        const cVal = Number(raw.cash_amount ?? 0);
        const uVal = Number(raw.upi_amount ?? raw.bank_amount ?? 0);
        if (cVal > 0 || uVal > 0) {
          cashAmt += cVal;
          digitalAmt += uVal;
        } else {
          const notes = c.notes || '';
          const cM = /Cash:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)/i.exec(notes);
          const uM = /UPI:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)/i.exec(notes);
          const cashSplit = cM ? Number(cM[1].replace(/,/g, '')) : c.amount / 2;
          const upiSplit = uM ? Number(uM[1].replace(/,/g, '')) : c.amount - cashSplit;
          cashAmt += cashSplit;
          digitalAmt += upiSplit;
        }
      } else if (c.paymentMode.includes('CASH')) {
        cashAmt += c.amount;
      } else {
        digitalAmt += c.amount;
      }
    });

    return {
      totAmt,
      saleAmt,
      saleCount,
      cashAmt,
      digitalAmt,
      totalCount: filteredCollections.length,
    };
  }, [filteredCollections]);

  // Human-readable Period Label for Statement Header
  const periodLabel = useMemo(() => {
    const today = new Date();
    const formatDate = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
    };

    if (datePreset === 'TODAY') {
      return `Today (${formatDate(today)})`;
    }
    if (datePreset === 'YESTERDAY') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return `Yesterday (${formatDate(y)})`;
    }
    if (datePreset === 'THIS_WEEK') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return `This Week (${formatDate(monday)} to ${formatDate(today)})`;
    }
    if (datePreset === 'THIS_MONTH') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `This Month (${months[today.getMonth()]} ${today.getFullYear()})`;
    }
    if (datePreset === 'CUSTOM') {
      if (customFromDate && customToDate) {
        return `${formatDateDDMMYY(customFromDate)} to ${formatDateDDMMYY(customToDate)}`;
      } else if (customFromDate) {
        return `From ${formatDateDDMMYY(customFromDate)}`;
      } else if (customToDate) {
        return `Up to ${formatDateDDMMYY(customToDate)}`;
      }
    }
    return 'All Records to Date';
  }, [datePreset, customFromDate, customToDate]);

  // PDF Statement Generation
  const handlePrintStatement = async () => {
    if (filteredCollections.length === 0) return;
    setIsGeneratingPdf(true);
    try {
      const payload = {
        records: filteredCollections.map((c) => ({
          date: c.date,
          ref: c.ref,
          source: c.source,
          partyName: c.partyName,
          partyMobile: c.partyMobile,
          driverName: c.driverName,
          vehicleNumber: c.vehicleNumber,
          routeName: c.routeName,
          paymentMode: c.paymentMode,
          amount: c.amount,
          notes: c.packageName ? `${c.packageName} | ${c.notes}` : c.notes,
        })),
        source_type: categoryFilter === 'CONNECTIONS'
          ? `New Connections (${selectedDriver !== 'ALL' ? selectedDriver : 'All Drivers'})`
          : (categoryFilter === 'SALES' ? 'Sales Paid (Refills)' : 'All Collections'),
        period_label: periodLabel,
        summary_stats: stats,
      };

      const response = await apiClient.post('/sales/collections-statement-pdf/', payload, {
        responseType: 'blob',
      });

      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, '_blank');
    } catch (err: any) {
      console.error('Error generating collections statement PDF:', err);
      notifications.show({
        title: 'Error Generating PDF',
        message: 'Failed to generate collections statement PDF. Please try again.',
        color: 'red',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const isLoading = isLoadingSales;

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* ── Top Header ── */}
      <Box pt={4} pb={2}>
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <div>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/')}
              mb={6}
              styles={{ root: { paddingLeft: 0, paddingRight: 8 } }}
            >
              Back to Dashboard
            </Button>
            <Group gap={10} align="center">
              <IconCash size={26} color="#800020" />
              <Title order={2} style={{ color: '#800020', fontWeight: 800, letterSpacing: '-0.02em', fontSize: 24 }}>
                Collections &amp; Cash Inflow
              </Title>
            </Group>
            <Text size="xs" c="dimmed" mt={3}>
              Consolidated real-time register of all money collected across Sales Invoices &amp; New Connections
            </Text>
          </div>

          <Group gap="xs" wrap="wrap">
            <Button
              variant="default"
              size="xs"
              leftSection={<IconRefresh size={14} />}
              onClick={() => {
                refetchSales();
              }}
            >
              Refresh
            </Button>
            <Button
              variant="default"
              size="xs"
              leftSection={<IconPrinter size={15} color="#800020" />}
              onClick={handlePrintStatement}
              loading={isGeneratingPdf}
              disabled={filteredCollections.length === 0}
            >
              Print / PDF Statement
            </Button>
            <Button
              variant="default"
              size="xs"
              leftSection={<IconPackages size={15} color="#800020" />}
              onClick={() => navigate('/sales/new-connection')}
            >
              + New Connection
            </Button>
            <Button
              size="xs"
              leftSection={<IconReceipt2 size={15} />}
              onClick={() => navigate('/sales/new')}
              style={{ backgroundColor: '#800020' }}
            >
              New Sale Invoice
            </Button>
          </Group>
        </Group>
      </Box>

      {/* ── KPI Summary Cards ── */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        {/* Card 1: Total Collections */}
        <Paper
          p="md"
          radius="lg"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#eef2f6',
            boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.04)',
          }}
        >
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <div>
              <Text size="xs" fw={700} tt="uppercase" c="#800020" style={{ letterSpacing: '0.5px' }}>
                {categoryFilter === 'CONNECTIONS' ? 'Connection Collections' : 'Total Collections'}
              </Text>
              <Text size="22px" fw={800} mt={4} style={{ color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                ₹{stats.totAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                {categoryFilter === 'CONNECTIONS'
                  ? `${stats.totalCount} new connection${stats.totalCount !== 1 ? 's' : ''} recorded`
                  : `${stats.totalCount} total collection${stats.totalCount !== 1 ? 's' : ''} recorded`}
              </Text>
            </div>
            <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {categoryFilter === 'CONNECTIONS' ? (
                <IconPackages size={24} color="#800020" stroke={1.75} />
              ) : (
                <IconCash size={24} color="#800020" stroke={1.75} />
              )}
            </Box>
          </Group>
        </Paper>

        {/* Card 2: Direct Sales / Active Drivers */}
        <Paper
          p="md"
          radius="lg"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#eef2f6',
            boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.04)',
          }}
        >
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <div>
              <Text size="xs" fw={700} tt="uppercase" c="#64748b" style={{ letterSpacing: '0.5px' }}>
                {categoryFilter === 'CONNECTIONS' ? 'Active Drivers with Connections' : 'Direct Sales Paid'}
              </Text>
              <Text size="22px" fw={800} mt={4} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {categoryFilter === 'CONNECTIONS' ? (
                  `${driverSummaryList.filter((d) => d.count > 0).length} Drivers`
                ) : (
                  `₹${stats.saleAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                )}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                {categoryFilter === 'CONNECTIONS'
                  ? `${connectionCollections.length} connections across all routes`
                  : `${regularSalesCollections.length} refill sales invoices with payments`}
              </Text>
            </div>
            <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {categoryFilter === 'CONNECTIONS' ? (
                <IconTruckDelivery size={24} color="#800020" stroke={1.75} />
              ) : (
                <IconReceipt2 size={24} color="#800020" stroke={1.75} />
              )}
            </Box>
          </Group>
        </Paper>

        {/* Card 3: Cash vs Bank/Digital */}
        <Paper
          p="md"
          radius="lg"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#eef2f6',
            boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.04)',
          }}
        >
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <div>
              <Text size="xs" fw={700} tt="uppercase" c="#64748b" style={{ letterSpacing: '0.5px' }}>
                Cash / UPI
              </Text>
              <Group gap="xs" align="baseline" mt={4}>
                <Text size="14px" fw={800} style={{ color: '#0f172a' }}>
                  Cash: ₹{stats.cashAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
                <Text size="xs" c="dimmed">|</Text>
                <Text size="14px" fw={800} style={{ color: '#800020' }}>
                  UPI: ₹{stats.digitalAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </Group>
              <Text size="xs" c="dimmed" mt={2}>
                {((stats.cashAmt / (stats.totAmt || 1)) * 100).toFixed(0)}% Cash &bull; {((stats.digitalAmt / (stats.totAmt || 1)) * 100).toFixed(0)}% UPI
              </Text>
            </div>
            <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconWallet size={24} color="#800020" stroke={1.75} />
            </Box>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* ── Filtering Controls Bar (Dashboard Style) ── */}
      <Paper
        p="md"
        radius="lg"
        withBorder
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#eef2f6',
          boxShadow: '0 2px 8px 0 rgba(15, 23, 42, 0.04)',
        }}
      >
        <Stack gap="md">
          {/* Top Row: Streamlined Category Toggle (All Collections, Sales Paid, New Connections) & Search */}
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <SegmentedControl
              value={categoryFilter}
              onChange={(val: any) => {
                setCategoryFilter(val);
                if (val !== 'CONNECTIONS') {
                  setSelectedDriver('ALL');
                }
              }}
              color="burgundy"
              radius="xl"
              size="xs"
              transitionDuration={250}
              transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
              data={[
                { label: `All Collections (${allCollections.length})`, value: 'ALL' },
                { label: `Sales Paid (${regularSalesCollections.length})`, value: 'SALES' },
                { label: `New Connections (${connectionCollections.length})`, value: 'CONNECTIONS' },
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
                },
                label: {
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '5px 14px',
                  transition: 'color 150ms ease',
                },
              }}
            />

            <TextInput
              size="xs"
              radius="xl"
              placeholder="Search reference, customer, driver, route..."
              leftSection={<IconSearch size={14} color="#94a3b8" />}
              rightSection={
                searchQuery ? (
                  <CloseButton
                    size="xs"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  />
                ) : null
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              style={{ width: 280 }}
              styles={{
                input: {
                  borderColor: '#e2e8f0',
                  backgroundColor: '#f8fafc',
                  fontSize: 12,
                },
              }}
            />
          </Group>

          <Divider color="#f1f5f9" />

          {/* Bottom Row: Date Presets & Payment Mode Filter */}
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Group gap="xs" wrap="wrap" align="center">
              <Text size="xs" fw={600} c="#64748b">
                Period:
              </Text>
              <SegmentedControl
                value={datePreset}
                onChange={(val: any) => setDatePreset(val)}
                color="burgundy"
                radius="xl"
                size="xs"
                data={[
                  { value: 'ALL', label: 'All' },
                  { value: 'TODAY', label: 'Today' },
                  { value: 'YESTERDAY', label: 'Yesterday' },
                  { value: 'THIS_WEEK', label: 'This Week' },
                  { value: 'THIS_MONTH', label: 'This Month' },
                  { value: 'CUSTOM', label: 'Custom' },
                ]}
                styles={{
                  root: {
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: 2,
                  },
                  indicator: {
                    backgroundColor: '#800020',
                    borderRadius: 9999,
                  },
                  label: {
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: '3px 10px',
                  },
                }}
              />

              {datePreset === 'CUSTOM' && (
                <Group gap="xs" align="center">
                  <TextInput
                    size="xs"
                    type="date"
                    radius="md"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.currentTarget.value)}
                    style={{ width: 135 }}
                  />
                  <Text size="xs" c="dimmed">to</Text>
                  <TextInput
                    size="xs"
                    type="date"
                    radius="md"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.currentTarget.value)}
                    style={{ width: 135 }}
                  />
                </Group>
              )}
            </Group>

            <Group gap="xs" align="center">
              <Text size="xs" fw={600} c="#64748b">
                Payment Mode:
              </Text>
              <Select
                size="xs"
                radius="xl"
                style={{ width: 145 }}
                value={modeFilter}
                onChange={(val) => setModeFilter(val || 'ALL')}
                data={[
                  { value: 'ALL', label: 'All Modes' },
                  { value: 'CASH', label: 'Cash Only' },
                  { value: 'UPI', label: 'UPI' },
                  { value: 'BANK', label: 'Bank / Cheque' },
                ]}
                styles={{
                  input: {
                    borderColor: '#e2e8f0',
                    backgroundColor: '#f8fafc',
                    fontWeight: 500,
                    fontSize: 12,
                  },
                }}
              />
            </Group>
          </Group>
        </Stack>
      </Paper>

      {/* ── DRIVER-WISE NEW CONNECTIONS SECTION (Visible when "New Connections" is toggled) ── */}
      {categoryFilter === 'CONNECTIONS' && (
        <Stack gap="sm">
          {/* Section Header with Select Driver Dropdown */}
          <Paper
            p="sm"
            radius="lg"
            withBorder
            style={{
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              boxShadow: '0 2px 8px 0 rgba(15, 23, 42, 0.04)',
            }}
          >
            <Group justify="space-between" align="center" wrap="wrap" gap="sm">
              <Group gap="xs" align="center">
                <Box
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#fdf2f4',
                    color: '#800020',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconPackages size={20} />
                </Box>
                <div>
                  <Group gap={6} align="center">
                    <Text size="sm" fw={800} style={{ color: '#800020' }}>
                      Driver-Wise New Connections
                    </Text>
                    <Badge size="xs" color="burgundy" variant="light">
                      {connectionCollections.length} Total
                    </Badge>
                  </Group>
                  <Text size="11px" c="dimmed">
                    Track cylinder connection packages issued and payment revenue collected by each driver
                  </Text>
                </div>
              </Group>

              {/* Select Driver Filter Dropdown */}
              <Group gap="xs" align="center">
                <Text size="xs" fw={700} c="#475569">
                  Select Driver:
                </Text>
                <Select
                  size="xs"
                  radius="xl"
                  style={{ minWidth: 220 }}
                  value={selectedDriver}
                  onChange={(val) => setSelectedDriver(val || 'ALL')}
                  data={[
                    {
                      value: 'ALL',
                      label: `All Drivers (${driverSummaryList.reduce((sum, d) => sum + d.count, 0)} Connections)`,
                    },
                    ...driverSummaryList.map((d) => ({
                      value: d.driverName,
                      label: `${d.driverName} (${d.count} Conn${d.count !== 1 ? 's' : ''} • ₹${d.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })})`,
                    })),
                  ]}
                  styles={{
                    input: {
                      borderColor: selectedDriver !== 'ALL' ? '#800020' : '#cbd5e1',
                      backgroundColor: selectedDriver !== 'ALL' ? '#fdf2f4' : '#ffffff',
                      fontWeight: 600,
                      fontSize: 12,
                      color: selectedDriver !== 'ALL' ? '#800020' : '#0f172a',
                    },
                  }}
                />
                {selectedDriver !== 'ALL' && (
                  <Button
                    variant="subtle"
                    color="gray"
                    size="compact-xs"
                    onClick={() => setSelectedDriver('ALL')}
                  >
                    Clear Filter
                  </Button>
                )}
              </Group>
            </Group>
          </Paper>

          {/* Active Filter Notice */}
          {selectedDriver !== 'ALL' && (
            <Paper p="xs" radius="md" style={{ backgroundColor: '#fdf2f4', border: '1px solid #f8d7da' }}>
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <IconFilter size={15} color="#800020" />
                  <Text size="xs" fw={700} style={{ color: '#800020' }}>
                    Filtering New Connections for: {selectedDriver} ({filteredCollections.length} records)
                  </Text>
                </Group>
                <Button
                  variant="subtle"
                  color="burgundy"
                  size="compact-xs"
                  onClick={() => setSelectedDriver('ALL')}
                >
                  Show All Drivers
                </Button>
              </Group>
            </Paper>
          )}
        </Stack>
      )}

      {/* ── Unified Collections Table ── */}
      <Paper radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
        {isLoading ? (
          <Center py={60}>
            <Stack align="center" gap="xs">
              <Loader color="burgundy" size="md" />
              <Text size="sm" c="dimmed">Loading collections &amp; payments...</Text>
            </Stack>
          </Center>
        ) : filteredCollections.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap="xs">
              {categoryFilter === 'CONNECTIONS' ? (
                <>
                  <IconPackages size={42} color="#cbd5e1" />
                  <Text size="sm" fw={600} c="#64748b">No new connection collections found</Text>
                  <Text size="xs" c="dimmed">
                    {selectedDriver !== 'ALL'
                      ? `No connection sales recorded for driver "${selectedDriver}" in this period.`
                      : 'No connection packages have been issued yet. Drivers can record new connections via mobile app.'}
                  </Text>
                  <Button
                    size="xs"
                    variant="light"
                    color="burgundy"
                    leftSection={<IconPackages size={14} />}
                    onClick={() => navigate('/sales/new-connection')}
                    mt="xs"
                  >
                    + Add New Connection
                  </Button>
                </>
              ) : (
                <>
                  <IconCash size={40} color="#cbd5e1" />
                  <Text size="sm" fw={600} c="#64748b">No collection records found</Text>
                  <Text size="xs" c="dimmed">Try adjusting your date range or search keyword</Text>
                </>
              )}
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={900}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead style={{ backgroundColor: '#fafbfc', borderBottom: '1px solid #e2e8f0' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 105 }}>Date</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 140 }}>
                    {categoryFilter === 'CONNECTIONS' ? 'Connection #' : 'Ref / Bill #'}
                  </Table.Th>
                  {categoryFilter === 'CONNECTIONS' && (
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13 }}>Package / Details</Table.Th>
                  )}
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13 }}>Customer / Payer</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13 }}>Driver &amp; Vehicle</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13 }}>Route / POS</Table.Th>
                  {categoryFilter === 'ALL' && (
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, textAlign: 'center', width: 125 }}>Type</Table.Th>
                  )}
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, textAlign: 'center', width: 105 }}>Mode</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, textAlign: 'right', width: 140 }}>Amount Collected</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, textAlign: 'right', width: 85 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredCollections.map((item) => (
                  <Table.Tr key={item.id}>
                    {/* Date */}
                    <Table.Td style={{ fontSize: 13, color: '#334155' }}>
                      {formatDateDDMMYY(item.date)}
                    </Table.Td>

                    {/* Reference # */}
                    <Table.Td>
                      <Text
                        size="xs"
                        fw={700}
                        style={{
                          color: '#800020',
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedItem(item)}
                      >
                        {item.ref}
                      </Text>
                      <Text size="11px" c="dimmed">
                        Bill: {item.rawRef}
                      </Text>
                    </Table.Td>

                    {/* Package Details (for Connections view) */}
                    {categoryFilter === 'CONNECTIONS' && (
                      <Table.Td>
                        <Badge size="sm" variant="light" color="burgundy" mb={2}>
                          {item.packageName || 'New Connection'}
                        </Badge>
                        {item.notes && item.notes !== item.packageName && (
                          <Text size="11px" c="dimmed" truncate style={{ maxWidth: 220 }}>
                            {item.notes}
                          </Text>
                        )}
                      </Table.Td>
                    )}

                    {/* Customer */}
                    <Table.Td>
                      <Text size="xs" fw={700} style={{ color: '#0f172a' }}>
                        {item.partyName}
                      </Text>
                      {item.partyMobile && (
                        <Text size="11px" c="dimmed">
                          Ph: {item.partyMobile}
                        </Text>
                      )}
                    </Table.Td>

                    {/* Driver & Vehicle */}
                    <Table.Td>
                      <Group gap={6} align="center" wrap="nowrap">
                        <IconTruckDelivery size={14} color="#800020" style={{ flexShrink: 0 }} />
                        <div>
                          <Text size="xs" fw={600} style={{ color: '#0f172a' }}>
                            {item.driverName}
                          </Text>
                          {item.vehicleNumber && (
                            <Text size="10.5px" c="dimmed">
                              {item.vehicleNumber}
                            </Text>
                          )}
                        </div>
                      </Group>
                    </Table.Td>

                    {/* Route / POS */}
                    <Table.Td style={{ fontSize: 12, color: '#475569' }}>
                      {item.routeName}
                    </Table.Td>

                    {/* Type Badge (Only shown in ALL view) */}
                    {categoryFilter === 'ALL' && (
                      <Table.Td style={{ textAlign: 'center' }}>
                        {item.isConnection ? (
                          <Badge size="xs" variant="filled" color="burgundy">
                            New Connection
                          </Badge>
                        ) : (
                          <Badge size="xs" variant="light" color="gray">
                            Refill Sale
                          </Badge>
                        )}
                      </Table.Td>
                    )}

                    {/* Payment Mode */}
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Badge
                        size="xs"
                        variant="outline"
                        color="gray"
                        styles={{
                          root: {
                            fontWeight: 700,
                            fontSize: 10.5,
                            backgroundColor: '#f8fafc',
                            color: '#475569',
                            borderColor: '#cbd5e1',
                            letterSpacing: '0.4px',
                          },
                        }}
                      >
                        {item.paymentMode}
                      </Badge>
                    </Table.Td>

                    {/* Amount */}
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" fw={800} style={{ color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      {item.totalBillAmount && item.totalBillAmount > item.amount && (
                        <Text size="10.5px" c="dimmed">
                          of ₹{item.totalBillAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      )}
                    </Table.Td>

                    {/* Actions */}
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label="View details" withArrow position="top">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                            style={{ color: '#475569' }}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Print Tax Invoice / Receipt PDF" withArrow position="top">
                          <ActionIcon
                            variant="subtle"
                            color="burgundy"
                            size="sm"
                            onClick={() => handlePrintReceiptPdf(item)}
                            style={{ color: '#800020' }}
                          >
                            <IconPrinter size={16} />
                          </ActionIcon>
                        </Tooltip>

                        {item.raw?.SalesId && (
                          <Tooltip label="Edit Invoice" withArrow position="top">
                            <ActionIcon
                              variant="subtle"
                              color="burgundy"
                              size="sm"
                              onClick={() => navigate(`/sales/${item.raw.SalesId}/edit`)}
                              style={{ color: '#800020' }}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      {/* ── Collection Details Modal ── */}
      <Modal
        opened={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={
          <Group gap="xs">
            <IconCash size={20} color="#800020" />
            <Text fw={700} style={{ color: '#800020', fontSize: 16 }}>
              Collection Record &bull; {selectedItem?.ref}
            </Text>
          </Group>
        }
        size="md"
        radius="md"
      >
        {selectedItem && (
          <Stack gap="md" pt="xs">
            <Paper p="sm" radius="md" style={{ backgroundColor: '#fdf2f4', border: '1px solid #f8d7da' }}>
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Amount Collected
                  </Text>
                  <Text size="24px" fw={800} style={{ color: '#800020' }}>
                    ₹{selectedItem.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </div>
                <Badge
                  size="md"
                  color="burgundy"
                  variant="filled"
                >
                  {selectedItem.isConnection ? 'New Connection Package' : 'Direct Sale Collection'}
                </Badge>
              </Group>
            </Paper>

            <SimpleGrid cols={2} spacing="xs">
              <Paper p="xs" radius="sm" withBorder>
                <Text size="11px" c="dimmed">Collection Date</Text>
                <Text size="xs" fw={700}>{formatDateDDMMYY(selectedItem.date)}</Text>
              </Paper>
              <Paper p="xs" radius="sm" withBorder>
                <Text size="11px" c="dimmed">Payment Mode</Text>
                <Text size="xs" fw={700}>{selectedItem.paymentMode}</Text>
              </Paper>
              <Paper p="xs" radius="sm" withBorder>
                <Text size="11px" c="dimmed">Payer / Customer</Text>
                <Text size="xs" fw={700}>{selectedItem.partyName}</Text>
              </Paper>
              <Paper p="xs" radius="sm" withBorder>
                <Text size="11px" c="dimmed">Driver &amp; Vehicle</Text>
                <Text size="xs" fw={700}>
                  {selectedItem.driverName} {selectedItem.vehicleNumber ? `(${selectedItem.vehicleNumber})` : ''}
                </Text>
              </Paper>
              <Paper p="xs" radius="sm" withBorder>
                <Text size="11px" c="dimmed">Route / POS</Text>
                <Text size="xs" fw={700}>{selectedItem.routeName}</Text>
              </Paper>
              <Paper p="xs" radius="sm" withBorder>
                <Text size="11px" c="dimmed">Original Bill Ref</Text>
                <Text size="xs" fw={700}>{selectedItem.rawRef}</Text>
              </Paper>
            </SimpleGrid>

            {selectedItem.packageName && (
              <Paper p="xs" radius="sm" withBorder style={{ backgroundColor: '#fafbfc' }}>
                <Text size="11px" c="dimmed">Connection Package</Text>
                <Text size="xs" fw={700} mt={2} style={{ color: '#800020' }}>
                  {selectedItem.packageName}
                </Text>
              </Paper>
            )}

            {selectedItem.notes && (
              <Paper p="xs" radius="sm" withBorder style={{ backgroundColor: '#fafbfc' }}>
                <Text size="11px" c="dimmed">Remarks &amp; Notes</Text>
                <Text size="xs" mt={2}>{selectedItem.notes}</Text>
              </Paper>
            )}

            <Group justify="space-between" mt="sm" wrap="wrap" gap="xs">
              <Group gap="xs">
                <Button
                  variant="outline"
                  color="burgundy"
                  size="xs"
                  leftSection={<IconPrinter size={14} />}
                  onClick={() => handlePrintReceiptPdf(selectedItem)}
                  styles={{ root: { borderColor: '#800020', color: '#800020', fontWeight: 600 } }}
                >
                  Print Receipt PDF
                </Button>
              </Group>

              <Group gap="xs">
                {selectedItem.raw?.SalesId && (
                  <Button
                    variant="outline"
                    color="burgundy"
                    size="xs"
                    leftSection={<IconEdit size={14} color="#800020" />}
                    onClick={() => {
                      const sid = selectedItem.raw.SalesId;
                      setSelectedItem(null);
                      navigate(`/sales/${sid}/edit`);
                    }}
                    styles={{ root: { borderColor: '#800020', color: '#800020', fontWeight: 600 } }}
                  >
                    Edit Invoice
                  </Button>
                )}
                <Button
                  size="xs"
                  leftSection={<IconReceipt2 size={14} />}
                  style={{ backgroundColor: '#800020' }}
                  onClick={() => {
                    setSelectedItem(null);
                    navigate('/sales');
                  }}
                >
                  View in Sales Register
                </Button>
              </Group>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};
