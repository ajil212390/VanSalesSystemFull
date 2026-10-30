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
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

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

  const { data: purchases = [], isLoading } = useQuery<PurchaseItem[]>({
    queryKey: ['purchases'],
    queryFn: async () => {
      const res = await apiClient.get('/purchases/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  const filteredPurchases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return purchases;
    return purchases.filter(
      (p) =>
        p.PurchaseNo.toLowerCase().includes(q) ||
        (p.InvoiceNo && p.InvoiceNo.toLowerCase().includes(q)) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(q))
    );
  }, [purchases, searchQuery]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/purchases/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      notifications.show({ title: 'Success', message: 'Purchase deleted.', color: 'green' });
    },
    onError: () => {
      notifications.show({ title: 'Error', message: 'Failed to delete purchase.', color: 'red' });
    },
  });

  return (
    <Stack gap="lg">
      {/* Top Header */}
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <div>
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
                              {item.PurchaseDate}
                            </Text>
                          )}
                        </div>
                      </Group>
                    </Table.Td>

                    <Table.Td>
                      <div>
                        <Text fw={500} size="sm" c="#334155">{item.InvoiceNo || '-'}</Text>
                        {item.InvoiceDate && (
                          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{item.InvoiceDate}</Text>
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
                      <Text size="sm" fw={700} c="#800020">
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
