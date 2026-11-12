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
  IconArrowLeft,
  IconCash,
  IconReceipt,
  IconReceipt2,
  IconSearch,
  IconEye,
  IconArrowUpRight,
  IconWallet,
  IconRefresh,
  IconCalendar,
  IconPrinter,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { formatDateDDMMYY } from '../components/DateInputDDMMYY';

interface CollectionItem {
  id: string;
  source: 'SALE' | 'RECEIPT';
  date: string;
  ref: string;
  rawRef: string;
  partyName: string;
  partyMobile?: string;
  partyId?: number | null;
  routeName: string;
  paymentMode: string;
  amount: number;
  totalBillAmount?: number;
  notes: string;
  raw: any;
}

export const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'SALE' | 'RECEIPT'>('ALL');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // 1. Fetch Sales Invoices
  const { data: sales = [], isLoading: isLoadingSales, refetch: refetchSales } = useQuery<any[]>({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await apiClient.get('/sales/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // 2. Fetch Customer Receipts (Payments of type RECEIPT)
  const { data: allPayments = [], isLoading: isLoadingPayments, refetch: refetchPayments } = useQuery<any[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/');
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

  // Customer Ledger ID Set (Sundry Debtors)
  const customerLedgerIds = useMemo(() => {
    return new Set(
      ledgers
        .filter((l: any) => {
          const gName = (l.group_name || l.GroupName || '').toLowerCase();
          const gid = Number(l.GroupId ?? l.Group ?? 0);
          return gid === 21 || gName.includes('debtor') || gName.includes('customer');
        })
        .map((l: any) => Number(l.LedgerId))
    );
  }, [ledgers]);

  // Customer Receipts Vouchers
  const customerReceipts = useMemo(() => {
    return allPayments.filter((p: any) => {
      if (p.voucher_type === 'RECEIPT' || p.VoucherType === 'RECEIPT' || p.PaymentType === 'RECEIPT') return true;
      if (p.voucher_type === 'PAYMENT' || p.VoucherType === 'PAYMENT') return false;
      const partyId = Number(p.PartyLedgerId ?? p.PartyLedger ?? 0);
      return customerLedgerIds.has(partyId);
    });
  }, [allPayments, customerLedgerIds]);

  // Compute Billwise Allocations from separate Receipts to prevent double counting
  const receiptAllocBySale = useMemo(() => {
    const map = new Map<string, number>();
    customerReceipts.forEach((p: any) => {
      (p.lines || []).forEach((l: any) => {
        (l.allocations || []).forEach((a: any) => {
          if (a.BillReference) {
            const key = String(a.BillReference).trim().toUpperCase();
            map.set(key, (map.get(key) || 0) + Number(a.AllocatedAmount || 0));
          }
        });
      });
    });
    return map;
  }, [customerReceipts]);

  // Construct Unified Collections Register
  const allCollections = useMemo(() => {
    const list: CollectionItem[] = [];

    // 1. Direct Payments collected on Sales Invoices
    sales.forEach((s: any) => {
      const rawPaid = Number(s.PaidAmount || 0);
      if (rawPaid <= 0) return;

      const sRef = String(s.InvoiceNo || s.SalesNo || `INV-${s.SalesId}`).trim();
      const allocatedFromReceipt = receiptAllocBySale.get(sRef.toUpperCase()) || 0;
      const netCounterPaid = Math.max(0, rawPaid - allocatedFromReceipt);

      if (netCounterPaid > 0) {
        const custId = s.CustomerLedger ? Number(s.CustomerLedger.LedgerId || s.CustomerLedger) : null;
        const custObj = custId ? ledgerMap.get(custId) : null;
        const partyName = custObj?.LedgerName || s.CustomerLedger?.LedgerName || s.CustomerName || s.PartyName || 'Cash Sale Buyer';
        const partyMobile = custObj?.Mobile || s.CustomerLedger?.Mobile || '';

        list.push({
          id: `sale-${s.SalesId}`,
          source: 'SALE',
          date: s.SalesDate || (s.CreatedAt ? s.CreatedAt.split('T')[0] : ''),
          ref: sRef.startsWith('INV-') ? `PAY-${sRef}` : `PAY-${sRef}`,
          rawRef: sRef,
          partyName,
          partyMobile,
          partyId: custId,
          routeName: s.RouteName || (s.RouteVehicleDriver?.Route?.RouteName) || 'Office Sale Point',
          paymentMode: (s.PaymentMethod || 'CASH').toUpperCase(),
          amount: netCounterPaid,
          totalBillAmount: Number(s.GrandTotal || 0),
          notes: s.Notes ? `Sale: ${s.Notes}` : `Direct counter collection on bill ${sRef}`,
          raw: s,
        });
      }
    });

    // 2. Standalone Customer Receipts
    customerReceipts.forEach((r: any) => {
      const amt = Number(r.Amount || 0);
      if (amt <= 0) return;

      const pId = Number(r.PartyLedgerId ?? r.PartyLedger ?? 0);
      const custObj = pId ? ledgerMap.get(pId) : null;
      const partyName = custObj?.LedgerName || r.party_name || r.PartyLedgerName || 'Customer';
      const partyMobile = custObj?.Mobile || '';
      const recRef = r.PaymentNo || r.VoucherNo || `REC-${r.PaymentId}`;
      const recDate = r.payment_date || (r.CreatedAt ? r.CreatedAt.split('T')[0] : '') || r.VoucherDate || '';

      list.push({
        id: `receipt-${r.PaymentId}`,
        source: 'RECEIPT',
        date: recDate,
        ref: recRef,
        rawRef: recRef,
        partyName,
        partyMobile,
        partyId: pId,
        routeName: r.RouteName || '-',
        paymentMode: (r.primary_mode || r.PaymentMode || 'CASH').toUpperCase(),
        amount: amt,
        notes: r.Narration || 'Customer collection receipt',
        raw: r,
      });
    });

    // Sort chronologically (newest first)
    list.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });

    return list;
  }, [sales, customerReceipts, ledgerMap, receiptAllocBySale]);

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

  // Filtered Collections
  const filteredCollections = useMemo(() => {
    return allCollections.filter((item) => {
      // Source filter
      if (sourceFilter !== 'ALL' && item.source !== sourceFilter) {
        return false;
      }

      // Mode filter
      if (modeFilter !== 'ALL') {
        const itemMode = item.paymentMode.toLowerCase();
        const target = modeFilter.toLowerCase();
        if (target === 'bank' && !itemMode.includes('bank') && !itemMode.includes('upi') && !itemMode.includes('card')) {
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
        const matchNotes = item.notes.toLowerCase().includes(q);
        if (!matchRef && !matchParty && !matchMobile && !matchRoute && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [allCollections, sourceFilter, modeFilter, dateBounds, searchQuery]);

  // Aggregate Metrics for Filtered Dataset
  const stats = useMemo(() => {
    let totAmt = 0;
    let saleAmt = 0;
    let receiptAmt = 0;
    let saleCount = 0;
    let receiptCount = 0;
    let cashAmt = 0;
    let digitalAmt = 0;

    filteredCollections.forEach((c) => {
      totAmt += c.amount;
      if (c.source === 'SALE') {
        saleAmt += c.amount;
        saleCount++;
      } else {
        receiptAmt += c.amount;
        receiptCount++;
      }

      if (c.paymentMode.includes('CASH')) {
        cashAmt += c.amount;
      } else {
        digitalAmt += c.amount;
      }
    });

    return {
      totAmt,
      saleAmt,
      receiptAmt,
      saleCount,
      receiptCount,
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
          routeName: c.routeName,
          paymentMode: c.paymentMode,
          amount: c.amount,
          notes: c.notes,
        })),
        source_type: sourceFilter,
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
      alert('Failed to generate PDF statement. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const isLoading = isLoadingSales || isLoadingPayments;

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* ── Top Header with Back to Dashboard ── */}
      <Box pt={4} pb={2}>
        <Group gap="xs" align="center" mb={6}>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/')}
            styles={{ root: { paddingLeft: 4, paddingRight: 8 } }}
          >
            Back to Dashboard
          </Button>
         
      
        </Group>

        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <div>
            <Group gap={10} align="center">
              <IconCash size={26} color="#800020" />
              <Title order={2} style={{ color: '#800020', fontWeight: 800, letterSpacing: '-0.02em', fontSize: 24 }}>
                Collections &amp; Cash Inflow
              </Title>
            </Group>
            <Text size="xs" c="dimmed" mt={3}>
              Consolidated real-time register of all money collected across Sales Invoices and Customer Receipts
            </Text>
          </div>

          <Group gap="xs" wrap="wrap">
            <Button
              variant="default"
              size="xs"
              leftSection={<IconRefresh size={14} />}
              onClick={() => {
                refetchSales();
                refetchPayments();
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
              leftSection={<IconReceipt size={15} />}
              onClick={() => navigate('/receipts/new')}
            >
              Record Receipt
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
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
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
                Total Collections
              </Text>
              <Text size="22px" fw={800} mt={4} style={{ color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                ₹{stats.totAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                {stats.totalCount} total collection{stats.totalCount !== 1 ? 's' : ''} recorded
              </Text>
            </div>
            <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconCash size={24} color="#800020" stroke={1.75} />
            </Box>
          </Group>
        </Paper>

        {/* Card 2: Sales Direct Counter Paid */}
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
                Direct Sales Paid
              </Text>
              <Text size="22px" fw={800} mt={4} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                ₹{stats.saleAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                {stats.saleCount} sales invoice{stats.saleCount !== 1 ? 's' : ''} with payments
              </Text>
            </div>
            <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconReceipt2 size={24} color="#800020" stroke={1.75} />
            </Box>
          </Group>
        </Paper>

        {/* Card 3: Standalone Receipts */}
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
                Customer Receipts
              </Text>
              <Text size="22px" fw={800} mt={4} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                ₹{stats.receiptAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                {stats.receiptCount} collection voucher{stats.receiptCount !== 1 ? 's' : ''}
              </Text>
            </div>
            <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconReceipt size={24} color="#800020" stroke={1.75} />
            </Box>
          </Group>
        </Paper>

        {/* Card 4: Cash vs Bank/Digital */}
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
          {/* Top Row: Streamlined Source Segmented Pill & Search */}
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <SegmentedControl
              value={sourceFilter}
              onChange={(val: any) => setSourceFilter(val)}
              color="burgundy"
              radius="xl"
              size="xs"
              transitionDuration={250}
              transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
              data={[
                { label: `All Collections (${allCollections.length})`, value: 'ALL' },
                { label: `Sales Paid (${allCollections.filter((c) => c.source === 'SALE').length})`, value: 'SALE' },
                { label: `Receipt Vouchers (${allCollections.filter((c) => c.source === 'RECEIPT').length})`, value: 'RECEIPT' },
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
              placeholder="Search reference, customer, mobile, route..."
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
              style={{ width: 300 }}
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

          {/* Bottom Row: Sliding Period Filter on Left & Payment Mode Select on Right */}
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Group gap="sm" align="center" wrap="wrap">
              <SegmentedControl
                value={datePreset}
                onChange={(val: any) => setDatePreset(val)}
                color="burgundy"
                radius="xl"
                size="xs"
                transitionDuration={250}
                transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
                data={[
                  { label: 'All Time', value: 'ALL' },
                  { label: 'Today', value: 'TODAY' },
                  { label: 'Yesterday', value: 'YESTERDAY' },
                  { label: 'This Week', value: 'THIS_WEEK' },
                  { label: 'This Month', value: 'THIS_MONTH' },
                  {
                    label: (
                      <Group gap={4} wrap="nowrap" align="center" style={{ display: 'inline-flex' }}>
                        <IconCalendar size={13} />
                        <span>Custom</span>
                      </Group>
                    ),
                    value: 'CUSTOM',
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
                  },
                  label: {
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '4px 13px',
                    transition: 'color 150ms ease',
                  },
                }}
              />

              {datePreset === 'CUSTOM' && (
                <Group gap="xs" align="center">
                  <TextInput
                    size="xs"
                    radius="md"
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.currentTarget.value)}
                    style={{ width: 135 }}
                  />
                  <Text size="xs" c="dimmed">to</Text>
                  <TextInput
                    size="xs"
                    radius="md"
                    type="date"
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
              <IconCash size={40} color="#cbd5e1" />
              <Text size="sm" fw={600} c="#64748b">No collection records found</Text>
              <Text size="xs" c="dimmed">Try adjusting your date range or search keyword</Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={900}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead style={{ backgroundColor: '#fafbfc', borderBottom: '1px solid #e2e8f0' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 105 }}>Date</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 130 }}>Ref / Voucher #</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 150 }}>Source</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13 }}>Customer / Payer</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13 }}>Route / POS</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, textAlign: 'center', width: 110 }}>Mode</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, textAlign: 'right', width: 140 }}>Amount Collected</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, textAlign: 'right', width: 95 }}>Actions</Table.Th>
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
                      {item.source === 'SALE' && (
                        <Text size="11px" c="dimmed">
                          Bill: {item.rawRef}
                        </Text>
                      )}
                    </Table.Td>

                    {/* Source Badge */}
                    <Table.Td>
                      {item.source === 'SALE' ? (
                        <Badge
                          size="sm"
                          variant="light"
                          style={{
                            backgroundColor: '#fdf2f4',
                            color: '#800020',
                            fontWeight: 700,
                            letterSpacing: '0.2px',
                          }}
                        >
                          Sale Direct Paid
                        </Badge>
                      ) : (
                        <Badge
                          size="sm"
                          variant="light"
                          style={{
                            backgroundColor: '#fdf2f4',
                            color: '#800020',
                            fontWeight: 700,
                            letterSpacing: '0.2px',
                          }}
                        >
                          Customer Receipt
                        </Badge>
                      )}
                    </Table.Td>

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

                    {/* Route / POS */}
                    <Table.Td style={{ fontSize: 12, color: '#475569' }}>
                      {item.routeName}
                    </Table.Td>

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
                        <Text size="10px" c="dimmed">
                          of ₹{item.totalBillAmount.toFixed(2)} bill
                        </Text>
                      )}
                    </Table.Td>

                    {/* Actions */}
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label="View Details" withArrow position="top">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>

                        {item.partyId && (
                          <Tooltip label="Customer Statement" withArrow position="top">
                            <ActionIcon
                              variant="subtle"
                              color="burgundy"
                              size="sm"
                              onClick={() => navigate('/receivables')}
                            >
                              <IconArrowUpRight size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>

              {/* Table Footer: Totals */}
              <Table.Tfoot style={{ backgroundColor: '#fafbfc', borderTop: '2px solid #e2e8f0' }}>
                <Table.Tr>
                  <Table.Td colSpan={6} style={{ fontWeight: 800, fontSize: 12, color: '#800020', textTransform: 'uppercase' }}>
                    Total Collections ({filteredCollections.length} Items)
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{stats.totAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Table.Td>
                  <Table.Td />
                </Table.Tr>
              </Table.Tfoot>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      {/* ── Quick Detail Modal ── */}
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
                  color={selectedItem.source === 'SALE' ? 'burgundy' : 'burgundy'}
                  variant="filled"
                >
                  {selectedItem.source === 'SALE' ? 'Direct Sale Collection' : 'Customer Receipt Voucher'}
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
                <Text size="11px" c="dimmed">Route / POS</Text>
                <Text size="xs" fw={700}>{selectedItem.routeName}</Text>
              </Paper>
            </SimpleGrid>

            {selectedItem.notes && (
              <Paper p="xs" radius="sm" withBorder style={{ backgroundColor: '#fafbfc' }}>
                <Text size="11px" c="dimmed">Remarks &amp; Notes</Text>
                <Text size="xs" mt={2}>{selectedItem.notes}</Text>
              </Paper>
            )}

            <Group justify="space-between" mt="sm">
              <Button variant="default" size="xs" onClick={() => setSelectedItem(null)}>
                Close
              </Button>
              {selectedItem.source === 'SALE' ? (
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
              ) : (
                <Button
                  size="xs"
                  leftSection={<IconReceipt size={14} />}
                  style={{ backgroundColor: '#800020' }}
                  onClick={() => {
                    setSelectedItem(null);
                    navigate('/receipts');
                  }}
                >
                  View in Receipts Register
                </Button>
              )}
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};
