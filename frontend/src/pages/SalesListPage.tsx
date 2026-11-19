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
  Box } from '@mantine/core';
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
  IconEdit,
  IconPackage,
  IconHistory,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUpRight,
  IconReceipt } from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { formatDateDDMMYY } from '../components/DateInputDDMMYY';

export const SalesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('ALL');
  const [typeFilter, setTypeFilter] = useState<string | null>('ALL');
  const [viewingSale, setViewingSale] = useState<any | null>(null);
  const [historySale, setHistorySale] = useState<any | null>(null);

  const openSaleId = searchParams.get('open_sale_id');

  // 1. Fetch Sales List
  const { data: sales = [], isLoading } = useQuery<any[]>({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await apiClient.get('/sales/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    } });

  // Automatically reopen sale details modal if open_sale_id is provided in URL
  React.useEffect(() => {
    if (openSaleId && sales.length > 0 && !viewingSale) {
      const match = sales.find((s: any) => String(s.SalesId) === String(openSaleId));
      if (match) {
        setViewingSale(match);
      }
    }
  }, [openSaleId, sales]);

  const handleCloseViewingModal = () => {
    setViewingSale(null);
    if (searchParams.has('open_sale_id')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('open_sale_id');
      setSearchParams(nextParams, { replace: true });
    }
  };

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

  const collectionsSummary = useMemo(() => {
    let totalCash = 0;
    let totalBank = 0;

    sales.forEach((s: any) => {
      if (s.Status === 'CANCELLED') return;
      const pm = (s.PaymentMethod || 'CASH').toUpperCase();
      const rawPaid = Number(s.PaidAmount ?? s.GrandTotal ?? 0);
      const advAdj = Number(s.advance_adjusted ?? s.AdvanceAdjusted ?? 0);
      const paid = Math.max(0, rawPaid - advAdj);
      if (paid <= 0) return;

      if (pm === 'SPLIT') {
        const cVal = Number(s.cash_amount ?? 0);
        const uVal = Number(s.upi_amount ?? s.bank_amount ?? 0);
        if (cVal > 0 || uVal > 0) {
          totalCash += cVal;
          totalBank += uVal;
        } else {
          const notes = s.Notes || '';
          const cM = /Cash:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)/i.exec(notes);
          const uM = /UPI:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)/i.exec(notes);
          const cashSplit = cM ? Number(cM[1].replace(/,/g, '')) : paid / 2;
          const upiSplit = uM ? Number(uM[1].replace(/,/g, '')) : paid - cashSplit;
          totalCash += cashSplit;
          totalBank += upiSplit;
        }
      } else if (pm.includes('CASH')) {
        totalCash += paid;
      } else {
        totalBank += paid;
      }
    });

    return {
      total: totalCash + totalBank,
      cash: totalCash,
      bank: totalBank,
    };
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
        color: 'teal' });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error',
        message: err.response?.data?.message || err.message || 'Could not approve sale.',
        color: 'red' });
    } });

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
        color: 'gray' });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error Deleting Sale',
        message: err.response?.data?.detail || err.message || 'Could not delete sale invoice.',
        color: 'red' });
    } });

  // Mutation: Apply Customer Advance
  const applyAdvanceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(`/sales/${id}/apply-advance/`);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setViewingSale(null);
      notifications.show({
        title: 'Advance Applied',
        message: data.message || 'Advance adjustment created and invoice settled successfully.',
        color: 'teal',
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error Applying Advance',
        message: err.response?.data?.message || err.message || 'Could not apply advance.',
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
    const url = `${apiClient.defaults.baseURL}/sales/${sale.SalesId}/invoice-pdf/?_t=${Date.now()}`;
    window.open(url, '_blank');
  };

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* ── Top Header ── */}
      <Box pt={4} pb={2}>
        <Group justify="space-between" align="center" wrap="wrap">
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
              Collections
            </Text>
            <IconCash size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#800020', fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>
            ₹{collectionsSummary.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Group gap="xs" mt={6} align="center" wrap="nowrap">
            <Text size="xs" fw={700} c="#0f172a">
              Cash: ₹{collectionsSummary.cash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text size="xs" c="dimmed">&bull;</Text>
            <Text size="xs" fw={700} style={{ color: '#800020' }}>
              Bank: ₹{collectionsSummary.bank.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </Group>
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
                  const invStr = String(sale.InvoiceNo || sale.SalesNo || '');
                  const isEmtrtn = invStr.startsWith('EMTRTN-');
                  const isRcpt = invStr.startsWith('RCPT-');

                  return (
                    <Table.Tr key={sale.SalesId}>
                      <Table.Td>
                        <Group gap={6} align="center" wrap="nowrap">
                          <Text fw={700} size="sm" ff="monospace" style={{ color: '#800020', whiteSpace: 'nowrap' }}>
                            {sale.InvoiceNo || sale.SalesNo || `#${sale.SalesId}`}
                          </Text>
                          {isEmtrtn && (
                            <Badge
                              size="xs"
                              color="blue"
                              variant="light"
                              styles={{
                                root: {
                                  backgroundColor: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  overflow: 'visible',
                                  whiteSpace: 'nowrap' } }}
                            >
                              EMPTY RETURN
                            </Badge>
                          )}
                          {isRcpt && (
                            <Badge
                              size="xs"
                              color="teal"
                              variant="light"
                              styles={{
                                root: {
                                  backgroundColor: '#ecfdf5',
                                  color: '#047857',
                                  border: '1px solid #a7f3d0',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  overflow: 'visible',
                                  whiteSpace: 'nowrap' } }}
                            >
                              RECEIPT
                            </Badge>
                          )}
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
                                  whiteSpace: 'nowrap' } }}
                            >
                              PACKAGE
                            </Badge>
                          )}
                          {(sale.IsEdited || sale.is_edited || (sale.edit_history && sale.edit_history.length > 0)) && (
                            <Tooltip
                              label="Click to inspect invoice revision history"
                              withArrow
                              position="top"
                            >
                              <Badge
                                size="xs"
                                variant="filled"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHistorySale(sale);
                                }}
                                styles={{
                                  root: {
                                    cursor: 'pointer',
                                    backgroundColor: '#800020',
                                    color: '#ffffff',
                                    fontWeight: 800,
                                    fontSize: 9,
                                    letterSpacing: '0.4px',
                                    height: 18,
                                    paddingLeft: 6,
                                    paddingRight: 6,
                                    borderRadius: 4,
                                    boxShadow: '0 1px 2px rgba(128, 0, 32, 0.25)',
                                    border: 'none',
                                    verticalAlign: 'middle',
                                    userSelect: 'none',
                                  },
                                  label: {
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3.5,
                                    overflow: 'visible',
                                    lineHeight: 1,
                                  },
                                }}
                              >
                                <span>EDITED</span>
                                <IconArrowUpRight size={10} stroke={2.8} />
                              </Badge>
                            </Tooltip>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {formatDateDDMMYY(sale.SalesDate)}
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
                              backgroundColor: '#ffffff' }}
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
                              backgroundColor: '#ffffff' }}
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
                            backgroundColor: isEmtrtn ? '#f1f5f9' : (isCredit ? '#fdf2f4' : '#f8fafc'),
                            color: isEmtrtn ? '#64748b' : (isCredit ? '#800020' : '#475569'),
                            borderColor: isEmtrtn ? '#cbd5e1' : (isCredit ? '#f5c2cb' : '#cbd5e1') }}
                        >
                          {isEmtrtn ? 'N/A' : (sale.PaymentMethod || 'CASH')}
                        </Badge>
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'right' }}>
                        {isRcpt ? (
                          <>
                            <Text size="sm" fw={800} style={{ color: '#047857', fontVariantNumeric: 'tabular-nums' }}>
                              ₹{Number(sale.PaidAmount || sale.GrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                            <Text size="10px" c="#047857" fw={700}>
                              COLLECTED
                            </Text>
                          </>
                        ) : isEmtrtn ? (
                          <>
                            <Text size="sm" fw={700} style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                              ₹0.00
                            </Text>
                            <Text size="10px" c="dimmed">
                              EMPTY RETURN
                            </Text>
                          </>
                        ) : (
                          <Text size="sm" fw={800} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            ₹{Number(sale.GrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        )}
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
                                display: 'inline-block' } }}
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
                                display: 'inline-block' } }}
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

                          {/* 2. Edit icon SECOND */}
                          <Tooltip label="Edit Sale Invoice" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="burgundy"
                              size="sm"
                              onClick={() => navigate(`/sales/${sale.SalesId}/edit`)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>

                          {/* 3. Delete icon THIRD */}
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
        onClose={handleCloseViewingModal}
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
                  {formatDateDDMMYY(viewingSale.SalesDate)}
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
                <Group justify="space-between" align="center">
                  <Text size="xs" fw={700} c="orange" tt="uppercase">
                    Edit Audit Log ({viewingSale.edit_history.length})
                  </Text>
                  <Badge size="xs" color="orange" variant="light">
                    Revised / Modified
                  </Badge>
                </Group>
                <Table verticalSpacing="xs" highlightOnHover withTableBorder>
                  <Table.Thead style={{ backgroundColor: '#fff7ed' }}>
                    <Table.Tr>
                      <Table.Th style={{ fontSize: 11 }}>TIMESTAMP</Table.Th>
                      <Table.Th style={{ fontSize: 11 }}>EDITED BY</Table.Th>
                      <Table.Th style={{ fontSize: 11, textAlign: 'right' }}>OLD AMOUNT</Table.Th>
                      <Table.Th style={{ fontSize: 11, textAlign: 'right' }}>NEW AMOUNT</Table.Th>
                      <Table.Th style={{ fontSize: 11 }}>PAYMENT MODE</Table.Th>
                      <Table.Th style={{ fontSize: 11 }}>REASON / NOTES</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {viewingSale.edit_history.map((eh: any, idx: number) => (
                      <Table.Tr key={idx}>
                        <Table.Td style={{ whiteSpace: 'nowrap' }}>
                          <Text size="xs" fw={600}>
                            {new Date(eh.EditedAt).toLocaleDateString()}
                          </Text>
                          <Text size="10px" c="dimmed">
                            {new Date(eh.EditedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" color="gray" variant="outline">
                            {eh.EditedBy || 'User'}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="xs" td="line-through" c="dimmed">
                            ₹{Number(eh.OldGrandTotal || 0).toFixed(2)}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="xs" fw={700} c="#800020">
                            ₹{Number(eh.NewGrandTotal || 0).toFixed(2)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs">
                            {eh.NewPaymentMethod || eh.OldPaymentMethod || '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {eh.Notes || '-'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </>
            )}

            <Divider />

            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              <div>
                <Text size="xs" c="dimmed">
                  Grand Total:
                </Text>
                <Text size="lg" fw={800} style={{ color: '#800020' }}>
                  ₹{Number(viewingSale.GrandTotal || 0).toFixed(2)}
                </Text>
                <Text size="xs" fw={600} mt={2}>
                  Paid: <span style={{ color: '#0d9488' }}>₹{Number(viewingSale.PaidAmount || 0).toFixed(2)}</span>
                  {Number(viewingSale.GrandTotal || 0) > Number(viewingSale.PaidAmount || 0) && (
                    <span style={{ color: '#dc2626', marginLeft: 8 }}>
                      (Due: ₹{(Number(viewingSale.GrandTotal || 0) - Number(viewingSale.PaidAmount || 0)).toFixed(2)})
                    </span>
                  )}
                </Text>
              </div>

              <Group gap="sm" wrap="wrap">
                {Number(viewingSale.GrandTotal || 0) > Number(viewingSale.PaidAmount || 0) && (
                  <Button
                    variant="light"
                    color="burgundy"
                    leftSection={<IconCash size={16} />}
                    loading={applyAdvanceMutation.isPending}
                    onClick={() => applyAdvanceMutation.mutate(viewingSale.SalesId)}
                  >
                    Apply Advance
                  </Button>
                )}
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
                  variant="light"
                  color="burgundy"
                  leftSection={<IconEdit size={16} />}
                  onClick={() => {
                    navigate(`/sales/${viewingSale.SalesId}/edit`);
                  }}
                >
                  Edit Invoice
                </Button>
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

      {/* Edit History Audit Modal */}
      <Modal
        opened={!!historySale}
        onClose={() => setHistorySale(null)}
        title={
          <Group gap="xs">
            <Box
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: '#fdf2f4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #f5c2cb',
              }}
            >
              <IconHistory size={18} color="#800020" />
            </Box>
            <div>
              <Text fw={800} style={{ color: '#800020', fontSize: 16 }}>
                Invoice Revision History
              </Text>
              <Text size="xs" c="dimmed">
                {historySale?.InvoiceNo || historySale?.SalesNo} &bull; {historySale?.customer_name || 'Walk-in Customer'}
              </Text>
            </div>
          </Group>
        }
        size="96%"
        radius="lg"
        padding="xl"
        centered
        styles={{
          content: {
            maxWidth: '1060px',
            width: '92vw',
          },
          inner: {
            padding: '12px',
          },
        }}
      >
        {historySale && (
          <Stack gap="md">
            {/* Summary Information Card */}
            <Box p="md" style={{ backgroundColor: '#fdf2f4', borderRadius: 10, border: '1px solid #f5c2cb' }}>
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    CUSTOMER
                  </Text>
                  <Text fw={800} size="xs" c="#0f172a" truncate>
                    {historySale.customer_name || 'Walk-in Customer'}
                  </Text>
                </div>
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    DELIVERED / EMPTY
                  </Text>
                  <Text fw={800} size="xs" c="#0f172a">
                    {historySale.TotalDeliveredQty ?? 0} Cyl / {historySale.TotalEmptyQty ?? 0} Ret
                  </Text>
                </div>
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    INVOICE TOTAL
                  </Text>
                  <Text fw={800} size="xs" c="#0f172a">
                    ₹{Number(historySale.GrandTotal ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </div>
                <div>
                  <Text size="10px" fw={700} c="#64748b" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    PAID / COLLECTED
                  </Text>
                  <Text fw={800} size="xs" style={{ color: '#800020' }}>
                    ₹{Number(historySale.PaidAmount ?? historySale.GrandTotal ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </div>
              </SimpleGrid>
            </Box>

            {/* Note / Reason outside the tab */}
            {historySale.EditReason && (
              <Text size="xs" c="#475569" px={4} style={{ marginTop: -4 }}>
                <Text component="span" fw={700} style={{ color: '#800020' }}>Latest Note / Reason:</Text>{' '}
                {historySale.EditReason}
              </Text>
            )}

            {(!historySale.edit_history || historySale.edit_history.length === 0) ? (
              <Box p="lg" style={{ textAlign: 'center', backgroundColor: '#fdf2f4', borderRadius: 10, border: '1px solid #f5c2cb' }}>
                <Text size="sm" style={{ color: '#800020', fontWeight: 700 }}>
                  Invoice record was marked as modified
                </Text>
                {historySale.EditedBy && (
                  <Text size="xs" c="dimmed" mt={4}>
                    Modified by: {historySale.EditedBy} {historySale.EditedAt ? `on ${formatDateDDMMYY(historySale.EditedAt)}` : ''}
                  </Text>
                )}
                {historySale.EditReason && (
                  <Text size="xs" fw={600} style={{ color: '#800020' }} mt={6}>
                    &ldquo;{historySale.EditReason}&rdquo;
                  </Text>
                )}
              </Box>
            ) : (
              <Table.ScrollContainer minWidth={600} style={{ width: '100%' }}>
                <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover withTableBorder style={{ borderRadius: 8, overflow: 'hidden', width: '100%' }}>
                  <Table.Thead style={{ backgroundColor: '#fdf2f4' }}>
                    <Table.Tr>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 160, whiteSpace: 'nowrap' }}>TIMESTAMP</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 180, whiteSpace: 'nowrap' }}>MODIFIED BY</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 210, whiteSpace: 'nowrap' }}>AMOUNT CHANGE</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px', width: 150, whiteSpace: 'nowrap' }}>PAYMENT MODE</Table.Th>
                      <Table.Th style={{ fontSize: 11, color: '#800020', fontWeight: 800, letterSpacing: '0.4px' }}>REASON / NOTES</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {historySale.edit_history.map((eh: any, idx: number) => {
                      const editDate = eh.EditedAt || eh.edited_at;
                      const editor = eh.EditedBy || eh.edited_by || 'Driver / Admin';
                      const oldTotal = eh.OldGrandTotal ?? eh.old_grand_total ?? 0;
                      const newTotal = eh.NewGrandTotal ?? eh.new_grand_total ?? 0;
                      const oldMode = eh.OldPaymentMethod || eh.old_payment_method || '';
                      const newMode = eh.NewPaymentMethod || eh.new_payment_method || '';
                      const noteText = eh.Notes || eh.notes || 'Invoice details updated';

                      return (
                        <Table.Tr key={eh.EditId || eh.edit_id || idx}>
                          <Table.Td style={{ fontSize: 12, color: '#475569', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                            {editDate ? new Date(editDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </Table.Td>
                          <Table.Td style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                            {editor}
                          </Table.Td>
                          <Table.Td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                            <Group gap={6} wrap="nowrap">
                              <Text size="xs" td="line-through" c="dimmed">
                                ₹{Number(oldTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                              <IconArrowRight size={13} color="#800020" />
                              <Text size="sm" fw={800} style={{ color: '#800020' }}>
                                ₹{Number(newTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                            </Group>
                          </Table.Td>
                          <Table.Td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                            {oldMode && oldMode !== newMode ? (
                              <Group gap={4} wrap="nowrap">
                                <Text size="xs" c="dimmed">{oldMode}</Text>
                                <IconArrowRight size={12} color="#800020" />
                                <Text size="xs" fw={700} style={{ color: '#800020' }}>{newMode}</Text>
                              </Group>
                            ) : (
                              <Text size="xs" fw={600} c="#0f172a">{newMode || 'Cash'}</Text>
                            )}
                          </Table.Td>
                          <Table.Td style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>
                            {noteText}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}

            <Group justify="space-between" mt="xs">
              <Button
                variant="subtle"
                color="burgundy"
                size="xs"
                radius="md"
                leftSection={<IconReceipt size={14} />}
                onClick={() => {
                  const billNo = historySale.InvoiceNo || historySale.SalesNo || '';
                  const cleanTicket = String(billNo).replace(/^#/, '');
                  const baseUrl = apiClient.defaults.baseURL?.replace(/\/api\/v1\/?$/, '') || '';
                  window.open(`${baseUrl}/api/v1/sales/invoice-pdf/?ticket_id=${encodeURIComponent(cleanTicket)}&_t=${Date.now()}`, '_blank');
                }}
                styles={{
                  root: {
                    color: '#800020',
                    fontWeight: 600,
                  },
                }}
              >
                View Invoice PDF
              </Button>
              <Button
                variant="outline"
                color="burgundy"
                size="xs"
                radius="md"
                onClick={() => setHistorySale(null)}
                styles={{
                  root: {
                    borderColor: '#800020',
                    color: '#800020',
                    fontWeight: 700,
                  },
                }}
              >
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default SalesListPage;

