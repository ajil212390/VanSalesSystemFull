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
  IconCreditCard,
  IconTrash,
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
    <Stack gap="lg" style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
      {/* Top Header */}
      <Group justify="space-between" align="center" wrap="wrap">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700, fontSize: 24 }}>
            Payments
          </Title>
          <Text size="sm" c="#64748b">
            Manage supplier payments, bank & cash payouts, and bill-wise allocations.
          </Text>
        </div>

        <Group gap="sm">
          <TextInput
            placeholder="Search by ID, supplier, narration..."
            leftSection={<IconSearch size={16} color="#94a3b8" />}
            rightSection={
              searchQuery ? (
                <CloseButton size="sm" onClick={() => setSearchQuery('')} aria-label="Clear search" />
              ) : null
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ width: 280 }}
            radius="md"
          />
          <Button
            leftSection={<IconPlus size={16} />}
            color="burgundy"
            radius="md"
            onClick={() => navigate('/payments/new')}
            style={{ backgroundColor: '#800020' }}
          >
            Add Payment
          </Button>
        </Group>
      </Group>

      {/* Main Table Card */}
      <Paper radius="md" p="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
        {isLoading ? (
          <Center py={60}>
            <Loader color="burgundy" size="md" />
          </Center>
        ) : filteredPayments.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap="xs">
              <IconCreditCard size={44} color="#cbd5e1" stroke={1.5} />
              <Text size="md" c="#64748b" fw={500}>
                {searchQuery ? 'No payments match your search.' : 'No payments recorded yet. Click "Add Payment" to record a payout.'}
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={850}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead style={{ backgroundColor: '#faf5f6', borderBottom: '1px solid #f1f5f9' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 100 }}>Payment #</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13 }}>Party / Supplier</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13 }}>Account</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13 }}>Date</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13 }}>Narration</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>Total Amount</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 80, textAlign: 'center' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredPayments.map((item) => {
                  const firstLine = item.lines && item.lines.length > 0 ? item.lines[0] : null;
                  return (
                    <Table.Tr key={item.PaymentId}>
                      <Table.Td>
                        <Badge variant="light" color="burgundy" radius="sm" size="sm">
                          PAY-{String(item.PaymentId).padStart(4, '0')}
                        </Badge>
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
                        <Text size="sm" c="#475569" style={{ whiteSpace: 'nowrap' }}>
                          {item.CreatedAt ? new Date(item.CreatedAt).toLocaleDateString() : '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="#64748b" lineClamp={1}>
                          {item.Narration && !item.Narration.startsWith('Payment voucher #')
                            ? item.Narration
                            : '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text fw={700} size="sm" c="#1e293b">
                          ₹{Number(item.Amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'center' }}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          radius="md"
                          onClick={() => {
                            setDeleteTarget(item);
                            setDeleteModalOpened(true);
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

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
        itemName={deleteTarget ? `Payment PAY-${String(deleteTarget.PaymentId).padStart(4, '0')}` : ''}
        itemType="payment voucher"
      />
    </Stack>
  );
};
