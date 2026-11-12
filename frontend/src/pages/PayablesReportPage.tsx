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
} from '@mantine/core';
import {
  IconArrowLeft,
  IconSearch,
  IconWallet,
  IconReceipt,
  IconCreditCard,
  IconBuildingFactory2,
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

// Clean, concise reference formatter e.g. PUR-20261111-0001 -> PUR-0001, PAY-SAL-... -> PAY-0001
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

export const PayablesReportPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [forceDelete, setForceDelete] = useState(false);

  // Statement date range and search filters inside detail view
  const [stmtFromDate, setStmtFromDate] = useState('');
  const [stmtToDate, setStmtToDate] = useState('');
  const [stmtSearch, setStmtSearch] = useState('');

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

  // 2. Fetch Purchases
  const { data: purchases = [], isLoading: isLoadingPurchases } = useQuery<any[]>({
    queryKey: ['purchases'],
    queryFn: async () => {
      const res = await apiClient.get('/purchases/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 3. Fetch Payments
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<any[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  const isLoading = isLoadingLedgers || isLoadingPurchases || isLoadingPayments;

  // Delete Ledger Mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, force }: { id: number; force?: boolean }) => {
      await apiClient.delete(`/ledgers/${id}/${force ? '?force=true' : ''}`);
    },
    onSuccess: () => {
      notifications.show({
        title: 'Supplier Deleted',
        message: 'The supplier account was successfully removed.',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setDeleteTarget(null);
      setForceDelete(false);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Cannot delete this supplier as it is linked to purchase bills or accounting transactions.';
      notifications.show({
        title: 'Cannot Delete Supplier',
        message: msg,
        color: 'red',
      });
      setDeleteTarget(null);
      setForceDelete(false);
    },
  });

  // Filter for Sundry Creditors (Suppliers) with Opening Balance included
  const creditorsList = useMemo(() => {
    // Map purchases by SupplierLedgerId
    const purchaseMap = new Map<number, number>();
    purchases.forEach((p) => {
      const sId = Number(p.SupplierLedgerId);
      if (sId) {
        purchaseMap.set(sId, (purchaseMap.get(sId) || 0) + Number(p.GrandTotal || 0));
      }
    });

    // Map payments by PartyLedgerId
    const paymentMap = new Map<number, number>();
    payments.forEach((p) => {
      if (p.voucher_type === 'PAYMENT' || !p.voucher_type) {
        const pId = Number(p.PartyLedgerId);
        if (pId) {
          paymentMap.set(pId, (paymentMap.get(pId) || 0) + Number(p.Amount || 0));
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

        const isCreditorGroup = gid === 24 || gName.includes('creditor') || gName.includes('supplier');
        const hasPurchases = purchaseMap.has(l.LedgerId);
        return isCreditorGroup || hasPurchases;
      })
      .map((l: any) => {
        const openingBal = Number(l.OpeningBalance || 0);
        const openingType = (l.OpeningBalanceType || 'CR').toUpperCase();
        const totalBilled = purchaseMap.has(l.LedgerId) ? purchaseMap.get(l.LedgerId)! : Number(l.CreditBalance || 0);
        const totalPaid = Math.max(paymentMap.get(l.LedgerId) || 0, Number(l.DebitBalance || 0));

        // Effective opening balance: CR is positive liability, DR is advance deduction
        const opCredit = openingType === 'CR' ? openingBal : -openingBal;
        const payable = opCredit + totalBilled - totalPaid;

        return {
          id: l.LedgerId,
          name: l.LedgerName,
          phone: l.PhoneNumber || l.MobileNumber || '—',
          city: l.City || '—',
          address: l.AddressLine1 || l.Address || '—',
          gstin: l.GSTIN || '—',
          groupName: l.group_name || 'Sundry Creditors',
          openingBal,
          openingType,
          totalBilled,
          totalPaid,
          payable,
          deleteBlockReason: l.delete_block_reason || null,
        };
      })
      .sort((a, b) => b.payable - a.payable);
  }, [ledgers, purchases, payments]);

  // Filtered Creditors
  const filteredCreditors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return creditorsList;
    return creditorsList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
    );
  }, [creditorsList, searchQuery]);

  // Summary Totals
  const totalOpeningSum = useMemo(() => {
    return creditorsList.reduce((sum, c) => {
      const net = c.openingType === 'CR' ? c.openingBal : -c.openingBal;
      return sum + net;
    }, 0);
  }, [creditorsList]);

  const totalBilledSum = useMemo(() => {
    return creditorsList.reduce((sum, c) => sum + c.totalBilled, 0);
  }, [creditorsList]);

  const totalPaidSum = useMemo(() => {
    return creditorsList.reduce((sum, c) => sum + c.totalPaid, 0);
  }, [creditorsList]);

  const totalPayableSum = useMemo(() => {
    return creditorsList.reduce((sum, c) => sum + c.payable, 0);
  }, [creditorsList]);

  const handlePrintStatement = (supplierId: number, fromDate?: string, toDate?: string) => {
    let url = `${apiClient.defaults.baseURL}/purchases/supplier-statement-pdf/?supplier_id=${supplierId}`;
    if (fromDate) url += `&from_date=${fromDate}`;
    if (toDate) url += `&to_date=${toDate}`;
    window.open(url, '_blank');
  };

  const [isPrintingSummary, setIsPrintingSummary] = useState(false);

  const handlePrintPayablesReport = async () => {
    try {
      setIsPrintingSummary(true);
      const payload = {
        creditors: filteredCreditors.map((c) => ({
          name: c.name,
          phone: c.phone,
          city: c.city,
          openingBal: c.openingBal,
          openingType: c.openingType,
          purchasesBilled: c.totalBilled,
          paymentsPaid: c.totalPaid,
          payableBalance: c.payable,
        })),
        summary: {
          totalCreditors: creditorsList.length,
          totalOpeningSum,
          totalPurchasesSum: totalBilledSum,
          totalPaidSum,
          totalPayableSum,
        },
        search: searchQuery.trim(),
      };

      const res = await apiClient.post('/ledgers/payables-summary-pdf/', payload, {
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

  // Detailed ledger statement transactions for the selected supplier
  const supplierStatementData = useMemo(() => {
    if (!selectedSupplier) return { entries: [], effectiveOpening: 0, totDebit: 0, totCredit: 0, closingBal: 0 };

    const suppPurchases = purchases.filter((p: any) => Number(p.SupplierLedgerId) === selectedSupplier.id);
    const suppPayments = payments.filter(
      (pm: any) => Number(pm.PartyLedgerId) === selectedSupplier.id && (pm.voucher_type === 'PAYMENT' || !pm.voucher_type)
    );

    // Initial Ledger Opening Balance
    const initOpBal = selectedSupplier.openingBal;
    const initOpType = selectedSupplier.openingType;
    const initCr = initOpType === 'CR' ? initOpBal : 0;
    const initDr = initOpType === 'DR' ? initOpBal : 0;

    const allTx: any[] = [];

    // Purchases (Credit entries)
    suppPurchases.forEach((p: any) => {
      const dt = String(p.PurchaseDate || p.CreatedAt?.split('T')[0] || '');
      const rawRef = p.InvoiceNo || p.PurchaseNo || `PUR-${p.PurchaseId}`;
      allTx.push({
        date: dt,
        ref: formatShortRef(rawRef),
        rawRef: rawRef,
        particulars: `Purchase Bill (#${formatShortRef(p.InvoiceNo || p.PurchaseNo)})`,
        debit: 0,
        credit: Number(p.GrandTotal || 0),
        sortKey: `${dt}_1_${p.PurchaseId}`,
      });
    });

    // Payments (Debit entries)
    suppPayments.forEach((pm: any) => {
      const dt = String(pm.payment_date || pm.CreatedAt?.split('T')[0] || pm.VoucherDate || '');
      const rawPayRef = pm.PaymentNo || `PAY-${pm.PaymentId}`;
      allTx.push({
        date: dt,
        ref: formatShortRef(rawPayRef),
        rawPayRef: rawPayRef,
        particulars: `Payment Disbursed (${pm.PaymentMode || 'CASH'})`,
        debit: Number(pm.Amount || 0),
        credit: 0,
        sortKey: `${dt}_2_${pm.PaymentId}`,
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

    const effectiveOpening = priorCr - priorDr;
    const finalTx: any[] = [];

    if (stmtFromDate || initOpBal > 0 || effectiveOpening !== 0) {
      finalTx.push({
        date: stmtFromDate || '—',
        ref: 'OP-BAL',
        particulars: 'Opening Balance (b/f)',
        debit: effectiveOpening < 0 ? Math.abs(effectiveOpening) : 0,
        credit: effectiveOpening > 0 ? effectiveOpening : 0,
        isOpening: true,
      });
    }

    // Apply text search inside statement
    const q = stmtSearch.toLowerCase().trim();
    periodEntries.forEach((tx) => {
      if (!q || tx.ref.toLowerCase().includes(q) || (tx.rawRef && tx.rawRef.toLowerCase().includes(q)) || (tx.rawPayRef && tx.rawPayRef.toLowerCase().includes(q)) || tx.particulars.toLowerCase().includes(q)) {
        finalTx.push(tx);
      }
    });

    // Running balance calculation (Credit increases payable liability)
    let runBal = 0;
    let totDebit = 0;
    let totCredit = 0;

    finalTx.forEach((tx) => {
      totDebit += tx.debit;
      totCredit += tx.credit;
      runBal += tx.credit - tx.debit;
      tx.runningBalance = runBal;
    });

    return {
      entries: finalTx,
      effectiveOpening,
      totDebit,
      totCredit,
      closingBal: runBal,
    };
  }, [selectedSupplier, purchases, payments, stmtFromDate, stmtToDate, stmtSearch]);

  // Full-screen Dedicated Supplier Statement View
  if (selectedSupplier) {
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
                  onClick={() => setSelectedSupplier(null)}
                  styles={{ root: { paddingLeft: 4, paddingRight: 8 } }}
                >
                  Back to Payables
                </Button>
                <Divider orientation="vertical" style={{ height: 16 }} />
                <Badge variant="light" color="burgundy" size="xs">
                  Supplier Account
                </Badge>
              </Group>
              <Group gap={10} align="center">
                <IconBuildingFactory2 size={24} color="#800020" />
                <Title order={2} style={{ color: '#800020', fontWeight: 700, letterSpacing: '-0.02em', fontSize: 24 }}>
                  {selectedSupplier.name} - Account Statement &amp; Ledger
                </Title>
              </Group>
              <Text size="xs" c="dimmed" mt={3}>
                Full chronological ledger, opening balance, purchase bills, disbursements, and rolling liability.
              </Text>
            </div>

            <Group gap="xs" align="center" wrap="wrap">
              <Button
                variant="outline"
                color="burgundy"
                size="sm"
                radius="md"
                leftSection={<IconPrinter size={16} />}
                onClick={() => handlePrintStatement(selectedSupplier.id, stmtFromDate, stmtToDate)}
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
                onClick={() => navigate(`/payments/new?party_id=${selectedSupplier.id}`)}
                style={{ backgroundColor: '#800020' }}
              >
                Record Payment
              </Button>
            </Group>
          </Group>
        </Box>

        {/* 4 Summary / KPI Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Contact Details
            </Text>
            <Text fw={700} style={{ color: '#0f172a', fontSize: 18, marginTop: 4 }}>
              {selectedSupplier.phone}
            </Text>
            <Text size="xs" c="dimmed">
              {selectedSupplier.city !== '—' ? selectedSupplier.city : 'City not specified'}
            </Text>
          </Paper>

          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Initial Opening Balance
            </Text>
            <Text fw={700} style={{ color: '#475569', fontSize: 18, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
              ₹{selectedSupplier.openingBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <Text component="span" size="xs" fw={700} c="#64748b">
                {selectedSupplier.openingType}
              </Text>
            </Text>
            <Text size="xs" c="dimmed">Ledger Opening Balance</Text>
          </Paper>

          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Period Total Purchases
            </Text>
            <Text fw={700} style={{ color: '#0f172a', fontSize: 18, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              ₹{supplierStatementData.totCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text size="xs" c="dimmed">Bills Payable (Cr)</Text>
          </Paper>

          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#fdf2f4', borderColor: '#f5c2cb', boxShadow: '0 1px 3px rgba(128,0,32,0.05)' }}>
            <Text size="xs" fw={700} c="#800020" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Net Outstanding Balance
            </Text>
            <Text fw={800} style={{ color: '#800020', fontSize: 20, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
              ₹{Math.abs(supplierStatementData.closingBal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <Text component="span" size="sm" fw={800} c="#800020">
                {supplierStatementData.closingBal >= 0 ? 'Cr' : 'Dr'}
              </Text>
            </Text>
            <Text size="xs" c="#800020" fw={500}>
              {supplierStatementData.closingBal >= 0 ? 'Liability Due to Supplier' : 'Advance Paid'}
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
                placeholder="Search bill #, ref, particulars..."
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
                {supplierStatementData.entries.length} Ledger Entries
              </Badge>
            </Group>
          </Group>

          {/* Transactions Ledger Table */}
          {supplierStatementData.entries.length === 0 ? (
            <Center py={60}>
              <Stack align="center" gap={6}>
                <IconWallet size={36} color="#cbd5e1" stroke={1.5} />
                <Text size="sm" c="#64748b" fw={600}>
                  No transactions found
                </Text>
                <Text size="xs" c="dimmed">
                  No bills or payments match the selected date range.
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
                      Ref / Bill #
                    </Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Particulars
                    </Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 140 }}>
                      Debit (Paid ₹)
                    </Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 140 }}>
                      Credit (Billed ₹)
                    </Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 160 }}>
                      Running Balance (₹)
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {supplierStatementData.entries.map((entry, idx) => (
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
                          {entry.runningBalance >= 0 ? 'Cr' : 'Dr'}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
                <Table.Tfoot style={{ borderTop: '2px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                  <Table.Tr style={{ height: 48 }}>
                    <Table.Td colSpan={3} style={{ fontWeight: 800, color: '#800020', textTransform: 'uppercase', fontSize: 12 }}>
                      Period Totals ({supplierStatementData.entries.length} items)
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: 13.5, color: '#0f172a' }}>
                      ₹{supplierStatementData.totDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: 13.5, color: '#0f172a' }}>
                      ₹{supplierStatementData.totCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 900, color: '#800020', fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>
                      ₹{Math.abs(supplierStatementData.closingBal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      <Text component="span" size="xs" fw={800}>
                        {supplierStatementData.closingBal >= 0 ? 'Cr' : 'Dr'}
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
              onClick={() => setSelectedSupplier(null)}
            >
              Back to Payables
            </Button>
            <Button
              color="burgundy"
              size="sm"
              leftSection={<IconArrowUpRight size={16} />}
              onClick={() => {
                const sId = selectedSupplier.id;
                setSelectedSupplier(null);
                navigate(`/payments/new?party_id=${sId}`);
              }}
              style={{ backgroundColor: '#800020' }}
            >
              Record Payment to {selectedSupplier.name}
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
            Payables Report (Sundry Creditors)
          </Title>
          <Text size="sm" c="dimmed">
            Detailed breakdown of supplier liability, opening balance, purchase bills, payments settled, and outstanding balances.
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
            onClick={handlePrintPayablesReport}
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
            onClick={() => navigate('/payments/new')}
            style={{ backgroundColor: '#800020' }}
          >
            Record Payment
          </Button>
        </Group>
      </Group>

      {/* 2. Summary KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Card 1: Total Suppliers */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Creditors
            </Text>
            <IconBuildingFactory2 size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {creditorsList.length}
          </Text>
          <Text size="xs" c="dimmed">
            Opening Bal: ₹{Math.abs(totalOpeningSum).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {totalOpeningSum >= 0 ? 'Cr' : 'Dr'}
          </Text>
        </Paper>

        {/* Card 2: Total Invoices Billed */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Purchases
            </Text>
            <IconReceipt size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            ₹{totalBilledSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text size="xs" c="dimmed">
            {purchases.length} purchase invoice{purchases.length !== 1 ? 's' : ''} recorded
          </Text>
        </Paper>

        {/* Card 3: Total Payments Settled */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Payments Settled
            </Text>
            <IconCreditCard size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            ₹{totalPaidSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text size="xs" c="dimmed">
            Disbursed to suppliers
          </Text>
        </Paper>

        {/* Card 4: Net Balance Payable */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Net Balance Payable
            </Text>
            <IconWallet size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#800020', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>
            ₹{Math.abs(totalPayableSum).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <Text component="span" size="sm" fw={700} c="#800020">
              {totalPayableSum >= 0 ? 'Cr' : 'Dr'}
            </Text>
          </Text>
          <Text size="xs" c="dimmed">
            Current outstanding liability
          </Text>
        </Paper>
      </SimpleGrid>

      {/* 3. Creditors Table Container */}
      <Paper radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {/* Table Filter Toolbar */}
        <Group justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #f1f5f9' }} wrap="wrap" gap="sm">
          <TextInput
            placeholder="Search supplier name, phone, city..."
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
            {filteredCreditors.length} Suppliers Listed
          </Badge>
        </Group>

        {/* Table */}
        {isLoading ? (
          <Center py={60}>
            <Loader color="burgundy" size="md" />
          </Center>
        ) : filteredCreditors.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap={6}>
              <IconWallet size={36} color="#cbd5e1" stroke={1.5} />
              <Text size="sm" c="#64748b" fw={600}>
                No suppliers found
              </Text>
              <Text size="xs" c="dimmed">
                No creditor records match your search criteria.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={950}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover style={{ tableLayout: 'auto' }}>
              <Table.Thead style={{ backgroundColor: '#fdf2f4', borderBottom: '1px solid #fce7ec' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Supplier Name &amp; Contact
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 150 }}>
                    Opening Bal (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 150 }}>
                    Purchases Billed (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 150 }}>
                    Payments Paid (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 160 }}>
                    Payable Balance (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center', width: 140, paddingRight: 16 }}>
                    Actions
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredCreditors.map((creditor) => (
                  <Table.Tr
                    key={creditor.id}
                    style={{ cursor: 'pointer', height: 48 }}
                    onClick={() => {
                      setSelectedSupplier(creditor);
                      setStmtFromDate('');
                      setStmtToDate('');
                      setStmtSearch('');
                    }}
                  >
                    {/* Supplier Name & Contact */}
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm" fw={700} c="#0f172a">
                          {creditor.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {creditor.phone} {creditor.city !== '—' ? `• ${creditor.city}` : ''}
                        </Text>
                      </Stack>
                    </Table.Td>

                    {/* Opening Balance */}
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text style={{ fontSize: 13.5, fontWeight: 600, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{creditor.openingBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        <Text component="span" size="xs" fw={700} c="#800020">
                          {creditor.openingType}
                        </Text>
                      </Text>
                    </Table.Td>

                    {/* Purchases Billed */}
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{creditor.totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Table.Td>

                    {/* Payments Paid */}
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{creditor.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Table.Td>

                    {/* Payable Balance */}
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{Math.abs(creditor.payable).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      <Text component="span" size="xs" fw={700} c="#800020">
                        {creditor.payable >= 0 ? 'Cr' : 'Dr'}
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
                            onClick={() => handlePrintStatement(creditor.id)}
                          >
                            <IconPrinter size={16} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Delete Supplier" withArrow position="top">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            onClick={() => setDeleteTarget(creditor)}
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
                      TOTAL ({filteredCreditors.length} CREDITORS)
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{Math.abs(totalOpeningSum).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <Text component="span" size="xs" fw={700}>
                      {totalOpeningSum >= 0 ? 'Cr' : 'Dr'}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{filteredCreditors.reduce((s, c) => s + c.totalBilled, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{filteredCreditors.reduce((s, c) => s + c.totalPaid, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 900, fontSize: 15, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{Math.abs(filteredCreditors.reduce((s, c) => s + c.payable, 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <Text component="span" size="xs" fw={800} c="#800020">
                      {totalPayableSum >= 0 ? 'Cr' : 'Dr'}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ border: 'none' }}>&nbsp;</Table.Td>
                </Table.Tr>
              </Table.Tfoot>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      {/* ── Delete Supplier Confirmation Modal ── */}
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
              {deleteTarget?.deleteBlockReason ? 'Supplier Linked to Transactions' : 'Delete Supplier'}
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
                  Supplier account <b>{deleteTarget.name}</b> is linked to active transactions and cannot be deleted directly:
                </Text>

                <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5' }}>
                  <Text size="xs" c="red" fw={700}>
                    {deleteTarget.deleteBlockReason}
                  </Text>
                  <Text size="xs" c="#64748b" mt={4}>
                    Deleting an active supplier will affect purchase history and accounting ledgers.
                  </Text>
                </Paper>

                <Checkbox
                  label="Force delete (cascade and delete linked test purchase bills & entries)"
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
                    leftSection={<IconReceipt size={14} />}
                    onClick={() => {
                      const name = deleteTarget.name;
                      setDeleteTarget(null);
                      navigate(`/purchases?search=${encodeURIComponent(name)}`);
                    }}
                  >
                    View Purchase Bills
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
                  Are you sure you want to delete supplier account <b>{deleteTarget.name}</b>?
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
    </Stack>
  );
};

export default PayablesReportPage;
