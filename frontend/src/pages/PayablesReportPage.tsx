import React, { useState, useMemo } from 'react';
import {
  Title,
  Text,
  Paper,
  SimpleGrid,
  Group,
  Stack,
  Badge,
  Button,
  Table,
  Loader,
  Center,
  TextInput,
  CloseButton,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconSearch,
  IconWallet,
  IconReceipt,
  IconCreditCard,
  IconBuildingFactory2,
  IconRefresh,
  IconArrowUpRight,
  IconPlus,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export const PayablesReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Ledgers
  const {
    data: ledgers = [],
    isLoading: isLoadingLedgers,
    refetch: refetchLedgers,
    isFetching,
  } = useQuery<any[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 2. Fetch Purchases
  const { data: purchases = [], isLoading: isLoadingPurchases } = useQuery<any[]>({
    queryKey: ['purchases'],
    queryFn: async () => {
      const res = await apiClient.get('/purchases/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 3. Fetch Payments
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<any[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  const isLoading = isLoadingLedgers || isLoadingPurchases || isLoadingPayments;

  // Filter for Sundry Creditors (Suppliers)
  const creditorsList = useMemo(() => {
    // Map purchases by SupplierLedgerId
    const purchaseMap = new Map<number, number>();
    purchases.forEach((p) => {
      const sId = Number(p.SupplierLedgerId);
      if (sId) {
        purchaseMap.set(sId, (purchaseMap.get(sId) || 0) + Number(p.GrandTotal || 0));
      }
    });

    // Map payments by PartyLedgerId (supplier payments)
    const paymentMap = new Map<number, number>();
    payments.forEach((p) => {
      if (p.voucher_type === 'PAYMENT' || !p.voucher_type) {
        const pId = Number(p.PartyLedgerId);
        if (pId) {
          paymentMap.set(pId, (paymentMap.get(pId) || 0) + Number(p.Amount || 0));
        }
      }
    });

    return ledgers
      .filter((l: any) => {
        const gName = (l.group_name || l.GroupName || '').toLowerCase();
        const gid = Number(l.GroupId ?? l.Group ?? 0);
        const isCreditorGroup = gid === 22 || gName.includes('creditor') || gName.includes('supplier');
        const hasPurchases = purchaseMap.has(l.LedgerId);
        return isCreditorGroup || hasPurchases;
      })
      .map((l: any) => {
        const totalBilled = purchaseMap.get(l.LedgerId) || 0;
        const totalPaid = paymentMap.get(l.LedgerId) || 0;
        const currentBal = Number(l.CurrentBalance || 0);
        // If currentBal is recorded, use it, otherwise derive from purchases - payments
        const payable = currentBal !== 0 ? Math.abs(currentBal) : Math.max(0, totalBilled - totalPaid);

        return {
          id: l.LedgerId,
          name: l.LedgerName,
          phone: l.PhoneNumber || l.MobileNumber || '—',
          city: l.City || '—',
          groupName: l.group_name || 'Sundry Creditors',
          totalBilled,
          totalPaid,
          payable,
          rawBalance: currentBal,
          balanceType: l.OpeningBalanceType || 'CR',
        };
      })
      .sort((a, b) => b.payable - a.payable);
  }, [ledgers, purchases, payments]);

  // Filtered Creditors
  const filteredCreditors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return creditorsList;
    return creditorsList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
    );
  }, [creditorsList, searchQuery]);

  // Summary Totals
  const totalBilledSum = useMemo(() => {
    return creditorsList.reduce((sum, c) => sum + c.totalBilled, 0);
  }, [creditorsList]);

  const totalPaidSum = useMemo(() => {
    return creditorsList.reduce((sum, c) => sum + c.totalPaid, 0);
  }, [creditorsList]);

  const totalPayableSum = useMemo(() => {
    return creditorsList.reduce((sum, c) => sum + c.payable, 0);
  }, [creditorsList]);

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* 1. Header with Back Button and Quick Actions */}
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <div>
          <Group gap="xs" align="center" mb={6}>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/')}
              styles={{ root: { paddingLeft: 4, paddingRight: 8 } }}
            >
              Back to Dashboard
            </Button>
          </Group>
          <Title order={2} style={{ color: '#800020', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Payables Report (Sundry Creditors)
          </Title>
          <Text size="sm" c="dimmed">
            Detailed breakdown of supplier liability, purchase bills recorded, payments settled, and outstanding payable balances.
          </Text>
        </div>

        <Group gap="xs" align="center" wrap="wrap">
          <Tooltip label="Refresh ledger balances" withArrow position="top">
            <ActionIcon
              variant="default"
              size="lg"
              radius="md"
              loading={isFetching}
              onClick={() => refetchLedgers()}
              style={{ borderColor: '#cbd5e1' }}
            >
              <IconRefresh size={18} color="#475569" />
            </ActionIcon>
          </Tooltip>

          <Button
            color="burgundy"
            radius="md"
            size="sm"
            fw={600}
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/payments/new')}
            style={{ boxShadow: '0 2px 4px rgba(128, 0, 32, 0.15)' }}
          >
            Record Payment
          </Button>
        </Group>
      </Group>

      {/* 2. Summary KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Card 1: Total Suppliers */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Creditors
            </Text>
            <IconBuildingFactory2 size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {creditorsList.length}
          </Text>
          <Text size="xs" c="dimmed">
            Registered supplier accounts
          </Text>
        </Paper>

        {/* Card 2: Total Invoices Billed */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Purchases
            </Text>
            <IconReceipt size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            ₹{totalBilledSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text size="xs" c="dimmed">
            {purchases.length} purchase invoice{purchases.length !== 1 ? 's' : ''} recorded
          </Text>
        </Paper>

        {/* Card 3: Total Payments Settled */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Payments Settled
            </Text>
            <IconCreditCard size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            ₹{totalPaidSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text size="xs" c="dimmed">
            Disbursed to suppliers
          </Text>
        </Paper>

        {/* Card 4: Net Balance Payable */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Net Balance Payable
            </Text>
            <IconWallet size={20} color="#800020" stroke={1.75} />
          </Group>
          <Group align="baseline" gap={6} mb={4}>
            <Text fw={700} style={{ color: '#800020', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              ₹{totalPayableSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Badge color="burgundy" variant="light" size="xs">
              CR
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            Current outstanding liability
          </Text>
        </Paper>
      </SimpleGrid>

      {/* 3. Creditors Table Container */}
      <Paper radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {/* Table Filter Toolbar */}
        <Group justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #f1f5f9' }} wrap="wrap" gap="sm">
          <TextInput
            placeholder="Search supplier name, phone, city..."
            size="sm"
            radius="md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            leftSection={<IconSearch size={15} color="#64748b" />}
            rightSection={searchQuery ? <CloseButton size="xs" onClick={() => setSearchQuery('')} /> : null}
            style={{ minWidth: 260, flexGrow: 1, maxWidth: 380 }}
          />

          <Badge
            variant="light"
            color="burgundy"
            size="md"
            radius="sm"
            styles={{
              root: {
                backgroundColor: '#fdf2f4',
                color: '#800020',
                fontWeight: 700,
              },
            }}
          >
            {filteredCreditors.length} Suppliers Listed
          </Badge>
        </Group>

        {/* Table */}
        {isLoading ? (
          <Center py={60}>
            <Loader color="burgundy" size="md" />
          </Center>
        ) : filteredCreditors.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap={6}>
              <IconWallet size={36} color="#cbd5e1" stroke={1.5} />
              <Text size="sm" c="#64748b" fw={600}>
                No suppliers found
              </Text>
              <Text size="xs" c="dimmed">
                No creditor records match your search criteria.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={700}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover style={{ tableLayout: 'auto' }}>
              <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Supplier Name
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', width: 140 }}>
                    Contact Phone
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', width: 130 }}>
                    City
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 140 }}>
                    Purchases Billed (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 140 }}>
                    Payments Paid (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 150 }}>
                    Payable Balance (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center', width: 110, paddingRight: 16 }}>
                    Action
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredCreditors.map((creditor) => (
                  <Table.Tr
                    key={creditor.id}
                    style={{ cursor: 'pointer', height: 46 }}
                    onClick={() => navigate('/purchases')}
                  >
                    <Table.Td>
                      <Text size="sm" fw={700} c="#0f172a">
                        {creditor.name}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Text size="xs" fw={500} c="#475569" style={{ fontFamily: 'monospace' }}>
                        {creditor.phone}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Text size="xs" fw={500} c="#475569">
                        {creditor.city}
                      </Text>
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{creditor.totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{creditor.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{creditor.payable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      <Text component="span" size="xs" fw={700} c="#800020">
                        Cr
                      </Text>
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'center', paddingRight: 16 }}>
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="burgundy"
                        rightSection={<IconArrowUpRight size={12} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/payments/new');
                        }}
                      >
                        Pay
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>

              {/* Total Footer Row */}
              <Table.Tfoot style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <Table.Tr style={{ height: 46 }}>
                  <Table.Td colSpan={3}>
                    <Text fw={800} style={{ color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      TOTAL ({filteredCreditors.length} CREDITORS)
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{filteredCreditors.reduce((s, c) => s + c.totalBilled, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{filteredCreditors.reduce((s, c) => s + c.totalPaid, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 900, fontSize: 15, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{filteredCreditors.reduce((s, c) => s + c.payable, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <Text component="span" size="xs" fw={800}>
                      Cr
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ border: 'none' }}>&nbsp;</Table.Td>
                </Table.Tr>
              </Table.Tfoot>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>
    </Stack>
  );
};

export default PayablesReportPage;

