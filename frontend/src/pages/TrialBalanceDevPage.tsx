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
  Select,
  Badge,
  SimpleGrid,
  Box,
  Divider,
  CloseButton,
  SegmentedControl,
  Switch,
} from '@mantine/core';
import {
  IconSearch,
  IconPrinter,
  IconRefresh,
  IconScale,
  IconArrowLeft,
  IconBook2,
  IconChevronDown,
  IconChevronRight,
  IconAlertCircle,
  IconFileSpreadsheet,
} from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';

interface LedgerItem {
  LedgerId: number;
  LedgerName: string;
  Group?: number | { GroupId?: number; GroupName?: string; Nature?: string };
  group_name?: string;
  group_nature?: string;
  Route?: number | null;
  RouteId?: number | null;
  RouteName?: string;
  route_name?: string;
  CustomerCode?: string;
  OpeningBalance: number;
  OpeningBalanceType: 'DR' | 'CR';
  DebitBalance: number;
  CreditBalance: number;
  CurrentBalance: number;
  GSTIN?: string;
  PhoneNumber?: string;
  MobileNumber?: string;
  AddressLine1?: string;
  City?: string;
}

export const TrialBalanceDevPage: React.FC = () => {
  const navigate = useNavigate();

  // Trial Balance Preferences & States
  const [tbViewType, setTbViewType] = useState<'grouped' | 'detailed'>('grouped');
  const [tbColumnFormat, setTbColumnFormat] = useState<'comprehensive' | 'closing'>('comprehensive');
  const [tbSearch, setTbSearch] = useState('');
  const [tbNatureFilter, setTbNatureFilter] = useState<string>('ALL');
  const [tbHideZero, setTbHideZero] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Fetch All Ledgers
  const { data: ledgers = [], isLoading, refetch } = useQuery<LedgerItem[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // Trial Balance Expand / Collapse helpers
  const toggleGroupExpand = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const expandAllGroups = () => {
    const allExp: Record<string, boolean> = {};
    trialBalanceData.groups.forEach((g) => {
      allExp[g.groupName] = true;
    });
    setExpandedGroups(allExp);
  };

  const collapseAllGroups = () => {
    setExpandedGroups({});
  };

  // Comprehensive Trial Balance Data with double-entry equality check
  const trialBalanceData = useMemo(() => {
    let filtered = ledgers;
    if (tbHideZero) {
      filtered = filtered.filter((l) => {
        const op = Number(l.OpeningBalance || 0);
        const dr = Number(l.DebitBalance || 0);
        const cr = Number(l.CreditBalance || 0);
        const cur = Number(l.CurrentBalance || 0);
        return Math.abs(op) > 0.001 || Math.abs(dr) > 0.001 || Math.abs(cr) > 0.001 || Math.abs(cur) > 0.001;
      });
    }

    if (tbSearch.trim()) {
      const q = tbSearch.toLowerCase();
      filtered = filtered.filter((l) =>
        (l.LedgerName && l.LedgerName.toLowerCase().includes(q)) ||
        (l.group_name && l.group_name.toLowerCase().includes(q)) ||
        (l.group_nature && l.group_nature.toLowerCase().includes(q))
      );
    }

    if (tbNatureFilter !== 'ALL') {
      filtered = filtered.filter((l) =>
        (l.group_nature || '').toLowerCase() === tbNatureFilter.toLowerCase()
      );
    }

    const groupMap: Record<
      string,
      {
        groupName: string;
        groupNature: string;
        ledgers: Array<{
          ledger: LedgerItem;
          opDr: number;
          opCr: number;
          txDr: number;
          txCr: number;
          closingDr: number;
          closingCr: number;
        }>;
        totalOpDr: number;
        totalOpCr: number;
        totalTxDr: number;
        totalTxCr: number;
        totalClosingDr: number;
        totalClosingCr: number;
      }
    > = {};

    let grandOpDr = 0;
    let grandOpCr = 0;
    let grandTxDr = 0;
    let grandTxCr = 0;
    let grandClosingDr = 0;
    let grandClosingCr = 0;

    filtered.forEach((l) => {
      const op = Number(l.OpeningBalance || 0);
      const isOpCr = l.OpeningBalanceType === 'CR';
      const opDr = !isOpCr ? Math.abs(op) : 0;
      const opCr = isOpCr ? Math.abs(op) : 0;

      const txDr = Number(l.DebitBalance || 0);
      const txCr = Number(l.CreditBalance || 0);

      // In Tally / ERP: Net balance = (OpDr - OpCr) + (PeriodDr - PeriodCr)
      const net = (opDr - opCr) + (txDr - txCr);
      const closingDr = net > 0 ? net : 0;
      const closingCr = net < 0 ? Math.abs(net) : 0;

      grandOpDr += opDr;
      grandOpCr += opCr;
      grandTxDr += txDr;
      grandTxCr += txCr;
      grandClosingDr += closingDr;
      grandClosingCr += closingCr;

      const grp = l.group_name || 'General';
      const nature = l.group_nature || 'Asset';

      if (!groupMap[grp]) {
        groupMap[grp] = {
          groupName: grp,
          groupNature: nature,
          ledgers: [],
          totalOpDr: 0,
          totalOpCr: 0,
          totalTxDr: 0,
          totalTxCr: 0,
          totalClosingDr: 0,
          totalClosingCr: 0,
        };
      }

      groupMap[grp].ledgers.push({
        ledger: l,
        opDr,
        opCr,
        txDr,
        txCr,
        closingDr,
        closingCr,
      });

      groupMap[grp].totalOpDr += opDr;
      groupMap[grp].totalOpCr += opCr;
      groupMap[grp].totalTxDr += txDr;
      groupMap[grp].totalTxCr += txCr;
      groupMap[grp].totalClosingDr += closingDr;
      groupMap[grp].totalClosingCr += closingCr;
    });

    const groupsList = Object.values(groupMap).sort((a, b) => {
      const natureOrder: Record<string, number> = {
        asset: 1,
        liability: 2,
        income: 3,
        expense: 4,
      };
      const orderA = natureOrder[a.groupNature.toLowerCase()] || 5;
      const orderB = natureOrder[b.groupNature.toLowerCase()] || 5;
      if (orderA !== orderB) return orderA - orderB;
      return a.groupName.localeCompare(b.groupName);
    });

    const closingDifference = grandClosingDr - grandClosingCr;
    const isBalanced = Math.abs(closingDifference) < 0.01;

    return {
      groups: groupsList,
      totalCount: filtered.length,
      grandOpDr,
      grandOpCr,
      grandTxDr,
      grandTxCr,
      grandClosingDr,
      grandClosingCr,
      closingDifference,
      isBalanced,
    };
  }, [ledgers, tbHideZero, tbSearch, tbNatureFilter]);

  // Export Trial Balance to Excel (Accounting format)
  const handleExportTrialBalanceExcel = () => {
    try {
      const rows: any[] = [];
      rows.push({
        'Account Group': 'FUTURE GAS DISTRIBUTION ERP - TRIAL BALANCE',
        'Ledger Name': '',
        'Nature': '',
        'Opening Dr': '',
        'Opening Cr': '',
        'Period Debit (Dr)': '',
        'Period Credit (Cr)': '',
        'Closing Dr': '',
        'Closing Cr': '',
      });

      trialBalanceData.groups.forEach((g) => {
        rows.push({
          'Account Group': g.groupName.toUpperCase(),
          'Ledger Name': `[GROUP TOTAL - ${g.ledgers.length} ACCOUNTS]`,
          'Nature': g.groupNature,
          'Opening Dr': g.totalOpDr || 0,
          'Opening Cr': g.totalOpCr || 0,
          'Period Debit (Dr)': g.totalTxDr || 0,
          'Period Credit (Cr)': g.totalTxCr || 0,
          'Closing Dr': g.totalClosingDr || 0,
          'Closing Cr': g.totalClosingCr || 0,
        });

        g.ledgers.forEach(({ ledger, opDr, opCr, txDr, txCr, closingDr, closingCr }) => {
          rows.push({
            'Account Group': g.groupName,
            'Ledger Name': ledger.LedgerName,
            'Nature': g.groupNature,
            'Opening Dr': opDr || 0,
            'Opening Cr': opCr || 0,
            'Period Debit (Dr)': txDr || 0,
            'Period Credit (Cr)': txCr || 0,
            'Closing Dr': closingDr || 0,
            'Closing Cr': closingCr || 0,
          });
        });
      });

      rows.push({
        'Account Group': 'GRAND TOTAL',
        'Ledger Name': '',
        'Nature': '',
        'Opening Dr': trialBalanceData.grandOpDr,
        'Opening Cr': trialBalanceData.grandOpCr,
        'Period Debit (Dr)': trialBalanceData.grandTxDr,
        'Period Credit (Cr)': trialBalanceData.grandTxCr,
        'Closing Dr': trialBalanceData.grandClosingDr,
        'Closing Cr': trialBalanceData.grandClosingCr,
      });

      if (!trialBalanceData.isBalanced) {
        const diff = Math.abs(trialBalanceData.closingDifference);
        rows.push({
          'Account Group': 'DIFFERENCE IN OPENING / TRIAL BALANCE',
          'Ledger Name': 'Opening Balance Difference',
          'Nature': '',
          'Opening Dr': '',
          'Opening Cr': '',
          'Period Debit (Dr)': '',
          'Period Credit (Cr)': '',
          'Closing Dr': trialBalanceData.closingDifference < 0 ? diff : 0,
          'Closing Cr': trialBalanceData.closingDifference > 0 ? diff : 0,
        });
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');
      XLSX.writeFile(wb, `Trial_Balance_${new Date().toISOString().slice(0, 10)}.xlsx`);

      notifications.show({
        title: 'Trial Balance Exported',
        message: 'Trial Balance workbook successfully generated and downloaded.',
        color: 'teal',
      });
    } catch (err: any) {
      notifications.show({
        title: 'Export Failed',
        message: err.message || 'Could not export Trial Balance.',
        color: 'red',
      });
    }
  };

  const handlePrintTrialBalance = () => {
    window.print();
  };

  return (
    <Stack gap="md" style={{ width: '100%' }}>
      {/* Top Header */}
      <Box pt={4} pb={2}>
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <div>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/')}
              mb={4}
              styles={{ root: { paddingLeft: 0, paddingRight: 8, color: '#475569' } }}
            >
              Back to Dashboard
            </Button>
            <Group gap={10} align="center">
              <IconScale size={24} color="#800020" />
              <Title order={2} style={{ color: '#800020', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>
                Trial Balance (Developer View)
              </Title>
              <Badge color="burgundy" variant="light" size="sm" radius="sm">
                INTERNAL / AUDIT ONLY
              </Badge>
            </Group>
            <Text size="xs" c="dimmed" mt={2}>
              Dedicated internal double-entry verification view &bull; Opening balances, period transactions, closing balances, and equality checks.
            </Text>
          </div>

          <Group gap="xs">
            <Button
              variant="default"
              size="xs"
              radius="md"
              leftSection={<IconRefresh size={14} />}
              onClick={() => refetch()}
            >
              Refresh
            </Button>

            <Button
              variant="outline"
              color="teal"
              size="xs"
              radius="md"
              leftSection={<IconFileSpreadsheet size={15} />}
              onClick={handleExportTrialBalanceExcel}
              style={{ borderColor: '#0d9488', color: '#0f766e', fontWeight: 600 }}
            >
              Export Excel
            </Button>
            <Button
              variant="outline"
              color="burgundy"
              size="xs"
              radius="md"
              leftSection={<IconPrinter size={15} />}
              onClick={handlePrintTrialBalance}
              style={{ borderColor: '#800020', color: '#800020', fontWeight: 600 }}
            >
              Print Trial Balance
            </Button>
          </Group>
        </Group>
      </Box>

      {/* Trial Balance Overview Strip */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
        {/* 1. Opening Balance */}
        <Paper p="xs" px="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Text size="11px" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px' }}>
            Total Opening Balances
          </Text>
          <Group justify="space-between" align="baseline" mt={2}>
            <div>
              <Text size="10px" c="dimmed">DEBIT (DR)</Text>
              <Text size="sm" fw={700} c="#0f172a" style={{ fontVariantNumeric: 'tabular-nums' }}>
                ₹{trialBalanceData.grandOpDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </div>
            <div>
              <Text size="10px" c="dimmed" style={{ textAlign: 'right' }}>CREDIT (CR)</Text>
              <Text size="sm" fw={700} c="#0f172a" style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                ₹{trialBalanceData.grandOpCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </div>
          </Group>
        </Paper>

        {/* 2. Transactions Total */}
        <Paper p="xs" px="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Text size="11px" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px' }}>
            Period Transactions
          </Text>
          <Group justify="space-between" align="baseline" mt={2}>
            <div>
              <Text size="10px" c="dimmed">TOTAL DEBITS (DR)</Text>
              <Text size="sm" fw={700} c="#0f172a" style={{ fontVariantNumeric: 'tabular-nums' }}>
                ₹{trialBalanceData.grandTxDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </div>
            <div>
              <Text size="10px" c="dimmed" style={{ textAlign: 'right' }}>TOTAL CREDITS (CR)</Text>
              <Text size="sm" fw={700} c="#0f172a" style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                ₹{trialBalanceData.grandTxCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </div>
          </Group>
        </Paper>

        {/* 3. Closing Trial Balance Dr & Cr */}
        <Paper p="xs" px="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <Text size="11px" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px' }}>
            Closing Trial Balances
          </Text>
          <Group justify="space-between" align="baseline" mt={2}>
            <div>
              <Text size="10px" c="dimmed">CLOSING DR</Text>
              <Text size="sm" fw={700} c="#0f172a" style={{ fontVariantNumeric: 'tabular-nums' }}>
                ₹{trialBalanceData.grandClosingDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </div>
            <div>
              <Text size="10px" c="dimmed" style={{ textAlign: 'right' }}>CLOSING CR</Text>
              <Text size="sm" fw={700} c="#0f172a" style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                ₹{trialBalanceData.grandClosingCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </div>
          </Group>
        </Paper>

        {/* 4. Equality Verification Card (Tally Style) */}
        <Paper
          p="xs"
          px="md"
          radius="sm"
          withBorder
          style={{
            backgroundColor: trialBalanceData.isBalanced ? '#f0fdf4' : '#fff1f2',
            borderColor: trialBalanceData.isBalanced ? '#bbf7d0' : '#fecdd3',
          }}
        >
          <Group justify="space-between" align="center">
            <Text size="11px" fw={700} c={trialBalanceData.isBalanced ? '#15803d' : '#b91c1c'} tt="uppercase" style={{ letterSpacing: '0.4px' }}>
              {trialBalanceData.isBalanced ? 'Trial Balance Status' : 'Difference in Balance'}
            </Text>
            <Badge
              size="xs"
              variant="filled"
              color={trialBalanceData.isBalanced ? 'green' : 'red'}
              radius="sm"
            >
              {trialBalanceData.isBalanced ? 'BALANCED' : 'UNADJUSTED'}
            </Badge>
          </Group>
          {trialBalanceData.isBalanced ? (
            <Text size="sm" fw={700} c="#166534" mt={4}>
              Dr = Cr (Diff: ₹0.00)
            </Text>
          ) : (
            <Text size="sm" fw={700} c="#991b1b" mt={4} style={{ fontVariantNumeric: 'tabular-nums' }}>
              ₹{Math.abs(trialBalanceData.closingDifference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
              <Text component="span" size="xs" fw={700}>
                {trialBalanceData.closingDifference > 0 ? 'Cr Difference' : 'Dr Difference'}
              </Text>
            </Text>
          )}
        </Paper>
      </SimpleGrid>

      {/* Trial Balance Main Container */}
      <Paper radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
        {/* Toolbar */}
        <Group justify="space-between" align="center" p="sm" style={{ borderBottom: '1px solid #f1f5f9' }} wrap="wrap" gap="sm">
          <Group gap="xs" wrap="wrap">
            {/* View Format: Grouped (Tally) vs Detailed */}
            <SegmentedControl
              size="xs"
              value={tbViewType}
              onChange={(val) => setTbViewType(val as 'grouped' | 'detailed')}
              data={[
                { value: 'grouped', label: 'Group-wise (Tally)' },
                { value: 'detailed', label: 'Ledger-wise (Flat)' },
              ]}
              color="burgundy"
            />

            {/* Column Format: Comprehensive (6 Col) vs Closing (2 Col) */}
            <SegmentedControl
              size="xs"
              value={tbColumnFormat}
              onChange={(val) => setTbColumnFormat(val as 'comprehensive' | 'closing')}
              data={[
                { value: 'comprehensive', label: 'Detailed (6 Columns)' },
                { value: 'closing', label: 'Closing (2 Columns)' },
              ]}
              color="burgundy"
            />

            {/* Nature Filter */}
            <Select
              placeholder="All Account Natures"
              data={[
                { value: 'ALL', label: 'All Natures' },
                { value: 'Asset', label: 'Assets' },
                { value: 'Liability', label: 'Liabilities' },
                { value: 'Income', label: 'Incomes' },
                { value: 'Expense', label: 'Expenses' },
              ]}
              value={tbNatureFilter}
              onChange={(val) => setTbNatureFilter(val || 'ALL')}
              size="xs"
              radius="md"
              style={{ width: 140 }}
            />

            {/* Search */}
            <TextInput
              placeholder="Search group or ledger..."
              leftSection={<IconSearch size={14} color="#800020" />}
              rightSection={
                tbSearch ? (
                  <CloseButton size="xs" aria-label="Clear search" onClick={() => setTbSearch('')} />
                ) : null
              }
              value={tbSearch}
              onChange={(e) => setTbSearch(e.currentTarget.value)}
              size="xs"
              radius="md"
              style={{ width: 200 }}
            />
          </Group>

          <Group gap="xs">
            {tbViewType === 'grouped' && (
              <Group gap={6}>
                <Button variant="subtle" size="xs" color="gray" onClick={expandAllGroups}>
                  Expand All
                </Button>
                <Divider orientation="vertical" style={{ height: 16 }} />
                <Button variant="subtle" size="xs" color="gray" onClick={collapseAllGroups}>
                  Collapse All
                </Button>
              </Group>
            )}

            <Switch
              size="xs"
              label="Hide 0.00 Balances"
              checked={tbHideZero}
              onChange={(e) => setTbHideZero(e.currentTarget.checked)}
              color="burgundy"
            />
          </Group>
        </Group>

        {/* Trial Balance Table */}
        {isLoading ? (
          <Center py={60}>
            <Loader color="burgundy" size="md" />
          </Center>
        ) : trialBalanceData.groups.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap="xs">
              <IconScale size={38} color="#800020" stroke={1.5} />
              <Text fw={600} size="sm" c="dimmed">
                {tbSearch ? 'No trial balance accounts match your search.' : 'No accounts available in trial balance.'}
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={tbColumnFormat === 'comprehensive' ? 1050 : 780}>
            <Table verticalSpacing="xs" horizontalSpacing="md" highlightOnHover withColumnBorders={false}>
              <Table.Thead style={{ backgroundColor: '#fbf0f2', borderBottom: '2px solid #800020' }}>
                {tbColumnFormat === 'comprehensive' ? (
                  <>
                    <Table.Tr>
                      <Table.Th rowSpan={2} style={{ color: '#800020', fontWeight: 700, fontSize: 12, minWidth: 260, verticalAlign: 'middle' }}>
                        PARTICULARS (GROUP / LEDGER)
                      </Table.Th>
                      <Table.Th colSpan={2} style={{ color: '#800020', fontWeight: 700, fontSize: 11, textAlign: 'center', borderLeft: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
                        OPENING BALANCE
                      </Table.Th>
                      <Table.Th colSpan={2} style={{ color: '#800020', fontWeight: 700, fontSize: 11, textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                        PERIOD TRANSACTIONS
                      </Table.Th>
                      <Table.Th colSpan={2} style={{ color: '#800020', fontWeight: 700, fontSize: 11, textAlign: 'center', backgroundColor: '#f7e4e7', borderRight: '1px solid #f1f5f9' }}>
                        CLOSING BALANCE
                      </Table.Th>
                      <Table.Th rowSpan={2} style={{ color: '#800020', fontWeight: 700, fontSize: 11, minWidth: 90, textAlign: 'center', verticalAlign: 'middle' }}>
                        STATEMENT
                      </Table.Th>
                    </Table.Tr>
                    <Table.Tr style={{ borderTop: '1px solid #f3d1d7' }}>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textAlign: 'right', minWidth: 110, borderLeft: '1px solid #f1f5f9' }}>Debit (Dr)</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textAlign: 'right', minWidth: 110, borderRight: '1px solid #f1f5f9' }}>Credit (Cr)</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textAlign: 'right', minWidth: 110 }}>Debit (Dr)</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 11, textAlign: 'right', minWidth: 110, borderRight: '1px solid #f1f5f9' }}>Credit (Cr)</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textAlign: 'right', minWidth: 120, backgroundColor: '#f7e4e7' }}>Debit (Dr)</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textAlign: 'right', minWidth: 120, backgroundColor: '#f7e4e7', borderRight: '1px solid #f1f5f9' }}>Credit (Cr)</Table.Th>
                    </Table.Tr>
                  </>
                ) : (
                  <Table.Tr>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12, minWidth: 280 }}>PARTICULARS (GROUP / LEDGER)</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12, minWidth: 140 }}>NATURE / GROUP</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12, minWidth: 140, textAlign: 'right' }}>DEBIT (DR)</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12, minWidth: 140, textAlign: 'right' }}>CREDIT (CR)</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12, minWidth: 100, textAlign: 'center' }}>STATEMENT</Table.Th>
                  </Table.Tr>
                )}
              </Table.Thead>

              <Table.Tbody>
                {/* Render Grouped Format (Traditional Tally) */}
                {tbViewType === 'grouped' && (
                  trialBalanceData.groups.map((g) => {
                    const isExpanded = !!expandedGroups[g.groupName];
                    return (
                      <React.Fragment key={g.groupName}>
                        {/* Group Header Row */}
                        <Table.Tr
                          style={{
                            backgroundColor: isExpanded ? '#fbf2f4' : '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            cursor: 'pointer',
                          }}
                          onClick={() => toggleGroupExpand(g.groupName)}
                        >
                          <Table.Td style={{ fontWeight: 700, fontSize: 13, color: '#800020' }}>
                            <Group gap="xs" wrap="nowrap">
                              {isExpanded ? (
                                <IconChevronDown size={16} color="#800020" />
                              ) : (
                                <IconChevronRight size={16} color="#64748b" />
                              )}
                              <Text fw={700} size="sm" c="#800020">
                                {g.groupName}
                              </Text>
                              <Badge size="xs" variant="outline" color="gray" radius="sm">
                                {g.groupNature}
                              </Badge>
                              <Text size="11px" c="dimmed">
                                ({g.ledgers.length})
                              </Text>
                            </Group>
                          </Table.Td>

                          {tbColumnFormat === 'comprehensive' ? (
                            <>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums', borderLeft: '1px solid #f1f5f9' }}>
                                {g.totalOpDr !== 0 ? `₹${g.totalOpDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums', borderRight: '1px solid #f1f5f9' }}>
                                {g.totalOpCr !== 0 ? `₹${g.totalOpCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                                {g.totalTxDr !== 0 ? `₹${g.totalTxDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums', borderRight: '1px solid #f1f5f9' }}>
                                {g.totalTxCr !== 0 ? `₹${g.totalTxCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#0f172a', fontVariantNumeric: 'tabular-nums', backgroundColor: isExpanded ? '#fae9ec' : '#fcf4f5' }}>
                                {g.totalClosingDr !== 0 ? `₹${g.totalClosingDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#0f172a', fontVariantNumeric: 'tabular-nums', backgroundColor: isExpanded ? '#fae9ec' : '#fcf4f5', borderRight: '1px solid #f1f5f9' }}>
                                {g.totalClosingCr !== 0 ? `₹${g.totalClosingCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'center' }}>
                                <Text size="11px" c="dimmed" fw={600}>
                                  {isExpanded ? 'Hide' : 'Expand'}
                                </Text>
                              </Table.Td>
                            </>
                          ) : (
                            <>
                              <Table.Td>
                                <Text size="xs" c="dimmed">{g.groupNature}</Text>
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                                {g.totalClosingDr !== 0 ? `₹${g.totalClosingDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                                {g.totalClosingCr !== 0 ? `₹${g.totalClosingCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                              </Table.Td>
                              <Table.Td style={{ textAlign: 'center' }}>
                                <Text size="11px" c="dimmed" fw={600}>
                                  {isExpanded ? 'Hide' : 'Expand'}
                                </Text>
                              </Table.Td>
                            </>
                          )}
                        </Table.Tr>

                        {/* Child Ledgers (Expanded) */}
                        {isExpanded &&
                          g.ledgers.map(({ ledger, opDr, opCr, txDr, txCr, closingDr, closingCr }) => (
                            <Table.Tr
                              key={ledger.LedgerId}
                              style={{ backgroundColor: '#ffffff' }}
                            >
                              <Table.Td style={{ paddingLeft: 36 }}>
                                <Group gap="xs" wrap="nowrap">
                                  <IconBook2 size={14} color="#64748b" />
                                  <Text size="xs" fw={500} c="#1e293b">
                                    {ledger.LedgerName}
                                  </Text>
                                </Group>
                              </Table.Td>

                              {tbColumnFormat === 'comprehensive' ? (
                                <>
                                  <Table.Td style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', borderLeft: '1px solid #f8fafc' }}>
                                    {opDr !== 0 ? `₹${opDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                  </Table.Td>
                                  <Table.Td style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', borderRight: '1px solid #f8fafc' }}>
                                    {opCr !== 0 ? `₹${opCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                  </Table.Td>
                                  <Table.Td style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                                    {txDr !== 0 ? `₹${txDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                  </Table.Td>
                                  <Table.Td style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', borderRight: '1px solid #f8fafc' }}>
                                    {txCr !== 0 ? `₹${txCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                  </Table.Td>
                                  <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums', backgroundColor: '#fffafa' }}>
                                    {closingDr !== 0 ? `₹${closingDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                  </Table.Td>
                                  <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums', backgroundColor: '#fffafa', borderRight: '1px solid #f8fafc' }}>
                                    {closingCr !== 0 ? `₹${closingCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                  </Table.Td>
                                  <Table.Td style={{ textAlign: 'center' }}>
                                    <Button
                                      variant="subtle"
                                      color="burgundy"
                                      size="compact-xs"
                                      onClick={() => navigate('/ledger-analysis')}
                                    >
                                      Statement
                                    </Button>
                                  </Table.Td>
                                </>
                              ) : (
                                <>
                                  <Table.Td>
                                    <Text size="xs" c="dimmed">{g.groupName}</Text>
                                  </Table.Td>
                                  <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                                    {closingDr !== 0 ? `₹${closingDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                  </Table.Td>
                                  <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                                    {closingCr !== 0 ? `₹${closingCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                  </Table.Td>
                                  <Table.Td style={{ textAlign: 'center' }}>
                                    <Button
                                      variant="subtle"
                                      color="burgundy"
                                      size="compact-xs"
                                      onClick={() => navigate('/ledger-analysis')}
                                    >
                                      Statement
                                    </Button>
                                  </Table.Td>
                                </>
                              )}
                            </Table.Tr>
                          ))}
                      </React.Fragment>
                    );
                  })
                )}

                {/* Render Detailed / Flat Format */}
                {tbViewType === 'detailed' && (
                  trialBalanceData.groups.flatMap((g) =>
                    g.ledgers.map(({ ledger, opDr, opCr, txDr, txCr, closingDr, closingCr }) => (
                      <Table.Tr
                        key={ledger.LedgerId}
                      >
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <IconBook2 size={15} color="#800020" />
                            <div>
                              <Text size="sm" fw={600} c="#1e293b">
                                {ledger.LedgerName}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {g.groupName} &bull; {g.groupNature}
                              </Text>
                            </div>
                          </Group>
                        </Table.Td>

                        {tbColumnFormat === 'comprehensive' ? (
                          <>
                            <Table.Td style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', borderLeft: '1px solid #f8fafc' }}>
                              {opDr !== 0 ? `₹${opDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', borderRight: '1px solid #f8fafc' }}>
                              {opCr !== 0 ? `₹${opCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                              {txDr !== 0 ? `₹${txDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontSize: 12, fontVariantNumeric: 'tabular-nums', borderRight: '1px solid #f8fafc' }}>
                              {txCr !== 0 ? `₹${txCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums', backgroundColor: '#fffafa' }}>
                              {closingDr !== 0 ? `₹${closingDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums', backgroundColor: '#fffafa', borderRight: '1px solid #f8fafc' }}>
                              {closingCr !== 0 ? `₹${closingCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center' }}>
                              <Button
                                variant="light"
                                color="burgundy"
                                size="xs"
                                radius="sm"
                                onClick={() => navigate('/ledger-analysis')}
                              >
                                Statement
                              </Button>
                            </Table.Td>
                          </>
                        ) : (
                          <>
                            <Table.Td>
                              <Badge size="xs" variant="light" color="gray">
                                {g.groupName}
                              </Badge>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                              {closingDr !== 0 ? `₹${closingDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                              {closingCr !== 0 ? `₹${closingCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center' }}>
                              <Button
                                variant="light"
                                color="burgundy"
                                size="xs"
                                radius="sm"
                                onClick={() => navigate('/ledger-analysis')}
                              >
                                Statement
                              </Button>
                            </Table.Td>
                          </>
                        )}
                      </Table.Tr>
                    ))
                  )
                )}
              </Table.Tbody>

              {/* Accounting Table Footer (Grand Totals & Difference) */}
              <Table.Tfoot style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #334155' }}>
                {/* 1. Grand Total Row */}
                <Table.Tr style={{ borderTop: '2px solid #800020' }}>
                  <Table.Td style={{ fontWeight: 800, fontSize: 12, color: '#800020', textTransform: 'uppercase' }}>
                    GRAND TOTAL ({trialBalanceData.totalCount} ACCOUNTS)
                  </Table.Td>

                  {tbColumnFormat === 'comprehensive' ? (
                    <>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', borderLeft: '1px solid #e2e8f0' }}>
                        ₹{trialBalanceData.grandOpDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', borderRight: '1px solid #e2e8f0' }}>
                        ₹{trialBalanceData.grandOpCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                        ₹{trialBalanceData.grandTxDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', borderRight: '1px solid #e2e8f0' }}>
                        ₹{trialBalanceData.grandTxCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#800020', fontVariantNumeric: 'tabular-nums', backgroundColor: '#fbf0f2' }}>
                        ₹{trialBalanceData.grandClosingDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#800020', fontVariantNumeric: 'tabular-nums', backgroundColor: '#fbf0f2', borderRight: '1px solid #e2e8f0' }}>
                        ₹{trialBalanceData.grandClosingCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Table.Td>
                      <Table.Td />
                    </>
                  ) : (
                    <>
                      <Table.Td />
                      <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{trialBalanceData.grandClosingDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                        ₹{trialBalanceData.grandClosingCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Table.Td>
                      <Table.Td />
                    </>
                  )}
                </Table.Tr>

                {/* 2. Difference in Opening Balance (Tally Format) if not balanced */}
                {!trialBalanceData.isBalanced && (
                  <>
                    <Table.Tr style={{ backgroundColor: '#fff1f2', borderTop: '1px dashed #fecdd3' }}>
                      <Table.Td style={{ fontWeight: 700, fontSize: 12, color: '#b91c1c' }}>
                        <Group gap="xs">
                          <IconAlertCircle size={15} color="#b91c1c" />
                          <Text fw={700} size="xs" c="#b91c1c">
                            Difference in Opening / Trial Balance
                          </Text>
                        </Group>
                      </Table.Td>

                      {tbColumnFormat === 'comprehensive' ? (
                        <>
                          <Table.Td style={{ borderLeft: '1px solid #fecdd3' }} />
                          <Table.Td style={{ borderRight: '1px solid #fecdd3' }} />
                          <Table.Td />
                          <Table.Td style={{ borderRight: '1px solid #fecdd3' }} />
                          <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#b91c1c', fontVariantNumeric: 'tabular-nums' }}>
                            {trialBalanceData.closingDifference < 0
                              ? `₹${Math.abs(trialBalanceData.closingDifference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#b91c1c', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid #fecdd3' }}>
                            {trialBalanceData.closingDifference > 0
                              ? `₹${Math.abs(trialBalanceData.closingDifference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </Table.Td>
                          <Table.Td />
                        </>
                      ) : (
                        <>
                          <Table.Td />
                          <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#b91c1c', fontVariantNumeric: 'tabular-nums' }}>
                            {trialBalanceData.closingDifference < 0
                              ? `₹${Math.abs(trialBalanceData.closingDifference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#b91c1c', fontVariantNumeric: 'tabular-nums' }}>
                            {trialBalanceData.closingDifference > 0
                              ? `₹${Math.abs(trialBalanceData.closingDifference).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </Table.Td>
                          <Table.Td />
                        </>
                      )}
                    </Table.Tr>

                    {/* Balanced Double Accounting Underline Row */}
                    <Table.Tr style={{ backgroundColor: '#f1f5f9', borderTop: '2px solid #334155', borderBottom: '3px double #334155' }}>
                      <Table.Td style={{ fontWeight: 800, fontSize: 12, color: '#0f172a' }}>
                        BALANCED EQUALITY TOTAL
                      </Table.Td>

                      {tbColumnFormat === 'comprehensive' ? (
                        <>
                          <Table.Td style={{ borderLeft: '1px solid #e2e8f0' }} />
                          <Table.Td style={{ borderRight: '1px solid #e2e8f0' }} />
                          <Table.Td />
                          <Table.Td style={{ borderRight: '1px solid #e2e8f0' }} />
                          <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            ₹{Math.max(trialBalanceData.grandClosingDr, trialBalanceData.grandClosingCr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#0f172a', fontVariantNumeric: 'tabular-nums', borderRight: '1px solid #e2e8f0' }}>
                            ₹{Math.max(trialBalanceData.grandClosingDr, trialBalanceData.grandClosingCr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Table.Td>
                          <Table.Td />
                        </>
                      ) : (
                        <>
                          <Table.Td />
                          <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            ₹{Math.max(trialBalanceData.grandClosingDr, trialBalanceData.grandClosingCr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 13, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            ₹{Math.max(trialBalanceData.grandClosingDr, trialBalanceData.grandClosingCr).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Table.Td>
                          <Table.Td />
                        </>
                      )}
                    </Table.Tr>
                  </>
                )}
              </Table.Tfoot>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>
    </Stack>
  );
};
