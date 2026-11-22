import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Modal,
  Badge,
  Alert,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconReceipt,
  IconCheck,
  IconBuildingBank,
  IconChevronDown,
  IconChevronUp,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DateInputDDMMYY } from '../components/DateInputDDMMYY';

interface LedgerOption {
  LedgerId: number;
  LedgerName: string;
  GroupId?: number;
  Group?: number;
  group_name?: string;
  group_nature?: string;
  Nature?: string;
  GSTIN?: string;
  PhoneNumber?: string;
  MobileNumber?: string;
  City?: string;
  OpeningBalance?: number;
  OpeningBalanceType?: string;
  CurrentBalance?: number | string;
  BalanceType?: 'Dr' | 'Cr';
  IsBillWise?: boolean;
}

export const isSundryCreditorOrDebtor = (ledger?: LedgerOption | null): boolean => {
  if (!ledger) return false;
  const gName = (ledger.group_name || '').toLowerCase();
  const gid = Number(ledger.GroupId ?? ledger.Group ?? 0);
  return (
    gid === 21 || // Sundry Debtors
    gid === 24 || // Sundry Creditors
    gName.includes('creditor') ||
    gName.includes('debtor') ||
    Boolean(ledger.IsBillWise)
  );
};

export const isSundryDebtor = (ledger?: LedgerOption | null): boolean => {
  if (!ledger) return false;
  const gName = (ledger.group_name || '').toLowerCase();
  const gid = Number(ledger.GroupId ?? ledger.Group ?? 0);
  return (
    gid === 21 || // Sundry Debtors
    gName.includes('debtor') ||
    gName.includes('customer')
  );
};

export const getLedgerBalanceInfo = (l?: LedgerOption | null) => {
  if (!l) return null;
  const curRaw = l.CurrentBalance !== undefined && l.CurrentBalance !== null && l.CurrentBalance !== ''
    ? Number(l.CurrentBalance)
    : null;

  let bal = 0;
  let balType: 'Dr' | 'Cr' = 'Dr';

  if (curRaw !== null && !isNaN(curRaw)) {
    bal = curRaw;
    if (bal > 0) {
      balType = 'Dr';
    } else if (bal < 0) {
      balType = 'Cr';
    } else {
      balType = (l.OpeningBalanceType || 'Dr').toUpperCase() === 'CR' ? 'Cr' : 'Dr';
    }
  } else {
    bal = Number(l.OpeningBalance ?? 0);
    balType = (l.OpeningBalanceType || 'Dr').toUpperCase() === 'CR' ? 'Cr' : 'Dr';
  }

  const absBal = Math.abs(bal);
  const isDebtor = isSundryDebtor(l);
  const isZero = absBal === 0;

  return {
    rawBal: bal,
    absBal,
    balType,
    isZero,
    isDebtor,
    label: isDebtor ? 'Receivable' : 'Bal',
    formatted: `₹${absBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balType}`,
  };
};

interface BillPaymentRecord {
  PaymentId: number | null;
  PaymentNo: string;
  Date: string;
  Account: string;
  Mode: string;
  Amount: number;
}

interface PendingBill {
  PurchaseId?: number;
  SalesId?: number;
  BillReference: string;
  BillDate: string;
  BillType?: string;
  InvoiceNo?: string;
  BillAmount?: number;
  PaidAmount?: number;
  PendingAmount?: number;
  GrandTotal?: number;
  AllocatedSoFar?: number;
  PendingBalance?: number;
  PaymentHistory?: BillPaymentRecord[];
}

interface BillAllocationItem {
  PurchaseId?: number;
  SalesId?: number;
  BillReference: string;
  BillDate: string;
  BillType?: string;
  InvoiceNo?: string;
  GrandTotal: number;
  AllocatedSoFar: number;
  PendingBalance: number;
  AllocatedAmount: number;
  PaymentHistory?: BillPaymentRecord[];
}

interface ReceiptParticularRow {
  id: string;
  ledgerId: string | null;
  amount: number | '';
  allocations: BillAllocationItem[];
}

const emptyRow = (): ReceiptParticularRow => ({
  id: Math.random().toString(36).substring(2, 9),
  ledgerId: null,
  amount: '',
  allocations: [],
});

export const ReceiptFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id) && id !== 'new' && id !== 'create';
  const prefillPartyId = searchParams.get('party_id') || searchParams.get('customer_id');
  const returnTo = searchParams.get('return_to');
  const saleId = searchParams.get('sale_id');
  const prefillAmount = searchParams.get('amount');
  const autoOpenAlloc = searchParams.get('auto_open_alloc') === 'true';
  const autoAllocTriggeredRef = useRef(false);

  // Top Voucher Header State
  const [receiptNo, setReceiptNo] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankOrCashLedgerId, setBankOrCashLedgerId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Main Table: Particulars (Rows)
  const [rows, setRows] = useState<ReceiptParticularRow[]>([emptyRow()]);

  // Modal State for Bill-Wise Allocation
  const [allocationModalOpened, setAllocationModalOpened] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [modalAllocations, setModalAllocations] = useState<BillAllocationItem[]>([]);
  const [isLoadingBills, setIsLoadingBills] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string>('APPROVED');
  const [expandedBillRef, setExpandedBillRef] = useState<string | null>(null);

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
    return bankAndCashLedgers.map((l) => {
      const bal = Number(l.CurrentBalance ?? l.OpeningBalance ?? 0);
      const balType = bal > 0 ? 'Dr' : (bal < 0 ? 'Cr' : (l.OpeningBalanceType || 'Dr'));
      const absBal = Math.abs(bal);
      const formattedAmount = `₹${absBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const formattedBal = `${formattedAmount} ${balType}`;
      return {
        value: String(l.LedgerId),
        label: `${l.LedgerName} (${l.group_name || 'Account'})`,
        ledgerName: l.LedgerName,
        groupName: l.group_name || 'Account',
        formattedAmount,
        balance: formattedBal,
        balType: balType,
      };
    });
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
    return ledgers.map((l) => {
      const bInfo = getLedgerBalanceInfo(l);
      const absBal = bInfo?.absBal ?? 0;
      const formattedAmount = `₹${absBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      return {
        value: String(l.LedgerId),
        label: `${l.LedgerName} (${l.group_name || 'Ledger'})`,
        ledgerName: l.LedgerName,
        groupName: l.group_name || 'Ledger',
        isDebtor: bInfo?.isDebtor ?? false,
        absBal,
        balType: bInfo?.balType ?? 'Dr',
        formattedAmount,
        formattedBal: bInfo?.formatted ?? '₹0.00 Dr',
        balanceText: bInfo ? bInfo.formatted : '',
      };
    });
  }, [ledgers]);

  // Fetch receipts/payments list to auto-calculate next voucher number (e.g. 001, 002)
  const { data: paymentsList = [] } = useQuery<any[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
    enabled: !isEditing,
  });

  useEffect(() => {
    if (!isEditing && prefillPartyId && ledgers.length > 0) {
      setRows((prev) => {
        if (prev.length > 0) {
          const amt = prefillAmount ? Number(prefillAmount) : prev[0].amount;
          return [{ ...prev[0], ledgerId: String(prefillPartyId), amount: amt || '' }, ...prev.slice(1)];
        }
        return prev;
      });
    }
  }, [isEditing, prefillPartyId, prefillAmount, ledgers]);

  useEffect(() => {
    if (autoOpenAlloc && !autoAllocTriggeredRef.current && rows.length > 0 && rows[0].ledgerId && Number(rows[0].amount) > 0) {
      autoAllocTriggeredRef.current = true;
      handleOpenAllocationModal(0);
    }
  }, [autoOpenAlloc, rows]);

  useEffect(() => {
    if (!isEditing && !receiptNo && paymentsList.length >= 0) {
      const receiptsOnly = paymentsList.filter((p: any) => p.voucher_type === 'RECEIPT');
      const nextNum = receiptsOnly.length + 1;
      setReceiptNo(String(nextNum).padStart(3, '0'));
    }
  }, [isEditing, paymentsList, receiptNo]);

  // Fetch existing receipt when editing
  useEffect(() => {
    if (isEditing && id) {
      setIsLoadingExisting(true);
      apiClient
        .get(`/payments/${id}/`)
        .then((res) => {
          const p = res.data;
          setReceiptNo(p.PaymentNo || p.ReferenceNumber || String(p.PaymentId).padStart(3, '0'));
          if (p.Status) setExistingStatus(String(p.Status).toUpperCase());
          if (p.payment_date) {
            setReceiptDate(p.payment_date);
          } else if (p.CreatedAt) {
            setReceiptDate(p.CreatedAt.split('T')[0]);
          }
          if (p.Narration) setNotes(p.Narration);

          const firstLine = p.lines && p.lines.length > 0 ? p.lines[0] : null;
          if (firstLine?.Ledger) {
            setBankOrCashLedgerId(String(firstLine.Ledger));
          }

          const lineAllocations: BillAllocationItem[] = (firstLine?.allocations || []).map((a: any) => ({
            PurchaseId: a.PurchaseId || a.SalesId || 0,
            SalesId: a.SalesId || a.PurchaseId || 0,
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
            message: 'Failed to load receipt details.',
            color: 'red',
          });
          navigate('/receipts');
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

    if (!row.amount || Number(row.amount) <= 0) {
      notifications.show({
        title: 'Enter Amount',
        message: 'Please enter the voucher amount before allocating bills.',
        color: 'orange',
      });
      return;
    }

    setActiveRowIndex(index);
    setExpandedBillRef(null);
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
        const pendingBalance = Number(b.PendingAmount ?? b.PendingBalance ?? 0);
        const allocatedSoFar = Number(b.PaidAmount ?? b.AllocatedSoFar ?? Math.max(0, grandTotal - pendingBalance));
        const currentAlloc = existingAllocMap.get(b.BillReference) || 0;

        return {
          PurchaseId: b.PurchaseId,
          SalesId: b.SalesId,
          BillReference: b.BillReference,
          BillDate: b.BillDate,
          BillType: b.BillType || (b.BillReference === 'OPENING' || b.PurchaseId === 0 ? 'OPENING' : 'SALES'),
          InvoiceNo: b.InvoiceNo,
          GrandTotal: grandTotal,
          AllocatedSoFar: allocatedSoFar,
          PendingBalance: pendingBalance,
          AllocatedAmount: currentAlloc,
          PaymentHistory: b.PaymentHistory || [],
        };
      });

      // Ensure all previously allocated bills are preserved in mapped
      row.allocations.forEach((a) => {
        if (!mapped.some((m) => m.BillReference === a.BillReference)) {
          mapped.push({ ...a });
        }
      });

      const rowAmount = Number(row.amount) || 0;

      // Auto-allocate against saleId if opened directly from newly created sale
      if (saleId) {
        const targetBill = mapped.find(
          (m) => String(m.SalesId) === String(saleId) || String(m.PurchaseId) === String(saleId)
        );
        if (targetBill && targetBill.AllocatedAmount === 0) {
          const otherBillsAlloc = mapped.reduce((sum, b) => {
            if (b.BillReference === 'CUSTOMER ADVANCE' || b === targetBill) return sum;
            return sum + (existingAllocMap.get(b.BillReference) || 0);
          }, 0);
          const availableForThisBill = Math.max(0, rowAmount - otherBillsAlloc);
          const allocToBill = Math.min(availableForThisBill, targetBill.PendingBalance);
          targetBill.AllocatedAmount = allocToBill;

          // If we had a CUSTOMER ADVANCE, reduce it
          const currentAdv = existingAllocMap.get('CUSTOMER ADVANCE') || 0;
          if (currentAdv > 0) {
            existingAllocMap.set('CUSTOMER ADVANCE', Math.max(0, currentAdv - allocToBill));
          }
        }
      }
      const totalPending = mapped.reduce(
        (acc, b) => acc + (b.BillReference !== 'CUSTOMER ADVANCE' ? b.PendingBalance : 0),
        0
      );

      // Add or sync Customer Advance row if receipt amount exceeds pending bills, or if party has no bills
      if (rowAmount > totalPending || mapped.length === 0 || existingAllocMap.has('CUSTOMER ADVANCE')) {
        const allocatedToRealBills = mapped.reduce(
          (acc, b) => acc + (b.BillReference !== 'CUSTOMER ADVANCE' ? b.AllocatedAmount : 0),
          0
        );
        const excess = Math.max(0, rowAmount - allocatedToRealBills);
        const existingAdv = existingAllocMap.get('CUSTOMER ADVANCE');
        const advAlloc = existingAdv !== undefined ? existingAdv : excess;

        const advRowIdx = mapped.findIndex((m) => m.BillReference === 'CUSTOMER ADVANCE');
        const advItem: BillAllocationItem = {
          PurchaseId: 0,
          SalesId: 0,
          BillReference: 'CUSTOMER ADVANCE',
          BillDate: new Date().toISOString().split('T')[0],
          BillType: 'ADVANCE',
          InvoiceNo: 'Customer Advance / Unallocated Advance',
          GrandTotal: excess || rowAmount,
          AllocatedSoFar: 0,
          PendingBalance: Math.max(excess, rowAmount, advAlloc),
          AllocatedAmount: advAlloc,
          PaymentHistory: [],
        };

        if (advRowIdx >= 0) {
          mapped[advRowIdx] = advItem;
        } else {
          mapped.push(advItem);
        }
      }

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

  // Modal Allocation Field Changes
  const handleModalAllocChange = (idx: number, val: number | string | undefined) => {
    const num = Math.max(0, Number(val) || 0);

    setModalAllocations((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        AllocatedAmount: num,
      };
      return updated;
    });
  };

  // Shift/allocate advance or available voucher funds to a specific bill
  const handleAllocateRow = (idx: number) => {
    setModalAllocations((prev) => {
      const target = prev[idx];
      if (!target || target.BillReference === 'CUSTOMER ADVANCE') return prev;
      const rowAmount = activeRowIndex !== null ? Number(rows[activeRowIndex].amount) || 0 : 0;

      // Other allocated bills (excluding target and advance)
      const otherAlloc = prev.reduce((sum, b, i) => {
        if (i === idx || b.BillReference === 'CUSTOMER ADVANCE') return sum;
        return sum + b.AllocatedAmount;
      }, 0);

      const available = Math.max(0, rowAmount - otherAlloc);
      const alloc = Math.min(target.PendingBalance, available);

      return prev.map((b, i) => {
        if (i === idx) {
          return { ...b, AllocatedAmount: alloc };
        }
        if (b.BillReference === 'CUSTOMER ADVANCE') {
          const rem = Math.max(0, available - alloc);
          return { ...b, AllocatedAmount: rem };
        }
        return b;
      });
    });
  };

  const handleModalClear = (idx: number) => {
    setModalAllocations((prev) => {
      const target = prev[idx];
      if (!target) return prev;
      const clearedAmount = target.AllocatedAmount;
      return prev.map((b, i) => {
        if (i === idx) {
          return { ...b, AllocatedAmount: 0 };
        }
        if (b.BillReference === 'CUSTOMER ADVANCE') {
          return { ...b, AllocatedAmount: b.AllocatedAmount + clearedAmount };
        }
        return b;
      });
    });
  };

  // Auto Fill (F12) — Allocates voucher line amount to bills in FIFO order; any excess goes to Customer Advance
  const handleAutoFill = () => {
    const rowAmount = activeRowIndex !== null ? Number(rows[activeRowIndex].amount) || 0 : 0;
    if (rowAmount <= 0) {
      notifications.show({
        title: 'Enter Line Amount',
        message: 'Please enter a voucher amount for this line before auto-allocating.',
        color: 'orange',
      });
      return;
    }

    setModalAllocations((prev) => {
      let remaining = rowAmount;
      const nonAdvance = prev.filter((b) => b.BillReference !== 'CUSTOMER ADVANCE');
      const updatedNonAdvance = nonAdvance.map((bill) => {
        if (remaining <= 0) {
          return { ...bill, AllocatedAmount: 0 };
        }
        const alloc = Math.min(bill.PendingBalance, remaining);
        remaining = Math.max(0, remaining - alloc);
        return { ...bill, AllocatedAmount: alloc };
      });

      // Customer Advance gets any remaining excess!
      if (remaining > 0 || prev.some((b) => b.BillReference === 'CUSTOMER ADVANCE')) {
        const existingAdv = prev.find((b) => b.BillReference === 'CUSTOMER ADVANCE');
        const advAlloc = remaining;
        const advRow: BillAllocationItem = existingAdv
          ? {
              ...existingAdv,
              PendingBalance: Math.max(existingAdv.PendingBalance, advAlloc),
              AllocatedAmount: advAlloc,
            }
          : {
              PurchaseId: 0,
              SalesId: 0,
              BillReference: 'CUSTOMER ADVANCE',
              BillDate: new Date().toISOString().split('T')[0],
              BillType: 'ADVANCE',
              InvoiceNo: 'Customer Advance / Unallocated Advance',
              GrandTotal: advAlloc,
              AllocatedSoFar: 0,
              PendingBalance: advAlloc,
              AllocatedAmount: advAlloc,
              PaymentHistory: [],
            };
        return [...updatedNonAdvance, advRow];
      }

      return updatedNonAdvance;
    });
  };

  // Listen for F12 keyboard shortcut
  useEffect(() => {
    if (!allocationModalOpened) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        handleAutoFill();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allocationModalOpened, activeRowIndex, rows]);

  // Save Modal Allocations back into active row
  const handleApplyModalAllocations = () => {
    if (activeRowIndex === null) return;
    const rowAmount = Number(rows[activeRowIndex].amount) || 0;
    const validAllocations = modalAllocations.filter((a) => a.AllocatedAmount > 0);
    const sumAllocated = validAllocations.reduce((acc, a) => acc + a.AllocatedAmount, 0);

    if (modalAllocations.some((b) => b.BillReference !== 'CUSTOMER ADVANCE' && b.AllocatedAmount > b.PendingBalance)) {
      notifications.show({
        title: 'Amount Exceeded',
        message: 'One or more allocated amounts exceed the bill pending balance.',
        color: 'red',
      });
      return;
    }

    if (rowAmount > 0 && sumAllocated > rowAmount) {
      notifications.show({
        title: 'Exceeds Line Amount',
        message: `Total allocated (₹${sumAllocated.toFixed(2)}) cannot exceed line amount (₹${rowAmount.toFixed(2)}).`,
        color: 'red',
      });
      return;
    }

    setRows((prev) => {
      const updated = [...prev];
      updated[activeRowIndex] = {
        ...updated[activeRowIndex],
        allocations: validAllocations,
      };
      return updated;
    });

    setAllocationModalOpened(false);
    setActiveRowIndex(null);
  };

  // Active ledger object in modal
  const activeModalLedger = useMemo(() => {
    if (activeRowIndex === null) return null;
    const lid = rows[activeRowIndex]?.ledgerId;
    return ledgers.find((l) => String(l.LedgerId) === String(lid)) || null;
  }, [activeRowIndex, rows, ledgers]);

  // Modal totals and validation flags
  const modalTotals = useMemo(() => {
    const totalPending = modalAllocations.reduce((sum, r) => sum + r.PendingBalance, 0);
    const totalAllocated = modalAllocations.reduce((sum, r) => sum + r.AllocatedAmount, 0);
    const rowAmt = activeRowIndex !== null ? Number(rows[activeRowIndex].amount) || 0 : 0;
    const remaining = rowAmt - totalAllocated;
    const hasOverBalance = modalAllocations.some(
      (b) => b.BillReference !== 'CUSTOMER ADVANCE' && b.AllocatedAmount > b.PendingBalance
    );
    const hasOverRowAmt = rowAmt > 0 && totalAllocated > rowAmt;
    const hasError = hasOverBalance || hasOverRowAmt;

    return { totalPending, totalAllocated, rowAmt, remaining, hasOverBalance, hasOverRowAmt, hasError };
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

  // Validation state: determines if Save / Post Voucher is enabled
  const saveValidation = useMemo(() => {
    if (!bankOrCashLedgerId) {
      return {
        canSave: false,
        reason: 'Please select an Account (Cash / Bank) in the header.',
      };
    }

    const validRows = rows.filter((r) => Boolean(r.ledgerId) && Number(r.amount) > 0);
    if (validRows.length === 0) {
      return {
        canSave: false,
        reason: 'Please add at least one Particular row with a Ledger and Amount.',
      };
    }

    // Check if any row has allocations exceeding balance or row amount
    for (const r of validRows) {
      const rAmt = Number(r.amount) || 0;
      const sumAlloc = r.allocations.reduce((s, a) => s + (Number(a.AllocatedAmount) || 0), 0);
      const overPending = r.allocations.some((a) => Number(a.AllocatedAmount) > Number(a.PendingBalance));
      if (overPending) {
        return {
          canSave: false,
          reason: 'One or more allocated amounts exceed the bill pending balance.',
        };
      }
      if (rAmt > 0 && sumAlloc > rAmt) {
        return {
          canSave: false,
          reason: 'Allocated amount cannot exceed the entered line amount.',
        };
      }
    }

    return { canSave: true, reason: '' };
  }, [bankOrCashLedgerId, rows]);

  // Save / Post Mutation
  const saveMutation = useMutation({
    mutationFn: async (asTemporary: boolean = false) => {
      if (!saveValidation.canSave) {
        throw new Error(saveValidation.reason || 'Please complete all required fields and bill allocations.');
      }

      const validRows = rows.filter((r) => Boolean(r.ledgerId) && Number(r.amount) > 0);
      if (validRows.length === 0) {
        throw new Error('Please add at least one Particular row with a Ledger and Amount.');
      }

      // Collect all allocations across all rows
      const allAllocations = validRows.flatMap((r) =>
        r.allocations.map((a) => ({
          BillType: a.BillType || (a.BillReference === 'OPENING' || a.PurchaseId === 0 ? 'OPENING' : 'SALES'),
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
        voucher_type: 'RECEIPT',
        is_temporary: asTemporary,
        status: asTemporary ? 'PENDING' : 'APPROVED',
        payment_date: receiptDate,
        Date: receiptDate,
        PaymentDate: receiptDate,
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
        return { data: res.data, asTemporary };
      } else {
        const res = await apiClient.post('/payments/', payload);
        return { data: res.data, asTemporary };
      }
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      const asTemp = result?.asTemporary;
      notifications.show({
        title: asTemp ? 'Temporary Receipt Saved' : (isEditing ? 'Receipt Updated' : 'Receipt Posted'),
        message: asTemp
          ? 'Saved as temporary receipt (TREC). General ledger has not been affected.'
          : 'Receipt approved and posted to General Ledger (REC).',
        color: asTemp ? 'yellow' : 'teal',
      });
      if (returnTo === 'sales') {
        navigate(saleId ? `/sales?open_sale_id=${saleId}` : '/sales');
      } else {
        navigate('/receipts');
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.message || 'Failed to save receipt.';
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
        minHeight: 'calc(100vh - 84px)',
        gap: 6,
        padding: '0 8px',
        paddingBottom: 24,
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
            onClick={() => navigate('/receipts')}
            title="Back to Receipts"
            style={{ color: '#1e293b' }}
          >
            <IconArrowLeft size={18} />
          </ActionIcon>
          <Title order={3} style={{ color: '#800020', fontWeight: 700, fontSize: 18 }}>
            {isEditing ? 'Edit Receipt Voucher' : 'Receipt Voucher'}
          </Title>
        </Group>
      </Group>

      {/* 2. Top Card: Voucher Header (Receipt No, Date, Account [Bank/Cash], Mode) */}
      <Paper p={8} radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
        <Group wrap="wrap" gap={8} align="flex-start">
          {/* Voucher Number */}
          <div style={{ flex: '1 1 120px', minWidth: 110 }}>
            <Text size="xs" fw={600} c="#334155" mb={2}>
              Receipt No
            </Text>
            <TextInput
              placeholder="001"
              value={receiptNo}
              onChange={(e) => {
                const numericOnly = e.currentTarget.value.replace(/\D/g, '');
                setReceiptNo(numericOnly);
              }}
              radius="md"
              size="sm"
            />
          </div>

          {/* Receipt Date */}
          <div style={{ flex: '1 1 140px', minWidth: 130 }}>
            <Text size="xs" fw={600} c="#334155" mb={2}>
              Date *
            </Text>
            <DateInputDDMMYY
              value={receiptDate}
              onChange={(val) => setReceiptDate(val)}
              radius="md"
              size="sm"
            />
          </div>

          {/* Account (Received Into - ONLY Bank & Cash) */}
          <div style={{ flex: '2 1 320px', minWidth: 260 }}>
            <Group justify="space-between" align="center" mb={2}>
              <Text size="xs" fw={600} c="#334155">
                Account (Bank / Cash) *
              </Text>
              {selectedAccountLedger && (() => {
                const cur = Number(selectedAccountLedger.CurrentBalance ?? selectedAccountLedger.OpeningBalance ?? 0);
                const bType = cur > 0 ? 'Dr' : (cur < 0 ? 'Cr' : (selectedAccountLedger.OpeningBalanceType || 'Dr'));
                return (
                  <Text size="xs" fw={700} c={bType === 'Cr' ? '#b91c1c' : '#800020'}>
                    Bal: ₹{Math.abs(cur).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {bType}
                  </Text>
                );
              })()}
            </Group>
            <Select
              placeholder="Select Bank or Cash..."
              data={bankAndCashOptions}
              value={bankOrCashLedgerId}
              onChange={(val) => setBankOrCashLedgerId(val ? String(val) : null)}
              renderOption={({ option }) => {
                const item = bankAndCashOptions.find((o) => o.value === option.value);
                const isCr = item?.balType === 'Cr';
                return (
                  <Group justify="space-between" wrap="nowrap" style={{ width: '100%', padding: '4px 2px' }}>
                    <Text size="sm" fw={500}>{option.label}</Text>
                    {item?.balance && (
                      <Badge
                        size="sm"
                        variant="light"
                        tt="none"
                        style={{
                          width: 108,
                          minWidth: 108,
                          height: 24,
                          backgroundColor: isCr ? '#fef2f2' : '#fdf2f4',
                          color: isCr ? '#b91c1c' : '#800020',
                          border: `1px solid ${isCr ? '#fecaca' : '#fecdd3'}`,
                          fontWeight: 600,
                          fontSize: 11,
                          padding: '0 8px',
                          borderRadius: 6,
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', flex: 1 }}>
                            {item.formattedAmount || (item.balance ? item.balance.replace(/\s*(Dr|Cr|DR|CR)$/, '') : '')}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: 10.5, marginLeft: 6, width: 20, textAlign: 'right', color: isCr ? '#b91c1c' : '#800020' }}>
                            {item.balType}
                          </span>
                        </div>
                      </Badge>
                    )}
                  </Group>
                );
              }}
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
                <col style={{ width: '50%' }} /> {/* Particulars (Ledger) */}
                <col style={{ width: 160 }} /> {/* Amount */}
                <col style={{ width: 210 }} /> {/* Bill Allocation Action */}
                <col style={{ width: 50 }} /> {/* Delete */}
              </colgroup>
              <Table.Thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <Table.Tr style={{ height: 32 }}>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11, textAlign: 'left' }}>#</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11, textAlign: 'left' }}>
                    PARTICULARS (LEDGER)
                  </Table.Th>
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
                  const isSundryParty = isSundryCreditorOrDebtor(selectedLedger);
                  const allocatedSum = row.allocations.reduce((sum, a) => sum + a.AllocatedAmount, 0);
                  const hasAllocations = allocatedSum > 0;

                  return (
                    <Table.Tr key={row.id} style={{ minHeight: 48, verticalAlign: 'middle' }}>
                      {/* # */}
                      <Table.Td style={{ textAlign: 'left' }}>
                        <Text size="xs" fw={600} c="dimmed">
                          {index + 1}
                        </Text>
                      </Table.Td>

                      {/* Particulars (Ledger Select) */}
                      <Table.Td style={{ padding: '6px 6px' }}>
                        {(() => {
                          const balInfo = getLedgerBalanceInfo(selectedLedger);
                          
                          return (
                            <Box style={{ position: 'relative' }}>
                              <Select
                                placeholder="Select Ledger (Customer, Income, Party)..."
                                data={allLedgerOptions}
                                value={row.ledgerId}
                                onChange={(val) => {
                                  updateRowLedger(index, val ? String(val) : null);
                                }}
                                searchable
                                clearable
                                size="sm"
                                radius="md"
                                renderOption={({ option }) => {
                                  const item = allLedgerOptions.find((o) => o.value === option.value);
                                  const isDebtor = item?.isDebtor;
                                  return (
                                    <Group justify="space-between" wrap="nowrap" style={{ width: '100%', padding: '4px 2px' }}>
                                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 12 }}>
                                        <Text size="sm" fw={600} c="#0f172a" truncate>
                                          {option.label}
                                        </Text>
                                      </div>
                                      {item && item.balanceText && (
                                        <Badge
                                          size="sm"
                                          variant="light"
                                          tt="none"
                                          style={{
                                            width: 108,
                                            minWidth: 108,
                                            height: 24,
                                            backgroundColor: isDebtor ? '#fdf2f4' : '#f8fafc',
                                            color: isDebtor ? '#800020' : '#475569',
                                            border: `1px solid ${isDebtor ? '#f5c2cb' : '#e2e8f0'}`,
                                            fontWeight: 600,
                                            fontSize: 11,
                                            padding: '0 8px',
                                            borderRadius: 6,
                                            flexShrink: 0,
                                          }}
                                        >
                                          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', flex: 1 }}>
                                              {item.formattedAmount || (item.balanceText ? item.balanceText.replace(/\s*(Dr|Cr|DR|CR)$/, '') : '')}
                                            </span>
                                            <span style={{ fontWeight: 700, fontSize: 10.5, marginLeft: 6, width: 20, textAlign: 'right', color: isDebtor ? '#800020' : (item.balType === 'Cr' ? '#800020' : '#64748b') }}>
                                              {item.balType}
                                            </span>
                                          </div>
                                        </Badge>
                                      )}
                                    </Group>
                                  );
                                }}
                                styles={{
                                  input: {
                                    height: 38,
                                    minHeight: 38,
                                    fontSize: 13,
                                    fontWeight: 500,
                                    borderColor: '#cbd5e1',
                                  },
                                }}
                              />
                              {selectedLedger && balInfo && (
                                <Group justify="space-between" align="center" gap={4} mt={3} px={2} wrap="nowrap">
                                  <Text size="10px" c="dimmed" truncate style={{ maxWidth: '40%' }}>
                                    {selectedLedger.group_name || 'Ledger'}
                                  </Text>
                                  <Group gap={6} align="center" wrap="nowrap">
                                    <Text size="11px" c="#64748b" fw={500}>
                                      {balInfo.isDebtor ? 'Balance Receivable:' : 'Current Balance:'}
                                    </Text>
                                    <Badge
                                      size="sm"
                                      variant="light"
                                      color="burgundy"
                                      style={{
                                        backgroundColor: '#fdf2f4',
                                        color: '#800020',
                                        borderColor: '#fbcfe8',
                                        fontWeight: 700,
                                        fontSize: 11,
                                        fontVariantNumeric: 'tabular-nums',
                                        padding: '2px 8px',
                                      }}
                                    >
                                      ₹{balInfo.absBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {balInfo.balType}
                                    </Badge>
                                  </Group>
                                </Group>
                              )}
                            </Box>
                          );
                        })()}
                      </Table.Td>

                      {/* Amount (₹) */}
                      <Table.Td style={{ textAlign: 'right', paddingRight: 4 }}>
                        <Box style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <NumberInput
                            size="sm"
                            radius="md"
                            min={0}
                            decimalScale={2}
                            hideControls
                            prefix="₹ "
                            placeholder="0.00"
                            value={row.amount}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(val: any) => updateRowAmount(index, val)}
                            style={{ width: 140 }}
                            styles={{
                              input: {
                                height: 38,
                                minHeight: 38,
                                fontWeight: 600,
                                fontSize: 13,
                                backgroundColor: '#ffffff',
                                borderColor: '#cbd5e1',
                                color: '#0f172a',
                                textAlign: 'right',
                                paddingLeft: 8,
                                paddingRight: 8,
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
                              size="xs"
                              radius="md"
                              variant={hasAllocations ? 'filled' : 'light'}
                              color="burgundy"
                              leftSection={<IconReceipt size={14} />}
                              disabled={!row.amount || Number(row.amount) <= 0}
                              onClick={() => handleOpenAllocationModal(index)}
                              title={
                                !row.amount || Number(row.amount) <= 0
                                  ? 'Enter line amount first to allocate bills'
                                  : undefined
                              }
                              style={{
                                height: 38,
                                ...(!row.amount || Number(row.amount) <= 0
                                  ? { backgroundColor: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' }
                                  : hasAllocations
                                  ? { backgroundColor: '#800020', color: '#ffffff', fontWeight: 600 }
                                  : isSundryParty
                                  ? { backgroundColor: '#fdf2f4', color: '#800020', fontWeight: 600 }
                                  : { backgroundColor: '#f8fafc', color: '#64748b' }),
                              }}
                            >
                              {hasAllocations
                                ? `Allocated ₹${allocatedSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                : isSundryParty
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
            overflowX: 'auto',
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
              <col style={{ width: '50%' }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 210 }} />
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

          {/* Row 2: Action Bar (Notes, Total, Buttons) */}
          <Box pt={4} pb={8} px="sm">
            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              {/* Left: Notes / Narration Input */}
              <div style={{ flex: '1 1 260px', maxWidth: 460 }}>
                <TextInput
                  placeholder="Add receipt notes, transaction reference, or narration..."
                  value={notes}
                  onChange={(e) => setNotes(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveMutation.mutate(false);
                    }
                  }}
                  radius="md"
                  size="xs"
                />
              </div>

              {/* Right: Breakdown & Action Buttons */}
              <Group gap="md" align="center" wrap="wrap">
                {/* Grand Total */}
                <Group gap={6} align="baseline" wrap="nowrap">
                  <Text size="xs" fw={600} c="dimmed">
                    Total Receipt:
                  </Text>
                  <Text fw={800} size="lg" c="#800020" style={{ whiteSpace: 'nowrap' }}>
                    ₹{voucherTotals.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </Group>

                <Divider orientation="vertical" visibleFrom="xs" />

                {/* Validation Info (if saving is disabled) */}
                {!saveValidation.canSave && saveValidation.reason && (
                  <Text size="xs" c="#dc2626" fw={600} style={{ maxWidth: 320, textAlign: 'right' }}>
                    {saveValidation.reason}
                  </Text>
                )}

                {/* Action Buttons */}
                <Group gap="xs" wrap="wrap">
                  <Button variant="default" size="xs" radius={8} onClick={() => navigate('/receipts')}>
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    color="yellow"
                    size="xs"
                    radius={8}
                    loading={saveMutation.isPending}
                    disabled={!saveValidation.canSave}
                    onClick={() => saveMutation.mutate(true)}
                    title="Save as temporary receipt (TREC) without posting to general ledger"
                  >
                    Save as Temporary (TREC)
                  </Button>
                  <Button
                    color="burgundy"
                    size="xs"
                    radius={8}
                    leftSection={<IconCheck size={14} />}
                    loading={saveMutation.isPending}
                    disabled={!saveValidation.canSave}
                    onClick={() => saveMutation.mutate(false)}
                    style={{
                      backgroundColor: !saveValidation.canSave ? '#cbd5e1' : '#800020',
                      cursor: !saveValidation.canSave ? 'not-allowed' : 'pointer',
                    }}
                    title={!saveValidation.canSave ? saveValidation.reason : 'Approve and post permanently to General Ledger (REC)'}
                  >
                    {isEditing && existingStatus !== 'PENDING' ? 'Update & Post to Ledger' : 'Approve & Post to Ledger (REC)'}
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
              Bill Wise {activeModalLedger?.LedgerName || 'Ledger'}
            </Text>
          </Group>
        }
        size={1050}
        radius="md"
      >
        <Stack gap="md">
          {/* Sale Bill Allocation Banner if redirected from a newly created sale */}
          {saleId && (
            <Alert
              icon={<IconInfoCircle size={18} />}
              color="burgundy"
              radius="md"
              variant="light"
              title="Allocating Advance Against Invoice"
              styles={{
                root: { border: '1px solid #f5c2cb', backgroundColor: '#fdf2f4', padding: '10px 14px' },
                title: { color: '#800020', fontWeight: 700, fontSize: 13, marginBottom: 2 },
                message: { color: '#475569', fontSize: 12 },
              }}
            >
              The advance payment was shifted to your newly generated invoice. Review the allocations below and click <b>Save Allocation</b> to confirm.
            </Alert>
          )}

          {/* Clean Sub-header with Auto Fill (F12) */}
          <Group justify="space-between" align="center" px={4} py={2} wrap="wrap" gap="sm">
            <Group gap="md" align="center" wrap="wrap">
              <Text size="sm" fw={600} c="#334155">
                Voucher Line Amount:{' '}
                <span style={{ color: '#800020', fontWeight: 700 }}>
                  ₹{modalTotals.rowAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </Text>
              <Text size="sm" fw={600} c={modalTotals.hasOverRowAmt ? '#dc2626' : '#800020'}>
                Allocated:{' '}
                <span style={{ fontWeight: 700 }}>
                  ₹{modalTotals.totalAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </Text>
              {modalTotals.hasOverRowAmt ? (
                <Text size="xs" fw={700} c="#dc2626">
                  Exceeded Line Amount by ₹{(modalTotals.totalAllocated - modalTotals.rowAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              ) : modalTotals.remaining > 0 ? (
                <Text size="xs" fw={600} c="#b45309">
                  Remaining: ₹{modalTotals.remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              ) : null}
              {modalTotals.hasOverBalance && (
                <Text size="xs" fw={700} c="#dc2626">
                  • Typed amount exceeds bill balance
                </Text>
              )}
            </Group>

            <Button
              size="xs"
              color="burgundy"
              variant="light"
              onClick={handleAutoFill}
              style={{
                backgroundColor: '#fbf0f2',
                color: '#800020',
                borderColor: '#e2e8f0',
                fontWeight: 700,
              }}
            >
              Auto Fill (F12)
            </Button>
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
                  This party ledger has no unpaid sales invoices. Receipt will be considered On-Account.
                </Text>
              </Stack>
            </Center>
          ) : (
            <Box style={{ width: '100%' }}>
              <Table verticalSpacing={2} horizontalSpacing="xs" highlightOnHover>
                <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                  <Table.Tr style={{ height: 30 }}>
                    <Table.Th style={{ color: '#475569', fontSize: 11, width: 55, fontWeight: 700 }}>SL NO</Table.Th>
                    <Table.Th style={{ color: '#475569', fontSize: 11, width: 175, fontWeight: 700 }}>BILL REF NO</Table.Th>
                    <Table.Th style={{ color: '#475569', fontSize: 11, width: 105, fontWeight: 700 }}>BILL DATE</Table.Th>
                    <Table.Th style={{ color: '#475569', fontSize: 11, textAlign: 'right', width: 120, fontWeight: 700 }}>TOTAL BILL (₹)</Table.Th>
                    <Table.Th style={{ color: '#475569', fontSize: 11, textAlign: 'right', width: 110, fontWeight: 700 }}>PAID (₹)</Table.Th>
                    <Table.Th style={{ color: '#475569', fontSize: 11, textAlign: 'right', width: 120, fontWeight: 700 }}>PENDING (₹)</Table.Th>
                    <Table.Th style={{ color: '#475569', fontSize: 11, textAlign: 'right', width: 130, fontWeight: 700 }}>
                      ALLOCATE (₹)
                    </Table.Th>
                    <Table.Th style={{ color: '#475569', fontSize: 11, textAlign: 'center', width: 85, fontWeight: 700 }}>
                      ACTION
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {modalAllocations.map((bill, bIdx) => {
                    const hasHistory = bill.PaymentHistory && bill.PaymentHistory.length > 0;
                    const isExpanded = expandedBillRef === bill.BillReference;
                    const isAdvanceRow = bill.BillReference === 'CUSTOMER ADVANCE';

                    return (
                      <React.Fragment key={`${bill.BillReference}_${bIdx}`}>
                        <Table.Tr
                          style={{
                            height: 34,
                            backgroundColor: isAdvanceRow ? '#fdf8f9' : undefined,
                            borderLeft: isAdvanceRow ? '3px solid #800020' : undefined,
                          }}
                        >
                          <Table.Td>
                            {isAdvanceRow ? (
                              <Badge
                                size="xs"
                                variant="outline"
                                color="burgundy"
                                radius="sm"
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  height: 19,
                                  borderColor: '#e2cbd0',
                                  color: '#800020',
                                  padding: '0 5px',
                                }}
                              >
                                ADV
                              </Badge>
                            ) : (
                              <Text size="xs" c="dimmed">
                                {bIdx + 1}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {isAdvanceRow ? (
                              <Group gap={6} align="center" wrap="nowrap">
                                <Text size="xs" fw={700} style={{ color: '#800020' }}>
                                  Customer Advance
                                </Text>
                                <Badge
                                  size="xs"
                                  variant="light"
                                  color="burgundy"
                                  radius="sm"
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: 600,
                                    height: 18,
                                    backgroundColor: '#f5e6e8',
                                    color: '#800020',
                                    border: '1px solid #e8c5cb',
                                    textTransform: 'none',
                                    padding: '0 5px',
                                  }}
                                >
                                  Unallocated
                                </Badge>
                              </Group>
                            ) : (
                              <Group gap={6} align="center" wrap="nowrap">
                                <Text size="xs" fw={600} c="#1e293b">
                                  {bill.BillReference}
                                </Text>
                                {saleId && (String(bill.SalesId) === String(saleId) || String(bill.PurchaseId) === String(saleId)) && (
                                  <Badge size="xs" color="burgundy" variant="light" radius="sm">
                                    New Bill
                                  </Badge>
                                )}
                              </Group>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c={isAdvanceRow ? '#800020' : '#475569'} fw={isAdvanceRow ? 600 : 400}>
                              {isAdvanceRow ? 'On Account' : bill.BillDate}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text size="xs" fw={600} c={isAdvanceRow ? 'dimmed' : '#0f172a'}>
                              {isAdvanceRow ? '—' : `₹${bill.GrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            {isAdvanceRow ? (
                              <Text size="xs" c="dimmed">—</Text>
                            ) : (
                              <Group gap={4} justify="flex-end" align="center" wrap="nowrap">
                                <Text size="xs" fw={600} c={bill.AllocatedSoFar > 0 ? '#800020' : '#64748b'}>
                                  ₹{bill.AllocatedSoFar.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </Text>
                                {bill.AllocatedSoFar > 0 && (
                                  <Box
                                    component="button"
                                    type="button"
                                    onClick={() => setExpandedBillRef(isExpanded ? null : bill.BillReference)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      padding: '2px 4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      color: '#800020',
                                    }}
                                    title="View Payment Breakdown"
                                  >
                                    {isExpanded ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
                                  </Box>
                                )}
                              </Group>
                            )}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text size="xs" fw={700} c={isAdvanceRow ? '#800020' : '#800020'}>
                              {isAdvanceRow ? '—' : `₹${bill.PendingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', paddingRight: 4 }}>
                            <NumberInput
                              size="xs"
                              radius="sm"
                              min={0}
                              max={isAdvanceRow ? undefined : bill.PendingBalance}
                              decimalScale={2}
                              hideControls
                              prefix="₹ "
                              placeholder="0.00"
                              value={bill.AllocatedAmount || ''}
                              onChange={(val) => handleModalAllocChange(bIdx, val)}
                              styles={{
                                input: {
                                  height: 25,
                                  minHeight: 25,
                                  fontWeight: 600,
                                  fontSize: 12,
                                  textAlign: 'right',
                                  borderColor:
                                    !isAdvanceRow && bill.AllocatedAmount > bill.PendingBalance
                                      ? '#dc2626'
                                      : bill.AllocatedAmount > 0
                                      ? '#800020'
                                      : '#cbd5e1',
                                  backgroundColor:
                                    !isAdvanceRow && bill.AllocatedAmount > bill.PendingBalance
                                      ? '#fef2f2'
                                      : bill.AllocatedAmount > 0
                                      ? '#fdf2f4'
                                      : '#ffffff',
                                  color:
                                    !isAdvanceRow && bill.AllocatedAmount > bill.PendingBalance
                                      ? '#dc2626'
                                      : bill.AllocatedAmount > 0
                                      ? '#800020'
                                      : '#0f172a',
                                },
                              }}
                            />
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'center' }}>
                            {!isAdvanceRow && bill.AllocatedAmount === 0 ? (
                              <Button
                                size="compact-xs"
                                variant="light"
                                color="burgundy"
                                onClick={() => handleAllocateRow(bIdx)}
                                styles={{ root: { fontSize: 11, fontWeight: 700, height: 22, padding: '0 8px' } }}
                              >
                                Allocate
                              </Button>
                            ) : (
                              <Button
                                size="compact-xs"
                                variant="subtle"
                                color="gray"
                                disabled={bill.AllocatedAmount === 0}
                                onClick={() => handleModalClear(bIdx)}
                                styles={{ root: { fontSize: 11, height: 22 } }}
                              >
                                Clear
                              </Button>
                            )}
                          </Table.Td>
                        </Table.Tr>

                        {/* Collapsible Payment History Breakdown */}
                        {isExpanded && (
                          <Table.Tr style={{ backgroundColor: '#faf5f6' }}>
                            <Table.Td colSpan={8} style={{ padding: '8px 16px' }}>
                              <Box
                                style={{
                                  border: '1px solid #e2e8f0',
                                  borderRadius: 6,
                                  backgroundColor: '#ffffff',
                                  overflow: 'hidden',
                                }}
                              >
                                <Table verticalSpacing={4} horizontalSpacing="sm">
                                  <Table.Thead style={{ backgroundColor: '#f1f5f9' }}>
                                    <Table.Tr style={{ height: 28 }}>
                                      <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#475569', width: 120 }}>RECEIPT / PAYMENT NO</Table.Th>
                                      <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#475569', width: 130 }}>DATE</Table.Th>
                                      <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>ACCOUNT</Table.Th>
                                      <Table.Th style={{ fontSize: 11, fontWeight: 700, color: '#475569', textAlign: 'right', width: 150 }}>AMOUNT PAID (₹)</Table.Th>
                                    </Table.Tr>
                                  </Table.Thead>
                                  <Table.Tbody>
                                    {hasHistory ? (
                                      bill.PaymentHistory!.map((rec, rIdx) => (
                                        <Table.Tr key={rIdx} style={{ height: 32 }}>
                                          <Table.Td>
                                            <Text size="xs" fw={600} c="#1e293b">
                                              {rec.PaymentNo.replace(/^#/, '')}
                                            </Text>
                                          </Table.Td>
                                          <Table.Td>
                                            <Text size="xs" c="#334155" fw={500}>
                                              {rec.Date}
                                            </Text>
                                          </Table.Td>
                                          <Table.Td>
                                            <Text size="xs" fw={500} c="#0f172a">
                                              {rec.Account}
                                            </Text>
                                          </Table.Td>
                                          <Table.Td style={{ textAlign: 'right' }}>
                                            <Text size="xs" fw={700} c="#15803d">
                                              ₹{Number(rec.Amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </Text>
                                          </Table.Td>
                                        </Table.Tr>
                                      ))
                                    ) : (
                                      <Table.Tr>
                                        <Table.Td colSpan={4} style={{ textAlign: 'center', padding: '10px' }}>
                                          <Text size="xs" c="dimmed" fs="italic">
                                            No prior payment or receipt transactions recorded for this bill.
                                          </Text>
                                        </Table.Td>
                                      </Table.Tr>
                                    )}
                                  </Table.Tbody>
                                </Table>
                              </Box>
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Box>
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
              disabled={modalTotals.hasError}
              style={{
                backgroundColor: modalTotals.hasError ? '#e2e8f0' : '#800020',
                color: modalTotals.hasError ? '#94a3b8' : '#ffffff',
                cursor: modalTotals.hasError ? 'not-allowed' : 'pointer',
              }}
              onClick={handleApplyModalAllocations}
            >
              Save Allocation
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
};
