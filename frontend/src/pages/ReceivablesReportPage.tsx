import React, { useState, useMemo } from 'react';
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
  TextInput,
  CloseButton,
  ActionIcon,
  Tooltip,
  Modal,
  Divider,
  Box,
  Checkbox,
  NumberInput,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconSearch,
  IconCoins,
  IconFileInvoice,
  IconCash,
  IconUsers,
  IconRefresh,
  IconPrinter,
  IconPlus,
  IconTrash,
  IconArrowUpRight,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DateInputDDMMYY, formatDateDDMMYY } from '../components/DateInputDDMMYY';

// Clean, concise reference formatter e.g. SAL-20261111-0001 -> INV-0001, PAY-SAL-... -> PAY-0001
const formatShortRef = (raw: string | null | undefined): string => {
  if (!raw) return '—';
  const str = String(raw).trim();
  if (/^PAY-/i.test(str)) {
    const nums = str.match(/(\d+)$/);
    if (nums) return `PAY-${nums[1]}`;
    return str;
  }
  if (/^(?:SAL|INV)-/i.test(str)) {
    const nums = str.match(/(\d+)$/);
    if (nums) return `INV-${nums[1]}`;
    return str;
  }
  if (/^DT-/i.test(str)) {
    const nums = str.match(/(\d+)$/);
    if (nums) return `DT-${nums[1]}`;
    return str;
  }
  if (/^PUR-/i.test(str)) {
    const nums = str.match(/(\d+)$/);
    if (nums) return `PUR-${nums[1]}`;
    return str;
  }
  return str;
};

export const ReceivablesReportPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [forceDelete, setForceDelete] = useState(false);

  // Statement date range and search filters inside detail view
  const [stmtFromDate, setStmtFromDate] = useState('');
  const [stmtToDate, setStmtToDate] = useState('');
  const [stmtSearch, setStmtSearch] = useState('');

  // Quick edit movement term modal
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingTermDays, setEditingTermDays] = useState<number>(15);

  const handleSaveMovementTerm = async () => {
    if (!selectedCustomer) return;
    try {
      await apiClient.patch(`/ledgers/${selectedCustomer.id}/`, {
        CreditPeriodDays: editingTermDays,
      });
      setSelectedCustomer((prev: any) => ({ ...prev, creditPeriod: editingTermDays }));
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      notifications.show({
        title: 'Updated',
        message: `Cylinder movement deadline updated to ${editingTermDays} days.`,
        color: 'teal',
      });
      setTermModalOpen(false);
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to update movement deadline.',
        color: 'red',
      });
    }
  };

  // 1. Fetch Ledgers
  const {
    data: ledgers = [],
    isLoading: isLoadingLedgers,
    refetch: refetchLedgers,
    isFetching,
  } = useQuery<any[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 2. Fetch Sales
  const { data: sales = [], isLoading: isLoadingSales } = useQuery<any[]>({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await apiClient.get('/sales/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 3. Fetch Payments & Receipts
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<any[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  const isLoading = isLoadingLedgers || isLoadingSales || isLoadingPayments;

  // Delete Ledger Mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, force }: { id: number; force?: boolean }) => {
      await apiClient.delete(`/ledgers/${id}/${force ? '?force=true' : ''}`);
    },
    onSuccess: () => {
      notifications.show({
        title: 'Customer Deleted',
        message: 'The customer account was successfully removed.',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setDeleteTarget(null);
      setForceDelete(false);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Cannot delete this customer as it is linked to sales bills or accounting transactions.';
      notifications.show({
        title: 'Cannot Delete Customer',
        message: msg,
        color: 'red',
      });
      setDeleteTarget(null);
      setForceDelete(false);
    },
  });

  // Filter for Sundry Debtors (Customers) with Opening Balance included
  const debtorsList = useMemo(() => {
    // Map customer collections and allocations from payments
    const receiptsMap = new Map<number, number>();
    const receiptAllocBySale = new Map<string | number, number>();
    const receiptAllocByCustomer = new Map<number, number>();

    payments.forEach((p: any) => {
      const pId = Number(p.PartyLedgerId);
      if (p.voucher_type === 'RECEIPT' && pId) {
        receiptsMap.set(pId, (receiptsMap.get(pId) || 0) + Number(p.Amount || 0));
      }
      (p.lines || []).forEach((l: any) => {
        (l.allocations || []).forEach((a: any) => {
          const amt = Number(a.AllocatedAmount || 0);
          if (amt > 0) {
            if (a.ReferenceId) {
              receiptAllocBySale.set(Number(a.ReferenceId), (receiptAllocBySale.get(Number(a.ReferenceId)) || 0) + amt);
            }
            if (a.BillReference) {
              const bRef = String(a.BillReference).trim().toUpperCase();
              receiptAllocBySale.set(bRef, (receiptAllocBySale.get(bRef) || 0) + amt);
            }
            if (pId) {
              receiptAllocByCustomer.set(pId, (receiptAllocByCustomer.get(pId) || 0) + amt);
            }
          }
        });
      });
    });

    // Map sales by CustomerLedger ID
    const salesMap = new Map<number, number>();
    const salesPaidMap = new Map<number, number>();
    sales.forEach((s) => {
      if (s.Status !== 'CANCELLED') {
        const cId = Number(s.CustomerLedger);
        if (cId) {
          salesMap.set(cId, (salesMap.get(cId) || 0) + Number(s.GrandTotal || 0));
          salesPaidMap.set(cId, (salesPaidMap.get(cId) || 0) + Number(s.PaidAmount || 0));
        }
      }
    });

    return ledgers
      .filter((l: any) => {
        const gName = (l.group_name || l.GroupName || '').toLowerCase();
        const gid = Number(l.GroupId ?? l.Group ?? 0);
        const lName = (l.LedgerName || '').trim().toLowerCase();

        // Strictly exclude Duties & Taxes, Tax accounts, Cash, and Bank accounts
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

        const isDebtorGroup = gid === 21 || gName.includes('debtor') || gName.includes('customer');
        const hasSales = salesMap.has(l.LedgerId);
        return isDebtorGroup || hasSales;
      })
      .map((l: any) => {
        const openingBal = Number(l.OpeningBalance || 0);
        const openingType = (l.OpeningBalanceType || 'DR').toUpperCase();
        const totalBilled = salesMap.has(l.LedgerId) ? salesMap.get(l.LedgerId)! : Number(l.DebitBalance || 0);

        // Sum payment receipts + payments collected directly on sales (excluding allocations from receipts to prevent double counting)
        const directReceipts = receiptsMap.get(l.LedgerId) || 0;
        const rawSalesPaid = salesPaidMap.get(l.LedgerId) || 0;
        const allocatedFromReceipts = receiptAllocByCustomer.get(l.LedgerId) || 0;
        const netCounterPaid = Math.max(0, rawSalesPaid - allocatedFromReceipts);
        const totalReceived = Math.max(directReceipts + netCounterPaid, Number(l.CreditBalance || 0));

        // Effective opening: DR is positive receivable, CR is customer advance
        const opDebit = openingType === 'DR' ? openingBal : -openingBal;
        const receivable = opDebit + totalBilled - totalReceived;

        return {
          id: l.LedgerId,
          name: l.LedgerName,
          phone: l.PhoneNumber || l.MobileNumber || '—',
          city: l.City || '—',
          address: l.AddressLine1 || l.Address || '—',
          gstin: l.GSTIN || '—',
          groupName: l.group_name || 'Sundry Debtors',
          openingBal,
          openingType,
          totalBilled,
          totalReceived,
          receivable,
          advanceBalance: Number(l.advance_balance || 0),
          creditPeriod: Number(l.CreditPeriodDays) || 15,
          deleteBlockReason: l.delete_block_reason || null,
        };
      })
      .sort((a, b) => b.receivable - a.receivable);
  }, [ledgers, sales, payments]);

  // Filtered Debtors
  const filteredDebtors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return debtorsList;
    return debtorsList.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q)
    );
  }, [debtorsList, searchQuery]);

  // Summary Totals
  const totalOpeningSum = useMemo(() => {
    return debtorsList.reduce((sum, d) => {
      const net = d.openingType === 'DR' ? d.openingBal : -d.openingBal;
      return sum + net;
    }, 0);
  }, [debtorsList]);

  const totalBilledSum = useMemo(() => {
    return debtorsList.reduce((sum, d) => sum + d.totalBilled, 0);
  }, [debtorsList]);

  const totalReceivedSum = useMemo(() => {
    return debtorsList.reduce((sum, d) => sum + d.totalReceived, 0);
  }, [debtorsList]);

  const totalReceivableSum = useMemo(() => {
    return debtorsList.reduce((sum, d) => sum + d.receivable, 0);
  }, [debtorsList]);

  const totalAdvanceSum = useMemo(() => {
    return debtorsList.reduce((sum, d) => sum + (d.advanceBalance || 0), 0);
  }, [debtorsList]);

  const [isPrintingSummary, setIsPrintingSummary] = useState(false);

  const handlePrintReceivablesReport = async () => {
    try {
      setIsPrintingSummary(true);
      const payload = {
        debtors: filteredDebtors.map((d) => ({
          name: d.name,
          phone: d.phone,
          city: d.city,
          openingBal: d.openingBal,
          openingType: d.openingType,
          salesBilled: d.totalBilled,
          collectionsReceived: d.totalReceived,
          netReceivable: d.receivable,
          advanceBalance: d.advanceBalance || 0,
        })),
        summary: {
          totalDebtors: debtorsList.length,
          totalOpeningSum,
          totalBilledSum,
          totalReceivedSum,
          totalReceivableSum,
          totalAdvanceSum,
        },
        search: searchQuery.trim(),
      };

      const res = await apiClient.post('/ledgers/receivables-summary-pdf/', payload, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: any) {
      notifications.show({
        title: 'Error Printing Report',
        message: err?.response?.data?.error || err.message || 'Failed to generate PDF summary.',
        color: 'red',
      });
    } finally {
      setIsPrintingSummary(false);
    }
  };

  const handlePrintStatement = (customerId: number, fromDate?: string, toDate?: string) => {
    let url = `${apiClient.defaults.baseURL}/sales/customer-statement-pdf/?customer_id=${customerId}`;
    if (fromDate) url += `&from_date=${fromDate}`;
    if (toDate) url += `&to_date=${toDate}`;
    window.open(url, '_blank');
  };

  // Detailed ledger statement transactions for the selected customer
  const customerStatementData = useMemo(() => {
    if (!selectedCustomer) return { entries: [], effectiveOpening: 0, totDebit: 0, totCredit: 0, closingBal: 0 };

    const custSales = sales.filter(
      (s: any) => Number(s.CustomerLedger) === selectedCustomer.id && s.Status !== 'CANCELLED'
    );
    const custReceipts = payments.filter((pm: any) => Number(pm.PartyLedgerId) === selectedCustomer.id);

    // Build allocation map for this customer to distinguish counter payments from receipt vouchers
    const receiptAllocBySale = new Map<string | number, number>();
    custReceipts.forEach((r: any) => {
      (r.lines || []).forEach((l: any) => {
        (l.allocations || []).forEach((a: any) => {
          const amt = Number(a.AllocatedAmount || 0);
          if (amt > 0) {
            if (a.ReferenceId) {
              receiptAllocBySale.set(Number(a.ReferenceId), (receiptAllocBySale.get(Number(a.ReferenceId)) || 0) + amt);
            }
            if (a.BillReference) {
              const bRef = String(a.BillReference).trim().toUpperCase();
              receiptAllocBySale.set(bRef, (receiptAllocBySale.get(bRef) || 0) + amt);
            }
          }
        });
      });
    });

    // Initial Ledger Opening Balance
    const initOpBal = selectedCustomer.openingBal;
    const initOpType = selectedCustomer.openingType;
    const initDr = initOpType === 'DR' ? initOpBal : 0;
    const initCr = initOpType === 'CR' ? initOpBal : 0;

    const allTx: any[] = [];

    // Sales (Debit entries - customer owes money)
    custSales.forEach((s: any) => {
      const dt = String(s.SalesDate || '');
      const sId = Number(s.SalesId);
      const sRef = String(s.InvoiceNo || s.SalesNo || '').trim().toUpperCase();
      const creditDays = selectedCustomer.creditPeriod || 15;
      let dueDate = '';
      let isOverdue = false;
      let overdueDays = 0;
      if (dt) {
        const d = new Date(dt);
        d.setDate(d.getDate() + creditDays);
        dueDate = d.toISOString().split('T')[0];
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        isOverdue = overdueDays > 0;
      }

      const rawRef = s.InvoiceNo || s.SalesNo || `INV-${s.SalesId}`;
      const shortRef = formatShortRef(rawRef);
      // Use exact timestamp so morning sales sort before afternoon receipts
      const sCreated = s.CreatedAt ? new Date(s.CreatedAt).toISOString() : `${dt}T00:00:00.000Z`;

      allTx.push({
        date: dt,
        ref: shortRef,
        rawRef: rawRef,
        particulars: s.advance_adjusted && Number(s.advance_adjusted) > 0
          ? `Sales Invoice (Adv Adj: ₹${Number(s.advance_adjusted).toFixed(2)})`
          : 'Sales Invoice',
        debit: Number(s.GrandTotal || 0),
        credit: 0,
        sortKey: `${dt}_1_${sCreated}_${String(s.SalesId).padStart(8, '0')}`,
        dueDate,
        isOverdue,
        overdueDays,
        isSale: true,
      });

      // Amount paid directly on the sale counter (exclude amounts allocated from separate receipt vouchers and advance adjustments)
      const allocatedFromReceipt = (receiptAllocBySale.get(sId) || 0) || (receiptAllocBySale.get(sRef) || 0);
      const adjFromAdvance = Number(s.advance_adjusted || 0);
      const counterPaidOnSale = Math.max(0, Number(s.PaidAmount || 0) - allocatedFromReceipt - adjFromAdvance);

      if (counterPaidOnSale > 0) {
        allTx.push({
          date: dt,
          ref: formatShortRef(`PAY-${rawRef}`),
          rawRef: `PAY-${rawRef}`,
          particulars: 'Payment Received on Sale',
          debit: 0,
          credit: counterPaidOnSale,
          sortKey: `${dt}_2_${sCreated}_${String(s.SalesId).padStart(8, '0')}`,
        });
      }
    });

    // Receipts (Credit entries - customer payment cleared)
    custReceipts.forEach((r: any) => {
      const dt = String(r.payment_date || r.CreatedAt?.split('T')[0] || r.VoucherDate || '');
      const rawRecRef = r.PaymentNo || `REC-${r.PaymentId}`;
      const rCreated = r.CreatedAt ? new Date(r.CreatedAt).toISOString() : `${dt}T23:59:59.000Z`;

      let rParticulars = `Collection Receipt (${r.primary_mode || r.PaymentMode || 'CASH'})`;
      if (r.lines) {
        const advAlloc = r.lines
          .flatMap((l: any) => l.allocations || [])
          .find((a: any) => a.BillReference === 'CUSTOMER ADVANCE' || a.BillType === 'ADVANCE');
        if (advAlloc && Number(advAlloc.AllocatedAmount) > 0) {
          rParticulars = `Collection Receipt (Advance: ₹${Number(advAlloc.AllocatedAmount).toFixed(2)})`;
        }
      }

      allTx.push({
        date: dt,
        ref: formatShortRef(rawRecRef),
        rawRecRef: rawRecRef,
        particulars: rParticulars,
        debit: 0,
        credit: Number(r.Amount || 0),
        sortKey: `${dt}_3_${rCreated}_${String(r.PaymentId).padStart(8, '0')}`,
      });
    });

    allTx.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // Date filtering with rolling opening balance
    let priorDr = initDr;
    let priorCr = initCr;
    const periodEntries: any[] = [];

    allTx.forEach((tx) => {
      if (stmtFromDate && tx.date && tx.date < stmtFromDate) {
        priorDr += tx.debit;
        priorCr += tx.credit;
      } else if (stmtToDate && tx.date && tx.date > stmtToDate) {
        // Skip entries beyond toDate
      } else {
        periodEntries.push(tx);
      }
    });

    const effectiveOpening = priorDr - priorCr;
    const finalTx: any[] = [];

    if (stmtFromDate || initOpBal > 0 || effectiveOpening !== 0) {
      finalTx.push({
        date: stmtFromDate || '—',
        ref: 'OP-BAL',
        particulars: 'Opening Balance (b/f)',
        debit: effectiveOpening > 0 ? effectiveOpening : 0,
        credit: effectiveOpening < 0 ? Math.abs(effectiveOpening) : 0,
        isOpening: true,
      });
    }

    // Apply text search inside statement
    const q = stmtSearch.toLowerCase().trim();
    periodEntries.forEach((tx) => {
      if (!q || tx.ref.toLowerCase().includes(q) || (tx.rawRef && tx.rawRef.toLowerCase().includes(q)) || (tx.rawRecRef && tx.rawRecRef.toLowerCase().includes(q)) || tx.particulars.toLowerCase().includes(q)) {
        finalTx.push(tx);
      }
    });

    // Running balance calculation (Debit increases customer receivable)
    let runBal = 0;
    let totDebit = 0;
    let totCredit = 0;

    finalTx.forEach((tx) => {
      totDebit += tx.debit;
      totCredit += tx.credit;
      runBal += tx.debit - tx.credit;
      tx.runningBalance = runBal;
    });

    return {
      entries: finalTx,
      effectiveOpening,
      totDebit,
      totCredit,
      closingBal: runBal,
    };
  }, [selectedCustomer, sales, payments, stmtFromDate, stmtToDate, stmtSearch]);

  // Full-screen Dedicated Customer Statement View
  if (selectedCustomer) {
    return (
      <Stack gap="lg" style={{ width: '100%' }}>
        {/* Header with Navigation and Quick Actions */}
        <Box pt={4} pb={2}>
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div>
              <Group gap="xs" align="center" mb={6}>
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => setSelectedCustomer(null)}
                  styles={{ root: { paddingLeft: 4, paddingRight: 8 } }}
                >
                  Back to Receivables
                </Button>
                <Divider orientation="vertical" style={{ height: 16 }} />
                <Badge variant="light" color="burgundy" size="xs">
                  Customer Account
                </Badge>
              </Group>
              <Group gap={10} align="center">
                <IconUsers size={24} color="#800020" />
                <Title order={2} style={{ color: '#800020', fontWeight: 700, letterSpacing: '-0.02em', fontSize: 24 }}>
                  {selectedCustomer.name}  - Account Statement &amp; Ledger
                </Title>
              </Group>
              <Text size="xs" c="dimmed" mt={3}>
                Full chronological ledger, opening balance, sales invoices, receipts, and live rolling balance.
              </Text>
            </div>

            <Group gap="xs" align="center" wrap="wrap">
              <Button
                variant="outline"
                color="burgundy"
                size="sm"
                radius="md"
                leftSection={<IconPrinter size={16} />}
                onClick={() => handlePrintStatement(selectedCustomer.id, stmtFromDate, stmtToDate)}
                style={{ fontWeight: 600, borderColor: '#f5c2cb', color: '#800020', backgroundColor: '#ffffff' }}
              >
                Print Statement PDF
              </Button>
              <Button
                color="burgundy"
                radius="md"
                size="sm"
                fw={600}
                leftSection={<IconArrowUpRight size={16} />}
                onClick={() => navigate(`/receipts/new?party_id=${selectedCustomer.id}`)}
                style={{ backgroundColor: '#800020' }}
              >
                Record Receipt
              </Button>
            </Group>
          </Group>
        </Box>

        {/* 5 Summary / KPI Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <Group justify="space-between" align="baseline">
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
                Contact Details
              </Text>
              <Tooltip label="Click to edit cylinder movement deadline" withArrow position="top">
                <Badge
                  variant="light"
                  color="burgundy"
                  size="xs"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setEditingTermDays(selectedCustomer.creditPeriod || 15);
                    setTermModalOpen(true);
                  }}
                >
                  Movement: {selectedCustomer.creditPeriod || 15} Days ✎
                </Badge>
              </Tooltip>
            </Group>
            <Text fw={700} style={{ color: '#0f172a', fontSize: 18, marginTop: 4 }}>
              {selectedCustomer.phone}
            </Text>
            <Text size="xs" c="dimmed">
              {selectedCustomer.city !== '—' ? selectedCustomer.city : 'City not specified'}
            </Text>
          </Paper>

          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Initial Opening Balance
            </Text>
            <Text fw={700} style={{ color: '#475569', fontSize: 18, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
              ₹{selectedCustomer.openingBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <Text component="span" size="xs" fw={700} c="#64748b">
                {selectedCustomer.openingType}
              </Text>
            </Text>
            <Text size="xs" c="dimmed">Ledger Opening Balance</Text>
          </Paper>

          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Period Total Sales
            </Text>
            <Text fw={700} style={{ color: '#0f172a', fontSize: 18, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              ₹{customerStatementData.totDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text size="xs" c="dimmed">Invoiced Bills (Dr)</Text>
          </Paper>

          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#f0fdfa', borderColor: '#99f6e4', boxShadow: '0 1px 3px rgba(13,148,136,0.05)' }}>
            <Text size="xs" fw={700} c="teal.8" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Available Advance
            </Text>
            <Text fw={800} style={{ color: '#0f766e', fontSize: 20, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
              ₹{selectedCustomer.advanceBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text size="xs" c="teal.7" fw={500}>
              Unallocated on Account
            </Text>
          </Paper>

          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#fdf2f4', borderColor: '#f5c2cb', boxShadow: '0 1px 3px rgba(128,0,32,0.05)' }}>
            <Text size="xs" fw={700} c="#800020" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Net Outstanding Balance
            </Text>
            <Text fw={800} style={{ color: '#800020', fontSize: 20, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
              ₹{Math.abs(customerStatementData.closingBal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <Text component="span" size="sm" fw={800} c="#800020">
                {customerStatementData.closingBal >= 0 ? 'Dr' : 'Cr'}
              </Text>
            </Text>
            <Text size="xs" c="#800020" fw={500}>
              {customerStatementData.closingBal >= 0 ? 'Outstanding from Customer' : 'Advance Balance'}
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Statement Table Container with Filter Toolbar */}
        <Paper radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          {/* Filter Toolbar */}
          <Group justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #f1f5f9' }} wrap="wrap" gap="sm">
            <Group gap="sm" align="center" wrap="wrap">
              <DateInputDDMMYY
                label="From Date"
                placeholder="dd/mm/yyyy"
                value={stmtFromDate}
                onChange={(iso) => setStmtFromDate(iso)}
                style={{ width: 145 }}
              />
              <DateInputDDMMYY
                label="To Date"
                placeholder="dd/mm/yyyy"
                value={stmtToDate}
                onChange={(iso) => setStmtToDate(iso)}
                style={{ width: 145 }}
              />
              <TextInput
                placeholder="Search invoice #, ref, particulars..."
                size="sm"
                label="Search Entries"
                value={stmtSearch}
                onChange={(e) => setStmtSearch(e.currentTarget.value)}
                leftSection={<IconSearch size={15} color="#64748b" />}
                rightSection={stmtSearch ? <CloseButton size="xs" onClick={() => setStmtSearch('')} /> : null}
                style={{ width: 230 }}
              />

              {(stmtFromDate || stmtToDate || stmtSearch) && (
                <Button
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => {
                    setStmtFromDate('');
                    setStmtToDate('');
                    setStmtSearch('');
                  }}
                  leftSection={<IconRefresh size={14} />}
                  style={{ alignSelf: 'flex-end', marginBottom: 1 }}
                >
                  Reset Filters
                </Button>
              )}
            </Group>

            <Group gap="xs" align="flex-end">
              <Badge
                variant="light"
                color="burgundy"
                size="md"
                radius="sm"
                styles={{
                  root: {
                    backgroundColor: '#fdf2f4',
                    color: '#800020',
                    fontWeight: 700,
                  },
                }}
              >
                {customerStatementData.entries.length} Ledger Entries
              </Badge>
            </Group>
          </Group>

          {/* Transactions Ledger Table */}
          {customerStatementData.entries.length === 0 ? (
            <Center py={60}>
              <Stack align="center" gap={6}>
                <IconCoins size={36} color="#cbd5e1" stroke={1.5} />
                <Text size="sm" c="#64748b" fw={600}>
                  No transactions found
                </Text>
                <Text size="xs" c="dimmed">
                  No invoices or receipts match the selected date range.
                </Text>
              </Stack>
            </Center>
          ) : (
            <Table.ScrollContainer minWidth={850}>
              <Table verticalSpacing="sm" highlightOnHover style={{ fontSize: 13 }}>
                <Table.Thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <Table.Tr>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', width: 120 }}>
                      Date
                    </Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', width: 170 }}>
                      Ref / Invoice #
                    </Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Particulars
                    </Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 140 }}>
                      Debit (Invoiced ₹)
                    </Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 140 }}>
                      Credit (Received ₹)
                    </Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 160 }}>
                      Running Balance (₹)
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {customerStatementData.entries.map((entry, idx) => (
                    <Table.Tr key={idx} style={{ height: 46 }}>
                      <Table.Td style={{ fontWeight: 500, color: '#475569' }}>
                        {formatDateDDMMYY(entry.date)}
                      </Table.Td>
                      <Table.Td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {entry.ref}
                      </Table.Td>
                      <Table.Td style={{ color: entry.isOpening ? '#800020' : '#334155', fontWeight: entry.isOpening ? 700 : 400 }}>
                        {entry.particulars}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: entry.debit > 0 ? 600 : 400, color: '#0f172a' }}>
                        {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: entry.credit > 0 ? 600 : 400, color: '#0f172a' }}>
                        {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </Table.Td>
                      <Table.Td
                        style={{
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          color: '#800020',
                        }}
                      >
                        ₹{Math.abs(entry.runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        <Text component="span" size="xs" fw={700}>
                          {entry.runningBalance >= 0 ? 'Dr' : 'Cr'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
                <Table.Tfoot style={{ borderTop: '2px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                  <Table.Tr style={{ height: 48 }}>
                    <Table.Td colSpan={3} style={{ fontWeight: 800, color: '#800020', textTransform: 'uppercase', fontSize: 12 }}>
                      Period Totals ({customerStatementData.entries.length} items)
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: 13.5, color: '#0f172a' }}>
                      ₹{customerStatementData.totDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: 13.5, color: '#0f172a' }}>
                      ₹{customerStatementData.totCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 900, color: '#800020', fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>
                      ₹{Math.abs(customerStatementData.closingBal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      <Text component="span" size="xs" fw={800}>
                        {customerStatementData.closingBal >= 0 ? 'Dr' : 'Cr'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tfoot>
              </Table>
            </Table.ScrollContainer>
          )}

          {/* Footer Bar */}
          <Group justify="space-between" align="center" p="md" style={{ borderTop: '1px solid #f1f5f9', backgroundColor: '#fafbfc' }}>
            <Button
              variant="default"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => setSelectedCustomer(null)}
            >
              Back to Receivables
            </Button>
            <Button
              color="burgundy"
              size="sm"
              leftSection={<IconArrowUpRight size={16} />}
              onClick={() => {
                const cId = selectedCustomer.id;
                setSelectedCustomer(null);
                navigate(`/receipts/new?party_id=${cId}`);
              }}
              style={{ backgroundColor: '#800020' }}
            >
              Record Receipt from {selectedCustomer.name}
            </Button>
          </Group>
        </Paper>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* 1. Header with Back Button and Quick Actions */}
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <div>
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
          <Title order={2} style={{ color: '#800020', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Receivables Report (Sundry Debtors)
          </Title>
          <Text size="sm" c="dimmed">
            Detailed breakdown of customer receivables.
          </Text>
        </div>

        <Group gap="xs" align="center" wrap="wrap">
          <Tooltip label="Refresh ledger balances" withArrow position="top">
            <ActionIcon
              variant="default"
              size="lg"
              radius="md"
              loading={isFetching}
              onClick={() => refetchLedgers()}
              style={{ borderColor: '#cbd5e1' }}
            >
              <IconRefresh size={18} color="#475569" />
            </ActionIcon>
          </Tooltip>

          <Button
            variant="outline"
            color="burgundy"
            radius="md"
            size="sm"
            fw={600}
            loading={isPrintingSummary}
            leftSection={<IconPrinter size={16} />}
            onClick={handlePrintReceivablesReport}
            style={{ borderColor: '#800020', color: '#800020' }}
          >
            Print Report
          </Button>

          <Button
            color="burgundy"
            radius="md"
            size="sm"
            fw={600}
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/receipts/new')}
            style={{ backgroundColor: '#800020' }}
          >
            Record Receipt
          </Button>
        </Group>
      </Group>

      {/* 2. Summary KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Card 1: Total Debtors */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Debtors
            </Text>
            <IconUsers size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {debtorsList.length}
          </Text>
          <Text size="xs" c="dimmed">
            Opening Bal: ₹{Math.abs(totalOpeningSum).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {totalOpeningSum >= 0 ? 'Dr' : 'Cr'}
          </Text>
        </Paper>

        {/* Card 2: Total Sales Billed */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Sales
            </Text>
            <IconFileInvoice size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            ₹{totalBilledSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text size="xs" c="dimmed">
            {sales.filter((s: any) => s.Status !== 'CANCELLED').length} delivery &amp; sales bills
          </Text>
        </Paper>

        {/* Card 3: Total Collections Received */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Collections Received
            </Text>
            <IconCash size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            ₹{totalReceivedSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text size="xs" c="dimmed">
            Cleared cash &amp; bank receipts
          </Text>
        </Paper>

        {/* Card 4: Net Balance Receivable */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Net Balance Receivable
            </Text>
            <IconCoins size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#800020', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>
            ₹{Math.abs(totalReceivableSum).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <Text component="span" size="sm" fw={700} c="#800020">
              {totalReceivableSum >= 0 ? 'Dr' : 'Cr'}
            </Text>
          </Text>
          <Text size="xs" c="dimmed">
            Current outstanding from customers
          </Text>
        </Paper>
      </SimpleGrid>

      {/* 3. Debtors Table Container */}
      <Paper radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {/* Table Filter Toolbar */}
        <Group justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #f1f5f9' }} wrap="wrap" gap="sm">
          <TextInput
            placeholder="Search customer name, phone, city..."
            size="sm"
            radius="md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            leftSection={<IconSearch size={15} color="#64748b" />}
            rightSection={searchQuery ? <CloseButton size="xs" onClick={() => setSearchQuery('')} /> : null}
            style={{ minWidth: 260, flexGrow: 1, maxWidth: 380 }}
          />

          <Badge
            variant="light"
            color="burgundy"
            size="md"
            radius="sm"
            styles={{
              root: {
                backgroundColor: '#fdf2f4',
                color: '#800020',
                fontWeight: 700,
              },
            }}
          >
            {filteredDebtors.length} Customers Listed
          </Badge>
        </Group>

        {/* Table */}
        {isLoading ? (
          <Center py={60}>
            <Loader color="burgundy" size="md" />
          </Center>
        ) : filteredDebtors.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap={6}>
              <IconCoins size={36} color="#cbd5e1" stroke={1.5} />
              <Text size="sm" c="#64748b" fw={600}>
                No customers found
              </Text>
              <Text size="xs" c="dimmed">
                No debtor records match your search criteria.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={950}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover style={{ tableLayout: 'auto' }}>
              <Table.Thead style={{ backgroundColor: '#fdf2f4', borderBottom: '1px solid #fce7ec' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Customer Name &amp; Contact
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 150 }}>
                    Opening Bal (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 150 }}>
                    Sales Billed (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 150 }}>
                    Collections (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 160 }}>
                    Receivable Balance (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center', width: 140, paddingRight: 16 }}>
                    Actions
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredDebtors.map((debtor) => (
                  <Table.Tr
                    key={debtor.id}
                    style={{ cursor: 'pointer', height: 48 }}
                    onClick={() => {
                      setSelectedCustomer(debtor);
                      setStmtFromDate('');
                      setStmtToDate('');
                      setStmtSearch('');
                    }}
                  >
                    {/* Customer Name & Contact */}
                    <Table.Td>
                      <Stack gap={2}>
                        <Group gap={6} align="center">
                          <Text size="sm" fw={700} c="#0f172a">
                            {debtor.name}
                          </Text>
                          {debtor.advanceBalance > 0 && (
                            <Badge color='burgundy' size="xs" variant="light">
                              Adv: ₹{debtor.advanceBalance.toFixed(2)}
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {debtor.phone} {debtor.city !== '—' ? `• ${debtor.city}` : ''}
                        </Text>
                      </Stack>
                    </Table.Td>

                    {/* Opening Balance */}
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text style={{ fontSize: 13.5, fontWeight: 600, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{debtor.openingBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        <Text component="span" size="xs" fw={700} c="#800020">
                          {debtor.openingType}
                        </Text>
                      </Text>
                    </Table.Td>

                    {/* Sales Billed */}
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{debtor.totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Table.Td>

                    {/* Collections Received */}
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{debtor.totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Table.Td>

                    {/* Receivable Balance */}
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{Math.abs(debtor.receivable).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      <Text component="span" size="xs" fw={700} c="#800020">
                        {debtor.receivable >= 0 ? 'Dr' : 'Cr'}
                      </Text>
                    </Table.Td>

                    {/* Actions: Print Statement, Delete */}
                    <Table.Td style={{ textAlign: 'center', paddingRight: 16 }}>
                      <Group gap={6} justify="center" wrap="nowrap" onClick={(e) => e.stopPropagation()}>
                        <Tooltip label="Print Statement PDF" withArrow position="top">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="burgundy"
                            onClick={() => handlePrintStatement(debtor.id)}
                          >
                            <IconPrinter size={16} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Delete Customer" withArrow position="top">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            onClick={() => setDeleteTarget(debtor)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>

              {/* Total Footer Row */}
              <Table.Tfoot style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <Table.Tr style={{ height: 48 }}>
                  <Table.Td>
                    <Text fw={800} style={{ color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      TOTAL ({filteredDebtors.length} DEBTORS)
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{Math.abs(totalOpeningSum).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <Text component="span" size="xs" fw={700}>
                      {totalOpeningSum >= 0 ? 'Dr' : 'Cr'}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{filteredDebtors.reduce((s, d) => s + d.totalBilled, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{filteredDebtors.reduce((s, d) => s + d.totalReceived, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 900, fontSize: 15, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{Math.abs(filteredDebtors.reduce((s, d) => s + d.receivable, 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <Text component="span" size="xs" fw={800} c="#800020">
                      {totalReceivableSum >= 0 ? 'Dr' : 'Cr'}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ border: 'none' }}>&nbsp;</Table.Td>
                </Table.Tr>
              </Table.Tfoot>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      {/* ── Delete Customer Confirmation Modal ── */}
      <Modal
        opened={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setForceDelete(false);
        }}
        title={
          <Group gap="xs">
            <IconTrash size={18} color="#dc2626" />
            <Text fw={700} c="#dc2626">
              {deleteTarget?.deleteBlockReason ? 'Customer Linked to Transactions' : 'Delete Customer'}
            </Text>
          </Group>
        }
        size="md"
        radius="md"
      >
        {deleteTarget && (
          <Stack gap="md">
            {deleteTarget.deleteBlockReason ? (
              <>
                <Text size="sm">
                  Customer account <b>{deleteTarget.name}</b> is linked to active transactions and cannot be deleted directly:
                </Text>

                <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5' }}>
                  <Text size="xs" c="red" fw={700}>
                    {deleteTarget.deleteBlockReason}
                  </Text>
                  <Text size="xs" c="#64748b" mt={4}>
                    Deleting an active customer will affect sales records and accounting ledgers.
                  </Text>
                </Paper>

                <Checkbox
                  label="Force delete (cascade and delete linked test invoices & entries)"
                  color="red"
                  checked={forceDelete}
                  onChange={(e) => setForceDelete(e.currentTarget.checked)}
                  styles={{ label: { fontSize: 13, fontWeight: 600, color: '#dc2626' } }}
                />

                <Group justify="space-between" align="center" mt="xs">
                  <Button
                    variant="light"
                    color="gray"
                    size="xs"
                    leftSection={<IconFileInvoice size={14} />}
                    onClick={() => {
                      const name = deleteTarget.name;
                      setDeleteTarget(null);
                      navigate(`/sales?search=${encodeURIComponent(name)}`);
                    }}
                  >
                    View Sales Invoices
                  </Button>

                  <Group gap="xs">
                    <Button
                      variant="default"
                      size="xs"
                      onClick={() => {
                        setDeleteTarget(null);
                        setForceDelete(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      color="red"
                      size="xs"
                      disabled={!forceDelete}
                      loading={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate({ id: deleteTarget.id, force: true })}
                    >
                      Force Delete
                    </Button>
                  </Group>
                </Group>
              </>
            ) : (
              <>
                <Text size="sm">
                  Are you sure you want to delete customer account <b>{deleteTarget.name}</b>?
                </Text>
                <Group justify="flex-end" gap="xs">
                  <Button variant="default" size="xs" onClick={() => setDeleteTarget(null)}>
                    Cancel
                  </Button>
                  <Button
                    color="red"
                    size="xs"
                    loading={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate({ id: deleteTarget.id, force: false })}
                  >
                    Confirm Delete
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        )}
      </Modal>
      {/* ── Cylinder Movement Term Edit Modal ── */}
      <Modal
        opened={termModalOpen}
        onClose={() => setTermModalOpen(false)}
        title={
          <Group gap="xs">
            <IconRefresh size={18} color="#800020" />
            <Text fw={700} style={{ color: '#800020' }}>
              Customer Cylinder Movement Term
            </Text>
          </Group>
        }
        size="sm"
        radius="md"
      >
        <Stack gap="md">
          <Text size="sm" c="#475569">
            Set the cylinder movement deadline (rotation/return cycle) for <b>{selectedCustomer?.name}</b>:
          </Text>
          <NumberInput
            label="Movement Cycle (Days)"
            description="Number of days from billing before cylinders are expected back"
            min={1}
            max={365}
            value={editingTermDays}
            onChange={(val) => setEditingTermDays(Number(val) || 15)}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="sm" onClick={() => setTermModalOpen(false)}>
              Cancel
            </Button>
            <Button color="burgundy" size="sm" onClick={handleSaveMovementTerm}>
              Save Term
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default ReceivablesReportPage;
