import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Table,
  Button,
  Group,
  Stack,
  Text,
  Box,
  FileButton,
  NumberInput,
  TextInput,
  Checkbox,
  ActionIcon,
  Badge,
} from '@mantine/core';
import {
  IconFileSpreadsheet,
  IconUpload,
  IconDownload,
  IconPlus,
  IconTrash,
  IconPencil,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import * as XLSX from 'xlsx';

export interface ImportedBillItem {
  id?: string;
  LedgerLineId?: number;
  BillNo: string;
  BillDate: string; // YYYY-MM-DD
  DueDate?: string | null; // YYYY-MM-DD
  Amount: number;
  Narration?: string;
}

interface OpeningBillsModalProps {
  opened: boolean;
  onClose: () => void;
  bills: ImportedBillItem[];
  onApplyBills: (bills: ImportedBillItem[], syncTotalToOpeningBalance: boolean) => void;
  ledgerName?: string;
}

function parseExcelDate(val: any): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? '' : val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    // Excel serial date code: 25569 days between 1900-01-01 and 1970-01-01
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
      // YYYY-MM-DD
      return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
    }
    if (p3.length === 4) {
      // DD-MM-YYYY or MM-DD-YYYY
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

export const OpeningBillsModal: React.FC<OpeningBillsModalProps> = ({
  opened,
  onClose,
  bills,
  onApplyBills,
  ledgerName,
}) => {
  const [localBills, setLocalBills] = useState<ImportedBillItem[]>([]);
  const [syncWithOpeningBalance, setSyncWithOpeningBalance] = useState<boolean>(true);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editBackup, setEditBackup] = useState<ImportedBillItem | null>(null);

  // Sync props when modal opens
  useEffect(() => {
    if (opened) {
      setLocalBills(
        bills.map((b) => ({
          ...b,
          id: b.id || Math.random().toString(36).substring(2, 9),
        }))
      );
      setEditingRowId(null);
      setEditBackup(null);
    }
  }, [opened, bills]);

  // Aggregate totals
  const totalAmount = useMemo(() => {
    return localBills.reduce((sum, b) => sum + (Number(b.Amount) || 0), 0);
  }, [localBills]);

  // Generate and download Excel template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Bill No': 'INV-2023-001',
        'Bill Date': '2023-11-15',
        'Due Date': '2023-12-15',
        'Amount': 15000.0,
        'Narration': 'Opening balance bill from previous software',
      },
      {
        'Bill No': 'INV-2023-002',
        'Bill Date': '2023-12-05',
        'Due Date': '2024-01-05',
        'Amount': 25500.0,
        'Narration': 'Historical purchase bill',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    // Add column widths for clean header spacing and readability
    ws['!cols'] = [
      { wch: 18 }, // Bill No
      { wch: 15 }, // Bill Date
      { wch: 15 }, // Due Date
      { wch: 16 }, // Amount
      { wch: 45 }, // Narration
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'OpeningBills');
    XLSX.writeFile(wb, 'Opening_Bills_Template.xlsx');
  };

  // Flexible Column Matching Dictionary
  const matchColumnType = (rawKey: string): 'billNo' | 'billDate' | 'dueDate' | 'amount' | 'narration' | null => {
    if (!rawKey) return null;
    const k = String(rawKey).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!k) return null;

    // 1. Due Date (Checked before Date so 'due date' isn't mistaken for 'date')
    if (
      [
        'duedate', 'due', 'duedt', 'expirydate', 'validtill', 'paymentdate', 'paydate',
        'payduedate', 'creditduedate', 'overduedate', 'termdate', 'expdt', 'maturitydate'
      ].some((alias) => k === alias || k.includes(alias))
    ) {
      return 'dueDate';
    }

    // 2. Bill Date
    if (
      [
        'billdate', 'invoicedate', 'purchasedate', 'billdt', 'docdate', 'documentdate',
        'invdate', 'voucherdate', 'vchdate', 'entrydate', 'transdate', 'txndate', 'postingdate',
        'creationdate', 'date', 'dt', 'invdt'
      ].some((alias) => k === alias || k.includes(alias)) &&
      !k.includes('due') && !k.includes('expiry') && !k.includes('valid')
    ) {
      return 'billDate';
    }

    // 3. Amount / Balance
    if (
      [
        'amount', 'billamount', 'grandtotal', 'netamount', 'pendingamount',
        'outstanding', 'totalamount', 'billvalue', 'grosstotal', 'nettotal',
        'invoiceamount', 'invamount', 'closingbalance', 'openbal', 'openingbal',
        'total', 'balance', 'value', 'debit', 'credit', 'bal', 'dr', 'cr', 'payable', 'dueamount', 'amt', 'tot'
      ].some((alias) => k === alias || k.includes(alias))
    ) {
      return 'amount';
    }

    // 4. Bill No / Invoice / Voucher / Ref
    if (
      [
        'billno', 'billnumber', 'billnum', 'billid', 'billref', 'billreference',
        'invoiceno', 'invoicenumber', 'invoicenum', 'invno', 'invnum',
        'docno', 'documentno', 'documentnum', 'docnum',
        'voucherno', 'vchnumber', 'vchno', 'vchnum',
        'refno', 'referenceno', 'reference', 'ref', 'entryno', 'transno', 'txnno',
        'invoice', 'bill', 'doc', 'voucher', 'vch', 'particulars'
      ].some((alias) => k === alias || k.includes(alias))
    ) {
      return 'billNo';
    }

    // 5. Narration / Remarks / Description
    if (
      [
        'narration', 'remarks', 'remark', 'notes', 'note', 'description', 'details',
        'comments', 'comment', 'memo', 'reason', 'itemname', 'item', 'desc', 'particular'
      ].some((alias) => k === alias || k.includes(alias))
    ) {
      return 'narration';
    }

    return null;
  };

  // Upload and parse Excel or CSV (100% Order-Independent & Alias-Resilient)
  const handleFileUpload = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 1. Convert to 2D array of rows to scan for the true header row
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rows || rows.length === 0) {
          notifications.show({
            title: 'Empty File',
            message: 'The uploaded file contains no data rows.',
            color: 'orange',
          });
          return;
        }

        // 2. Locate the header row (look through the first 10 rows for matches)
        let headerRowIdx = 0;
        let maxMatchedCols = 0;
        let detectedColMap: Record<number, 'billNo' | 'billDate' | 'dueDate' | 'amount' | 'narration'> = {};

        const searchLimit = Math.min(10, rows.length);
        for (let r = 0; r < searchLimit; r++) {
          const row = rows[r];
          if (!Array.isArray(row)) continue;

          let matches = 0;
          const currentMap: Record<number, 'billNo' | 'billDate' | 'dueDate' | 'amount' | 'narration'> = {};

          row.forEach((cellVal, colIdx) => {
            if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
              const matchedType = matchColumnType(String(cellVal));
              if (matchedType && !Object.values(currentMap).includes(matchedType)) {
                currentMap[colIdx] = matchedType;
                matches++;
              }
            }
          });

          if (matches > maxMatchedCols) {
            maxMatchedCols = matches;
            headerRowIdx = r;
            detectedColMap = currentMap;
          }
        }

        // 3. Parse data rows starting after headerRowIdx
        const dataRows = rows.slice(headerRowIdx + 1);
        const parsedBills: ImportedBillItem[] = [];

        dataRows.forEach((row, rowOffset) => {
          if (!Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) {
            return; // skip completely empty rows
          }

          let billNo = '';
          let billDate = '';
          let dueDate = '';
          let amount = 0;
          let narration = '';

          // A. Map by detected header columns (completely independent of order!)
          row.forEach((cellVal, colIdx) => {
            const mappedType = detectedColMap[colIdx];
            if (mappedType === 'billNo') {
              billNo = String(cellVal).trim();
            } else if (mappedType === 'billDate') {
              billDate = parseExcelDate(cellVal);
            } else if (mappedType === 'dueDate') {
              dueDate = parseExcelDate(cellVal);
            } else if (mappedType === 'amount') {
              amount = parseNumeric(cellVal);
            } else if (mappedType === 'narration') {
              narration = String(cellVal).trim();
            }
          });

          // B. Smart Fallback: If amount, billNo, or billDate are still missing, inspect cell values
          if (!amount || !billNo || !billDate) {
            row.forEach((cellVal, colIdx) => {
              if (detectedColMap[colIdx]) return; // already used

              if (cellVal !== '' && cellVal !== null && cellVal !== undefined) {
                // If amount is missing and cell is a positive number
                if (!amount && typeof cellVal === 'number' && cellVal > 0) {
                  amount = cellVal;
                  return;
                }
                const str = String(cellVal).trim();
                // If date is missing and cell looks like date
                if (!billDate && (/^\d{4}[-/.]\d{2}[-/.]\d{2}/.test(str) || /^\d{2}[-/.]\d{2}[-/.]\d{4}/.test(str))) {
                  billDate = parseExcelDate(str);
                  return;
                }
                // If billNo is missing and cell has alphanumeric text (not purely narrative)
                if (!billNo && str.length > 0 && str.length < 35 && !/^\d{4}[-/.]/.test(str)) {
                  billNo = str;
                  return;
                }
              }
            });
          }

          // Fallbacks for missing identifiers
          if (!billNo) {
            billNo = `OB-${rowOffset + 1}`;
          }
          if (!billDate) {
            billDate = new Date().toISOString().split('T')[0];
          }

          // Only add rows that have at least some amount or bill number
          if (amount > 0 || billNo) {
            parsedBills.push({
              id: Math.random().toString(36).substring(2, 9),
              BillNo: billNo,
              BillDate: billDate,
              DueDate: dueDate || null,
              Amount: amount,
              Narration: narration,
            });
          }
        });

        if (parsedBills.length === 0) {
          notifications.show({
            title: 'No Data Rows',
            message: 'Could not extract valid bill records. Please verify the file content.',
            color: 'orange',
          });
          return;
        }

        setLocalBills((prev) => [...prev, ...parsedBills]);

        const detectedNames = Object.values(detectedColMap).join(', ');
        notifications.show({
          title: 'File Parsed Successfully',
          message: `Imported ${parsedBills.length} bill(s) from "${file.name}". Auto-detected columns: ${detectedNames || 'Auto-aligned by content'}.`,
          color: 'teal',
        });
      } catch {
        notifications.show({
          title: 'Import Error',
          message: 'Failed to read file. Please ensure it is a valid .xlsx, .xls, or .csv file.',
          color: 'red',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleStartEdit = (b: ImportedBillItem) => {
    setEditingRowId(b.id || null);
    setEditBackup({ ...b });
  };

  const handleSaveEdit = (idx: number) => {
    const item = localBills[idx];
    if (!item.BillNo.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Bill Ref No cannot be empty.',
        color: 'red',
      });
      return;
    }
    if (Number(item.Amount) <= 0) {
      notifications.show({
        title: 'Validation Error',
        message: 'Amount must be greater than 0.',
        color: 'red',
      });
      return;
    }
    setEditingRowId(null);
    setEditBackup(null);
  };

  const handleCancelEdit = (idx: number) => {
    if (editBackup) {
      setLocalBills((prev) => {
        const copy = [...prev];
        copy[idx] = { ...editBackup };
        return copy;
      });
    }
    setEditingRowId(null);
    setEditBackup(null);
  };

  const handleAddManualRow = () => {
    const newId = Math.random().toString(36).substring(2, 9);
    const newRow: ImportedBillItem = {
      id: newId,
      BillNo: `BILL-${localBills.length + 1}`,
      BillDate: new Date().toISOString().split('T')[0],
      DueDate: null,
      Amount: 0,
      Narration: '',
    };
    setLocalBills((prev) => [...prev, newRow]);
    setEditingRowId(newId);
    setEditBackup({ ...newRow });
  };

  const handleRemoveRow = (idx: number) => {
    const item = localBills[idx];
    if (editingRowId === item.id) {
      setEditingRowId(null);
      setEditBackup(null);
    }
    setLocalBills((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFieldChange = (
    idx: number,
    field: keyof ImportedBillItem,
    val: any
  ) => {
    setLocalBills((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleApply = () => {
    const invalidBills = localBills.filter(
      (b) => !b.BillNo.trim() || Number(b.Amount) <= 0
    );
    if (invalidBills.length > 0) {
      notifications.show({
        title: 'Incomplete Bills',
        message: 'Please ensure every bill has a valid Bill No and Amount greater than 0.',
        color: 'red',
      });
      return;
    }

    onApplyBills(localBills, syncWithOpeningBalance);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm" align="center">
          <IconFileSpreadsheet size={22} color="#800020" />
          <Box>
            <Text fw={700} size="sm" c="#800020">
              Opening Bills Allocation & Import
            </Text>
            {ledgerName && (
              <Text size="xs" c="dimmed">
                For Ledger: {ledgerName}
              </Text>
            )}
          </Box>
        </Group>
      }
      size="1060px"
      radius="md"
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      styles={{
        header: { borderBottom: '1px solid #f1f5f9', paddingBottom: 10 },
        body: { padding: '16px 20px' },
      }}
    >
      <Stack gap="md">
        {/* Top Control Bar: File Upload + Template Download + Manual Add */}
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="xs">
            <FileButton
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            >
              {(props) => (
                <Button
                  {...props}
                  size="xs"
                  color="burgundy"
                  radius="sm"
                  leftSection={<IconUpload size={14} />}
                >
                  Upload Excel / CSV
                </Button>
              )}
            </FileButton>

            <Button
              variant="outline"
              color="gray"
              size="xs"
              radius="sm"
              leftSection={<IconDownload size={14} />}
              onClick={handleDownloadTemplate}
            >
              Download Sample Template
            </Button>
          </Group>

          <Group gap="xs">
            <Button
              variant="light"
              color="burgundy"
              size="xs"
              radius="sm"
              leftSection={<IconPlus size={14} />}
              onClick={handleAddManualRow}
            >
              Add Row
            </Button>

            {localBills.length > 0 && (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                onClick={() => {
                  setLocalBills([]);
                  setEditingRowId(null);
                  setEditBackup(null);
                }}
              >
                Clear All
              </Button>
            )}
          </Group>
        </Group>

        {/* Informative alert if no bills */}
        {localBills.length === 0 ? (
          <Box
            style={{
              border: '1px dashed #cbd5e1',
              borderRadius: 8,
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
            }}
          >
            <IconFileSpreadsheet
              size={36}
              color="#94a3b8"
              style={{ margin: '0 auto 8px auto', display: 'block' }}
            />
            <Text fw={600} size="sm" c="#334155">
              No Opening Bills Loaded Yet
            </Text>
            <Text size="xs" c="dimmed" style={{ maxWidth: 460, margin: '4px auto 14px auto' }}>
              Upload an Excel (.xlsx / .xls) or CSV sheet of historical bills, or click &ldquo;Add Row&rdquo; to input them manually.
            </Text>
            <FileButton
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            >
              {(props) => (
                <Button
                  {...props}
                  size="xs"
                  color="burgundy"
                  radius="sm"
                  leftSection={<IconUpload size={14} />}
                >
                  Choose Excel File
                </Button>
              )}
            </FileButton>
          </Box>
        ) : (
          /* Preview Table */
          <Box
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              overflow: 'hidden',
              maxHeight: '390px',
              overflowY: 'auto',
            }}
          >
            <Table striped highlightOnHover withColumnBorders verticalSpacing={6} horizontalSpacing="sm">
              <Table.Thead style={{ backgroundColor: '#fdf2f4', position: 'sticky', top: 0, zIndex: 1 }}>
                <Table.Tr style={{ height: 34 }}>
                  <Table.Th style={{ width: 45, textAlign: 'center', fontSize: 11, color: '#800020', fontWeight: 700 }}>
                    #
                  </Table.Th>
                  <Table.Th style={{ width: 170, fontSize: 11, color: '#800020', fontWeight: 700 }}>
                    BILL REF NO *
                  </Table.Th>
                  <Table.Th style={{ width: 140, fontSize: 11, color: '#800020', fontWeight: 700 }}>
                    BILL DATE *
                  </Table.Th>
                  <Table.Th style={{ width: 140, fontSize: 11, color: '#800020', fontWeight: 700 }}>
                    DUE DATE
                  </Table.Th>
                  <Table.Th style={{ width: 155, textAlign: 'right', fontSize: 11, color: '#800020', fontWeight: 700 }}>
                    AMOUNT (₹) *
                  </Table.Th>
                  <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 700 }}>
                    NARRATION
                  </Table.Th>
                  <Table.Th style={{ width: 95, textAlign: 'center', fontSize: 11, color: '#800020', fontWeight: 700 }}>
                    ACTIONS
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {localBills.map((b, idx) => {
                  const isEditing = editingRowId === b.id;

                  return (
                    <Table.Tr
                      key={b.id || idx}
                      style={{
                        height: 36,
                        backgroundColor: isEditing ? '#f0fdf4' : undefined,
                      }}
                    >
                      {/* 1. Sl No */}
                      <Table.Td style={{ textAlign: 'center', fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                        {idx + 1}
                      </Table.Td>

                      {/* 2. Bill Ref No */}
                      <Table.Td>
                        {isEditing ? (
                          <TextInput
                            size="xs"
                            value={b.BillNo}
                            placeholder="e.g. INV-1001"
                            autoFocus
                            onChange={(e) => handleFieldChange(idx, 'BillNo', e.currentTarget.value)}
                            styles={{
                              input: {
                                height: 26,
                                minHeight: 26,
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#0f172a',
                              },
                            }}
                          />
                        ) : (
                          <Text size="xs" fw={700} c="#0f172a">
                            {b.BillNo}
                          </Text>
                        )}
                      </Table.Td>

                      {/* 3. Bill Date */}
                      <Table.Td>
                        {isEditing ? (
                          <TextInput
                            type="date"
                            size="xs"
                            value={b.BillDate}
                            onChange={(e) => handleFieldChange(idx, 'BillDate', e.currentTarget.value)}
                            styles={{
                              input: {
                                height: 26,
                                minHeight: 26,
                                fontSize: 12,
                                color: '#334155',
                              },
                            }}
                          />
                        ) : (
                          <Text size="xs" c="#334155" fw={500}>
                            {b.BillDate}
                          </Text>
                        )}
                      </Table.Td>

                      {/* 4. Due Date */}
                      <Table.Td>
                        {isEditing ? (
                          <TextInput
                            type="date"
                            size="xs"
                            value={b.DueDate || ''}
                            onChange={(e) => handleFieldChange(idx, 'DueDate', e.currentTarget.value || null)}
                            styles={{
                              input: {
                                height: 26,
                                minHeight: 26,
                                fontSize: 12,
                                color: '#64748b',
                              },
                            }}
                          />
                        ) : (
                          <Text size="xs" c={b.DueDate ? '#334155' : '#94a3b8'}>
                            {b.DueDate || '-'}
                          </Text>
                        )}
                      </Table.Td>

                      {/* 5. Amount */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        {isEditing ? (
                          <NumberInput
                            size="xs"
                            min={0}
                            decimalScale={2}
                            hideControls
                            prefix="₹ "
                            value={b.Amount || ''}
                            onChange={(val) => handleFieldChange(idx, 'Amount', Number(val) || 0)}
                            styles={{
                              input: {
                                height: 26,
                                minHeight: 26,
                                fontSize: 12,
                                fontWeight: 700,
                                textAlign: 'right',
                                color: Number(b.Amount) > 0 ? '#15803d' : '#b91c1c',
                              },
                            }}
                          />
                        ) : (
                          <Text size="xs" fw={700} c="#15803d" style={{ textAlign: 'right' }}>
                            ₹{Number(b.Amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Text>
                        )}
                      </Table.Td>

                      {/* 6. Narration */}
                      <Table.Td>
                        {isEditing ? (
                          <TextInput
                            size="xs"
                            placeholder="Optional remarks"
                            value={b.Narration || ''}
                            onChange={(e) => handleFieldChange(idx, 'Narration', e.currentTarget.value)}
                            styles={{
                              input: {
                                height: 26,
                                minHeight: 26,
                                fontSize: 12,
                                color: '#475569',
                              },
                            }}
                          />
                        ) : (
                          <Text size="xs" c={b.Narration ? '#475569' : '#94a3b8'}>
                            {b.Narration || '-'}
                          </Text>
                        )}
                      </Table.Td>

                      {/* 7. Actions */}
                      <Table.Td style={{ textAlign: 'center' }}>
                        {isEditing ? (
                          <Group gap={4} justify="center" wrap="nowrap">
                            <ActionIcon
                              size="sm"
                              color="teal"
                              variant="filled"
                              title="Save Row"
                              onClick={() => handleSaveEdit(idx)}
                            >
                              <IconCheck size={14} />
                            </ActionIcon>
                            <ActionIcon
                              size="sm"
                              color="gray"
                              variant="light"
                              title="Cancel"
                              onClick={() => handleCancelEdit(idx)}
                            >
                              <IconX size={14} />
                            </ActionIcon>
                          </Group>
                        ) : (
                          <Group gap={4} justify="center" wrap="nowrap">
                            <ActionIcon
                              size="sm"
                              color="burgundy"
                              variant="subtle"
                              title="Edit Bill"
                              onClick={() => handleStartEdit(b)}
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                            <ActionIcon
                              size="sm"
                              color="red"
                              variant="subtle"
                              title="Delete Bill"
                              onClick={() => handleRemoveRow(idx)}
                            >
                              <IconTrash size={15} />
                            </ActionIcon>
                          </Group>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Box>
        )}

        {/* Bottom Summary Bar */}
        <Group
          justify="space-between"
          align="center"
          wrap="wrap"
          style={{
            padding: '10px 14px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
          }}
        >
          <Group gap="md">
            <Badge color="burgundy" variant="light" size="md">
              {localBills.length} Bill{localBills.length === 1 ? '' : 's'} Loaded
            </Badge>

            <Group gap={6}>
              <Text size="xs" fw={500} c="#64748b">
                Total Bills Value:
              </Text>
              <Text size="sm" fw={700} c="#15803d">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </Group>
          </Group>

          <Checkbox
            label="Auto-fill Ledger Opening Balance with Total"
            size="xs"
            color="burgundy"
            checked={syncWithOpeningBalance}
            onChange={(e) => setSyncWithOpeningBalance(e.currentTarget.checked)}
          />
        </Group>

        {/* Modal Actions */}
        <Group justify="flex-end" gap="sm" mt={6}>
          <Button variant="default" size="xs" onClick={onClose}>
            Cancel
          </Button>

          <Button
            color="burgundy"
            size="xs"
            onClick={handleApply}
            disabled={localBills.length === 0}
          >
            Apply Bills ({localBills.length})
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
