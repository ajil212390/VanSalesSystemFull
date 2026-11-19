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
  Box } from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconReceipt,
  IconPencil,
  IconTrash,
  IconArrowLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { formatDateDDMMYY, DateInputDDMMYY } from '../components/DateInputDDMMYY';

interface PurchaseItem {
  PurchaseId: number;
  PurchaseNo: string;
  PurchaseDate: string;
  InvoiceNo?: string;
  InvoiceDate?: string;
  SupplierLedgerId: number;
  supplier_name?: string;
  supplier_state?: string;
  SubTotal: number;
  TaxAmount: number;
  CGSTAmount: number;
  SGSTAmount: number;
  IGSTAmount: number;
  GrandTotal: number;
  total_qty?: number;
}

export const PurchaseListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PurchaseItem | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  // Filters State
  type DateFilterType = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  const { data: purchases = [], isLoading } = useQuery<PurchaseItem[]>({
    queryKey: ['purchases'],
    queryFn: async () => {
      const res = await apiClient.get('/purchases/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    } });

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

  const filteredPurchases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = purchases.filter((p) => {
      // 1. Date filter
      if (!isDateInFilter(p.PurchaseDate || p.InvoiceDate)) return false;

      // 2. Search query
      if (!q) return true;
      return (
        p.PurchaseNo.toLowerCase().includes(q) ||
        (p.InvoiceNo && p.InvoiceNo.toLowerCase().includes(q)) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(q)) ||
        (p.PurchaseDate && (p.PurchaseDate.toLowerCase().includes(q) || formatDateDDMMYY(p.PurchaseDate).toLowerCase().includes(q))) ||
        (p.InvoiceDate && (p.InvoiceDate.toLowerCase().includes(q) || formatDateDDMMYY(p.InvoiceDate).toLowerCase().includes(q)))
      );
    });

    // 3. Sorting
    result = [...result].sort((a, b) => {
      if (sortBy === 'date_asc') {
        const da = a.PurchaseDate || a.InvoiceDate || '';
        const db = b.PurchaseDate || b.InvoiceDate || '';
        return da.localeCompare(db);
      }
      if (sortBy === 'amount_desc') {
        return Number(b.GrandTotal || 0) - Number(a.GrandTotal || 0);
      }
      if (sortBy === 'amount_asc') {
        return Number(a.GrandTotal || 0) - Number(b.GrandTotal || 0);
      }
      // default: date_desc (newest first)
      const da = a.PurchaseDate || a.InvoiceDate || '';
      const db = b.PurchaseDate || b.InvoiceDate || '';
      if (db !== da) return db.localeCompare(da);
      return b.PurchaseId - a.PurchaseId;
    });

    return result;
  }, [purchases, searchQuery, dateFilter, customStartDate, customEndDate, sortBy]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/purchases/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['godown-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-notes'] });
      queryClient.invalidateQueries({ queryKey: ['van-stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      notifications.show({ title: 'Success', message: 'Purchase deleted and stock removed from godown.', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to delete purchase.', color: 'red' });
    } });

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
            Purchases
          </Title>
          <Text size="sm" c="dimmed">
            Manage supplier invoices and GST purchase entries.
          </Text>
        </div>

        <Group gap="xs" align="center" wrap="wrap" style={{ flexGrow: 1, justifyContent: 'flex-end' }}>
          <TextInput
            placeholder="Search by Purchase No, Invoice, Supplier..."
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
            onClick={() => navigate('/purchases/new')}
          >
            Add Purchase
          </Button>
        </Group>
      </Group>

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

      {/* Table */}
      <Paper radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
        {isLoading ? (
          <Center py={60}>
            <Loader color="burgundy" size="md" />
          </Center>
        ) : filteredPurchases.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap="xs">
              <IconReceipt size={36} color="#cbd5e1" />
              <Text c="dimmed" size="sm">
                {searchQuery ? 'No purchases match your search.' : 'No purchases yet. Click "Add Purchase" to create your first one.'}
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={1000}>
            <Table verticalSpacing="sm" horizontalSpacing="sm" highlightOnHover>
              <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 140 }}>Purchase No</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 120 }}>Invoice No</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 160 }}>Party</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 65, textAlign: 'center' }}>Qty</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 110, textAlign: 'right' }}>Taxable (₹)</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 90, textAlign: 'right' }}>CGST (₹)</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 90, textAlign: 'right' }}>SGST (₹)</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 90, textAlign: 'right' }}>IGST (₹)</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 95, textAlign: 'right' }}>Tax (₹)</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 115, textAlign: 'right' }}>Total (₹)</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 80, textAlign: 'center' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredPurchases.map((item) => (
                  <Table.Tr key={item.PurchaseId}>
                    <Table.Td>
                      <Group gap={8} wrap="nowrap" align="flex-start">
                        <IconReceipt size={16} color="#800020" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <Text fw={600} size="sm" c="#1e293b" style={{ whiteSpace: 'nowrap' }}>
                            {item.PurchaseNo}
                          </Text>
                          {item.PurchaseDate && (
                            <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                              {formatDateDDMMYY(item.PurchaseDate)}
                            </Text>
                          )}
                        </div>
                      </Group>
                    </Table.Td>

                    <Table.Td>
                      <div>
                        <Text fw={500} size="sm" c="#334155">{item.InvoiceNo || '-'}</Text>
                        {item.InvoiceDate && (
                          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{formatDateDDMMYY(item.InvoiceDate)}</Text>
                        )}
                      </div>
                    </Table.Td>

                    <Table.Td>
                      <Text fw={600} size="sm" c="#1e293b">
                        {item.supplier_name || `Ledger #${item.SupplierLedgerId}`}
                      </Text>
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'center' }}>
                      <Text size="sm" fw={600} c="#334155">{item.total_qty ?? '-'}</Text>
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" fw={600} c="#334155">
                        ₹{Number(item.SubTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>

                    {(() => {
                      const tax = Number(item.TaxAmount || 0);
                      const isIntra = !item.supplier_state || item.supplier_state.toLowerCase() === 'kerala';
                      const cgst = item.CGSTAmount !== undefined && item.CGSTAmount !== null
                        ? Number(item.CGSTAmount)
                        : (isIntra && tax > 0 ? Number((tax / 2).toFixed(2)) : 0);
                      const sgst = item.SGSTAmount !== undefined && item.SGSTAmount !== null
                        ? Number(item.SGSTAmount)
                        : (isIntra && tax > 0 ? Number((tax / 2).toFixed(2)) : 0);
                      const igst = item.IGSTAmount !== undefined && item.IGSTAmount !== null
                        ? Number(item.IGSTAmount)
                        : (!isIntra && tax > 0 ? tax : 0);

                      return (
                        <>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text size="sm" fw={600} c={cgst > 0 ? '#334155' : 'dimmed'}>
                              {cgst > 0 ? `₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                            </Text>
                          </Table.Td>

                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text size="sm" fw={600} c={sgst > 0 ? '#334155' : 'dimmed'}>
                              {sgst > 0 ? `₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                            </Text>
                          </Table.Td>

                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text size="sm" fw={600} c={igst > 0 ? '#800020' : 'dimmed'}>
                              {igst > 0 ? `₹${igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                            </Text>
                          </Table.Td>
                        </>
                      );
                    })()}

                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" fw={600} c="#0f766e">
                        ₹{Number(item.TaxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" fw={700} c="#000000">
                        ₹{Number(item.GrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'center' }}>
                      <Group gap={4} justify="center" wrap="nowrap">
                        <ActionIcon
                          variant="subtle"
                          color="burgundy"
                          size="sm"
                          title="Edit"
                          onClick={() => navigate(`/purchases/${item.PurchaseId}/edit`)}
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
                ))}
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
            deleteMutation.mutate(deleteTarget.PurchaseId);
            setDeleteModalOpened(false);
            setDeleteTarget(null);
          }
        }}
        itemName={deleteTarget?.PurchaseNo}
        itemType="purchase invoice"
        loading={deleteMutation.isPending}
      />

      {/* Bottom Footer Count */}
      <Group justify="flex-end" pt="xs" pb="md">
        <Text size="sm" c="dimmed">
          Showing {filteredPurchases.length} purchase(s).
        </Text>
      </Group>
    </Stack>
  );
};
