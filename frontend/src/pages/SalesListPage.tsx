import React, { useState, useMemo } from 'react';
import {
  Title,
  Text,
  Paper,
  SimpleGrid,
  Group,
  Stack,
  Button,
  Table,
  Badge,
  ActionIcon,
  TextInput,
  Select,
  Tooltip,
  Modal,
  Divider,
  SegmentedControl,
  ThemeIcon,
  Box } from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconPrinter,
  IconClock,
  IconFileInvoice,
  IconCash,
  IconEye,
  IconReceipt2,
  IconUserCheck,
  IconTrash,
  IconEdit,
  IconPackage,
  IconHistory,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUpRight,
  IconUser,
  IconCalendar,
  IconTruck,
  IconFileText,
  IconReceipt } from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { formatDateDDMMYY, DateInputDDMMYY } from '../components/DateInputDDMMYY';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface SanitizedEditHistory {
  raw: any;
  timestamp: string;
  editor: string;
  oldTotal: number;
  newTotal: number;
  oldPaymentMethod: string;
  newPaymentMethod: string;
  notes: string;
  amountChanged: boolean;
  paymentModeChanged: boolean;
}

const formatSaleEditHistory = (histories: any[] = [], currentGrandTotal?: number): SanitizedEditHistory[] => {
  if (!Array.isArray(histories) || histories.length === 0) return [];

  const sorted = [...histories].sort((a, b) => {
    const tA = new Date(a.EditedAt || a.edited_at || 0).getTime();
    const tB = new Date(b.EditedAt || b.edited_at || 0).getTime();
    return tA - tB;
  });

  const parsed = sorted.map((h) => ({
    raw: h,
    timestamp: h.EditedAt || h.edited_at,
    editor: h.EditedBy || h.edited_by || 'Admin / User',
    oldTotal: Number(h.OldGrandTotal ?? h.old_grand_total ?? 0),
    newTotal: Number(h.NewGrandTotal ?? h.new_grand_total ?? 0),
    oldPaymentMethod: h.OldPaymentMethod || h.old_payment_method || '',
    newPaymentMethod: h.NewPaymentMethod || h.new_payment_method || '',
    notes: h.Notes || h.notes || 'Invoice details updated',
  }));

  const n = parsed.length;
  if (currentGrandTotal !== undefined && currentGrandTotal > 0 && n > 0) {
    parsed[n - 1].newTotal = Number(currentGrandTotal);
  }

  for (let i = n - 1; i >= 0; i--) {
    if (i < n - 1) {
      if (parsed[i + 1].oldTotal > 0 && parsed[i].newTotal !== parsed[i + 1].oldTotal) {
        parsed[i].newTotal = parsed[i + 1].oldTotal;
      }
    }
  }
  for (let i = 1; i < n; i++) {
    if (parsed[i].oldTotal === 0 && parsed[i - 1].newTotal > 0) {
      parsed[i].oldTotal = parsed[i - 1].newTotal;
    }
  }

  return parsed.map((item) => ({
    ...item,
    amountChanged: Math.abs(item.oldTotal - item.newTotal) > 0.01,
    paymentModeChanged: Boolean(item.oldPaymentMethod && item.newPaymentMethod && item.oldPaymentMethod !== item.newPaymentMethod),
  }));
};

export const SalesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('ALL');
  const [typeFilter, setTypeFilter] = useState<string | null>('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState<'ALL' | 'CASH' | 'BANK'>('ALL');
  const [paymentGroupFilter, setPaymentGroupFilter] = useState<string | null>('ALL');
  const [viewingSale, setViewingSale] = useState<any | null>(null);
  const [historySale, setHistorySale] = useState<any | null>(null);
  const [deleteTargetSale, setDeleteTargetSale] = useState<any | null>(null);

  // Date Filter & Sort State
  type DateFilterType = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  const openSaleId = searchParams.get('open_sale_id');

  // 1. Fetch Sales List
  const { data: sales = [], isLoading } = useQuery<any[]>({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await apiClient.get('/sales/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    }
  });

  // 1b. Fetch Payment Groups for filter & sorting
  const { data: paymentGroups = [] } = useQuery<any[]>({
    queryKey: ['payment-groups'],
    queryFn: async () => {
      const res = await apiClient.get('/payment-groups/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    }
  });

  const paymentGroupOptions = useMemo(() => {
    const list = paymentGroups.map((pg: any) => ({
      value: String(pg.PaymentGroupId),
      label: pg.PaymentGroupName || `Group #${pg.PaymentGroupId}`
    }));
    return [
      { value: 'ALL', label: 'All Payment Groups' },
      ...list,
      { value: 'UNASSIGNED', label: 'Direct / Unassigned' }
    ];
  }, [paymentGroups]);

  // Automatically reopen sale details modal if open_sale_id is provided in URL
  React.useEffect(() => {
    if (openSaleId && sales.length > 0 && !viewingSale) {
      const match = sales.find((s: any) => String(s.SalesId) === String(openSaleId));
      if (match) {
        setViewingSale(match);
      }
    }
  }, [openSaleId, sales]);

  const handleCloseViewingModal = () => {
    setViewingSale(null);
    if (searchParams.has('open_sale_id')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('open_sale_id');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const isPackageSale = (s: any) => {
    const notes = String(s.Notes || '').toLowerCase();
    const lines = Array.isArray(s.lines) ? s.lines : [];
    return Boolean(
      notes.includes('package') ||
      notes.includes('connection') ||
      lines.some((l: any) =>
        l.is_package ||
        String(l.product_name || l.ProductName || '').toLowerCase().includes('connection') ||
        String(l.product_name || l.ProductName || '').toLowerCase().includes('package')
      )
    );
  };

  const isDateInFilter = (dateStr?: string) => {
    if (!dateStr || dateFilter === 'all') return true;
    const d = String(dateStr).slice(0, 10);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (dateFilter === 'today') {
      return d === todayStr;
    }
    if (dateFilter === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      const yesterdayStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
      return d === yesterdayStr;
    }
    if (dateFilter === 'this_week') {
      const day = today.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diff);
      const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      return d >= mondayStr && d <= todayStr;
    }
    if (dateFilter === 'this_month') {
      const monthStartStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      return d >= monthStartStr && d <= todayStr;
    }
    if (dateFilter === 'custom') {
      if (customStartDate && d < customStartDate) return false;
      if (customEndDate && d > customEndDate) return false;
      return true;
    }
    return true;
  };

  const getSplitInfo = (s: any) => {
    let cashAmt = Number(s.cash_amount || 0);
    let bankAmt = Number(s.bank_amount || s.upi_amount || 0);

    if ((cashAmt === 0 || bankAmt === 0) && s.Notes) {
      const cMatch = s.Notes.match(/Cash:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)/i);
      const uMatch = s.Notes.match(/(?:UPI|Bank|Online):\s*[₹Rs\.]*\s*([\d,]+\.?\d*)/i);
      if (cMatch && cashAmt === 0) cashAmt = parseFloat(cMatch[1].replace(/,/g, '')) || 0;
      if (uMatch && bankAmt === 0) bankAmt = parseFloat(uMatch[1].replace(/,/g, '')) || 0;
    }

    const grandTotal = Number(s.GrandTotal || s.PaidAmount || 0);
    const pm = (s.PaymentMethod || '').toUpperCase();

    if (pm === 'CASH' && cashAmt === 0) {
      cashAmt = grandTotal;
    } else if ((pm === 'BANK' || pm === 'UPI' || pm === 'ONLINE') && bankAmt === 0) {
      bankAmt = grandTotal;
    }

    const isSplit = pm === 'SPLIT' || (cashAmt > 0 && bankAmt > 0);
    return { cashAmt, bankAmt, isSplit, grandTotal, pm };
  };

  // Filtered Sales
  const filteredSales = useMemo(() => {
    const baseList = sales.filter((s: any) => {
      // 1. Date filter
      if (!isDateInFilter(s.SalesDate)) return false;

      // 2. Status & Type filters
      if (statusFilter === 'APPROVED') {
        if (!s.IsApproved || s.Status === 'CANCELLED') return false;
      } else if (statusFilter === 'PENDING') {
        if (s.IsApproved || s.Status === 'CANCELLED') return false;
      } else if (statusFilter === 'CANCELLED') {
        if (s.Status !== 'CANCELLED') return false;
      } else {
        // 'ALL' - hide CANCELLED by default
        if (s.Status === 'CANCELLED') return false;
      }

      const isPkg = isPackageSale(s);
      if (typeFilter === 'PACKAGE' && !isPkg) return false;
      if (typeFilter === 'REGULAR' && isPkg) return false;

      // 3. Search query
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const sNo = String(s.SalesNo || '').toLowerCase();
      const invNo = String(s.InvoiceNo || '').toLowerCase();
      const cust = String(s.customer_name || '').toLowerCase();
      const route = String(s.route_name || s.RouteName || '').toLowerCase();
      const driver = String(s.driver_name || s.DriverName || '').toLowerCase();
      const vehicle = String(s.vehicle_number || s.VehicleName || '').toLowerCase();
      const pgName = String(s.payment_group_name || '').toLowerCase();
      return (
        sNo.includes(q) ||
        invNo.includes(q) ||
        cust.includes(q) ||
        route.includes(q) ||
        driver.includes(q) ||
        vehicle.includes(q) ||
        pgName.includes(q)
      );
    });

    let result: any[] = [];

    // Payment Mode & Payment Group Filtering + Split Row Generation
    if (paymentModeFilter === 'ALL') {
      result = baseList;
    } else if (paymentModeFilter === 'CASH') {
      baseList.forEach((s: any) => {
        const { cashAmt, isSplit, pm } = getSplitInfo(s);
        if (pm === 'CASH') {
          result.push(s);
        } else if (isSplit && cashAmt > 0) {
          result.push({
            ...s,
            display_payment_method: 'CASH (Split)',
            display_amount: cashAmt,
            is_split_row: true,
          });
        }
      });
    } else if (paymentModeFilter === 'BANK') {
      baseList.forEach((s: any) => {
        // Match Payment Group filter if selected
        if (paymentGroupFilter && paymentGroupFilter !== 'ALL') {
          if (paymentGroupFilter === 'UNASSIGNED') {
            if (s.payment_group_id || s.payment_group_name) return;
          } else {
            const matchId = String(s.payment_group_id) === String(paymentGroupFilter);
            const matchName = s.payment_group_name === paymentGroupFilter;
            if (!matchId && !matchName) return;
          }
        }

        const { bankAmt, isSplit, pm } = getSplitInfo(s);
        if (pm === 'BANK' || pm === 'UPI' || pm === 'ONLINE') {
          result.push({
            ...s,
            display_payment_method: pm,
            display_amount: bankAmt || s.GrandTotal,
            is_split_row: false,
          });
        } else if (isSplit && bankAmt > 0) {
          result.push({
            ...s,
            display_payment_method: 'BANK (Split)',
            display_amount: bankAmt,
            is_split_row: true,
          });
        }
      });
    }

    // 4. Sorting
    result = [...result].sort((a: any, b: any) => {
      if (sortBy === 'date_asc') {
        const da = a.SalesDate || '';
        const db = b.SalesDate || '';
        return da.localeCompare(db);
      }
      if (sortBy === 'amount_desc') {
        const amtA = Number(a.display_amount ?? a.GrandTotal ?? 0);
        const amtB = Number(b.display_amount ?? b.GrandTotal ?? 0);
        return amtB - amtA;
      }
      if (sortBy === 'amount_asc') {
        const amtA = Number(a.display_amount ?? a.GrandTotal ?? 0);
        const amtB = Number(b.display_amount ?? b.GrandTotal ?? 0);
        return amtA - amtB;
      }
      if (sortBy === 'mode_cash') {
        const aIsCash = ((a.display_payment_method || a.PaymentMethod || '') as string).toUpperCase().includes('CASH') ? 0 : 1;
        const bIsCash = ((b.display_payment_method || b.PaymentMethod || '') as string).toUpperCase().includes('CASH') ? 0 : 1;
        if (aIsCash !== bIsCash) return aIsCash - bIsCash;
      }
      if (sortBy === 'mode_bank') {
        const aIsBank = ((a.display_payment_method || a.PaymentMethod || '') as string).toUpperCase().includes('BANK') ||
                        ((a.display_payment_method || a.PaymentMethod || '') as string).toUpperCase().includes('UPI') ? 0 : 1;
        const bIsBank = ((b.display_payment_method || b.PaymentMethod || '') as string).toUpperCase().includes('BANK') ||
                        ((b.display_payment_method || b.PaymentMethod || '') as string).toUpperCase().includes('UPI') ? 0 : 1;
        if (aIsBank !== bIsBank) return aIsBank - bIsBank;
      }
      // default: date_desc (newest first)
      const da = a.SalesDate || '';
      const db = b.SalesDate || '';
      if (db !== da) return db.localeCompare(da);
      return b.SalesId - a.SalesId;
    });

    return result;
  }, [sales, search, statusFilter, typeFilter, paymentModeFilter, paymentGroupFilter, dateFilter, customStartDate, customEndDate, sortBy]);

  // KPI Metrics
  const totalSalesAmount = useMemo(() => {
    return filteredSales
      .filter((s: any) => s.Status !== 'CANCELLED')
      .reduce((sum: number, s: any) => sum + Number(s.display_amount ?? s.GrandTotal ?? 0), 0);
  }, [filteredSales]);

  const activeInvoicesCount = useMemo(() => {
    return filteredSales.filter((s: any) => s.Status !== 'CANCELLED').length;
  }, [filteredSales]);

  const collectionsSummary = useMemo(() => {
    let totalCash = 0;
    let totalBank = 0;

    filteredSales.forEach((s: any) => {
      if (s.Status === 'CANCELLED') return;
      if (s.display_amount !== undefined) {
        const isB = (s.display_payment_method || '').toUpperCase().includes('BANK') || (s.display_payment_method || '').toUpperCase().includes('UPI');
        if (isB) totalBank += Number(s.display_amount);
        else totalCash += Number(s.display_amount);
        return;
      }

      const pm = (s.PaymentMethod || 'CASH').toUpperCase();
      const rawPaid = Number(s.PaidAmount ?? s.GrandTotal ?? 0);
      const advAdj = Number(s.advance_adjusted ?? s.AdvanceAdjusted ?? 0);
      const paid = Math.max(0, rawPaid - advAdj);
      if (paid <= 0) return;

      if (pm === 'SPLIT') {
        const cVal = Number(s.cash_amount ?? 0);
        const uVal = Number(s.upi_amount ?? s.bank_amount ?? 0);
        if (cVal > 0 || uVal > 0) {
          totalCash += cVal;
          totalBank += uVal;
        } else {
          const notes = s.Notes || '';
          const cM = /Cash:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)/i.exec(notes);
          const uM = /UPI:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)/i.exec(notes);
          const cashSplit = cM ? Number(cM[1].replace(/,/g, '')) : paid / 2;
          const upiSplit = uM ? Number(uM[1].replace(/,/g, '')) : paid - cashSplit;
          totalCash += cashSplit;
          totalBank += upiSplit;
        }
      } else if (pm.includes('CASH')) {
        totalCash += paid;
      } else {
        totalBank += paid;
      }
    });

    return {
      total: totalCash + totalBank,
      cash: totalCash,
      bank: totalBank,
    };
  }, [filteredSales]);

  const pendingApprovalsCount = useMemo(() => {
    return filteredSales.filter((s: any) => !s.IsApproved && s.Status !== 'CANCELLED').length;
  }, [filteredSales]);

  // Mutation: Single Approve
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(`/sales/${id}/approve/`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      notifications.show({
        title: 'Sale Approved',
        message: 'The sale invoice has been verified and approved.',
        color: 'teal' });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || err.message || 'Could not approve sale.',
        color: 'red' });
    } });

  // Mutation: Delete Sale
  const deleteSaleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/sales/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setViewingSale(null);
      setDeleteTargetSale(null);
      notifications.show({
        title: 'Invoice Deleted',
        message: 'The sale invoice has been removed, stock restored, and accounts synced.',
        color: 'gray' });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error Deleting Sale',
        message: err.response?.data?.detail || err.message || 'Could not delete sale invoice.',
        color: 'red' });
    } });

  // Mutation: Apply Customer Advance
  const applyAdvanceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(`/sales/${id}/apply-advance/`);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setViewingSale(null);
      notifications.show({
        title: 'Advance Applied',
        message: data.message || 'Advance adjustment created and invoice settled successfully.',
        color: 'teal',
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error Applying Advance',
        message: err.response?.data?.message || err.message || 'Could not apply advance.',
        color: 'red',
      });
    },
  });

  const handleDeleteSale = (sale: any) => {
    setDeleteTargetSale(sale);
  };

  const handleConfirmDeleteSale = () => {
    if (deleteTargetSale) {
      deleteSaleMutation.mutate(deleteTargetSale.SalesId);
    }
  };

  // Open Invoice PDF
  const handlePrintPdf = (sale: any) => {
    const url = `${apiClient.defaults.baseURL}/sales/${sale.SalesId}/invoice-pdf/?_t=${Date.now()}`;
    window.open(url, '_blank');
  };

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* ── Top Header ── */}
      <Box pt={4} pb={2}>
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
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
            <Title order={2} style={{ color: '#800020', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em' }}>
              Sales &amp; Invoices
            </Title>
            
          </div>

          <Group gap="xs" align="center" wrap="wrap">
            {/* Date Filter Pills */}
            <SegmentedControl
              size="xs"
              radius="xl"
              color="burgundy"
              transitionDuration={250}
              transitionTimingFunction="cubic-bezier(0.16, 1, 0.3, 1)"
              value={dateFilter}
              onChange={(val) => setDateFilter(val as any)}
              data={[
                { label: 'All', value: 'all' },
                { label: 'Today', value: 'today' },
                { label: 'Yesterday', value: 'yesterday' },
                { label: 'This Week', value: 'this_week' },
                { label: 'This Month', value: 'this_month' },
                { label: 'Custom', value: 'custom' },
              ]}
              styles={{
                root: {
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  padding: 3,
                  borderRadius: 9999,
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                },
                control: {
                  border: 'none',
                },
                indicator: {
                  backgroundColor: '#800020',
                  borderRadius: 9999,
                  boxShadow: '0 2px 4px rgba(128, 0, 32, 0.25)',
                  border: 'none',
                  outline: 'none',
                },
                label: {
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '5px 14px',
                  transition: 'color 150ms ease, font-weight 150ms ease',
                },
              }}
            />

            {dateFilter === 'custom' && (
              <Group gap="xs" align="center">
                <Box style={{ width: 120 }}>
                  <DateInputDDMMYY
                    placeholder="From Date"
                    value={customStartDate}
                    onChange={(val) => setCustomStartDate(val)}
                  />
                </Box>
                <Text size="xs" c="dimmed">to</Text>
                <Box style={{ width: 120 }}>
                  <DateInputDDMMYY
                    placeholder="To Date"
                    value={customEndDate}
                    onChange={(val) => setCustomEndDate(val)}
                  />
                </Box>
              </Group>
            )}

            {/* Sort Select */}
            <Select
              size="xs"
              radius="xl"
              value={sortBy}
              onChange={(val) => setSortBy(val || 'date_desc')}
              data={[
                { label: 'Date: Newest First', value: 'date_desc' },
                { label: 'Date: Oldest First', value: 'date_asc' },
                { label: 'Amount: High to Low', value: 'amount_desc' },
                { label: 'Amount: Low to High', value: 'amount_asc' },
                { label: 'Mode: Cash First', value: 'mode_cash' },
                { label: 'Mode: Bank First', value: 'mode_bank' },
              ]}
              style={{ width: 185 }}
              styles={{
                input: {
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  fontWeight: 600,
                  fontSize: 12,
                },
              }}
            />

            <Button
              variant="outline"
              color="burgundy"
              leftSection={<IconPackage size={17} />}
              style={{ borderColor: '#800020', color: '#800020', fontWeight: 600 }}
              onClick={() => navigate('/sales/new-connection')}
            >
              + Add New Connection
            </Button>
            <Button
              leftSection={<IconPlus size={18} />}
              style={{ backgroundColor: '#800020', fontWeight: 600 }}
              onClick={() => navigate('/sales/new')}
            >
              Add Sale
            </Button>
          </Group>
        </Group>
      </Box>

      {/* ── Summary KPI Cards (3 Cards: Total Sales, Cash Collections, Pending Approvals) ── */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
              Total Billed Sales
            </Text>
            <IconFileInvoice size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>
            ₹{totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {activeInvoicesCount} total invoice{activeInvoicesCount !== 1 ? 's' : ''} generated
          </Text>
        </Paper>

        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
              Collections (Includes Pending)
            </Text>
            <IconCash size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#800020', fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>
            ₹{collectionsSummary.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Group gap="xs" mt={6} align="center" wrap="nowrap">
            <Text size="xs" fw={700} c="#0f172a">
              Cash: ₹{collectionsSummary.cash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text size="xs" c="dimmed">&bull;</Text>
            <Text size="xs" fw={700} style={{ color: '#800020' }}>
              Bank: ₹{collectionsSummary.bank.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </Group>
        </Paper>

        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
              Pending Approvals
            </Text>
            <IconClock size={20} color="#b45309" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#b45309', fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>
            {pendingApprovalsCount}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Awaiting shift verification
          </Text>
        </Paper>
      </SimpleGrid>

      {/* ── Filter Bar ── */}
      <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <TextInput
            placeholder="Search invoice #, customer, route, vehicle, driver..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 260 }}
          />

          <Group gap="xs" wrap="wrap">
            {/* Payment Mode Selector: All, Cash Only, Bank / UPI */}
            <Select
              data={[
                { value: 'ALL', label: 'All Payment Modes' },
                { value: 'CASH', label: 'Cash Only' },
                { value: 'BANK', label: 'Bank / UPI' },
              ]}
              value={paymentModeFilter}
              onChange={(val) => {
                const nextVal = (val as any) || 'ALL';
                setPaymentModeFilter(nextVal);
                if (nextVal !== 'BANK') setPaymentGroupFilter('ALL');
              }}
              style={{ width: 165 }}
            />

            {/* Payment Group selector appears only when Bank is selected */}
            {paymentModeFilter === 'BANK' && (
              <Select
                data={paymentGroupOptions}
                value={paymentGroupFilter}
                onChange={(val) => setPaymentGroupFilter(val || 'ALL')}
                placeholder="All Payment Groups"
                style={{ width: 180 }}
              />
            )}
            <Select
              data={[
                { value: 'ALL', label: 'All Sales Types' },
                { value: 'REGULAR', label: 'Regular Sales' },
                { value: 'PACKAGE', label: 'New Connections' },
              ]}
              value={typeFilter}
              onChange={(val) => setTypeFilter(val || 'ALL')}
              style={{ width: 170 }}
            />
            <Select
              data={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'APPROVED', label: 'Approved Only' },
                { value: 'PENDING', label: 'Pending Approval' },
                { value: 'CANCELLED', label: 'Cancelled / Deleted' },
              ]}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || 'ALL')}
              style={{ width: 170 }}
            />
          </Group>
        </Group>
      </Paper>

      {/* ── Sales List Table ── */}
      <Paper radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
        <Table.ScrollContainer minWidth={1150}>
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <Table.Tr>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', minWidth: 210 }}>
                  INVOICE # &amp; DATE
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', minWidth: 150 }}>
                  CUSTOMER
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', minWidth: 160 }}>
                  ROUTE / VEHICLE
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center', minWidth: 140 }}>
                  QTY (FILLED / EMPTY)
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center', minWidth: 90 }}>
                  PAYMENT
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right', minWidth: 105 }}>
                  TOTAL
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right', minWidth: 115 }}>
                  GRAND TOTAL
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center', minWidth: 110 }}>
                  STATUS
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center', width: 90, minWidth: 90 }}>
                  ACTIONS
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                    <Text size="sm" c="dimmed">
                      Loading sales invoices...
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : filteredSales.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={9} style={{ textAlign: 'center', padding: '48px' }}>
                    <Text size="sm" fw={600} c="dimmed">
                      No sales records matching your criteria.
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      Click "Add Sale" to record a direct sales transaction or generate an invoice.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredSales.map((sale: any) => {
                  const isCredit = (sale.PaymentMethod || '').toUpperCase() === 'CREDIT';
                  const isPkg = isPackageSale(sale);
                  const invStr = String(sale.InvoiceNo || sale.SalesNo || '');
                  const isEmtrtn = invStr.startsWith('EMTRTN-');
                  const isRcpt = invStr.startsWith('RCPT-');

                  return (
                    <Table.Tr key={`${sale.SalesId}-${sale.display_payment_method || 'full'}`}>
                      <Table.Td>
                        <Group gap={6} align="center" wrap="nowrap">
                          <Text fw={700} size="sm" ff="monospace" style={{ color: '#800020', whiteSpace: 'nowrap' }}>
                            {sale.InvoiceNo || sale.SalesNo || `#${sale.SalesId}`}
                          </Text>
                          {isEmtrtn && (
                            <Badge
                              size="xs"
                              variant="light"
                              styles={{
                                root: {
                                  backgroundColor: '#fdf2f4',
                                  color: '#800020',
                                  border: '1px solid #f5c2cb',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  overflow: 'visible',
                                  whiteSpace: 'nowrap' } }}
                            >
                              EMPTY RETURN
                            </Badge>
                          )}
                          {isRcpt && (
                            <Badge
                              size="xs"
                              color="teal"
                              variant="light"
                              styles={{
                                root: {
                                  backgroundColor: '#ecfdf5',
                                  color: '#047857',
                                  border: '1px solid #a7f3d0',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  overflow: 'visible',
                                  whiteSpace: 'nowrap' } }}
                            >
                              RECEIPT
                            </Badge>
                          )}
                          {isPkg && (
                            <Badge
                              size="xs"
                              color="burgundy"
                              variant="light"
                              styles={{
                                root: {
                                  backgroundColor: '#fdf2f4',
                                  color: '#800020',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  overflow: 'visible',
                                  whiteSpace: 'nowrap' } }}
                            >
                              PACKAGE
                            </Badge>
                          )}
                          {(sale.IsEdited || sale.is_edited || (sale.edit_history && sale.edit_history.length > 0)) && (
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
                                  setHistorySale(sale);
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
                        <Text size="xs" c="dimmed">
                          {formatDateDDMMYY(sale.SalesDate)}
                        </Text>
                      </Table.Td>

                      <Table.Td>
                        <Text fw={600} size="sm" style={{ color: '#0f172a' }}>
                          {sale.customer_name || 'Walk-in Cash Customer'}
                        </Text>
                        {sale.customer_phone && (
                          <Text size="xs" c="dimmed">
                            {sale.customer_phone}
                          </Text>
                        )}
                      </Table.Td>

                      <Table.Td>
                        <Text size="xs" fw={600} style={{ color: '#334155' }}>
                          {sale.route_name || sale.RouteName || 'Office Sale Point'}
                        </Text>
                        <Text size="10px" c="dimmed">
                          {sale.vehicle_number || sale.VehicleName || 'Direct'} &bull; {sale.driver_name || sale.DriverName || 'Admin'}
                        </Text>
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'center' }}>
                        <Group gap={4} justify="center">
                          <Badge
                            size="xs"
                            variant="outline"
                            style={{
                              fontWeight: 600,
                              color: '#800020',
                              borderColor: '#f5c2cb',
                              backgroundColor: '#ffffff' }}
                          >
                            {Number(sale.TotalDeliveredQty || 0)} Deliv.
                          </Badge>
                          <Badge
                            size="xs"
                            variant="outline"
                            style={{
                              fontWeight: 600,
                              color: '#64748b',
                              borderColor: '#e2e8f0',
                              backgroundColor: '#ffffff' }}
                          >
                            {Number(sale.TotalEmptyQty || 0)} Empty
                          </Badge>
                        </Group>
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'center' }}>
                        <Stack gap={2} align="center">
                          <Badge
                            size="xs"
                            variant="outline"
                            style={{
                              fontWeight: 700,
                              backgroundColor: isEmtrtn ? '#f1f5f9' : (isCredit ? '#fdf2f4' : '#f8fafc'),
                              color: isEmtrtn ? '#64748b' : (isCredit ? '#800020' : '#475569'),
                              borderColor: isEmtrtn ? '#cbd5e1' : (isCredit ? '#f5c2cb' : '#cbd5e1') }}
                          >
                            {isEmtrtn ? 'N/A' : (sale.display_payment_method || sale.PaymentMethod || 'CASH')}
                          </Badge>

                          {/* Near the Bank payment, add the Group Name (only for Bank / UPI / Split) */}
                          {Boolean(
                            (
                              (sale.display_payment_method || '').toUpperCase().includes('BANK') ||
                              (sale.display_payment_method || '').toUpperCase().includes('UPI') ||
                              (['BANK', 'UPI', 'SPLIT'].includes((sale.PaymentMethod || '').toUpperCase()))
                            ) && sale.payment_group_name
                          ) && (
                            <Badge
                              size="xs"
                              variant="outline"
                              style={{
                                fontSize: 9,
                                height: 16,
                                paddingLeft: 5,
                                paddingRight: 5,
                                color: '#800020',
                                borderColor: '#f5c2cb',
                                backgroundColor: '#fff5f7',
                                fontWeight: 600,
                              }}
                            >
                              {sale.payment_group_name}
                            </Badge>
                          )}
                        </Stack>
                      </Table.Td>

                      {/* TOTAL Column (Mode-specific or split portion) */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        {isRcpt ? (
                          <>
                            <Text size="sm" fw={800} style={{ color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                              ₹{Number(sale.display_amount ?? (sale.PaidAmount || sale.GrandTotal || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                            <Text size="10px" c="#047857" fw={700}>
                              {sale.is_split_row ? 'PORTION' : 'COLLECTED'}
                            </Text>
                          </>
                        ) : isEmtrtn ? (
                          <>
                            <Text size="sm" fw={700} style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                              ₹0.00
                            </Text>
                            <Text size="10px" c="dimmed">
                              EMPTY RETURN
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text size="sm" fw={800} style={{ color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                              ₹{Number(sale.display_amount ?? (sale.PaidAmount || sale.GrandTotal || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                            {sale.is_split_row ? (
                              <Text size="10px" c="#047857" fw={700}>
                                {paymentModeFilter === 'CASH' ? 'CASH ONLY' : paymentModeFilter === 'BANK' ? 'BANK ONLY' : 'PORTION'}
                              </Text>
                            ) : null}
                          </>
                        )}
                      </Table.Td>

                      {/* GRAND TOTAL Column (Full invoice total including Bank and Cash) */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        {isEmtrtn ? (
                          <>
                            <Text size="sm" fw={700} style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                              ₹0.00
                            </Text>
                            <Text size="10px" c="dimmed">
                              EMPTY RETURN
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text size="sm" fw={800} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                              ₹{Number(sale.GrandTotal || sale.PaidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                            {sale.is_split_row && (
                              <Text size="10px" c="dimmed" fw={600}>
                                FULL BILL
                              </Text>
                            )}
                          </>
                        )}
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'center' }}>
                        {sale.Status === 'CANCELLED' ? (
                          <Badge
                            size="xs"
                            variant="filled"
                            styles={{
                              root: {
                                fontWeight: 700,
                                backgroundColor: '#fef2f2',
                                color: '#b91c1c',
                                border: '1px solid #fca5a5',
                                flexShrink: 0,
                                overflow: 'visible',
                                whiteSpace: 'nowrap',
                                display: 'inline-block' } }}
                          >
                            CANCELLED
                          </Badge>
                        ) : sale.IsApproved ? (
                          <Badge
                            size="xs"
                            variant="filled"
                            styles={{
                              root: {
                                fontWeight: 700,
                                backgroundColor: '#fdf2f4',
                                color: '#800020',
                                border: '1px solid #f5c2cb',
                                flexShrink: 0,
                                overflow: 'visible',
                                whiteSpace: 'nowrap',
                                display: 'inline-block' } }}
                          >
                            APPROVED
                          </Badge>
                        ) : (
                          <Badge
                            size="xs"
                            variant="outline"
                            styles={{
                              root: {
                                fontWeight: 700,
                                backgroundColor: '#fffbeb',
                                color: '#b45309',
                                borderColor: '#fde68a',
                                flexShrink: 0,
                                overflow: 'visible',
                                whiteSpace: 'nowrap',
                                display: 'inline-block' } }}
                          >
                            PENDING
                          </Badge>
                        )}
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'center' }}>
                        <Group gap={6} justify="center" wrap="nowrap">
                          {/* 1. Eye icon (View Details) FIRST */}
                          <Tooltip label="View Details & Lines" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="dark"
                              size="sm"
                              onClick={() => setViewingSale(sale)}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>

                          {/* 2. Edit icon SECOND */}
                          <Tooltip label="Edit Sale Invoice" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="burgundy"
                              size="sm"
                              onClick={() => navigate(`/sales/${sale.SalesId}/edit`)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>

                          {/* 3. Delete icon THIRD */}
                          <Tooltip label="Delete Invoice" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => handleDeleteSale(sale)}
                              loading={deleteSaleMutation.isPending}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {/* ── Delete Confirmation Modal ── */}
      <DeleteConfirmModal
        opened={!!deleteTargetSale}
        onClose={() => setDeleteTargetSale(null)}
        onConfirm={handleConfirmDeleteSale}
        title="Delete Sale Invoice"
        itemName={deleteTargetSale?.InvoiceNo || deleteTargetSale?.SalesNo || ''}
        itemType="invoice"
        description={
          <Stack gap="xs">
            <Text size="sm" c="#334155">
              Are you sure you want to delete invoice <strong style={{ color: '#800020' }}>"{deleteTargetSale?.InvoiceNo || deleteTargetSale?.SalesNo}"</strong>?
            </Text>
            <Text size="xs" c="dimmed">
              This will automatically reverse van stock movements and reverse associated accounting vouchers for this invoice.
            </Text>
          </Stack>
        }
        loading={deleteSaleMutation.isPending}
      />

      {/* ── View Sale Details Modal ── */}
      <Modal
        opened={!!viewingSale}
        onClose={handleCloseViewingModal}
        title={
          <Group gap="sm" align="center">
            <ThemeIcon size={38} radius="md" variant="light" style={{ backgroundColor: '#fdf2f4', color: '#800020', border: '1px solid #fecdd3' }}>
              <IconReceipt2 size={20} />
            </ThemeIcon>
            <div>
              <Group gap={8} align="center">
                <Text fw={800} style={{ color: '#800020', fontSize: 17, letterSpacing: '-0.3px' }}>
                  Invoice Details — {viewingSale?.InvoiceNo || viewingSale?.SalesNo}
                </Text>
                {viewingSale?.IsApproved ? (
                  <Badge size="xs" variant="filled" color="teal" radius="sm" style={{ fontWeight: 700 }}>
                    APPROVED
                  </Badge>
                ) : (
                  <Badge size="xs" variant="outline" color="orange" radius="sm" style={{ fontWeight: 700, backgroundColor: '#fffbeb', borderColor: '#fde68a', color: '#b45309' }}>
                    PENDING APPROVAL
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                Invoice ID: #{viewingSale?.SalesId} &bull; Delivery Ticket
              </Text>
            </div>
          </Group>
        }
        size={920}
        radius="lg"
        centered
        padding="xl"
      >
        {viewingSale && (
          <Stack gap="md">
            {/* Top Info Cards */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <Group gap={8} mb={4}>
                  <ThemeIcon size={22} radius="sm" variant="subtle" color="gray">
                    <IconUser size={14} color="#64748b" />
                  </ThemeIcon>
                  <Text size="11px" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: '0.5px' }}>
                    Customer
                  </Text>
                </Group>
                <Text size="sm" fw={800} c="#0f172a" style={{ lineHeight: 1.3 }}>
                  {viewingSale.customer_name || 'Walk-in Customer'}
                </Text>
                <Text size="11px" c="dimmed" mt={2}>
                  Ledger ID: #{viewingSale.CustomerLedger || 'Direct'}
                </Text>
              </Paper>

              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <Group gap={8} mb={4}>
                  <ThemeIcon size={22} radius="sm" variant="subtle" color="gray">
                    <IconCalendar size={14} color="#64748b" />
                  </ThemeIcon>
                  <Text size="11px" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: '0.5px' }}>
                    Sales Date
                  </Text>
                </Group>
                <Text size="sm" fw={800} c="#0f172a" style={{ lineHeight: 1.3 }}>
                  {formatDateDDMMYY(viewingSale.SalesDate)}
                </Text>
                <Text size="11px" c="dimmed" mt={2}>
                  {viewingSale.CreatedAt ? new Date(viewingSale.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recorded Date'}
                </Text>
              </Paper>

              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <Group gap={8} mb={4}>
                  <ThemeIcon size={22} radius="sm" variant="subtle" color="gray">
                    <IconTruck size={14} color="#64748b" />
                  </ThemeIcon>
                  <Text size="11px" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: '0.5px' }}>
                    Route &amp; Vehicle
                  </Text>
                </Group>
                <Text size="sm" fw={800} c="#0f172a" style={{ lineHeight: 1.3 }}>
                  {viewingSale.route_name || viewingSale.RouteName || 'Main Route'}
                </Text>
                <Text size="11px" c="dimmed" mt={2}>
                  {viewingSale.vehicle_number || viewingSale.VehicleName || 'Van Stock'}
                  {(viewingSale.driver_name || viewingSale.DriverName) ? ` • ${viewingSale.driver_name || viewingSale.DriverName}` : ''}
                </Text>
              </Paper>

              <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <Group gap={8} mb={4}>
                  <ThemeIcon size={22} radius="sm" variant="subtle" color="gray">
                    <IconCash size={14} color="#64748b" />
                  </ThemeIcon>
                  <Text size="11px" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: '0.5px' }}>
                    Payment Mode
                  </Text>
                </Group>
                <Badge
                  size="md"
                  radius="sm"
                  variant="light"
                  color={
                    (viewingSale.PaymentMethod || '').toUpperCase() === 'CASH'
                      ? 'teal'
                      : (viewingSale.PaymentMethod || '').toUpperCase() === 'CREDIT'
                      ? 'yellow'
                      : (viewingSale.PaymentMethod || '').toUpperCase() === 'SPLIT'
                      ? 'indigo'
                      : 'burgundy'
                  }
                  style={{ fontWeight: 800, textTransform: 'uppercase' }}
                >
                  {viewingSale.PaymentMethod || 'Cash'}
                </Badge>
                <Text size="11px" c="dimmed" mt={3}>
                  {(viewingSale.PaymentMethod || '').toUpperCase() === 'CREDIT' ? 'Payment on Credit' : 'Payment Received'}
                </Text>
              </Paper>
            </SimpleGrid>

            {/* Line Items Table */}
            <Box style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <Group justify="space-between" align="center" px="md" py="xs" style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Group gap={6}>
                  <IconPackage size={16} color="#64748b" />
                  <Text size="xs" fw={700} c="#334155" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                    Line Items ({(viewingSale.lines || []).length})
                  </Text>
                </Group>
                {Number(viewingSale.TotalEmptyQty || 0) > 0 && (
                  <Badge size="xs" color="cyan" variant="light" radius="sm" style={{ fontWeight: 700 }}>
                    {Number(viewingSale.TotalEmptyQty)} Empties Collected
                  </Badge>
                )}
              </Group>

              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                  <Table.Tr>
                    <Table.Th style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.5px' }}>PRODUCT</Table.Th>
                    <Table.Th style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>DELIVERED QTY</Table.Th>
                    {viewingSale.lines?.some((l: any) => Number(l.EmptyQuantity || 0) > 0) && (
                      <Table.Th style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>EMPTY RETURN</Table.Th>
                    )}
                    <Table.Th style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>UNIT RATE</Table.Th>
                    <Table.Th style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>GST %</Table.Th>
                    <Table.Th style={{ fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right' }}>LINE TOTAL</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(viewingSale.lines || []).map((ln: any, idx: number) => (
                    <Table.Tr key={idx}>
                      <Table.Td>
                        <Text size="xs" fw={700} c="#0f172a">
                          {ln.ProductName || ln.product_name}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Badge size="sm" variant="light" color="dark" radius="sm" style={{ fontWeight: 700 }}>
                          {ln.Quantity || ln.quantity} NOS
                        </Badge>
                      </Table.Td>
                      {viewingSale.lines?.some((l: any) => Number(l.EmptyQuantity || 0) > 0) && (
                        <Table.Td style={{ textAlign: 'right' }}>
                          {Number(ln.EmptyQuantity || 0) > 0 ? (
                            <Badge size="sm" variant="light" color="cyan" radius="sm" style={{ fontWeight: 700 }}>
                              {ln.EmptyQuantity} Ret
                            </Badge>
                          ) : (
                            <Text size="xs" c="dimmed">-</Text>
                          )}
                        </Table.Td>
                      )}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="xs" fw={600} c="#334155">
                          ₹{Number(ln.SalesPrice || ln.rate || 0).toFixed(2)}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Badge size="xs" variant="outline" color="gray" radius="sm">
                          {Number(ln.TaxPercent || 0)}%
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="xs" fw={800} c="#0f172a">
                          ₹{Number(ln.Total || ln.total || 0).toFixed(2)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>

            {/* Notes / Empty Return Narration Callout */}
            {viewingSale.Notes && (
              <Paper p="xs" radius="md" style={{ backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                <Group gap={6} align="flex-start" wrap="nowrap">
                  <IconFileText size={16} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <Text size="11px" fw={700} c="#475569" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                      Delivery Narration &bull; Empties
                    </Text>
                    <Text size="xs" c="#334155" style={{ fontStyle: 'italic', marginTop: 1 }}>
                      {viewingSale.Notes}
                    </Text>
                  </div>
                </Group>
              </Paper>
            )}

            {/* Financial Summary Card */}
            <Paper p="md" radius="md" style={{ backgroundColor: '#fcfaf9', border: '1px solid #f2e2e4' }}>
              <Group justify="space-between" align="center" wrap="wrap" gap="md">
                <Group gap="xl" wrap="wrap">
                  <div>
                    <Text size="11px" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                      Taxable SubTotal
                    </Text>
                    <Text size="sm" fw={700} c="#334155">
                      ₹{Number(viewingSale.SubTotal || (Number(viewingSale.GrandTotal || 0) - Number(viewingSale.TaxAmount || 0))).toFixed(2)}
                    </Text>
                  </div>
                  <div>
                    <Text size="11px" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                      GST (Tax)
                    </Text>
                    <Text size="sm" fw={700} c="#334155">
                      ₹{Number(viewingSale.TaxAmount || 0).toFixed(2)}
                    </Text>
                  </div>
                  <Divider orientation="vertical" />
                  <div>
                    <Text size="11px" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                      Grand Total
                    </Text>
                    <Text size="xl" fw={800} style={{ color: '#800020', lineHeight: 1.2 }}>
                      ₹{Number(viewingSale.GrandTotal || 0).toFixed(2)}
                    </Text>
                  </div>
                  <div>
                    <Text size="11px" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                      Amount Paid
                    </Text>
                    <Text size="md" fw={800} style={{ color: '#0f766e', lineHeight: 1.2 }}>
                      ₹{Number(viewingSale.PaidAmount || 0).toFixed(2)}
                    </Text>
                  </div>
                  {Number(viewingSale.GrandTotal || 0) > Number(viewingSale.PaidAmount || 0) && (
                    <div>
                      <Text size="11px" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                        Balance Due
                      </Text>
                      <Text size="md" fw={800} style={{ color: '#b91c1c', lineHeight: 1.2 }}>
                        ₹{(Number(viewingSale.GrandTotal || 0) - Number(viewingSale.PaidAmount || 0)).toFixed(2)}
                      </Text>
                    </div>
                  )}
                  {Number(viewingSale.PaidAmount || 0) > Number(viewingSale.GrandTotal || 0) && (
                    <div>
                      <Text size="11px" c="dimmed" fw={700} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                        Advance / Excess Paid
                      </Text>
                      <Text size="md" fw={800} style={{ color: '#0f766e', lineHeight: 1.2 }}>
                        ₹{(Number(viewingSale.PaidAmount || 0) - Number(viewingSale.GrandTotal || 0)).toFixed(2)} Cr
                      </Text>
                    </div>
                  )}
                </Group>
              </Group>
            </Paper>

            {viewingSale.edit_history && viewingSale.edit_history.length > 0 && (
              <>
                <Divider />
                <Group justify="space-between" align="center">
                  <Text size="xs" fw={700} c="orange" tt="uppercase">
                    Edit Audit Log ({viewingSale.edit_history.length})
                  </Text>
                  <Badge size="xs" color="orange" variant="light">
                    Revised / Modified
                  </Badge>
                </Group>
                <Table verticalSpacing="xs" highlightOnHover withTableBorder>
                  <Table.Thead style={{ backgroundColor: '#fff7ed' }}>
                    <Table.Tr>
                      <Table.Th style={{ fontSize: 11 }}>TIMESTAMP</Table.Th>
                      <Table.Th style={{ fontSize: 11 }}>EDITED BY</Table.Th>
                      <Table.Th style={{ fontSize: 11, textAlign: 'right' }}>AMOUNT CHANGE</Table.Th>
                      <Table.Th style={{ fontSize: 11 }}>PAYMENT MODE</Table.Th>
                      <Table.Th style={{ fontSize: 11 }}>REASON / NOTES</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {formatSaleEditHistory(viewingSale.edit_history, viewingSale.GrandTotal).map((eh, idx) => (
                      <Table.Tr key={idx}>
                        <Table.Td style={{ whiteSpace: 'nowrap' }}>
                          <Text size="xs" fw={600}>
                            {eh.timestamp ? new Date(eh.timestamp).toLocaleDateString() : '—'}
                          </Text>
                          <Text size="10px" c="dimmed">
                            {eh.timestamp ? new Date(eh.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" color="gray" variant="outline">
                            {eh.editor}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {eh.amountChanged ? (
                            <Group gap={6} justify="flex-end" wrap="nowrap">
                              <Text size="xs" td="line-through" c="dimmed">
                                ₹{eh.oldTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                              <IconArrowRight size={12} color="#800020" />
                              <Text size="xs" fw={700} c="#800020">
                                ₹{eh.newTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                            </Group>
                          ) : (
                            <Group gap={4} justify="flex-end" wrap="nowrap">
                              <Text size="xs" fw={600} c="#334155">
                                ₹{eh.newTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                              <Badge size="9px" color="gray" variant="light" radius="xs" px={4}>
                                Unchanged
                              </Badge>
                            </Group>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {eh.paymentModeChanged ? (
                            <Group gap={4} wrap="nowrap">
                              <Text size="xs" c="dimmed">{eh.oldPaymentMethod}</Text>
                              <IconArrowRight size={11} color="#800020" />
                              <Text size="xs" fw={700} c="#800020">{eh.newPaymentMethod}</Text>
                            </Group>
                          ) : (
                            <Text size="xs">
                              {eh.newPaymentMethod || eh.oldPaymentMethod || '-'}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {eh.notes}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </>
            )}

            <Divider />

            {/* Action Buttons Footer */}
            <Group justify="space-between" align="center" wrap="wrap" pt="xs">
              <Button
                variant="subtle"
                color="red"
                size="sm"
                leftSection={<IconTrash size={16} />}
                loading={deleteSaleMutation.isPending}
                onClick={() => handleDeleteSale(viewingSale)}
              >
                Delete Invoice
              </Button>

              <Group gap="sm" wrap="wrap">
                {Number(viewingSale.GrandTotal || 0) > Number(viewingSale.PaidAmount || 0) && (
                  <Button
                    variant="light"
                    color="burgundy"
                    size="sm"
                    leftSection={<IconCash size={16} />}
                    loading={applyAdvanceMutation.isPending}
                    onClick={() => applyAdvanceMutation.mutate(viewingSale.SalesId)}
                  >
                    Apply Advance
                  </Button>
                )}
                {!viewingSale.IsApproved && (
                  <Button
                    variant="filled"
                    size="sm"
                    style={{ backgroundColor: '#800020', fontWeight: 600 }}
                    leftSection={<IconUserCheck size={16} />}
                    loading={approveMutation.isPending}
                    onClick={() => {
                      approveMutation.mutate(viewingSale.SalesId);
                      setViewingSale(null);
                    }}
                  >
                    Approve Invoice
                  </Button>
                )}
                <Button
                  variant="light"
                  color="burgundy"
                  size="sm"
                  leftSection={<IconEdit size={16} />}
                  onClick={() => {
                    navigate(`/sales/${viewingSale.SalesId}/edit`);
                  }}
                >
                  Edit Invoice
                </Button>
                <Button
                  size="sm"
                  leftSection={<IconPrinter size={16} />}
                  style={{ backgroundColor: '#800020', fontWeight: 700, boxShadow: '0 2px 4px rgba(128,0,32,0.2)' }}
                  onClick={() => handlePrintPdf(viewingSale)}
                >
                  Print GST Tax Invoice
                </Button>
              </Group>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Edit History Audit Modal */}
      <Modal
        opened={!!historySale}
        onClose={() => setHistorySale(null)}
        title={
          <Group gap="xs">
            <Box
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: '#fdf2f4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #f5c2cb',
              }}
            >
              <IconHistory size={18} color="#800020" />
            </Box>
            <div>
              <Text fw={800} style={{ color: '#800020', fontSize: 16 }}>
                Invoice Revision History
              </Text>
              <Text size="xs" c="dimmed">
                {historySale?.InvoiceNo || historySale?.SalesNo} &bull; {historySale?.customer_name || 'Walk-in Customer'}
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
        {historySale && (
          <Stack gap="md">
            {/* Summary Information Card */}
            <Box p="md" style={{ backgroundColor: '#fdf2f4', borderRadius: 10, border: '1px solid #f5c2cb' }}>
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    CUSTOMER
                  </Text>
                  <Text fw={800} size="xs" c="#0f172a" truncate>
                    {historySale.customer_name || 'Walk-in Customer'}
                  </Text>
                </div>
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    DELIVERED / EMPTY
                  </Text>
                  <Text fw={800} size="xs" c="#0f172a">
                    {historySale.TotalDeliveredQty ?? 0} Cyl / {historySale.TotalEmptyQty ?? 0} Ret
                  </Text>
                </div>
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    INVOICE TOTAL
                  </Text>
                  <Text fw={800} size="xs" c="#0f172a">
                    ₹{Number(historySale.GrandTotal ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </div>
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    PAID / COLLECTED
                  </Text>
                  <Text fw={800} size="xs" style={{ color: '#800020' }}>
                    ₹{Number(historySale.PaidAmount ?? historySale.GrandTotal ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </div>
              </SimpleGrid>
            </Box>

            {/* Note / Reason outside the tab */}
            {historySale.EditReason && (
              <Text size="xs" c="#475569" px={4} style={{ marginTop: -4 }}>
                <Text component="span" fw={700} style={{ color: '#800020' }}>Latest Note / Reason:</Text>{' '}
                {historySale.EditReason}
              </Text>
            )}

            {(!historySale.edit_history || historySale.edit_history.length === 0) ? (
              <Box p="lg" style={{ textAlign: 'center', backgroundColor: '#fdf2f4', borderRadius: 10, border: '1px solid #f5c2cb' }}>
                <Text size="sm" style={{ color: '#800020', fontWeight: 700 }}>
                  Invoice record was marked as modified
                </Text>
                {historySale.EditedBy && (
                  <Text size="xs" c="dimmed" mt={4}>
                    Modified by: {historySale.EditedBy} {historySale.EditedAt ? `on ${formatDateDDMMYY(historySale.EditedAt)}` : ''}
                  </Text>
                )}
                {historySale.EditReason && (
                  <Text size="xs" fw={600} style={{ color: '#800020' }} mt={6}>
                    &ldquo;{historySale.EditReason}&rdquo;
                  </Text>
                )}
              </Box>
            ) : (
              <Table.ScrollContainer minWidth={600} style={{ width: '100%' }}>
                <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover withTableBorder style={{ borderRadius: 8, overflow: 'hidden', width: '100%' }}>
                  <Table.Thead style={{ backgroundColor: '#fdf2f4' }}>
                    <Table.Tr>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 160, whiteSpace: 'nowrap' }}>TIMESTAMP</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 180, whiteSpace: 'nowrap' }}>MODIFIED BY</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 210, whiteSpace: 'nowrap' }}>AMOUNT CHANGE</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 150, whiteSpace: 'nowrap' }}>PAYMENT MODE</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px' }}>REASON / NOTES</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {formatSaleEditHistory(historySale.edit_history, historySale.GrandTotal).map((eh, idx) => (
                      <Table.Tr key={eh.raw.EditId || eh.raw.edit_id || idx}>
                        <Table.Td style={{ fontSize: 12, color: '#475569', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {eh.timestamp ? new Date(eh.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </Table.Td>
                        <Table.Td style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {eh.editor}
                        </Table.Td>
                        <Table.Td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                          {eh.amountChanged ? (
                            <Group gap={6} wrap="nowrap">
                              <Text size="xs" td="line-through" c="dimmed">
                                ₹{eh.oldTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                              <IconArrowRight size={13} color="#800020" />
                              <Text size="sm" fw={800} style={{ color: '#800020' }}>
                                ₹{eh.newTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                            </Group>
                          ) : (
                            <Group gap={6} wrap="nowrap">
                              <Text size="xs" fw={700} c="#334155">
                                ₹{eh.newTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                              <Badge size="xs" color="gray" variant="light" radius="xs">
                                Unchanged
                              </Badge>
                            </Group>
                          )}
                        </Table.Td>
                        <Table.Td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                          {eh.paymentModeChanged ? (
                            <Group gap={4} wrap="nowrap">
                              <Text size="xs" c="dimmed">{eh.oldPaymentMethod}</Text>
                              <IconArrowRight size={12} color="#800020" />
                              <Text size="xs" fw={700} style={{ color: '#800020' }}>{eh.newPaymentMethod}</Text>
                            </Group>
                          ) : (
                            <Text size="xs" fw={600} c="#0f172a">{eh.newPaymentMethod || eh.oldPaymentMethod || 'Cash'}</Text>
                          )}
                        </Table.Td>
                        <Table.Td style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>
                          {eh.notes}
                        </Table.Td>
                      </Table.Tr>
                    ))}
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
                  const billNo = historySale.InvoiceNo || historySale.SalesNo || '';
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
                onClick={() => setHistorySale(null)}
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

export default SalesListPage;

