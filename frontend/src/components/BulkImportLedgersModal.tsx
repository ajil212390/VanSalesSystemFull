import React, { useState, useMemo } from 'react';
import {
  Modal,
  Table,
  Button,
  Group,
  Stack,
  Text,
  Box,
  FileButton,
  ActionIcon,
  Badge,
  Paper,
  SimpleGrid,
  Collapse,
  ThemeIcon,
  Tooltip,
  TextInput,
  NumberInput,
  Select,
} from '@mantine/core';
import {
  IconFileSpreadsheet,
  IconUpload,
  IconDownload,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconPencil,
  IconX,
  IconPlus,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { apiClient } from '../api/client';

export interface BulkImportBillItem {
  BillNo: string;
  BillDate: string;
  DueDate?: string | null;
  Amount: number;
  Narration?: string;
}

export interface BulkImportLedgerItem {
  id: string;
  LedgerName: string;
  GroupName: string;
  OpeningBalance: number;
  OpeningBalanceType: 'DR' | 'CR';
  IsBillWise?: boolean;
  GSTRegistrationType?: string;
  MobileNumber?: string;
  GSTIN?: string;
  PAN?: string;
  AddressLine1?: string;
  City?: string;
  State?: string;
  Pincode?: string;
  Narration?: string;
  bills: BulkImportBillItem[];
}

interface BulkImportLedgersModalProps {
  opened: boolean;
  onClose: () => void;
  availableGroups: { value: string; label: string }[];
}

function parseExcelDate(val: any): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? '' : val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const parts = str.split(/[-/.\s]+/);
  if (parts.length === 3) {
    let [p1, p2, p3] = parts;
    if (p3.length === 2) {
      p3 = Number(p3) > 50 ? `19${p3}` : `20${p3}`;
    }
    if (p1.length === 4) {
      return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
    }
    if (p3.length === 4) {
      return `${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return '';
}

function parseNumeric(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normalizeGstRegistrationType(val: any, hasGstin?: boolean): 'Unregistered' | 'Regular' | 'Composition' {
  if (!val) return hasGstin ? 'Regular' : 'Unregistered';
  const str = String(val).toLowerCase().trim();
  if (str.includes('comp')) return 'Composition';
  if (str.includes('reg')) return 'Regular';
  if (str.includes('unreg') || str.includes('cons')) return 'Unregistered';
  return hasGstin ? 'Regular' : 'Unregistered';
}

export const BulkImportLedgersModal: React.FC<BulkImportLedgersModalProps> = ({
  opened,
  onClose,
  availableGroups,
}) => {
  const queryClient = useQueryClient();
  const [parsedLedgers, setParsedLedgers] = useState<BulkImportLedgerItem[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});
  const [fileName, setFileName] = useState<string>('');

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editRowData, setEditRowData] = useState<BulkImportLedgerItem | null>(null);

  // Bill Editing State
  const [editingBillKey, setEditingBillKey] = useState<string | null>(null); // format: `${ledgerId}-${billIndex}`
  const [editingBillData, setEditingBillData] = useState<BulkImportBillItem | null>(null);

  const groupSelectOptions = useMemo(() => {
    return availableGroups.map((g) => ({
      value: g.label.replace(/\s*\(.*?\)/, '').trim(),
      label: g.label,
    }));
  }, [availableGroups]);

  const toggleExpand = (id: string) => {
    setExpandedRowIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEdit = (item: BulkImportLedgerItem) => {
    setEditingRowId(item.id);
    setEditRowData({ ...item });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditRowData(null);
  };

  const handleSaveEdit = () => {
    if (!editRowData) return;
    if (!editRowData.LedgerName.trim()) {
      notifications.show({
        title: 'Validation',
        message: 'Ledger name cannot be blank.',
        color: 'red',
      });
      return;
    }
    setParsedLedgers((prev) =>
      prev.map((l) => (l.id === editRowData.id ? { ...editRowData } : l))
    );
    setEditingRowId(null);
    setEditRowData(null);
  };

  // Bill Actions
  const handleStartEditBill = (ledgerId: string, billIdx: number, bill: BulkImportBillItem) => {
    setEditingBillKey(`${ledgerId}-${billIdx}`);
    setEditingBillData({ ...bill });
  };

  const handleCancelEditBill = () => {
    setEditingBillKey(null);
    setEditingBillData(null);
  };

  const handleSaveEditBill = (ledgerId: string, billIdx: number) => {
    if (!editingBillData) return;
    if (!editingBillData.BillNo.trim()) {
      notifications.show({
        title: 'Validation',
        message: 'Bill Ref No cannot be blank.',
        color: 'red',
      });
      return;
    }
    setParsedLedgers((prev) =>
      prev.map((l) => {
        if (l.id !== ledgerId) return l;
        const updatedBills = [...l.bills];
        updatedBills[billIdx] = { ...editingBillData };
        return { ...l, bills: updatedBills };
      })
    );
    setEditingBillKey(null);
    setEditingBillData(null);
  };

  const handleDeleteBill = (ledgerId: string, billIdx: number) => {
    setParsedLedgers((prev) =>
      prev.map((l) => {
        if (l.id !== ledgerId) return l;
        return {
          ...l,
          bills: l.bills.filter((_, i) => i !== billIdx),
        };
      })
    );
    if (editingBillKey === `${ledgerId}-${billIdx}`) {
      setEditingBillKey(null);
      setEditingBillData(null);
    }
  };

  const handleAddBill = (ledgerId: string) => {
    const newBill: BulkImportBillItem = {
      BillNo: `BILL-${Math.floor(1000 + Math.random() * 9000)}`,
      BillDate: new Date().toISOString().split('T')[0],
      DueDate: '',
      Amount: 0,
      Narration: '',
    };
    setParsedLedgers((prev) =>
      prev.map((l) => {
        if (l.id !== ledgerId) return l;
        return {
          ...l,
          bills: [...l.bills, newBill],
        };
      })
    );
    // Expand this row so bill breakdown is immediately visible
    setExpandedRowIds((prev) => ({ ...prev, [ledgerId]: true }));
    // Open the new bill in edit mode right away
    const currentLedger = parsedLedgers.find((l) => l.id === ledgerId);
    const newIdx = currentLedger ? currentLedger.bills.length : 0;
    setEditingBillKey(`${ledgerId}-${newIdx}`);
    setEditingBillData(newBill);
  };

  const handleSyncBalanceToBills = (ledgerId: string) => {
    const ledger = parsedLedgers.find((l) => l.id === ledgerId);
    if (!ledger) return;
    const totalBills = ledger.bills.reduce((sum, b) => sum + (Number(b.Amount) || 0), 0);
    setParsedLedgers((prev) =>
      prev.map((l) => (l.id === ledgerId ? { ...l, OpeningBalance: totalBills } : l))
    );
    notifications.show({
      title: 'Balance Synced',
      message: `Updated ${ledger.LedgerName}'s Opening Balance to ₹${totalBills.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`,
      color: 'burgundy',
    });
  };

  const resetState = () => {
    setParsedLedgers([]);
    setExpandedRowIds({});
    setFileName('');
    setEditingRowId(null);
    setEditRowData(null);
    setEditingBillKey(null);
    setEditingBillData(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        'Ledger Name': 'Kochi Supermarkets',
        'Account Group': 'Sundry Debtors',
        'Opening Balance': 40000,
        'Balance Type': 'DR',
        'Bill No': 'INV-2023-010',
        'Bill Date': '2023-11-15',
        'Due Date': '2023-12-15',
        'Bill Amount': 25000,
        'Bill Remarks': 'Nov cylinder delivery',
        'GST Registration Type': 'Regular Taxpayer',
        'GSTIN': '32AAAAA0000A1Z5',
        'Mobile Number': '9847012345',
        'City': 'Kochi',
        'State': 'Kerala',
        'Pincode': '682001',
        'Narration': 'Regular retail debtor',
      },
      {
        'Ledger Name': 'Kochi Supermarkets',      
        'Account Group': 'Sundry Debtors',
        'Opening Balance': 40000,
        'Balance Type': 'DR',
        'Bill No': 'INV-2023-025',
        'Bill Date': '2023-12-01',
        'Due Date': '2024-01-01',
        'Bill Amount': 15000,
        'Bill Remarks': 'Dec cylinder delivery',
        'GST Registration Type': 'Regular Taxpayer',
        'GSTIN': '32AAAAA0000A1Z5',
        'Mobile Number': '9847012345',
        'City': 'Kochi',
        'State': 'Kerala',
        'Pincode': '682001',
        'Narration': 'Regular retail debtor',
      },
      {
        'Ledger Name': 'Apex Gas Bottling Ltd',
        'Account Group': 'Sundry Creditors',
        'Opening Balance': 75000,
        'Balance Type': 'CR',
        'Bill No': 'PB-2023-902',
        'Bill Date': '2023-11-20',
        'Due Date': '2023-12-20',
        'Bill Amount': 75000,
        'Bill Remarks': 'Bulk gas purchase invoice',
        'GST Registration Type': 'Regular Taxpayer',
        'GSTIN': '32BBBBB1111B1Z2',
        'Mobile Number': '04842555666',
        'City': 'Aluva',
        'State': 'Kerala',
        'Pincode': '683101',
        'Narration': 'Primary LPG supplier',
      },
      {
        'Ledger Name': 'Green City Traders',
        'Account Group': 'Sundry Debtors',
        'Opening Balance': 20000,
        'Balance Type': 'DR',
        'Bill No': 'INV-2023-030',
        'Bill Date': '2023-12-10',
        'Due Date': '2024-01-10',
        'Bill Amount': 20000,
        'Bill Remarks': 'Retail composition delivery',
        'GST Registration Type': 'Composition Scheme',
        'GSTIN': '32CCCCC2222C1Z3',
        'Mobile Number': '9847199999',
        'City': 'Thrissur',
        'State': 'Kerala',
        'Pincode': '680001',
        'Narration': 'Dealer under composition scheme',
      },
      {
        'Ledger Name': 'State Bank of India - Current A/c',
        'Account Group': 'Bank Accounts',
        'Opening Balance': 185000,
        'Balance Type': 'DR',
        'Bill No': '',
        'Bill Date': '',
        'Due Date': '',
        'Bill Amount': '',
        'Bill Remarks': '',
        'GST Registration Type': 'Unregistered / Consumer',
        'GSTIN': '',
        'Mobile Number': '',
        'City': 'Kochi',
        'State': 'Kerala',
        'Pincode': '682011',
        'Narration': 'Main operating account',
      },
      {
        'Ledger Name': 'Office Rent & Maintenance',
        'Account Group': 'Indirect Expenses',
        'Opening Balance': 0,
        'Balance Type': 'DR',
        'Bill No': '',
        'Bill Date': '',
        'Due Date': '',
        'Bill Amount': '',
        'Bill Remarks': '',
        'GST Registration Type': 'Unregistered / Consumer',
        'GSTIN': '',
        'Mobile Number': '',
        'City': '',
        'State': '',
        'Pincode': '',
        'Narration': 'Godown and office lease expense',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    // Add generous column widths for better spacing and formatting
    ws['!cols'] = [
      { wch: 32 }, // Ledger Name
      { wch: 22 }, // Account Group
      { wch: 18 }, // Opening Balance
      { wch: 15 }, // Balance Type
      { wch: 18 }, // Bill No
      { wch: 15 }, // Bill Date
      { wch: 15 }, // Due Date
      { wch: 16 }, // Bill Amount
      { wch: 28 }, // Bill Remarks
      { wch: 24 }, // GST Registration Type
      { wch: 20 }, // GSTIN
      { wch: 18 }, // Mobile Number
      { wch: 16 }, // City
      { wch: 16 }, // State
      { wch: 14 }, // Pincode
      { wch: 32 }, // Narration
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger_Bulk_Import');
    XLSX.writeFile(wb, 'RouteFlow_Ledger_Bulk_Import_Template.xlsx');
  };

  // Match column header alias
  const matchCol = (raw: string): string | null => {
    if (!raw) return null;
    const k = String(raw).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!k) return null;

    if (['duedate', 'due', 'duedt', 'expirydate', 'maturitydate'].some((a) => k === a || k.includes(a))) {
      return 'dueDate';
    }
    if (['billdate', 'invoicedate', 'invdate', 'billdt', 'docdate', 'entrydate', 'voucherdate'].some((a) => k === a || k.includes(a))) {
      return 'billDate';
    }
    if (['billamount', 'billamt', 'invamount', 'pendingamount', 'billvalue'].some((a) => k === a || k.includes(a))) {
      return 'billAmount';
    }
    if (['billno', 'invoiceno', 'invno', 'refno', 'referenceno', 'bill', 'voucher', 'docno'].some((a) => k === a || k.includes(a))) {
      return 'billNo';
    }
    if (['billremarks', 'billnarration', 'itemremarks', 'lineitemremarks'].some((a) => k === a || k.includes(a))) {
      return 'billNarration';
    }
    if (['balancetype', 'baltype', 'drcr', 'dr/cr', 'optype', 'type'].some((a) => k === a || k.includes(a))) {
      return 'openingBalanceType';
    }
    if (['openingbalance', 'openbal', 'balance', 'opening', 'amount', 'opbal', 'currbal'].some((a) => k === a || k.includes(a))) {
      return 'openingBalance';
    }
    if (['accountgroup', 'groupname', 'acctype', 'accounttype', 'head', 'group'].some((a) => k === a || k.includes(a))) {
      return 'groupName';
    }
    if (['ledgername', 'partyname', 'accountname', 'party', 'customer', 'supplier', 'ledger', 'name'].some((a) => k === a || k.includes(a))) {
      return 'ledgerName';
    }
    if (['gstregistrationtype', 'registrationtype', 'gstregtype', 'regtype', 'gsttype', 'taxtype', 'gstregistration'].some((a) => k === a || k.includes(a))) {
      return 'gstRegistrationType';
    }
    if (['gstin', 'gst', 'gstno', 'taxno'].some((a) => k === a || k.includes(a))) {
      return 'gstin';
    }
    if (['pan', 'panno'].some((a) => k === a || k.includes(a))) {
      return 'pan';
    }
    if (['mobile', 'phone', 'contact', 'mobilenumber', 'phonenumber', 'tel'].some((a) => k === a || k.includes(a))) {
      return 'mobile';
    }
    if (['city', 'town', 'location'].some((a) => k === a || k.includes(a))) {
      return 'city';
    }
    if (['state', 'province', 'statecode'].some((a) => k === a || k.includes(a))) {
      return 'state';
    }
    if (['pincode', 'pin', 'postalcode', 'zip'].some((a) => k === a || k.includes(a))) {
      return 'pincode';
    }
    if (['address', 'addressline1', 'street'].some((a) => k === a || k.includes(a))) {
      return 'address';
    }
    if (['narration', 'remarks', 'notes', 'description'].some((a) => k === a || k.includes(a))) {
      return 'narration';
    }

    return null;
  };

  // Upload and parse file
  const handleFileUpload = (file: File | null) => {
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!rows || rows.length === 0) {
          notifications.show({
            title: 'Empty File',
            message: 'No data found in uploaded sheet.',
            color: 'orange',
          });
          return;
        }

        // Identify header row
        let headerRowIdx = 0;
        let maxMatched = 0;
        let colMap: Record<number, string> = {};

        const searchLimit = Math.min(10, rows.length);
        for (let r = 0; r < searchLimit; r++) {
          const row = rows[r];
          if (!Array.isArray(row)) continue;

          let matches = 0;
          const currentMap: Record<number, string> = {};

          row.forEach((cell, idx) => {
            const mapped = matchCol(String(cell));
            if (mapped && !Object.values(currentMap).includes(mapped)) {
              currentMap[idx] = mapped;
              matches++;
            }
          });

          if (matches > maxMatched) {
            maxMatched = matches;
            headerRowIdx = r;
            colMap = currentMap;
          }
        }

        // Group rows by Ledger Name
        const dataRows = rows.slice(headerRowIdx + 1);
        const groupedMap = new Map<string, BulkImportLedgerItem>();

        dataRows.forEach((row) => {
          if (!Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) {
            return;
          }

          let lName = '';
          let gName = '';
          let opBal = 0;
          let opType: 'DR' | 'CR' = 'DR';
          let billNo = '';
          let billDate = '';
          let dueDate = '';
          let billAmt = 0;
          let billNarration = '';
          let gstRegType = '';
          let mobile = '';
          let gstin = '';
          let pan = '';
          let city = '';
          let state = '';
          let pincode = '';
          let address = '';
          let narration = '';

          row.forEach((cell, idx) => {
            const m = colMap[idx];
            if (m === 'ledgerName') lName = String(cell).trim();
            else if (m === 'groupName') gName = String(cell).trim();
            else if (m === 'openingBalance') opBal = parseNumeric(cell);
            else if (m === 'openingBalanceType') {
              const t = String(cell).trim().toUpperCase();
              opType = t.includes('CR') ? 'CR' : 'DR';
            } else if (m === 'billNo') billNo = String(cell).trim();
            else if (m === 'billDate') billDate = parseExcelDate(cell);
            else if (m === 'dueDate') dueDate = parseExcelDate(cell);
            else if (m === 'billAmount') billAmt = parseNumeric(cell);
            else if (m === 'billNarration') billNarration = String(cell).trim();
            else if (m === 'gstRegistrationType') gstRegType = String(cell).trim();
            else if (m === 'mobile') mobile = String(cell).trim();
            else if (m === 'gstin') gstin = String(cell).trim().toUpperCase();
            else if (m === 'pan') pan = String(cell).trim().toUpperCase();
            else if (m === 'city') city = String(cell).trim();
            else if (m === 'state') state = String(cell).trim();
            else if (m === 'pincode') pincode = String(cell).trim();
            else if (m === 'address') address = String(cell).trim();
            else if (m === 'narration') narration = String(cell).trim();
          });

          if (!lName) return;

          const key = lName.toLowerCase();
          let existing = groupedMap.get(key);

          if (!existing) {
            existing = {
              id: Math.random().toString(36).substring(2, 9),
              LedgerName: lName,
              GroupName: gName || 'Sundry Debtors',
              OpeningBalance: opBal,
              OpeningBalanceType: opType,
              GSTRegistrationType: normalizeGstRegistrationType(gstRegType, !!gstin),
              MobileNumber: mobile || undefined,
              GSTIN: gstin || undefined,
              PAN: pan || undefined,
              City: city || undefined,
              State: state || undefined,
              Pincode: pincode || undefined,
              AddressLine1: address || undefined,
              Narration: narration || undefined,
              bills: [],
            };
            groupedMap.set(key, existing);
          } else {
            // Update missing fields if available in secondary rows
            if (!existing.GroupName && gName) existing.GroupName = gName;
            if (!existing.GSTRegistrationType && gstRegType) {
              existing.GSTRegistrationType = normalizeGstRegistrationType(gstRegType, !!(existing.GSTIN || gstin));
            }
            if (!existing.MobileNumber && mobile) existing.MobileNumber = mobile;
            if (!existing.GSTIN && gstin) existing.GSTIN = gstin;
            if (!existing.City && city) existing.City = city;
            if (!existing.State && state) existing.State = state;
            if (!existing.Pincode && pincode) existing.Pincode = pincode;
            if (!existing.AddressLine1 && address) existing.AddressLine1 = address;
          }

          // If this row has an opening bill
          if (billNo || billAmt > 0) {
            existing.bills.push({
              BillNo: billNo || `OB-${existing.bills.length + 1}`,
              BillDate: billDate || new Date().toISOString().split('T')[0],
              DueDate: dueDate || null,
              Amount: billAmt > 0 ? billAmt : opBal,
              Narration: billNarration || narration || 'Opening Bill',
            });
          }
        });

        // For ledgers where opening balance was 0 but bills were added, compute sum
        const result = Array.from(groupedMap.values()).map((item) => {
          if (item.OpeningBalance === 0 && item.bills.length > 0) {
            const sum = item.bills.reduce((s, b) => s + b.Amount, 0);
            return { ...item, OpeningBalance: sum };
          }
          return item;
        });

        if (result.length === 0) {
          notifications.show({
            title: 'No Ledgers Found',
            message: 'Could not detect valid ledger rows in the uploaded file.',
            color: 'orange',
          });
          return;
        }

        setParsedLedgers(result);
        notifications.show({
          title: 'File Parsed Successfully',
          message: `Parsed ${result.length} ledger(s) and ${result.reduce((c, l) => c + l.bills.length, 0)} bill(s).`,
          color: 'teal',
        });
      } catch (err: any) {
        notifications.show({
          title: 'Parsing Failed',
          message: err?.message || 'Failed to read spreadsheet.',
          color: 'red',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRemoveLedger = (idx: number) => {
    setParsedLedgers((prev) => prev.filter((_, i) => i !== idx));
  };

  // Bulk Import Mutation
  const importMutation = useMutation({
    mutationFn: async (ledgers: BulkImportLedgerItem[]) => {
      const payload = {
        ledgers: ledgers.map((l) => ({
          LedgerName: l.LedgerName,
          GroupName: l.GroupName,
          OpeningBalance: l.OpeningBalance,
          OpeningBalanceType: l.OpeningBalanceType,
          IsBillWise: l.bills.length > 0,
          GSTRegistrationType: l.GSTRegistrationType || (l.GSTIN ? 'Regular' : 'Unregistered'),
          MobileNumber: l.MobileNumber || null,
          GSTIN: l.GSTIN || null,
          PAN: l.PAN || null,
          AddressLine1: l.AddressLine1 || null,
          City: l.City || null,
          State: l.State || null,
          Pincode: l.Pincode || null,
          Narration: l.Narration || null,
          bills: l.bills.map((b) => ({
            BillNo: b.BillNo,
            BillDate: b.BillDate,
            DueDate: b.DueDate || null,
            Amount: b.Amount,
            Narration: b.Narration || '',
          })),
        })),
      };
      const res = await apiClient.post('/ledgers/bulk-import/', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      notifications.show({
        title: 'Bulk Import Completed',
        message: `Imported ${data.created_count} new ledger(s), updated ${data.updated_count}, and created ${data.total_bills_count} opening bill(s)!`,
        color: 'burgundy',
        autoClose: 6000,
      });
      handleClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.message || 'Failed to import ledgers.';
      notifications.show({
        title: 'Import Failed',
        message: String(msg),
        color: 'red',
        autoClose: 8000,
      });
    },
  });

  // Calculate totals
  const stats = useMemo(() => {
    let totalBills = 0;
    let totalDr = 0;
    let totalCr = 0;

    parsedLedgers.forEach((l) => {
      totalBills += l.bills.length;
      if (l.OpeningBalanceType === 'CR') {
        totalCr += l.OpeningBalance;
      } else {
        totalDr += l.OpeningBalance;
      }
    });

    return { totalBills, totalDr, totalCr };
  }, [parsedLedgers]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <ThemeIcon color="burgundy" variant="light" size="lg" radius="md">
            <IconFileSpreadsheet size={20} color="#800020" />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md" style={{ color: '#800020' }}>
              Bulk Import Ledgers & Opening Bills
            </Text>
            <Text size="xs" c="dimmed">
              Import party accounts, classification groups, opening balances, and bill details from a single spreadsheet.
            </Text>
          </div>
        </Group>
      }
      size="1140px"
      radius="md"
      padding="lg"
      styles={{
        header: {
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: 14,
        },
      }}
    >
      <Stack gap="md">
        {/* Preview State or Instructions */}
        {parsedLedgers.length === 0 ? (
          <Paper
            p="xl"
            radius="md"
            withBorder
            style={{
              textAlign: 'center',
              backgroundColor: '#fdfbfa',
              borderStyle: 'dashed',
              borderWidth: 2,
              borderColor: '#e8d2d6',
              paddingTop: 50,
              paddingBottom: 50,
            }}
          >
            <ThemeIcon color="burgundy" variant="light" size={60} radius="xl" mb="md" style={{ backgroundColor: '#fff5f7' }}>
              <IconFileSpreadsheet size={32} color="#800020" />
            </ThemeIcon>

            <Text fw={700} size="lg" style={{ color: '#800020' }} mb={4}>
              Select Excel or CSV Spreadsheet
            </Text>

            <Text size="xs" c="dimmed" maw={520} mx="auto" mb="xl">
              Upload an Excel (.xlsx, .xls) or CSV spreadsheet containing party and general ledgers. You can include opening invoice/bill items, which will automatically group under their respective ledgers.
            </Text>

            <Group justify="center" gap="md" mb="md">
              <FileButton onChange={handleFileUpload} accept=".xlsx,.xls,.csv">
                {(props) => (
                  <Button
                    {...props}
                    color="burgundy"
                    size="md"
                    radius="md"
                    leftSection={<IconUpload size={18} />}
                    styles={{
                      root: {
                        backgroundColor: '#800020',
                        fontWeight: 600,
                        paddingLeft: 24,
                        paddingRight: 24,
                        height: 44,
                        boxShadow: '0 2px 6px rgba(128, 0, 32, 0.25)',
                      },
                    }}
                  >
                    Select Excel / CSV File
                  </Button>
                )}
              </FileButton>

              <Button
                variant="default"
                size="md"
                radius="md"
                leftSection={<IconDownload size={16} color="#800020" />}
                onClick={handleDownloadTemplate}
                styles={{
                  root: {
                    fontWeight: 600,
                    height: 44,
                    borderColor: '#e2e8f0',
                    color: '#334155',
                  },
                }}
              >
                Download Sample Template
              </Button>
            </Group>

            <Text size="xs" c="dimmed">
              Supports <strong>.xlsx</strong>, <strong>.xls</strong>, and <strong>.csv</strong>. Multiple bill rows for the same ledger auto-merge!
            </Text>
          </Paper>
        ) : (
          <Box>
            {/* Upload & Template Control Strip (when sheet is loaded) */}
            <Paper p="xs" px="md" radius="sm" withBorder mb="sm" style={{ backgroundColor: '#fafafa', borderColor: '#e2e8f0' }}>
              <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                <Group gap="xs">
                  <FileButton onChange={handleFileUpload} accept=".xlsx,.xls,.csv">
                    {(props) => (
                      <Button
                        {...props}
                        color="burgundy"
                        variant="light"
                        size="xs"
                        radius="md"
                        leftSection={<IconUpload size={14} />}
                      >
                        Choose Different File
                      </Button>
                    )}
                  </FileButton>

                  <Button
                    variant="default"
                    size="xs"
                    radius="md"
                    leftSection={<IconDownload size={13} color="#800020" />}
                    onClick={handleDownloadTemplate}
                  >
                    Download Sample Template
                  </Button>

                  {fileName && (
                    <Badge color="burgundy" variant="outline" size="sm" styles={{ root: { borderColor: '#f5c2cb', color: '#800020' } }}>
                      {fileName}
                    </Badge>
                  )}
                </Group>

                <Text size="xs" c="dimmed">
                  Edit ledger details and opening bills inline before importing.
                </Text>
              </Group>
            </Paper>

            {/* Summary Strip - Strictly RouteFlow Burgundy brand palette */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mb="sm">
              <Paper p="xs" px="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9' }}>
                <Text size="xs" c="#64748b" fw={500}>
                  Total Ledgers
                </Text>
                <Text size="lg" fw={700} style={{ color: '#800020' }}>
                  {parsedLedgers.length}
                </Text>
              </Paper>

              <Paper p="xs" px="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9' }}>
                <Text size="xs" c="#64748b" fw={500}>
                  Total Attached Bills
                </Text>
                <Text size="lg" fw={700} style={{ color: '#800020' }}>
                  {stats.totalBills}
                </Text>
              </Paper>

              <Paper p="xs" px="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9' }}>
                <Text size="xs" c="#64748b" fw={500}>
                  Total Debit (DR)
                </Text>
                <Text size="lg" fw={700} style={{ color: '#800020' }}>
                  ₹{stats.totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </Paper>

              <Paper p="xs" px="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9' }}>
                <Text size="xs" c="#64748b" fw={500}>
                  Total Credit (CR)
                </Text>
                <Text size="lg" fw={700} style={{ color: '#800020' }}>
                  ₹{stats.totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </Paper>
            </SimpleGrid>

            {/* Preview Table */}
            <Box
              style={{
                maxHeight: 380,
                overflowY: 'auto',
                border: '1px solid #f1f5f9',
                borderRadius: 6,
              }}
            >
              <Table highlightOnHover withColumnBorders verticalSpacing={4} horizontalSpacing={8} style={{ fontSize: 12 }}>
                <Table.Thead style={{ backgroundColor: '#fff5f7', position: 'sticky', top: 0, zIndex: 2 }}>
                  <Table.Tr>
                    <Table.Th style={{ width: 40, textAlign: 'center', color: '#800020', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, padding: '6px 4px' }}>#</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, padding: '6px 8px' }}>LEDGER NAME</Table.Th>
                    <Table.Th style={{ width: 175, color: '#800020', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, padding: '6px 8px' }}>ACCOUNT GROUP</Table.Th>
                    <Table.Th style={{ width: 130, textAlign: 'right', color: '#800020', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, padding: '6px 8px' }}>OPENING BALANCE</Table.Th>
                    <Table.Th style={{ width: 65, textAlign: 'center', color: '#800020', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, padding: '6px 4px' }}>TYPE</Table.Th>
                    <Table.Th style={{ width: 95, textAlign: 'center', color: '#800020', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, padding: '6px 4px' }}>BILLS</Table.Th>
                    <Table.Th style={{ width: 200, color: '#800020', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, padding: '6px 8px' }}>GST & CONTACT</Table.Th>
                    <Table.Th style={{ width: 75, textAlign: 'center', color: '#800020', fontWeight: 700, fontSize: 11, letterSpacing: 0.5, padding: '6px 4px' }}>ACTIONS</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {parsedLedgers.map((l, idx) => {
                    const isExpanded = !!expandedRowIds[l.id];
                    const hasBills = l.bills.length > 0;
                    const isEditing = editingRowId === l.id && editRowData;

                    return (
                      <React.Fragment key={l.id}>
                        <Table.Tr style={{ backgroundColor: isEditing ? '#fdf2f4' : idx % 2 === 1 ? '#fdfdfd' : '#ffffff' }}>
                          <Table.Td style={{ textAlign: 'center', color: '#64748b', fontSize: 11, padding: '4px' }}>{idx + 1}</Table.Td>

                          {/* 1. Ledger Name */}
                          <Table.Td style={{ padding: '4px 8px' }}>
                            {isEditing ? (
                              <Stack gap={4}>
                                <TextInput
                                  size="xs"
                                  value={editRowData.LedgerName}
                                  onChange={(e) => setEditRowData({ ...editRowData, LedgerName: e.currentTarget.value })}
                                  placeholder="Ledger Name"
                                  styles={{ input: { fontWeight: 600 } }}
                                />
                                <Group gap={4} grow>
                                  <TextInput
                                    size="xs"
                                    value={editRowData.City || ''}
                                    onChange={(e) => setEditRowData({ ...editRowData, City: e.currentTarget.value })}
                                    placeholder="City"
                                    styles={{ input: { fontSize: 11, height: 24, minHeight: 24 } }}
                                  />
                                  <TextInput
                                    size="xs"
                                    value={editRowData.Pincode || ''}
                                    onChange={(e) => setEditRowData({ ...editRowData, Pincode: e.currentTarget.value })}
                                    placeholder="Pincode"
                                    maxLength={10}
                                    styles={{ input: { fontSize: 11, height: 24, minHeight: 24 } }}
                                  />
                                </Group>
                              </Stack>
                            ) : (
                              <>
                                <Text fw={600} size="xs" c="#1e293b" style={{ lineHeight: 1.25 }}>
                                  {l.LedgerName}
                                </Text>
                                {(l.City || l.State || l.Pincode) && (
                                  <Text size="11px" c="dimmed" style={{ lineHeight: 1.1 }}>
                                    {[l.City, l.State, l.Pincode ? `PIN: ${l.Pincode}` : ''].filter(Boolean).join(', ')}
                                  </Text>
                                )}
                              </>
                            )}
                          </Table.Td>

                          {/* 2. Account Group */}
                          <Table.Td style={{ padding: '4px 8px' }}>
                            {isEditing ? (
                              <Select
                                size="xs"
                                data={groupSelectOptions}
                                value={editRowData.GroupName}
                                onChange={(val) => setEditRowData({ ...editRowData, GroupName: val || '' })}
                                searchable
                                placeholder="Select Group"
                              />
                            ) : (
                              <Badge
                                variant="outline"
                                color="burgundy"
                                size="xs"
                                styles={{
                                  root: {
                                    borderColor: '#800020',
                                    color: '#800020',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.3,
                                    padding: '0 6px',
                                    height: 19,
                                    fontSize: 10,
                                    backgroundColor: '#fff5f7',
                                  },
                                }}
                              >
                                {l.GroupName}
                              </Badge>
                            )}
                          </Table.Td>

                          {/* 3. Opening Balance */}
                          <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, padding: '4px 8px' }}>
                            {isEditing ? (
                              <NumberInput
                                size="xs"
                                min={0}
                                decimalScale={2}
                                hideControls
                                prefix="₹ "
                                value={editRowData.OpeningBalance}
                                onChange={(val) => setEditRowData({ ...editRowData, OpeningBalance: Number(val) || 0 })}
                              />
                            ) : (
                              `₹${l.OpeningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            )}
                          </Table.Td>

                          {/* 4. Balance Type (Clean DR / CR text, no pill UI) */}
                          <Table.Td style={{ textAlign: 'center', padding: '4px' }}>
                            {isEditing ? (
                              <Select
                                size="xs"
                                data={[
                                  { value: 'DR', label: 'DR' },
                                  { value: 'CR', label: 'CR' },
                                ]}
                                value={editRowData.OpeningBalanceType}
                                onChange={(val) => setEditRowData({ ...editRowData, OpeningBalanceType: (val as 'DR' | 'CR') || 'DR' })}
                              />
                            ) : (
                              <Text size="xs" fw={700} style={{ color: '#800020', letterSpacing: 0.5 }}>
                                {l.OpeningBalanceType}
                              </Text>
                            )}
                          </Table.Td>

                          {/* 5. Bills Count */}
                          <Table.Td style={{ textAlign: 'center', padding: '4px' }}>
                            {hasBills ? (
                              <Button
                                variant="subtle"
                                size="compact-xs"
                                color="burgundy"
                                rightSection={isExpanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
                                onClick={() => toggleExpand(l.id)}
                                style={{ fontSize: 11, fontWeight: 600, color: '#800020', height: 22 }}
                              >
                                {l.bills.length} Bill{l.bills.length > 1 ? 's' : ''}
                              </Button>
                            ) : (
                              <Button
                                variant="subtle"
                                size="compact-xs"
                                color="burgundy"
                                leftSection={<IconPlus size={11} />}
                                onClick={() => handleAddBill(l.id)}
                                style={{ fontSize: 11, color: '#800020', fontWeight: 600, height: 22 }}
                                title="Attach opening bills to this ledger"
                              >
                                Add Bill
                              </Button>
                            )}
                          </Table.Td>

                          {/* 6. GST & Contact */}
                          <Table.Td style={{ padding: '4px 8px' }}>
                            {isEditing ? (
                              <Stack gap={4}>
                                <Select
                                  size="xs"
                                  placeholder="GST Registration Type"
                                  data={[
                                    { value: 'Unregistered', label: 'Unregistered / Consumer' },
                                    { value: 'Regular', label: 'Regular Taxpayer' },
                                    { value: 'Composition', label: 'Composition Scheme' },
                                  ]}
                                  value={editRowData.GSTRegistrationType || 'Unregistered'}
                                  onChange={(val) => setEditRowData({ ...editRowData, GSTRegistrationType: val || 'Unregistered' })}
                                  styles={{
                                    input: { fontSize: 11, height: 26, minHeight: 26 },
                                  }}
                                />
                                <TextInput
                                  size="xs"
                                  placeholder="GSTIN (15 Digits)"
                                  maxLength={15}
                                  value={editRowData.GSTIN || ''}
                                  onChange={(e) => setEditRowData({ ...editRowData, GSTIN: e.currentTarget.value.toUpperCase() })}
                                  styles={{
                                    input: { fontSize: 11, height: 26, minHeight: 26 },
                                  }}
                                />
                                <TextInput
                                  size="xs"
                                  placeholder="Mobile Number"
                                  value={editRowData.MobileNumber || ''}
                                  onChange={(e) => setEditRowData({ ...editRowData, MobileNumber: e.currentTarget.value })}
                                  styles={{
                                    input: { fontSize: 11, height: 26, minHeight: 26 },
                                  }}
                                />
                              </Stack>
                            ) : (
                              <Stack gap={2}>
                                <Badge
                                  size="xs"
                                  variant="outline"
                                  styles={{
                                    root: {
                                      fontSize: 9,
                                      fontWeight: 600,
                                      height: 18,
                                      padding: '0 6px',
                                      width: 'fit-content',
                                      borderColor: l.GSTRegistrationType === 'Regular' ? '#800020' : l.GSTRegistrationType === 'Composition' ? '#d97706' : '#cbd5e1',
                                      color: l.GSTRegistrationType === 'Regular' ? '#800020' : l.GSTRegistrationType === 'Composition' ? '#b45309' : '#64748b',
                                      backgroundColor: l.GSTRegistrationType === 'Regular' ? '#fff5f7' : l.GSTRegistrationType === 'Composition' ? '#fffbeb' : '#f8fafc',
                                    },
                                  }}
                                >
                                  {l.GSTRegistrationType === 'Regular'
                                    ? 'Regular Taxpayer'
                                    : l.GSTRegistrationType === 'Composition'
                                    ? 'Composition Scheme'
                                    : 'Unregistered / Consumer'}
                                </Badge>
                                {l.GSTIN ? (
                                  <Text size="11px" fw={600} style={{ color: '#800020', fontFamily: 'monospace', lineHeight: 1.2 }}>
                                    {l.GSTIN}
                                  </Text>
                                ) : null}
                                {l.MobileNumber ? (
                                  <Text size="11px" c="#334155" style={{ lineHeight: 1.2 }}>
                                    {l.MobileNumber}
                                  </Text>
                                ) : null}
                              </Stack>
                            )}
                          </Table.Td>

                          {/* 7. ACTIONS */}
                          <Table.Td style={{ textAlign: 'center', padding: '4px' }}>
                            {isEditing ? (
                              <Group gap={4} justify="center" wrap="nowrap">
                                <Tooltip label="Save Changes" withArrow>
                                  <ActionIcon
                                    size="xs"
                                    color="burgundy"
                                    variant="filled"
                                    title="Save"
                                    onClick={handleSaveEdit}
                                  >
                                    <IconCheck size={13} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Cancel" withArrow>
                                  <ActionIcon
                                    size="xs"
                                    color="gray"
                                    variant="light"
                                    title="Cancel"
                                    onClick={handleCancelEdit}
                                  >
                                    <IconX size={13} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            ) : (
                              <Group gap={4} justify="center" wrap="nowrap">
                                <Tooltip label="Edit Ledger" withArrow>
                                  <ActionIcon
                                    size="xs"
                                    color="burgundy"
                                    variant="subtle"
                                    title="Edit Ledger"
                                    onClick={() => handleStartEdit(l)}
                                  >
                                    <IconPencil size={14} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Remove from import" withArrow>
                                  <ActionIcon
                                    size="xs"
                                    color="red"
                                    variant="subtle"
                                    title="Delete"
                                    onClick={() => handleRemoveLedger(idx)}
                                  >
                                    <IconTrash size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            )}
                          </Table.Td>
                        </Table.Tr>

                        {/* Collapsible Attached Bills Detail */}
                        {(hasBills || isExpanded) && (
                          <Table.Tr>
                            <Table.Td colSpan={8} p={0}>
                              <Collapse expanded={isExpanded}>
                                <Box p="xs" px="md" style={{ backgroundColor: '#fdf8f9', borderBottom: '1px solid #f0dfe2', borderTop: '1px solid #f0dfe2' }}>
                                  <Group justify="space-between" align="center" mb={8} wrap="wrap" gap="xs">
                                    <Group gap="sm" align="center">
                                      <Text size="xs" fw={700} style={{ color: '#800020' }}>
                                        Opening Bills ({l.bills.length}) for {l.LedgerName}:
                                      </Text>
                                      {(() => {
                                        const billsTotal = l.bills.reduce((sum, b) => sum + (Number(b.Amount) || 0), 0);
                                        const isMatch = Math.abs(billsTotal - Number(l.OpeningBalance || 0)) < 0.01;
                                        return (
                                          <Group gap={6} align="center">
                                            <Badge
                                              size="xs"
                                              variant="outline"
                                              color="burgundy"
                                              styles={{ root: { borderColor: '#f5c2cb', color: '#800020' } }}
                                            >
                                              Bills Total: ₹{billsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </Badge>
                                            {!isMatch && l.bills.length > 0 && (
                                              <Tooltip label="Update Opening Balance to equal bills total" withArrow>
                                                <Button
                                                  variant="subtle"
                                                  color="burgundy"
                                                  size="compact-xs"
                                                  onClick={() => handleSyncBalanceToBills(l.id)}
                                                  style={{ fontSize: 10, height: 20 }}
                                                >
                                                  Sync Opening Balance
                                                </Button>
                                              </Tooltip>
                                            )}
                                          </Group>
                                        );
                                      })()}
                                    </Group>

                                    <Button
                                      variant="light"
                                      color="burgundy"
                                      size="compact-xs"
                                      leftSection={<IconPlus size={12} />}
                                      onClick={() => handleAddBill(l.id)}
                                      style={{ fontWeight: 600, fontSize: 11 }}
                                    >
                                      + Add Bill
                                    </Button>
                                  </Group>

                                  {l.bills.length === 0 ? (
                                    <Text size="xs" c="dimmed" fs="italic" py={6}>
                                      No opening bills attached yet. Click "+ Add Bill" to add bill references.
                                    </Text>
                                  ) : (
                                    <Table withTableBorder withColumnBorders style={{ fontSize: 12, backgroundColor: '#ffffff' }}>
                                      <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                                        <Table.Tr>
                                          <Table.Th style={{ width: 36, textAlign: 'center', color: '#800020', fontSize: 11, fontWeight: 700 }}>#</Table.Th>
                                          <Table.Th style={{ width: 150, color: '#800020', fontSize: 11, fontWeight: 700 }}>Bill Ref No</Table.Th>
                                          <Table.Th style={{ width: 125, color: '#800020', fontSize: 11, fontWeight: 700 }}>Bill Date</Table.Th>
                                          <Table.Th style={{ width: 125, color: '#800020', fontSize: 11, fontWeight: 700 }}>Due Date</Table.Th>
                                          <Table.Th style={{ width: 130, textAlign: 'right', color: '#800020', fontSize: 11, fontWeight: 700 }}>Amount</Table.Th>
                                          <Table.Th style={{ color: '#800020', fontSize: 11, fontWeight: 700 }}>Narration / Remarks</Table.Th>
                                          <Table.Th style={{ width: 80, textAlign: 'center', color: '#800020', fontSize: 11, fontWeight: 700 }}>Actions</Table.Th>
                                        </Table.Tr>
                                      </Table.Thead>
                                      <Table.Tbody>
                                        {l.bills.map((b, bIdx) => {
                                          const billKey = `${l.id}-${bIdx}`;
                                          const isEditingBill = editingBillKey === billKey && editingBillData;

                                          return (
                                            <Table.Tr key={bIdx} style={{ backgroundColor: isEditingBill ? '#fff5f7' : undefined }}>
                                              <Table.Td style={{ textAlign: 'center', color: '#64748b' }}>{bIdx + 1}</Table.Td>

                                              {/* 1. Bill Ref No */}
                                              <Table.Td>
                                                {isEditingBill ? (
                                                  <TextInput
                                                    size="xs"
                                                    value={editingBillData.BillNo}
                                                    onChange={(e) => setEditingBillData({ ...editingBillData, BillNo: e.currentTarget.value })}
                                                    placeholder="e.g. INV-001"
                                                  />
                                                ) : (
                                                  <Text size="xs" fw={600} style={{ color: '#800020' }}>
                                                    {b.BillNo}
                                                  </Text>
                                                )}
                                              </Table.Td>

                                              {/* 2. Bill Date */}
                                              <Table.Td>
                                                {isEditingBill ? (
                                                  <TextInput
                                                    size="xs"
                                                    placeholder="YYYY-MM-DD"
                                                    value={editingBillData.BillDate}
                                                    onChange={(e) => setEditingBillData({ ...editingBillData, BillDate: e.currentTarget.value })}
                                                  />
                                                ) : (
                                                  <Text size="xs">{b.BillDate || '—'}</Text>
                                                )}
                                              </Table.Td>

                                              {/* 3. Due Date */}
                                              <Table.Td>
                                                {isEditingBill ? (
                                                  <TextInput
                                                    size="xs"
                                                    placeholder="YYYY-MM-DD"
                                                    value={editingBillData.DueDate || ''}
                                                    onChange={(e) => setEditingBillData({ ...editingBillData, DueDate: e.currentTarget.value })}
                                                  />
                                                ) : (
                                                  <Text size="xs">{b.DueDate || '—'}</Text>
                                                )}
                                              </Table.Td>

                                              {/* 4. Amount */}
                                              <Table.Td style={{ textAlign: 'right' }}>
                                                {isEditingBill ? (
                                                  <NumberInput
                                                    size="xs"
                                                    min={0}
                                                    decimalScale={2}
                                                    hideControls
                                                    prefix="₹ "
                                                    value={editingBillData.Amount}
                                                    onChange={(val) => setEditingBillData({ ...editingBillData, Amount: Number(val) || 0 })}
                                                  />
                                                ) : (
                                                  <Text size="xs" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                    ₹{Number(b.Amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                  </Text>
                                                )}
                                              </Table.Td>

                                              {/* 5. Narration */}
                                              <Table.Td>
                                                {isEditingBill ? (
                                                  <TextInput
                                                    size="xs"
                                                    placeholder="Bill remarks"
                                                    value={editingBillData.Narration || ''}
                                                    onChange={(e) => setEditingBillData({ ...editingBillData, Narration: e.currentTarget.value })}
                                                  />
                                                ) : (
                                                  <Text size="xs" c="dimmed">
                                                    {b.Narration || '—'}
                                                  </Text>
                                                )}
                                              </Table.Td>

                                              {/* 6. Actions */}
                                              <Table.Td style={{ textAlign: 'center' }}>
                                                {isEditingBill ? (
                                                  <Group gap={4} justify="center" wrap="nowrap">
                                                    <Tooltip label="Save Bill" withArrow>
                                                      <ActionIcon
                                                        size="xs"
                                                        color="burgundy"
                                                        variant="filled"
                                                        title="Save Bill"
                                                        onClick={() => handleSaveEditBill(l.id, bIdx)}
                                                      >
                                                        <IconCheck size={12} />
                                                      </ActionIcon>
                                                    </Tooltip>
                                                    <Tooltip label="Cancel" withArrow>
                                                      <ActionIcon
                                                        size="xs"
                                                        color="gray"
                                                        variant="light"
                                                        title="Cancel"
                                                        onClick={handleCancelEditBill}
                                                      >
                                                        <IconX size={12} />
                                                      </ActionIcon>
                                                    </Tooltip>
                                                  </Group>
                                                ) : (
                                                  <Group gap={4} justify="center" wrap="nowrap">
                                                    <Tooltip label="Edit Bill" withArrow>
                                                      <ActionIcon
                                                        size="xs"
                                                        color="burgundy"
                                                        variant="subtle"
                                                        title="Edit Bill"
                                                        onClick={() => handleStartEditBill(l.id, bIdx, b)}
                                                      >
                                                        <IconPencil size={13} />
                                                      </ActionIcon>
                                                    </Tooltip>
                                                    <Tooltip label="Delete Bill" withArrow>
                                                      <ActionIcon
                                                        size="xs"
                                                        color="red"
                                                        variant="subtle"
                                                        title="Delete Bill"
                                                        onClick={() => handleDeleteBill(l.id, bIdx)}
                                                      >
                                                        <IconTrash size={13} />
                                                      </ActionIcon>
                                                    </Tooltip>
                                                  </Group>
                                                )}
                                              </Table.Td>
                                            </Table.Tr>
                                          );
                                        })}
                                      </Table.Tbody>
                                    </Table>
                                  )}
                                </Box>
                              </Collapse>
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Box>
          </Box>
        )}

        {/* Modal Actions */}
        <Group justify="flex-end" gap="sm" pt="xs" style={{ borderTop: '1px solid #f1f5f9' }}>
          <Button variant="default" size="sm" onClick={handleClose}>
            Cancel
          </Button>

          <Button
            color="burgundy"
            size="sm"
            onClick={() => importMutation.mutate(parsedLedgers)}
            loading={importMutation.isPending}
            disabled={parsedLedgers.length === 0}
            leftSection={<IconCheck size={16} />}
          >
            Import {parsedLedgers.length} Ledgers ({stats.totalBills} Bills)
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
