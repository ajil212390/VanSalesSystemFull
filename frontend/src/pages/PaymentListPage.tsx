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

interface PaymentItem {
  PaymentId: number;
  PartyLedgerId: number;
  party_name?: string;
  Amount: number | string;
  Narration?: string;
  CreatedAt?: string;
  lines?: PaymentLineItem[];
}

export const PaymentListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PaymentItem | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const { data: payments = [], isLoading } = useQuery<PaymentItem[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  const filteredPayments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return payments;
    return payments.filter(
      (p) =>
        String(p.PaymentId).includes(q) ||
        (p.party_name && p.party_name.toLowerCase().includes(q)) ||
        (p.Narration && p.Narration.toLowerCase().includes(q))
    );
  }, [payments, searchQuery]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/payments/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      notifications.show({ title: 'Success', message: 'Payment voucher deleted successfully.', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to delete payment voucher.', color: 'red' });
    },
  });

  return (
    <Stack gap="lg">
      {/* Top Header */}
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Payments
          </Title>
          <Text size="sm" c="dimmed">
            Manage supplier payments, bank & cash payouts, and bill-wise allocations.
          </Text>
        </div>

        <Group gap="xs" align="center" wrap="wrap" style={{ flexGrow: 1, justifyContent: 'flex-end' }}>
          <TextInput
            placeholder="Search by Payment No, Supplier, Narration..."
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
            onClick={() => navigate('/payments/new')}
          >
            Add Payment
          </Button>
        </Group>
      </Group>

      {/* Main Table Card */}
      <Paper radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
        {isLoading ? (
          <Center py={60}>
            <Loader color="burgundy" size="md" />
          </Center>
        ) : filteredPayments.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap="xs">
              <IconReceipt size={36} color="#cbd5e1" stroke={1.5} />
              <Text c="dimmed" size="sm">
                {searchQuery ? 'No payments match your search.' : 'No payments recorded yet. Click "Add Payment" to record a payout.'}
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={920}>
            <Table verticalSpacing="sm" horizontalSpacing="sm" highlightOnHover>
              <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 130, minWidth: 120 }}>Payment No</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 130, minWidth: 125, whiteSpace: 'nowrap' }}>Date</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 200, minWidth: 180 }}>Party (Supplier)</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 140, minWidth: 120 }}>Account</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 140 }}>Narration</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 140, minWidth: 120, textAlign: 'right' }}>Total (₹)</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 90, minWidth: 90, textAlign: 'center' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredPayments.map((item) => {
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
                            {String(item.PaymentId).padStart(3, '0')}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td style={{ whiteSpace: 'nowrap', minWidth: 125, width: 130 }}>
                        <Text size="sm" c="#475569" style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all', display: 'inline-block' }}>
                          {dateStr}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} size="sm" c="#1e293b">
                          {item.party_name || `Ledger #${item.PartyLedgerId}`}
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
                            onClick={() => navigate(`/payments/${item.PaymentId}/edit`)}
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
        itemName={deleteTarget ? `Payment #${String(deleteTarget.PaymentId).padStart(3, '0')}` : ''}
        itemType="payment voucher"
      />

      {/* Bottom Footer Count */}
      <Group justify="flex-end" pt="xs" pb="md">
        <Text size="sm" c="dimmed">
          Showing {filteredPayments.length} payment(s).
        </Text>
      </Group>
    </Stack>
  );
};
