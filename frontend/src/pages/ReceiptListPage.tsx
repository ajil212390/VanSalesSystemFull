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
  Badge,
} from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconReceipt,
  IconTrash,
  IconPencil,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface PaymentLineItem {
  PaymentLineId?: number;
  PaymentMode: string;
  LedgerId: number;
  ledger_name?: string;
  Amount: number | string;
  InstrumentNumber?: string;
}

interface ReceiptItem {
  PaymentId: number;
  PartyLedgerId: number;
  party_name?: string;
  Amount: number | string;
  Narration?: string;
  CreatedAt?: string;
  voucher_type?: string;
  lines?: PaymentLineItem[];
}

export const ReceiptListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ReceiptItem | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

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
      if (p.voucher_type === 'RECEIPT') return true;
      if (p.voucher_type === 'PAYMENT') return false;
      if (customerLedgerIds.has(p.PartyLedgerId)) return true;
      return false;
    });
  }, [allPayments, ledgers]);

  const filteredReceipts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return receipts;
    return receipts.filter(
      (p) =>
        String(p.PaymentId).includes(q) ||
        (p.party_name && p.party_name.toLowerCase().includes(q)) ||
        (p.Narration && p.Narration.toLowerCase().includes(q))
    );
  }, [receipts, searchQuery]);

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
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to delete receipt voucher.', color: 'red' });
    },
  });

  return (
    <Stack gap="lg">
      {/* Top Header */}
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Receipts
          </Title>
          <Text size="sm" c="dimmed">
            Manage customer collections, bank & cash receipts, and bill-wise allocations.
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
          <Table.ScrollContainer minWidth={920}>
            <Table verticalSpacing="sm" horizontalSpacing="sm" highlightOnHover>
              <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 110, minWidth: 100 }}>Voucher No</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 100, minWidth: 90 }}>Type</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 120, minWidth: 110, whiteSpace: 'nowrap' }}>Date</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 200, minWidth: 180 }}>Party Name</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 140, minWidth: 120 }}>Account</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 140 }}>Narration</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 140, minWidth: 120, textAlign: 'right' }}>Total (₹)</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 90, minWidth: 90, textAlign: 'center' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredReceipts.map((item) => {
                  const firstLine = item.lines && item.lines.length > 0 ? item.lines[0] : null;
                  const dateStr = item.CreatedAt
                    ? new Date(item.CreatedAt).toISOString().split('T')[0]
                    : '—';

                  return (
                    <Table.Tr key={item.PaymentId}>
                      <Table.Td style={{ whiteSpace: 'nowrap' }}>
                        <Group gap={6} wrap="nowrap">
                          <IconReceipt size={16} color="#800020" style={{ flexShrink: 0 }} />
                          <Text fw={600} size="sm" c="#1e293b" style={{ whiteSpace: 'nowrap' }}>
                            REC-{String(item.PaymentId).padStart(3, '0')}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="xs"
                          variant="light"
                          color="burgundy"
                          styles={{ root: { fontWeight: 600, textTransform: 'uppercase' } }}
                        >
                          Receipt
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ whiteSpace: 'nowrap', minWidth: 110, width: 120 }}>
                        <Text size="sm" c="#475569" style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all', display: 'inline-block' }}>
                          {dateStr}
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
                      <Table.Td>
                        <Text size="sm" c="#64748b" lineClamp={1}>
                          {item.Narration && !item.Narration.startsWith('Payment voucher #')
                            ? item.Narration
                            : '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text fw={700} size="sm" c="#800020">
                          ₹{Number(item.Amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Group gap={4} justify="center" wrap="nowrap">
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
        itemName={deleteTarget ? `Receipt #REC-${String(deleteTarget.PaymentId).padStart(3, '0')}` : ''}
        itemType="receipt voucher"
      />

      {/* Bottom Footer Count */}
      <Group justify="flex-end" pt="xs" pb="md">
        <Text size="sm" c="dimmed">
          Showing {filteredReceipts.length} receipt(s).
        </Text>
      </Group>
    </Stack>
  );
};
