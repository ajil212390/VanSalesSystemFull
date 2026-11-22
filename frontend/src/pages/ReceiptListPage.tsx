import React, { useState, useMemo } from 'react';
import {
  Title,
  Paper,
  Button,
  Group,
  Stack,
  Table,
  Loader,
  Center,
  Text,
  TextInput,
  CloseButton,
  ActionIcon,
  SegmentedControl,
  Select,
  Box,
  Badge,
} from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconReceipt,
  IconTrash,
  IconPencil,
  IconArrowLeft,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { formatDateDDMMYY, DateInputDDMMYY } from '../components/DateInputDDMMYY';

interface PaymentLineItem {
  PaymentLineId?: number;
  PaymentMode: string;
  LedgerId: number;
  ledger_name?: string;
  Amount: number | string;
  InstrumentNumber?: string;
  allocations?: Array<{
    BillReference?: string;
    BillType?: string;
    AllocationType?: string;
    AllocatedAmount?: number;
  }>;
}

interface ReceiptItem {
  PaymentId: number;
  PartyLedgerId: number;
  party_name?: string;
  Amount: number | string;
  Narration?: string;
  CreatedAt?: string;
  voucher_type?: string;
  voucher_no?: string;
  against_bills?: string[];
  payment_date?: string;
  lines?: PaymentLineItem[];
  PaymentNo?: string;
  ReferenceNumber?: string;
  Status?: string;
}

export const ReceiptListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ReceiptItem | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  // Filters State
  type DateFilterType = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  // Fetch all payments/receipts
  const { data: allPayments = [], isLoading } = useQuery<ReceiptItem[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // Fetch ledgers to identify customers (Sundry Debtors)
  const { data: ledgers = [] } = useQuery<any[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // Filter strictly for Customer Receipts
  const receipts = useMemo(() => {
    const customerLedgerIds = new Set(
      ledgers
        .filter((l) => {
          const gName = (l.group_name || l.GroupName || '').toLowerCase();
          const gid = Number(l.GroupId ?? l.Group ?? 0);
          return gid === 21 || gName.includes('debtor') || gName.includes('customer');
        })
        .map((l) => l.LedgerId)
    );

    return allPayments.filter((p) => {
      const vt = String(p.voucher_type || '').toUpperCase();
      // Strictly exclude Supplier / Expense Payments from Receipts screen!
      if (vt === 'PAYMENT') return false;
      if (vt === 'RECEIPT') return true;
      if (customerLedgerIds.has(p.PartyLedgerId)) return true;
      if (String(p.ReferenceNumber || '').toUpperCase().startsWith('TREC-')) return true;
      if (String(p.PaymentNo || '').toUpperCase().startsWith('REC-')) return true;
      return false;
    });
  }, [allPayments, ledgers]);

  // Counts for status tabs
  const pendingCount = useMemo(() => {
    return receipts.filter((p) => String(p.Status || '').toUpperCase() === 'PENDING').length;
  }, [receipts]);

  const approvedCount = useMemo(() => {
    return receipts.filter((p) => String(p.Status || '').toUpperCase() !== 'PENDING').length;
  }, [receipts]);

  const receiptNumMap = useMemo(() => {
    const map = new Map<number, string>();
    const sortedApproved = [...receipts]
      .filter((p) => String(p.Status || '').toUpperCase() !== 'PENDING')
      .sort((a, b) => a.PaymentId - b.PaymentId);
    sortedApproved.forEach((p, idx) => {
      map.set(p.PaymentId, p.PaymentNo || `REC-${String(idx + 1).padStart(3, '0')}`);
    });

    const sortedPending = [...receipts]
      .filter((p) => String(p.Status || '').toUpperCase() === 'PENDING')
      .sort((a, b) => a.PaymentId - b.PaymentId);
    sortedPending.forEach((p, idx) => {
      map.set(p.PaymentId, p.ReferenceNumber || `TREC-${String(idx + 1).padStart(3, '0')}`);
    });

    return map;
  }, [receipts]);

  const getAgainstBills = (item: any): string[] => {
    if (Array.isArray(item.against_bills) && item.against_bills.length > 0) {
      return item.against_bills;
    }
    const bills: string[] = [];
    (item.lines || []).forEach((line: any) => {
      (line.allocations || []).forEach((alloc: any) => {
        const ref = alloc.BillReference ? String(alloc.BillReference).trim() : '';
        if (ref && !bills.includes(ref)) {
          bills.push(ref);
        }
      });
    });
    if (bills.length === 0 && item.Narration) {
      const match = item.Narration.match(/(INV-?\d+|SALE-?\d+)/i);
      if (match && !bills.includes(match[1].toUpperCase())) {
        bills.push(match[1].toUpperCase());
      }
    }
    return bills;
  };

  const isDateInFilter = (dateStr?: string) => {
    if (!dateStr || dateFilter === 'all') return true;
    const d = dateStr.slice(0, 10);
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

  const filteredReceipts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = receipts.filter((p) => {
      // 1. Status filter
      const isPending = String(p.Status || '').toUpperCase() === 'PENDING';
      if (statusFilter === 'pending' && !isPending) return false;
      if (statusFilter === 'approved' && isPending) return false;

      // 2. Date filter
      const itemDate = p.payment_date || (p.CreatedAt ? p.CreatedAt.slice(0, 10) : '');
      if (!isDateInFilter(itemDate)) return false;

      // 3. Search query
      if (!q) return true;
      const againstStr = getAgainstBills(p).join(' ').toLowerCase();
      const displayNo = (receiptNumMap.get(p.PaymentId) || p.PaymentNo || p.ReferenceNumber || String(p.PaymentId)).toLowerCase();
      return (
        displayNo.includes(q) ||
        (p.party_name && p.party_name.toLowerCase().includes(q)) ||
        againstStr.includes(q) ||
        (p.Narration && p.Narration.toLowerCase().includes(q)) ||
        (p.payment_date && (p.payment_date.includes(q) || formatDateDDMMYY(p.payment_date).includes(q))) ||
        (p.CreatedAt && formatDateDDMMYY(p.CreatedAt).includes(q))
      );
    });

    // 4. Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === 'date_asc') {
        const da = a.payment_date || a.CreatedAt || '';
        const db = b.payment_date || b.CreatedAt || '';
        return da.localeCompare(db);
      }
      if (sortBy === 'amount_desc') {
        return Number(b.Amount || 0) - Number(a.Amount || 0);
      }
      if (sortBy === 'amount_asc') {
        return Number(a.Amount || 0) - Number(b.Amount || 0);
      }
      // default: date_desc (newest first)
      const da = a.payment_date || a.CreatedAt || '';
      const db = b.payment_date || b.CreatedAt || '';
      if (db !== da) return db.localeCompare(da);
      return b.PaymentId - a.PaymentId;
    });

    return result;
  }, [receipts, searchQuery, receiptNumMap, dateFilter, statusFilter, customStartDate, customEndDate, sortBy]);



  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/payments/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      notifications.show({ title: 'Success', message: 'Receipt voucher deleted successfully.', color: 'green' });
    },
    onError: (err: any) => {
      let msg = 'Failed to delete receipt voucher.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') msg = err.response.data;
        else if (err.response.data.detail) msg = err.response.data.detail;
        else if (err.response.data.message) msg = err.response.data.message;
        else if (err.response.data.error) msg = err.response.data.error;
      } else if (err.message) {
        msg = err.message;
      }
      notifications.show({ title: 'Error', message: msg, color: 'red' });
    },
  });

  return (
    <Stack gap="lg">
      {/* Top Header */}
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
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Receipts
          </Title>
          <Text size="sm" c="dimmed">
            Manage customer collections, temporary receipts (TREC), and approved ledger postings (REC).
          </Text>
        </div>

        <Group gap="xs" align="center" wrap="wrap" style={{ flexGrow: 1, justifyContent: 'flex-end' }}>
          <TextInput
            placeholder="Search by Receipt No, Customer, Narration..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            leftSection={<IconSearch size={16} stroke={1.5} color="#800020" />}
            rightSection={searchQuery ? <CloseButton size="sm" onClick={() => setSearchQuery('')} /> : null}
            radius="md"
            size="sm"
            style={{ width: 280, minWidth: 200, flexGrow: 1, maxWidth: 360 }}
          />
          <Button
            color="burgundy"
            radius={10}
            size="sm"
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/receipts/new')}
          >
            Add Receipt
          </Button>
        </Group>
      </Group>

      {/* Status Segmented Control & Summary Banner */}
      <Paper
        p="xs"
        radius="md"
        withBorder
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="xs" align="center">
            <Text size="xs" fw={700} c="#475569" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
              Receipt Status:
            </Text>
            <SegmentedControl
              size="xs"
              radius="xl"
              color="burgundy"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              data={[
                { label: `All Receipts (${receipts.length})`, value: 'all' },
                { label: `Pending Shift Settlement (${pendingCount})`, value: 'pending' },
                { label: `Approved & Posted (${approvedCount})`, value: 'approved' },
              ]}
              styles={{
                root: {
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  padding: 3,
                },
                indicator: {
                  backgroundColor: '#800020',
                  boxShadow: '0 2px 4px rgba(128, 0, 32, 0.25)',
                },
                label: {
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '5px 14px',
                },
              }}
            />
          </Group>

          {pendingCount > 0 && (
            <Badge color="yellow" variant="light" size="sm" radius="sm" style={{ border: '1px solid #fde68a', fontWeight: 600 }}>
              {pendingCount} Temporary Receipt{pendingCount > 1 ? 's' : ''} (TREC) will be approved when driver shift is settled in End Allocation
            </Badge>
          )}
        </Group>
      </Paper>

      {/* Date Filter & Sort Card */}
      <Paper
        p="xs"
        radius="xl"
        withBorder
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="xs" align="center" wrap="wrap">
            <Text size="xs" fw={700} c="#475569" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
              Date Filter:
            </Text>
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
                <Box style={{ width: 130 }}>
                  <DateInputDDMMYY
                    placeholder="From Date"
                    value={customStartDate}
                    onChange={(val) => setCustomStartDate(val)}
                  />
                </Box>
                <Text size="xs" c="dimmed">to</Text>
                <Box style={{ width: 130 }}>
                  <DateInputDDMMYY
                    placeholder="To Date"
                    value={customEndDate}
                    onChange={(val) => setCustomEndDate(val)}
                  />
                </Box>
              </Group>
            )}
          </Group>

          {/* Sort Option */}
          <Group gap="xs" align="center">
            <Text size="xs" fw={700} c="#475569" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
              Sort:
            </Text>
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
              ]}
              style={{ width: 180 }}
              styles={{
                input: {
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  fontWeight: 600,
                  fontSize: 12,
                },
              }}
            />
          </Group>
        </Group>
      </Paper>

      {/* Main Table Card */}
      <Paper radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
        {isLoading ? (
          <Center py={60}>
            <Loader color="burgundy" size="md" />
          </Center>
        ) : filteredReceipts.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap="xs">
              <IconReceipt size={36} color="#cbd5e1" stroke={1.5} />
              <Text c="dimmed" size="sm">
                {searchQuery ? 'No receipts match your search.' : 'No receipts recorded yet. Click "Add Receipt" to record a collection.'}
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={940}>
            <Table verticalSpacing="sm" horizontalSpacing="sm" highlightOnHover>
              <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 170, minWidth: 150 }}>Receipt No</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 110, minWidth: 100, whiteSpace: 'nowrap' }}>Date</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 190, minWidth: 160 }}>Party Name</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 130, minWidth: 110 }}>Account</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 200 }}>Narration</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 130, minWidth: 110, textAlign: 'right' }}>Total (₹)</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 110, minWidth: 100, textAlign: 'center' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredReceipts.map((item) => {
                  const firstLine = item.lines && item.lines.length > 0 ? item.lines[0] : null;
                  const dateStr = item.payment_date || (item.CreatedAt
                    ? new Date(item.CreatedAt).toISOString().split('T')[0]
                    : '—');
                  const againstBills = getAgainstBills(item);
                  const isPending = String(item.Status).toUpperCase() === 'PENDING';
                  const displayNo = receiptNumMap.get(item.PaymentId) || item.PaymentNo || item.ReferenceNumber || `REC-${String(item.PaymentId).padStart(3, '0')}`;

                  return (
                    <Table.Tr key={item.PaymentId} style={{ backgroundColor: isPending ? '#fffdf7' : undefined }}>
                      <Table.Td style={{ whiteSpace: 'nowrap' }}>
                        <Group gap={6} wrap="nowrap" align="center">
                          <IconReceipt size={16} color={isPending ? '#d97706' : '#800020'} style={{ flexShrink: 0 }} />
                          <div>
                            <Group gap={6} align="center">
                              <Text fw={700} size="sm" c={isPending ? '#b45309' : '#1e293b'} style={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                                {displayNo}
                              </Text>
                              {isPending && (
                                <Badge size="xs" color="yellow" variant="light" radius="xs" style={{ border: '1px solid #fde68a', fontWeight: 600 }}>
                                  Pending
                                </Badge>
                              )}
                            </Group>
                            {againstBills.length > 0 && (
                              <Text size="10.5px" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                                Agst: {againstBills.join(', ')}
                              </Text>
                            )}
                          </div>
                        </Group>
                      </Table.Td>
                      <Table.Td style={{ whiteSpace: 'nowrap', minWidth: 110, width: 120 }}>
                        <Text size="sm" c="#475569" style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all', display: 'inline-block' }}>
                          {formatDateDDMMYY(dateStr)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} size="sm" c="#1e293b">
                          {item.party_name || `Customer #${item.PartyLedgerId}`}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {firstLine && firstLine.ledger_name ? (
                          <Text size="sm" fw={500} c="#1e293b">
                            {firstLine.ledger_name}
                          </Text>
                        ) : (
                          <Text size="xs" c="#94a3b8">—</Text>
                        )}
                      </Table.Td>
                      <Table.Td style={{ minWidth: 200, maxWidth: 360 }}>
                        <Text size="sm" c="#64748b" title={item.Narration || ''} style={{ wordBreak: 'break-word', lineHeight: 1.4 }}>
                          {item.Narration && !item.Narration.startsWith('Payment voucher #')
                            ? item.Narration
                            : '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text fw={700} size="sm" c="#000000">
                          ₹{Number(item.Amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Group gap={6} justify="center" wrap="nowrap">
                          <ActionIcon
                            variant="subtle"
                            color="burgundy"
                            size="sm"
                            title="Edit"
                            onClick={() => navigate(`/receipts/${item.PaymentId}/edit`)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            title="Delete"
                            onClick={() => {
                              setDeleteTarget(item);
                              setDeleteModalOpened(true);
                            }}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.PaymentId);
          }
          setDeleteModalOpened(false);
          setDeleteTarget(null);
        }}
        title="Delete Receipt"
        itemName={deleteTarget ? (receiptNumMap.get(deleteTarget.PaymentId) || `Receipt #${deleteTarget.PaymentId}`) : 'this receipt'}
        description="Any associated double-entry ledger vouchers and bill allocations will be deleted."
      />
    </Stack>
  );
};
export default ReceiptListPage;
