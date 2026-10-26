import React, { useState, useEffect, useMemo } from 'react';
import {
  Title,
  Paper,
  TextInput,
  NumberInput,
  Select,
  Button,
  Group,
  Stack,
  Table,
  Loader,
  Center,
  Text,
  ActionIcon,
  Divider,
  Box,
  Badge,
  Modal,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconReceipt,
  IconCheck,
  IconBuildingBank,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';

interface LedgerOption {
  LedgerId: number;
  LedgerName: string;
  GroupId: number;
  group_name?: string;
  Nature?: string;
  GSTIN?: string;
  PhoneNumber?: string;
  MobileNumber?: string;
  City?: string;
  CurrentBalance?: number | string;
  BalanceType?: 'Dr' | 'Cr';
}

interface PendingBill {
  PurchaseId: number;
  BillReference: string;
  BillDate: string;
  BillAmount?: number;
  PaidAmount?: number;
  PendingAmount?: number;
  GrandTotal?: number;
  AllocatedSoFar?: number;
  PendingBalance?: number;
}

interface BillAllocationItem {
  PurchaseId: number;
  BillReference: string;
  BillDate: string;
  GrandTotal: number;
  AllocatedSoFar: number;
  PendingBalance: number;
  AllocatedAmount: number;
}

interface PaymentParticularRow {
  id: string;
  ledgerId: string | null;
  amount: number | '';
  allocations: BillAllocationItem[];
}

const emptyRow = (): PaymentParticularRow => ({
  id: Math.random().toString(36).substring(2, 9),
  ledgerId: null,
  amount: '',
  allocations: [],
});

export const PaymentFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  // Top Voucher Header State
  const [paymentNo, setPaymentNo] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankOrCashLedgerId, setBankOrCashLedgerId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Main Table: Particulars (Debit Rows)
  const [rows, setRows] = useState<PaymentParticularRow[]>([emptyRow()]);

  // Modal State for Bill-Wise Allocation
  const [allocationModalOpened, setAllocationModalOpened] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [modalAllocations, setModalAllocations] = useState<BillAllocationItem[]>([]);
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  // 1. Fetch All Ledgers
  const { data: ledgers = [] } = useQuery<LedgerOption[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // Filter ONLY Cash & Bank Accounts for the top "Account" dropdown
  const bankAndCashLedgers = useMemo(() => {
    return ledgers.filter((l) => {
      const g = (l.group_name || '').toLowerCase();
      const n = (l.Nature || '').toLowerCase();
      return (
        g.includes('bank') ||
        g.includes('cash') ||
        l.GroupId === 16 || // Cash-in-hand
        l.GroupId === 17 || // Bank Accounts
        (n === 'asset' && (g.includes('cash') || g.includes('bank')))
      );
    });
  }, [ledgers]);

  const bankAndCashOptions = useMemo(() => {
    return bankAndCashLedgers.map((l) => ({
      value: String(l.LedgerId),
      label: `${l.LedgerName} (${l.group_name || 'Account'})`,
    }));
  }, [bankAndCashLedgers]);


  // Selected Bank/Cash ledger object
  const selectedAccountLedger = useMemo(() => {
    return bankAndCashLedgers.find((l) => String(l.LedgerId) === bankOrCashLedgerId) || null;
  }, [bankOrCashLedgerId, bankAndCashLedgers]);

  // Determine payment mode automatically based on selected account
  const autoPaymentMode = useMemo(() => {
    if (!selectedAccountLedger) return 'Bank';
    const g = (selectedAccountLedger.group_name || '').toLowerCase();
    if (g.includes('cash') || selectedAccountLedger.GroupId === 16) return 'Cash';
    return 'Bank';
  }, [selectedAccountLedger]);

  // All Ledgers options for the Particulars rows in the table
  const allLedgerOptions = useMemo(() => {
    return ledgers.map((l) => ({
      value: String(l.LedgerId),
      label: `${l.LedgerName} (${l.group_name || 'Ledger'})`,
    }));
  }, [ledgers]);

  // Fetch payments list to auto-calculate next voucher number (e.g. 001, 002)
  const { data: paymentsList = [] } = useQuery<any[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
    enabled: !isEditing,
  });

  useEffect(() => {
    if (!isEditing && !paymentNo && paymentsList.length >= 0) {
      let maxNum = 0;
      paymentsList.forEach((p: any) => {
        const num = Number(p.PaymentId || 0);
        if (num > maxNum) maxNum = num;
      });
      const nextNum = maxNum + 1;
      setPaymentNo(String(nextNum).padStart(3, '0'));
    }
  }, [isEditing, paymentsList, paymentNo]);

  // Fetch existing payment when editing
  useEffect(() => {
    if (isEditing && id) {
      setIsLoadingExisting(true);
      apiClient
        .get(`/payments/${id}/`)
        .then((res) => {
          const p = res.data;
          setPaymentNo(String(p.PaymentId).padStart(3, '0'));
          if (p.payment_date) {
            setPaymentDate(p.payment_date);
          } else if (p.CreatedAt) {
            setPaymentDate(p.CreatedAt.split('T')[0]);
          }
          if (p.Narration) setNotes(p.Narration);

          const firstLine = p.lines && p.lines.length > 0 ? p.lines[0] : null;
          if (firstLine?.Ledger) {
            setBankOrCashLedgerId(String(firstLine.Ledger));
          }

          const lineAllocations: BillAllocationItem[] = (firstLine?.allocations || []).map((a: any) => ({
            PurchaseId: a.PurchaseId || 0,
            BillReference: a.BillReference,
            BillDate: a.BillDate || '',
            GrandTotal: Number(a.GrandTotal || a.AllocatedAmount || 0),
            AllocatedSoFar: 0,
            PendingBalance: Number(a.AllocatedAmount || 0),
            AllocatedAmount: Number(a.AllocatedAmount || 0),
          }));

          setRows([
            {
              id: Math.random().toString(36).substring(2, 9),
              ledgerId: p.PartyLedgerId ? String(p.PartyLedgerId) : null,
              amount: Number(p.Amount || 0),
              allocations: lineAllocations,
            },
          ]);
        })
        .catch(() => {
          notifications.show({
            title: 'Error',
            message: 'Failed to load payment details.',
            color: 'red',
          });
          navigate('/payments');
        })
        .finally(() => {
          setIsLoadingExisting(false);
        });
    }
  }, [isEditing, id, navigate]);

  // Table Row Handlers
  const addRow = () => {
    setRows((prev) => [...prev, emptyRow()]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) {
      setRows([emptyRow()]);
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRowLedger = (index: number, ledgerId: string | null) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        ledgerId,
        allocations: [], // reset allocations when party changes
      };
      return updated;
    });
  };

  const updateRowAmount = (index: number, amount: number | '') => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        amount,
      };
      return updated;
    });
  };

  // Open Allocation Modal for a specific row
  const handleOpenAllocationModal = async (index: number) => {
    const row = rows[index];
    if (!row.ledgerId) {
      notifications.show({
        title: 'Select Ledger',
        message: 'Please select a Particular / Ledger first.',
        color: 'red',
      });
      return;
    }

    setActiveRowIndex(index);
    setAllocationModalOpened(true);
    setIsLoadingBills(true);

    try {
      const url = `/payments/pending-bills/?party_id=${row.ledgerId}${id ? `&exclude_payment_id=${id}` : ''}`;
      const res = await apiClient.get(url);
      const pendingBills: PendingBill[] = res.data || [];

      // Existing allocations on this row
      const existingAllocMap = new Map<string, number>();
      row.allocations.forEach((a) => {
        existingAllocMap.set(a.BillReference, a.AllocatedAmount);
      });

      const mapped: BillAllocationItem[] = pendingBills.map((b) => {
        const grandTotal = Number(b.BillAmount ?? b.GrandTotal ?? 0);
        const allocatedSoFar = Number(b.PaidAmount ?? b.AllocatedSoFar ?? 0);
        const pendingBalance = Number(b.PendingAmount ?? b.PendingBalance ?? 0);
        const currentAlloc = existingAllocMap.get(b.BillReference) || 0;

        return {
          PurchaseId: b.PurchaseId,
          BillReference: b.BillReference,
          BillDate: b.BillDate,
          GrandTotal: grandTotal,
          AllocatedSoFar: allocatedSoFar,
          PendingBalance: pendingBalance,
          AllocatedAmount: currentAlloc,
        };
      });

      // Ensure all previously allocated bills are preserved in mapped
      row.allocations.forEach((a) => {
        if (!mapped.some((m) => m.BillReference === a.BillReference)) {
          mapped.push({ ...a });
        }
      });

      setModalAllocations(mapped);
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to load pending bills for this party.',
        color: 'red',
      });
      setModalAllocations([]);
    } finally {
      setIsLoadingBills(false);
    }
  };

  // Modal Allocation Field Changes — Strictly capped at row amount if entered
  const handleModalAllocChange = (idx: number, val: number | string | undefined) => {
    const rowAmount = activeRowIndex !== null ? Number(rows[activeRowIndex].amount) || 0 : 0;
    const num = Math.max(0, Number(val) || 0);

    setModalAllocations((prev) => {
      const otherAllocSum = prev.reduce((sum, r, i) => (i !== idx ? sum + r.AllocatedAmount : sum), 0);
      const maxPending = prev[idx].PendingBalance;

      // If user entered a specific row amount, cannot allocate more than remaining of that amount
      const maxAllowed = rowAmount > 0 ? Math.min(maxPending, Math.max(0, rowAmount - otherAllocSum)) : maxPending;

      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        AllocatedAmount: Math.min(num, maxAllowed),
      };
      return updated;
    });
  };

  // Pay Full — Capped by available row amount if specified
  const handleModalPayFull = (idx: number) => {
    const rowAmount = activeRowIndex !== null ? Number(rows[activeRowIndex].amount) || 0 : 0;

    setModalAllocations((prev) => {
      const otherAllocSum = prev.reduce((sum, r, i) => (i !== idx ? sum + r.AllocatedAmount : sum), 0);
      const maxPending = prev[idx].PendingBalance;

      // Cannot allocate more than available rowAmount
      const available = rowAmount > 0 ? Math.max(0, rowAmount - otherAllocSum) : maxPending;
      const allocToSet = Math.min(maxPending, available);

      if (rowAmount > 0 && available <= 0) {
        notifications.show({
          title: 'Amount Limit Reached',
          message: `Cannot allocate more than the entered voucher amount of ₹${rowAmount.toLocaleString('en-IN')}.`,
          color: 'orange',
        });
        return prev;
      }

      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        AllocatedAmount: allocToSet,
      };
      return updated;
    });
  };

  const handleModalClear = (idx: number) => {
    setModalAllocations((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        AllocatedAmount: 0,
      };
      return updated;
    });
  };


  // Save Modal Allocations back into active row
  const handleApplyModalAllocations = () => {
    if (activeRowIndex === null) return;
    const rowAmount = Number(rows[activeRowIndex].amount) || 0;
    const validAllocations = modalAllocations.filter((a) => a.AllocatedAmount > 0);
    const sumAllocated = validAllocations.reduce((acc, a) => acc + a.AllocatedAmount, 0);

    if (rowAmount > 0 && sumAllocated > rowAmount) {
      notifications.show({
        title: 'Amount Exceeded',
        message: `Allocated amount (₹${sumAllocated.toLocaleString()}) cannot exceed the entered line amount (₹${rowAmount.toLocaleString()}).`,
        color: 'red',
      });
      return;
    }

    setRows((prev) => {
      const updated = [...prev];
      const currentRow = updated[activeRowIndex];
      updated[activeRowIndex] = {
        ...currentRow,
        allocations: validAllocations,
        amount: currentRow.amount === '' || currentRow.amount === 0 ? sumAllocated : currentRow.amount,
      };
      return updated;
    });

    setAllocationModalOpened(false);
    setActiveRowIndex(null);
  };

  // Active ledger being edited in modal
  const activeModalLedger = useMemo(() => {
    if (activeRowIndex === null) return null;
    const lid = rows[activeRowIndex]?.ledgerId;
    return ledgers.find((l) => String(l.LedgerId) === lid) || null;
  }, [activeRowIndex, rows, ledgers]);

  // Modal totals
  const modalTotals = useMemo(() => {
    const totalPending = modalAllocations.reduce((sum, r) => sum + r.PendingBalance, 0);
    const totalAllocated = modalAllocations.reduce((sum, r) => sum + r.AllocatedAmount, 0);
    const rowAmt = activeRowIndex !== null ? Number(rows[activeRowIndex].amount) || 0 : 0;
    const remaining = Math.max(0, rowAmt - totalAllocated);

    return { totalPending, totalAllocated, rowAmt, remaining };
  }, [modalAllocations, activeRowIndex, rows]);

  // Grand Totals across all table rows
  const voucherTotals = useMemo(() => {
    const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalAllocated = rows.reduce((sum, r) => {
      const rAlloc = r.allocations.reduce((aSum, a) => aSum + a.AllocatedAmount, 0);
      return sum + rAlloc;
    }, 0);

    return {
      totalAmount,
      totalAllocated,
      onAccount: Math.max(0, totalAmount - totalAllocated),
    };
  }, [rows]);

  // Save / Post Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!bankOrCashLedgerId) {
        throw new Error('Please select an Account (Cash / Bank) in the header.');
      }

      const validRows = rows.filter((r) => Boolean(r.ledgerId) && Number(r.amount) > 0);
      if (validRows.length === 0) {
        throw new Error('Please add at least one Particular row with a Ledger and Amount.');
      }

      // Collect all allocations across all rows
      const allAllocations = validRows.flatMap((r) =>
        r.allocations.map((a) => ({
          BillType: 'PURCHASE',
          BillReference: a.BillReference,
          BillDate: a.BillDate,
          AllocationType: 'Against Reference',
          AllocatedAmount: a.AllocatedAmount,
        }))
      );

      // Primary party ledger (first row's ledger)
      const primaryPartyId = Number(validRows[0].ledgerId);

      const payload = {
        PartyLedgerId: primaryPartyId,
        Amount: voucherTotals.totalAmount,
        Narration: notes.trim() || '',
        PaymentLedgerId: Number(bankOrCashLedgerId),
        PaymentMode: autoPaymentMode,
        lines: [
          {
            LineNo: 1,
            PaymentMode: autoPaymentMode,
            LedgerId: Number(bankOrCashLedgerId),
            Amount: voucherTotals.totalAmount,
            Narration: notes.trim() || '',
            allocations: allAllocations,
          },
        ],
        allocations: allAllocations,
      };

      if (isEditing && id) {
        const res = await apiClient.put(`/payments/${id}/`, payload);
        return res.data;
      } else {
        const res = await apiClient.post('/payments/', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      notifications.show({
        title: isEditing ? 'Payment Updated' : 'Payment Saved',
        message: isEditing
          ? 'Payment voucher updated successfully.'
          : 'Payment voucher and allocations posted successfully.',
        color: 'teal',
      });
      navigate('/payments');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.message || 'Failed to save payment.';
      notifications.show({ title: 'Error', message: String(msg), color: 'red' });
    },
  });

  if (isLoadingExisting) {
    return (
      <Center style={{ height: 'calc(100vh - 120px)' }}>
        <Loader color="burgundy" />
      </Center>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 84px)',
        gap: 6,
        padding: '0 8px',
        backgroundColor: '#f8fafc',
      }}
    >
      {/* 1. Top Header */}
      <Group justify="space-between" align="center" style={{ minHeight: 28 }}>
        <Group gap={6} align="center">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => navigate('/payments')}
            title="Back to Payments"
            style={{ color: '#1e293b' }}
          >
            <IconArrowLeft size={18} />
          </ActionIcon>
          <Title order={3} style={{ color: '#800020', fontWeight: 700, fontSize: 18 }}>
            {isEditing ? 'Edit Payment' : 'Payment Voucher'}
          </Title>
        </Group>
      </Group>

      {/* 2. Top Card: Voucher Header (Payment No, Date, Account [Bank/Cash], Mode) */}
      <Paper p={8} radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
        <Group wrap="wrap" gap={8} align="flex-start">
          {/* Payment Number */}
          <div style={{ flex: '1 1 120px', minWidth: 110 }}>
            <Text size="xs" fw={600} c="#334155" mb={2}>
              Payment No
            </Text>
            <TextInput
              placeholder="001"
              value={paymentNo}
              onChange={(e) => {
                const numericOnly = e.currentTarget.value.replace(/\D/g, '');
                setPaymentNo(numericOnly);
              }}
              radius="md"
              size="sm"
            />
          </div>

          {/* Payment Date */}
          <div style={{ flex: '1 1 140px', minWidth: 130 }}>
            <Text size="xs" fw={600} c="#334155" mb={2}>
              Date *
            </Text>
            <TextInput
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.currentTarget.value)}
              radius="md"
              size="sm"
            />
          </div>

          {/* Account (Paid From - ONLY Bank & Cash) */}
          <div style={{ flex: '2 1 320px', minWidth: 260 }}>
            <Text size="xs" fw={600} c="#334155" mb={2}>
              Account (Bank / Cash) *
            </Text>
            <Select
              placeholder="Select Bank or Cash..."
              data={bankAndCashOptions}
              value={bankOrCashLedgerId}
              onChange={(val) => setBankOrCashLedgerId(val ? String(val) : null)}
              searchable
              clearable
              radius="md"
              size="sm"
            />
          </div>
        </Group>
      </Paper>

      {/* 3. Main Particulars Table & Bottom Dock — Unified Single Card */}
      <Paper
        radius="sm"
        withBorder
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Box style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', backgroundColor: '#ffffff', minHeight: 300 }}>
          <Table.ScrollContainer minWidth={880}>
            <Table
              verticalSpacing={0}
              horizontalSpacing={4}
              highlightOnHover
              style={{ tableLayout: 'fixed', width: '100%', minWidth: 880 }}
              styles={{
                td: { paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 },
                th: { paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6, whiteSpace: 'nowrap' },
              }}
            >
              <colgroup>
                <col style={{ width: 44 }} /> {/* # */}
                <col style={{ width: '45%' }} /> {/* Particulars (Ledger) */}
                <col style={{ width: 170 }} /> {/* Amount */}
                <col style={{ width: 220 }} /> {/* Bill Allocation Action */}
                <col style={{ width: 50 }} /> {/* Delete */}
              </colgroup>
              <Table.Thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <Table.Tr style={{ height: 28 }}>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11, textAlign: 'left' }}>#</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11, textAlign: 'left' }}>PARTICULARS (LEDGER)</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11, textAlign: 'right', paddingRight: 8 }}>
                    AMOUNT (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11, textAlign: 'center' }}>
                    BILL ALLOCATION
                  </Table.Th>
                  <Table.Th style={{ padding: '2px' }} />
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {rows.map((row, index) => {
                  const selectedLedger = ledgers.find((l) => String(l.LedgerId) === row.ledgerId);
                  const isCreditorOrSupplier =
                    selectedLedger &&
                    ((selectedLedger.group_name || '').toLowerCase().includes('creditor') ||
                      (selectedLedger.group_name || '').toLowerCase().includes('supplier') ||
                      selectedLedger.Nature === 'LIABILITY');

                  const allocatedSum = row.allocations.reduce((sum, a) => sum + a.AllocatedAmount, 0);
                  const hasAllocations = allocatedSum > 0;

                  return (
                    <Table.Tr key={row.id} style={{ height: 38 }}>
                      {/* # */}
                      <Table.Td style={{ textAlign: 'left' }}>
                        <Text size="xs" fw={600} c="dimmed">
                          {index + 1}
                        </Text>
                      </Table.Td>

                      {/* Particulars (Ledger Select) */}
                      <Table.Td>
                        <Select
                          placeholder="Select Ledger (Supplier, Expense, Party)..."
                          data={allLedgerOptions}
                          value={row.ledgerId}
                          onChange={(val) => updateRowLedger(index, val ? String(val) : null)}
                          searchable
                          clearable
                          size="xs"
                          radius="sm"
                          styles={{ input: { height: 26, minHeight: 26, fontSize: 12 } }}
                        />
                      </Table.Td>

                      {/* Amount (₹) — Styled exactly like PurchaseFormPage */}
                      <Table.Td style={{ textAlign: 'right', paddingRight: 4 }}>
                        <Box style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <NumberInput
                            size="xs"
                            radius="sm"
                            min={0}
                            decimalScale={2}
                            hideControls
                            prefix="₹ "
                            placeholder="0.00"
                            value={row.amount}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(val: any) => updateRowAmount(index, val)}
                            style={{ width: 125 }}
                            styles={{
                              input: {
                                height: 24,
                                minHeight: 24,
                                fontWeight: 600,
                                fontSize: 13,
                                backgroundColor: '#ffffff',
                                borderColor: '#cbd5e1',
                                color: '#0f172a',
                                textAlign: 'right',
                                paddingLeft: 4,
                                paddingRight: 6,
                                fontVariantNumeric: 'tabular-nums',
                              },
                            }}
                          />
                        </Box>
                      </Table.Td>

                      {/* Bill Allocation Action */}
                      <Table.Td style={{ textAlign: 'center' }}>
                        {row.ledgerId ? (
                          <Group gap={6} justify="center" wrap="nowrap">
                            <Button
                              size="compact-xs"
                              variant={hasAllocations ? 'filled' : 'light'}
                              color={hasAllocations ? 'teal' : 'burgundy'}
                              leftSection={<IconReceipt size={13} />}
                              onClick={() => handleOpenAllocationModal(index)}
                              style={hasAllocations ? {} : { backgroundColor: '#fdf2f4', color: '#800020' }}
                            >
                              {hasAllocations
                                ? `Allocated ₹${allocatedSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                : isCreditorOrSupplier
                                ? 'Allocate Bills'
                                : 'Bill Allocation'}
                            </Button>
                          </Group>
                        ) : (
                          <Text size="xs" c="dimmed">
                            Select Ledger First
                          </Text>
                        )}
                      </Table.Td>

                      {/* Delete Row Action */}
                      <Table.Td style={{ textAlign: 'center', padding: '2px' }}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => removeRow(index)}
                          title="Remove row"
                        >
                          <IconTrash size={15} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}

                {/* Add Row Button inside Tbody */}
                <Table.Tr>
                  <Table.Td colSpan={5} style={{ padding: '4px 6px', backgroundColor: '#ffffff' }}>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      leftSection={<IconPlus size={14} />}
                      onClick={addRow}
                    >
                      Add Row
                    </Button>
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Box>

        {/* 4. Footer Section — FIXED AT BOTTOM OF CARD */}
        <Box
          style={{
            marginTop: 'auto',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            overflowX: 'hidden',
          }}
        >
          {/* Row 1: Totals Row */}
          <Table
            verticalSpacing={1}
            horizontalSpacing="xs"
            style={{ tableLayout: 'fixed', width: '100%', minWidth: 880, borderBottom: 'none' }}
            styles={{
              td: { border: 'none', paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 },
            }}
          >
            <colgroup>
              <col style={{ width: 44 }} />
              <col style={{ width: '45%' }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 220 }} />
              <col style={{ width: 50 }} />
            </colgroup>
            <Table.Tbody>
              <Table.Tr style={{ height: 28, backgroundColor: '#ffffff', border: 'none' }}>
                <Table.Td style={{ border: 'none' }} />
                <Table.Td style={{ textAlign: 'right', color: '#475569', fontWeight: 700, fontSize: 13, border: 'none' }}>
                  Total:
                </Table.Td>
                {/* Total Voucher Amount */}
                <Table.Td style={{ textAlign: 'right', border: 'none', paddingRight: 8 }}>
                  <Text fw={800} style={{ fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{voucherTotals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </Table.Td>
                {/* Total Allocated to Bills */}
                <Table.Td style={{ textAlign: 'center', border: 'none' }}>
                  {voucherTotals.totalAllocated > 0 && (
                    <Text fw={700} style={{ fontSize: 12, color: '#0f766e', fontVariantNumeric: 'tabular-nums' }}>
                      Allocated: ₹{voucherTotals.totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td style={{ border: 'none' }} />
              </Table.Tr>
            </Table.Tbody>
          </Table>

          {/* Row 2: Action Bar (Notes, On-Account, Grand Total, Buttons) */}
          <Box pt={4} pb={8} px="sm">
            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              {/* Left: Notes / Narration Input */}
              <div style={{ flex: '1 1 300px', maxWidth: 460 }}>
                <TextInput
                  placeholder="Add payment notes, transaction reference, or narration..."
                  value={notes}
                  onChange={(e) => setNotes(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveMutation.mutate();
                    }
                  }}
                  radius="md"
                  size="xs"
                />
              </div>

              {/* Right: Breakdown & Action Buttons */}
              <Group gap="md" align="center" wrap="nowrap">
                {/* Grand Total */}
                <Group gap={6} align="baseline" wrap="nowrap">
                  <Text size="xs" fw={600} c="dimmed">
                    Total Payment:
                  </Text>
                  <Text fw={800} size="lg" c="#800020" style={{ whiteSpace: 'nowrap' }}>
                    ₹{voucherTotals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </Group>

                <Divider orientation="vertical" />

                {/* Action Buttons */}
                <Group gap="xs" wrap="nowrap">
                  <Button variant="default" size="xs" radius={8} onClick={() => navigate('/payments')}>
                    Cancel
                  </Button>
                  <Button
                    color="burgundy"
                    size="xs"
                    radius={8}
                    leftSection={<IconCheck size={14} />}
                    loading={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                    style={{ backgroundColor: '#800020' }}
                  >
                    {isEditing ? 'Update Payment' : 'Save & Post Voucher'}
                  </Button>
                </Group>
              </Group>
            </Group>
          </Box>
        </Box>
      </Paper>

      {/* 5. Bill-Wise Allocation Modal */}
      <Modal
        opened={allocationModalOpened}
        onClose={() => {
          setAllocationModalOpened(false);
          setActiveRowIndex(null);
        }}
        title={
          <Group gap="xs">
            <IconBuildingBank size={18} color="#800020" />
            <Text fw={700} size="md" c="#800020">
              Bill-Wise Allocation — {activeModalLedger?.LedgerName || 'Ledger'}
            </Text>
          </Group>
        }
        size="xl"
        radius="md"
      >
        <Stack gap="md">
          {/* Clean Sub-header */}
          <Group justify="space-between" align="center" px={4} py={2}>
            <Text size="sm" fw={600} c="#334155">
              Voucher Line Amount: <span style={{ color: '#800020', fontWeight: 700 }}>₹{modalTotals.rowAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </Text>
            <Text size="sm" fw={600} c="#16a34a">
              Allocated: <span style={{ fontWeight: 700 }}>₹{modalTotals.totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </Text>
          </Group>

          {/* Pending Bills Table */}
          {isLoadingBills ? (
            <Center py={40}>
              <Loader color="burgundy" size="md" />
            </Center>
          ) : modalAllocations.length === 0 ? (
            <Center py={40}>
              <Stack align="center" gap="xs">
                <IconReceipt size={36} color="#cbd5e1" stroke={1.5} />
                <Text size="sm" fw={600} c="#475569">
                  No Pending Bills Found
                </Text>
                <Text size="xs" c="#94a3b8">
                  This party ledger has no unpaid purchase invoices. Payment will be considered On-Account.
                </Text>
              </Stack>
            </Center>
          ) : (
            <Table.ScrollContainer minWidth={640}>
              <Table verticalSpacing={2} horizontalSpacing="xs" highlightOnHover>
                <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                  <Table.Tr style={{ height: 26 }}>
                    <Table.Th style={{ color: '#475569', fontSize: 11 }}>#</Table.Th>
                    <Table.Th style={{ color: '#475569', fontSize: 11 }}>BILL REF #</Table.Th>
                    <Table.Th style={{ color: '#475569', fontSize: 11 }}>BILL DATE</Table.Th>
                    <Table.Th style={{ color: '#475569', fontSize: 11, textAlign: 'right' }}>TOTAL BILL (₹)</Table.Th>
                    <Table.Th style={{ color: '#475569', fontSize: 11, textAlign: 'right' }}>PENDING (₹)</Table.Th>
                    <Table.Th style={{ color: '#475569', fontSize: 11, textAlign: 'right', width: 140 }}>
                      ALLOCATE (₹)
                    </Table.Th>
                    <Table.Th style={{ color: '#475569', fontSize: 11, textAlign: 'center', width: 100 }}>
                      ACTION
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {modalAllocations.map((bill, bIdx) => (
                    <Table.Tr key={bill.PurchaseId} style={{ height: 32 }}>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {bIdx + 1}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="burgundy" size="sm" radius="xs">
                          {bill.BillReference}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="#475569">
                          {bill.BillDate}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="xs" fw={600} c="#0f172a">
                          ₹{bill.GrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="xs" fw={700} c="#b91c1c">
                          ₹{bill.PendingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', paddingRight: 4 }}>
                        <Box style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <NumberInput
                            size="xs"
                            radius="sm"
                            min={0}
                            max={bill.PendingBalance}
                            decimalScale={2}
                            hideControls
                            prefix="₹ "
                            placeholder="0.00"
                            value={bill.AllocatedAmount || ''}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(val) => handleModalAllocChange(bIdx, val)}
                            style={{ width: 115 }}
                            styles={{
                              input: {
                                height: 24,
                                minHeight: 24,
                                fontWeight: 600,
                                fontSize: 13,
                                textAlign: 'right',
                                paddingLeft: 4,
                                paddingRight: 6,
                                fontVariantNumeric: 'tabular-nums',
                                color: bill.AllocatedAmount > 0 ? '#16a34a' : '#0f172a',
                                backgroundColor: bill.AllocatedAmount > 0 ? '#f0fdf4' : '#ffffff',
                                borderColor: bill.AllocatedAmount > 0 ? '#86efac' : '#cbd5e1',
                              },
                            }}
                          />
                        </Box>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        {bill.AllocatedAmount > 0 ? (
                          <Button size="compact-xs" variant="subtle" color="gray" onClick={() => handleModalClear(bIdx)}>
                            Clear
                          </Button>
                        ) : (
                          <Button size="compact-xs" variant="light" color="burgundy" onClick={() => handleModalPayFull(bIdx)}>
                            Full Amount
                          </Button>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}

          {/* Modal Actions */}
          <Group justify="flex-end" gap="xs" mt="sm">
            <Button
              variant="default"
              size="xs"
              onClick={() => {
                setAllocationModalOpened(false);
                setActiveRowIndex(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="burgundy"
              size="xs"
              style={{ backgroundColor: '#800020' }}
              onClick={handleApplyModalAllocations}
            >
              Apply Allocation
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
};
