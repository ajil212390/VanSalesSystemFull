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
  IconCoins,
  IconFileInvoice,
  IconCash,
  IconUsers,
  IconRefresh,
  IconArrowUpRight,
  IconPlus,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export const ReceivablesReportPage: React.FC = () => {
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

  // 2. Fetch Sales
  const { data: sales = [], isLoading: isLoadingSales } = useQuery<any[]>({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await apiClient.get('/sales/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 3. Fetch Payments & Receipts
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<any[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const res = await apiClient.get('/payments/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  const isLoading = isLoadingLedgers || isLoadingSales || isLoadingPayments;

  // Filter for Sundry Debtors (Customers)
  const debtorsList = useMemo(() => {
    // Map sales by CustomerLedger ID
    const salesMap = new Map<number, number>();
    sales.forEach((s) => {
      if (s.Status !== 'CANCELLED') {
        const cId = Number(s.CustomerLedger);
        if (cId) {
          salesMap.set(cId, (salesMap.get(cId) || 0) + Number(s.GrandTotal || 0));
        }
      }
    });

    // Map customer collections by PartyLedgerId
    const receiptsMap = new Map<number, number>();
    payments.forEach((p) => {
      if (p.voucher_type === 'RECEIPT') {
        const pId = Number(p.PartyLedgerId);
        if (pId) {
          receiptsMap.set(pId, (receiptsMap.get(pId) || 0) + Number(p.Amount || 0));
        }
      }
    });

    return ledgers
      .filter((l: any) => {
        const gName = (l.group_name || l.GroupName || '').toLowerCase();
        const gid = Number(l.GroupId ?? l.Group ?? 0);
        const isDebtorGroup = gid === 21 || gName.includes('debtor') || gName.includes('customer');
        const hasSales = salesMap.has(l.LedgerId);
        return isDebtorGroup || hasSales;
      })
      .map((l: any) => {
        const totalBilled = salesMap.get(l.LedgerId) || 0;
        const totalReceived = receiptsMap.get(l.LedgerId) || 0;
        const currentBal = Number(l.CurrentBalance || 0);
        // If currentBal is set, use it; otherwise derive from sales - receipts
        const receivable = currentBal !== 0 ? Math.abs(currentBal) : Math.max(0, totalBilled - totalReceived);

        return {
          id: l.LedgerId,
          name: l.LedgerName,
          phone: l.PhoneNumber || l.MobileNumber || '—',
          city: l.City || '—',
          groupName: l.group_name || 'Sundry Debtors',
          totalBilled,
          totalReceived,
          receivable,
          rawBalance: currentBal,
          balanceType: l.OpeningBalanceType || 'DR',
        };
      })
      .sort((a, b) => b.receivable - a.receivable);
  }, [ledgers, sales, payments]);

  // Filtered Debtors
  const filteredDebtors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return debtorsList;
    return debtorsList.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q)
    );
  }, [debtorsList, searchQuery]);

  // Summary Totals
  const totalBilledSum = useMemo(() => {
    return debtorsList.reduce((sum, d) => sum + d.totalBilled, 0);
  }, [debtorsList]);

  const totalReceivedSum = useMemo(() => {
    return debtorsList.reduce((sum, d) => sum + d.totalReceived, 0);
  }, [debtorsList]);

  const totalReceivableSum = useMemo(() => {
    return debtorsList.reduce((sum, d) => sum + d.receivable, 0);
  }, [debtorsList]);

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
            Receivables Report (Sundry Debtors)
          </Title>
          <Text size="sm" c="dimmed">
            Detailed breakdown of customer receivables, delivery sales invoiced, collections received, and outstanding balances.
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
            onClick={() => navigate('/receipts/new')}
            style={{ boxShadow: '0 2px 4px rgba(128, 0, 32, 0.15)' }}
          >
            Record Receipt
          </Button>
        </Group>
      </Group>

      {/* 2. Summary KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Card 1: Total Debtors */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Debtors
            </Text>
            <IconUsers size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {debtorsList.length}
          </Text>
          <Text size="xs" c="dimmed">
            Registered customer accounts
          </Text>
        </Paper>

        {/* Card 2: Total Sales Billed */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Sales
            </Text>
            <IconFileInvoice size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            ₹{totalBilledSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text size="xs" c="dimmed">
            {sales.filter((s: any) => s.Status !== 'CANCELLED').length} delivery &amp; sales bills
          </Text>
        </Paper>

        {/* Card 3: Total Collections Received */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Collections Received
            </Text>
            <IconCash size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            ₹{totalReceivedSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text size="xs" c="dimmed">
            Cleared cash &amp; bank receipts
          </Text>
        </Paper>

        {/* Card 4: Net Balance Receivable */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Net Balance Receivable
            </Text>
            <IconCoins size={20} color="#800020" stroke={1.75} />
          </Group>
          <Group align="baseline" gap={6} mb={4}>
            <Text fw={700} style={{ color: '#166534', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              ₹{totalReceivableSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Badge color="teal" variant="light" size="xs">
              DR
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            Current outstanding from customers
          </Text>
        </Paper>
      </SimpleGrid>

      {/* 3. Debtors Table Container */}
      <Paper radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {/* Table Filter Toolbar */}
        <Group justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #f1f5f9' }} wrap="wrap" gap="sm">
          <TextInput
            placeholder="Search customer name, phone, city..."
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
            color="teal"
            size="md"
            radius="sm"
            styles={{
              root: {
                backgroundColor: '#f0fdf4',
                color: '#166534',
                fontWeight: 700,
              },
            }}
          >
            {filteredDebtors.length} Customers Listed
          </Badge>
        </Group>

        {/* Table */}
        {isLoading ? (
          <Center py={60}>
            <Loader color="burgundy" size="md" />
          </Center>
        ) : filteredDebtors.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap={6}>
              <IconCoins size={36} color="#cbd5e1" stroke={1.5} />
              <Text size="sm" c="#64748b" fw={600}>
                No customers found
              </Text>
              <Text size="xs" c="dimmed">
                No debtor records match your search criteria.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={700}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover style={{ tableLayout: 'auto' }}>
              <Table.Thead style={{ backgroundColor: '#f0fdf4' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#166534', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Customer Name
                  </Table.Th>
                  <Table.Th style={{ color: '#166534', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', width: 140 }}>
                    Contact Phone
                  </Table.Th>
                  <Table.Th style={{ color: '#166534', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', width: 130 }}>
                    City
                  </Table.Th>
                  <Table.Th style={{ color: '#166534', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 140 }}>
                    Sales Billed (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#166534', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 140 }}>
                    Collections (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#166534', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 150 }}>
                    Receivable Balance (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#166534', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'center', width: 110, paddingRight: 16 }}>
                    Action
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredDebtors.map((debtor) => (
                  <Table.Tr
                    key={debtor.id}
                    style={{ cursor: 'pointer', height: 46 }}
                    onClick={() => navigate('/receipts')}
                  >
                    <Table.Td>
                      <Text size="sm" fw={700} c="#0f172a">
                        {debtor.name}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Text size="xs" fw={500} c="#475569" style={{ fontFamily: 'monospace' }}>
                        {debtor.phone}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Text size="xs" fw={500} c="#475569">
                        {debtor.city}
                      </Text>
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{debtor.totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{debtor.totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#166534', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{debtor.receivable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      <Text component="span" size="xs" fw={700} c="#166534">
                        Dr
                      </Text>
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'center', paddingRight: 16 }}>
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="teal"
                        rightSection={<IconArrowUpRight size={12} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/receipts/new');
                        }}
                      >
                        Receive
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>

              {/* Total Footer Row */}
              <Table.Tfoot style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <Table.Tr style={{ height: 46 }}>
                  <Table.Td colSpan={3}>
                    <Text fw={800} style={{ color: '#166534', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      TOTAL ({filteredDebtors.length} DEBTORS)
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{filteredDebtors.reduce((s, d) => s + d.totalBilled, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{filteredDebtors.reduce((s, d) => s + d.totalReceived, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 900, fontSize: 15, color: '#166534', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{filteredDebtors.reduce((s, d) => s + d.receivable, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <Text component="span" size="xs" fw={800}>
                      Dr
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

export default ReceivablesReportPage;

