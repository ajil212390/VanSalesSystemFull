import React, { useState, useMemo } from 'react';
import {
  Title,
  Text,
  Paper,
  SimpleGrid,
  Group,
  Stack,
  Button,
  Table,
  Badge,
  ActionIcon,
  TextInput,
  Select,
  Tooltip,
  Modal,
  Divider,
  Box,
} from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconPrinter,
  IconClock,
  IconFileInvoice,
  IconCash,
  IconEye,
  IconReceipt2,
  IconUserCheck,
  IconTrash,
  IconPackage,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';

export const SalesListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('ALL');
  const [typeFilter, setTypeFilter] = useState<string | null>('ALL');
  const [viewingSale, setViewingSale] = useState<any | null>(null);

  // 1. Fetch Sales List
  const { data: sales = [], isLoading } = useQuery<any[]>({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await apiClient.get('/sales/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  const isPackageSale = (s: any) => {
    return Boolean(
      s.Notes?.toLowerCase().includes('package') ||
      s.Notes?.toLowerCase().includes('connection') ||
      (s.lines && s.lines.some((l: any) => l.is_package || l.product_name?.toLowerCase().includes('connection') || l.product_name?.toLowerCase().includes('package')))
    );
  };

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter((s: any) => {
      if (statusFilter === 'APPROVED' && !s.IsApproved) return false;
      if (statusFilter === 'PENDING' && s.IsApproved) return false;

      const isPkg = isPackageSale(s);
      if (typeFilter === 'PACKAGE' && !isPkg) return false;
      if (typeFilter === 'REGULAR' && isPkg) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const sNo = (s.SalesNo || '').toLowerCase();
      const invNo = (s.InvoiceNo || '').toLowerCase();
      const cust = (s.customer_name || '').toLowerCase();
      const route = (s.route_name || s.RouteName || '').toLowerCase();
      const driver = (s.driver_name || s.DriverName || '').toLowerCase();
      const vehicle = (s.vehicle_number || s.VehicleName || '').toLowerCase();
      return (
        sNo.includes(q) ||
        invNo.includes(q) ||
        cust.includes(q) ||
        route.includes(q) ||
        driver.includes(q) ||
        vehicle.includes(q)
      );
    });
  }, [sales, search, statusFilter, typeFilter]);

  // KPI Metrics
  const totalSalesAmount = useMemo(() => {
    return sales.reduce((sum: number, s: any) => sum + Number(s.GrandTotal || 0), 0);
  }, [sales]);

  const cashCollectionsAmount = useMemo(() => {
    return sales
      .filter((s: any) => (s.PaymentMethod || '').toUpperCase() === 'CASH')
      .reduce((sum: number, s: any) => sum + Number(s.PaidAmount || s.GrandTotal || 0), 0);
  }, [sales]);

  const pendingApprovalsCount = useMemo(() => {
    return sales.filter((s: any) => !s.IsApproved && s.Status !== 'CANCELLED').length;
  }, [sales]);

  // Mutation: Single Approve
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(`/sales/${id}/approve/`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      notifications.show({
        title: 'Sale Approved',
        message: 'The sale invoice has been verified and approved.',
        color: 'teal',
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || err.message || 'Could not approve sale.',
        color: 'red',
      });
    },
  });

  // Mutation: Delete Sale
  const deleteSaleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/sales/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setViewingSale(null);
      notifications.show({
        title: 'Invoice Deleted',
        message: 'The sale invoice has been removed and accounts synced.',
        color: 'gray',
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error Deleting Sale',
        message: err.response?.data?.detail || err.message || 'Could not delete sale invoice.',
        color: 'red',
      });
    },
  });

  const handleDeleteSale = (sale: any) => {
    if (window.confirm(`Are you sure you want to delete invoice "${sale.InvoiceNo || sale.SalesNo}"? This will reverse accounting vouchers and stock movements.`)) {
      deleteSaleMutation.mutate(sale.SalesId);
    }
  };

  // Open Invoice PDF
  const handlePrintPdf = (sale: any) => {
    const url = `${apiClient.defaults.baseURL}/sales/${sale.SalesId}/invoice-pdf/`;
    window.open(url, '_blank');
  };

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* ── Top Header ── */}
      <Box pt={4} pb={2}>
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Title order={2} style={{ color: '#800020', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em' }}>
              Sales &amp; Invoices
            </Title>
            <Text size="xs" c="dimmed" mt={2}>
              Customer GST tax invoices &bull; Direct office sales &bull; New connection packages &bull; Audit trail
            </Text>
          </div>

          <Group gap="sm">
            <Button
              variant="outline"
              color="burgundy"
              leftSection={<IconPackage size={17} />}
              style={{ borderColor: '#800020', color: '#800020', fontWeight: 600 }}
              onClick={() => navigate('/sales/new-connection')}
            >
              + Add New Connection
            </Button>
            <Button
              leftSection={<IconPlus size={18} />}
              style={{ backgroundColor: '#800020', fontWeight: 600 }}
              onClick={() => navigate('/sales/new')}
            >
              Add Sale
            </Button>
          </Group>
        </Group>
      </Box>

      {/* ── Summary KPI Cards (3 Cards: Total Sales, Cash Collections, Pending Approvals) ── */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
              Total Billed Sales
            </Text>
            <IconFileInvoice size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>
            ₹{totalSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {sales.length} total invoice{sales.length !== 1 ? 's' : ''} generated
          </Text>
        </Paper>

        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
              Cash Collections
            </Text>
            <IconCash size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#800020', fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>
            ₹{cashCollectionsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Immediate cash settled sales
          </Text>
        </Paper>

        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
              Pending Approvals
            </Text>
            <IconClock size={20} color="#b45309" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#b45309', fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>
            {pendingApprovalsCount}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Awaiting shift verification
          </Text>
        </Paper>
      </SimpleGrid>

      {/* ── Filter Bar ── */}
      <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <TextInput
            placeholder="Search invoice #, customer, route, vehicle, driver..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 260 }}
          />

          <Group gap="xs">
            <Select
              data={[
                { value: 'ALL', label: 'All Sales Types' },
                { value: 'REGULAR', label: 'Regular Sales' },
                { value: 'PACKAGE', label: 'New Connections' },
              ]}
              value={typeFilter}
              onChange={(val) => setTypeFilter(val || 'ALL')}
              style={{ width: 170 }}
            />
            <Select
              data={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'APPROVED', label: 'Approved Only' },
                { value: 'PENDING', label: 'Pending Approval' },
              ]}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || 'ALL')}
              style={{ width: 170 }}
            />
          </Group>
        </Group>
      </Paper>

      {/* ── Sales List Table ── */}
      <Paper radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
        <Table.ScrollContainer minWidth={1050}>
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <Table.Tr>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', minWidth: 210 }}>
                  INVOICE # &amp; DATE
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', minWidth: 150 }}>
                  CUSTOMER
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', minWidth: 160 }}>
                  ROUTE / VEHICLE
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center', minWidth: 140 }}>
                  QTY (FILLED / EMPTY)
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center', minWidth: 90 }}>
                  PAYMENT
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'right', minWidth: 110 }}>
                  GRAND TOTAL
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center', minWidth: 110 }}>
                  STATUS
                </Table.Th>
                <Table.Th style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center', width: 90, minWidth: 90 }}>
                  ACTIONS
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                    <Text size="sm" c="dimmed">
                      Loading sales invoices...
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : filteredSales.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8} style={{ textAlign: 'center', padding: '48px' }}>
                    <Text size="sm" fw={600} c="dimmed">
                      No sales records matching your criteria.
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      Click "Add Sale" to record a direct sales transaction or generate an invoice.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredSales.map((sale: any) => {
                  const isCredit = (sale.PaymentMethod || '').toUpperCase() === 'CREDIT';
                  const isPkg = isPackageSale(sale);

                  return (
                    <Table.Tr key={sale.SalesId}>
                      <Table.Td>
                        <Group gap={6} align="center" wrap="nowrap">
                          <Text fw={700} size="sm" ff="monospace" style={{ color: '#800020', whiteSpace: 'nowrap' }}>
                            {sale.InvoiceNo || sale.SalesNo || `#${sale.SalesId}`}
                          </Text>
                          {isPkg && (
                            <Badge
                              size="xs"
                              color="burgundy"
                              variant="light"
                              styles={{
                                root: {
                                  backgroundColor: '#fdf2f4',
                                  color: '#800020',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  overflow: 'visible',
                                  whiteSpace: 'nowrap',
                                },
                              }}
                            >
                              PACKAGE
                            </Badge>
                          )}
                          {sale.IsEdited && (
                            <Tooltip
                              label={`Edited by ${sale.EditedBy || 'Driver'}${sale.EditedAt ? ` at ${new Date(sale.EditedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}${sale.EditReason ? ` • ${sale.EditReason}` : ''}`}
                              withArrow
                              position="top"
                            >
                              <Badge size="xs" color="orange" variant="light" styles={{ root: { cursor: 'pointer', fontWeight: 700, flexShrink: 0 } }}>
                                Edited
                              </Badge>
                            </Tooltip>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {sale.SalesDate || ''}
                        </Text>
                      </Table.Td>

                      <Table.Td>
                        <Text fw={600} size="sm" style={{ color: '#0f172a' }}>
                          {sale.customer_name || 'Walk-in Cash Customer'}
                        </Text>
                        {sale.customer_phone && (
                          <Text size="xs" c="dimmed">
                            {sale.customer_phone}
                          </Text>
                        )}
                      </Table.Td>

                      <Table.Td>
                        <Text size="xs" fw={600} style={{ color: '#334155' }}>
                          {sale.route_name || sale.RouteName || 'Office Sale Point'}
                        </Text>
                        <Text size="10px" c="dimmed">
                          {sale.vehicle_number || sale.VehicleName || 'Direct'} &bull; {sale.driver_name || sale.DriverName || 'Admin'}
                        </Text>
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'center' }}>
                        <Group gap={4} justify="center">
                          <Badge
                            size="xs"
                            variant="outline"
                            style={{
                              fontWeight: 600,
                              color: '#800020',
                              borderColor: '#f5c2cb',
                              backgroundColor: '#ffffff',
                            }}
                          >
                            {Number(sale.TotalDeliveredQty || 0)} Deliv.
                          </Badge>
                          <Badge
                            size="xs"
                            variant="outline"
                            style={{
                              fontWeight: 600,
                              color: '#64748b',
                              borderColor: '#e2e8f0',
                              backgroundColor: '#ffffff',
                            }}
                          >
                            {Number(sale.TotalEmptyQty || 0)} Empty
                          </Badge>
                        </Group>
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'center' }}>
                        <Badge
                          size="xs"
                          variant="outline"
                          style={{
                            fontWeight: 700,
                            backgroundColor: isCredit ? '#fdf2f4' : '#f8fafc',
                            color: isCredit ? '#800020' : '#475569',
                            borderColor: isCredit ? '#f5c2cb' : '#cbd5e1',
                          }}
                        >
                          {sale.PaymentMethod || 'CASH'}
                        </Badge>
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={800} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          ₹{Number(sale.GrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'center' }}>
                        {sale.IsApproved ? (
                          <Badge
                            size="xs"
                            variant="filled"
                            styles={{
                              root: {
                                fontWeight: 700,
                                backgroundColor: '#fdf2f4',
                                color: '#800020',
                                border: '1px solid #f5c2cb',
                                flexShrink: 0,
                                overflow: 'visible',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                              },
                            }}
                          >
                            APPROVED
                          </Badge>
                        ) : (
                          <Badge
                            size="xs"
                            variant="outline"
                            styles={{
                              root: {
                                fontWeight: 700,
                                backgroundColor: '#fffbeb',
                                color: '#b45309',
                                borderColor: '#fde68a',
                                flexShrink: 0,
                                overflow: 'visible',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                              },
                            }}
                          >
                            PENDING
                          </Badge>
                        )}
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'center' }}>
                        <Group gap={6} justify="center" wrap="nowrap">
                          {/* 1. Eye icon (View Details) FIRST */}
                          <Tooltip label="View Details & Lines" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="dark"
                              size="sm"
                              onClick={() => setViewingSale(sale)}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>

                          {/* 2. Delete icon SECOND */}
                          <Tooltip label="Delete Invoice" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => handleDeleteSale(sale)}
                              loading={deleteSaleMutation.isPending}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {/* ── View Sale Details Modal ── */}
      <Modal
        opened={!!viewingSale}
        onClose={() => setViewingSale(null)}
        title={
          <Group gap="xs">
            <IconReceipt2 size={20} color="#800020" />
            <Text fw={700} style={{ color: '#800020', fontSize: 16 }}>
              Invoice Details — {viewingSale?.InvoiceNo || viewingSale?.SalesNo}
            </Text>
          </Group>
        }
        size="lg"
        radius="md"
        centered
      >
        {viewingSale && (
          <Stack gap="md">
            <SimpleGrid cols={2} spacing="xs">
              <div>
                <Text size="xs" c="dimmed">
                  Customer:
                </Text>
                <Text size="sm" fw={700}>
                  {viewingSale.customer_name || 'Walk-in Customer'}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Sales Date:
                </Text>
                <Text size="sm" fw={600}>
                  {viewingSale.SalesDate}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Route &amp; Vehicle:
                </Text>
                <Text size="sm" fw={600}>
                  {viewingSale.route_name || viewingSale.RouteName} &bull; {viewingSale.vehicle_number || viewingSale.VehicleName}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  Payment Mode:
                </Text>
                <Text size="sm" fw={600}>
                  {viewingSale.PaymentMethod}
                </Text>
              </div>
            </SimpleGrid>

            <Divider />

            <Text size="xs" fw={700} c="#475569" tt="uppercase">
              Line Items ({(viewingSale.lines || []).length})
            </Text>
            <Table verticalSpacing="xs" highlightOnHover>
              <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                <Table.Tr>
                  <Table.Th style={{ fontSize: 11 }}>PRODUCT</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'right' }}>QTY</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'right' }}>RATE</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'right' }}>GST %</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'right' }}>TOTAL</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(viewingSale.lines || []).map((ln: any, idx: number) => (
                  <Table.Tr key={idx}>
                    <Table.Td>
                      <Text size="xs" fw={600}>
                        {ln.ProductName || ln.product_name}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="xs">{ln.Quantity || ln.quantity}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="xs">₹{Number(ln.SalesPrice || ln.rate || 0).toFixed(2)}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="xs">{Number(ln.TaxPercent || 0)}%</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="xs" fw={700}>
                        ₹{Number(ln.Total || ln.total || 0).toFixed(2)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {viewingSale.edit_history && viewingSale.edit_history.length > 0 && (
              <>
                <Divider />
                <Text size="xs" fw={700} c="orange" tt="uppercase">
                  Edit Audit Log ({viewingSale.edit_history.length})
                </Text>
                <Stack gap={4}>
                  {viewingSale.edit_history.map((eh: any, idx: number) => (
                    <Paper key={idx} p="xs" radius="sm" style={{ backgroundColor: '#fffaf0', border: '1px solid #fed7aa' }}>
                      <Group justify="space-between" align="center">
                        <Text size="xs" fw={700} c="#9a3412">
                          Edited by {eh.EditedBy}
                        </Text>
                        <Text size="10px" c="dimmed">
                          {new Date(eh.EditedAt).toLocaleString()}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed" mt={2}>
                        {eh.Notes || `Changed from ₹${eh.OldGrandTotal} to ₹${eh.NewGrandTotal}`}
                      </Text>
                    </Paper>
                  ))}
                </Stack>
              </>
            )}

            <Divider />

            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed">
                  Grand Total:
                </Text>
                <Text size="lg" fw={800} style={{ color: '#800020' }}>
                  ₹{Number(viewingSale.GrandTotal || 0).toFixed(2)}
                </Text>
              </div>

              <Group gap="sm">
                {!viewingSale.IsApproved && (
                  <Button
                    variant="filled"
                    style={{ backgroundColor: '#800020', fontWeight: 600 }}
                    leftSection={<IconUserCheck size={16} />}
                    loading={approveMutation.isPending}
                    onClick={() => {
                      approveMutation.mutate(viewingSale.SalesId);
                      setViewingSale(null);
                    }}
                  >
                    Approve Invoice
                  </Button>
                )}
                <Button
                  variant="subtle"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  loading={deleteSaleMutation.isPending}
                  onClick={() => handleDeleteSale(viewingSale)}
                >
                  Delete Invoice
                </Button>
                <Button
                  leftSection={<IconPrinter size={16} />}
                  style={{ backgroundColor: '#800020', fontWeight: 600 }}
                  onClick={() => handlePrintPdf(viewingSale)}
                >
                  Print GST Tax Invoice
                </Button>
              </Group>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default SalesListPage;

