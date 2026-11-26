import React, { useState, useMemo, useEffect } from 'react';
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
  IconCalendar,
  IconBook2,
  IconFileText,
  IconCash,
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
import { DateInputDDMMYY, formatDateDDMMYY } from '../components/DateInputDDMMYY';

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

interface StatementEntry {
  date: string;
  ref: string;
  vch_no?: string;
  voucher_type: string;
  particulars: string;
  item_name?: string;
  full_qty?: number | string | null;
  empty_qty?: number | string | null;
  is_cylinder?: boolean;
  debit: number;
  credit: number;
  runningBalance?: number;
}

export const LedgerAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLedgerId, setSelectedLedgerId] = useState<number | null>(null);

  // Main Page Filters & Sorting (matching Accounts Page)
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('name_asc');
  const [visibleCount, setVisibleCount] = useState<number>(100);

  // Reset visible limit to 100 whenever filters or search query change
  useEffect(() => {
    setVisibleCount(100);
  }, [searchQuery, selectedGroupFilter, selectedRouteFilter, sortBy]);

  // Statement Filters
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('ALL');
  const [stmtSearch, setStmtSearch] = useState<string>('');

  // PDF Generation States
  const [isGeneratingReportPdf, setIsGeneratingReportPdf] = useState(false);
  const [isGeneratingStatementPdf, setIsGeneratingStatementPdf] = useState(false);

  // View mode: 'ledgers' (default ledger analysis) | 'trial_balance' (Tally / ERP Trial Balance)
  const [viewMode, setViewMode] = useState<'ledgers' | 'trial_balance'>('ledgers');

  // Trial Balance Preferences & States
  const [tbViewType, setTbViewType] = useState<'grouped' | 'detailed'>('grouped');
  const [tbColumnFormat, setTbColumnFormat] = useState<'comprehensive' | 'closing'>('comprehensive');
  const [tbSearch, setTbSearch] = useState('');
  const [tbNatureFilter, setTbNatureFilter] = useState<string>('ALL');
  const [tbHideZero, setTbHideZero] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // 1. Fetch All Ledgers
  const { data: ledgers = [], isLoading, refetch } = useQuery<LedgerItem[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 2. Fetch Account Groups
  const { data: groups = [] } = useQuery<{ GroupId: number; GroupName: string; Nature: string }[]>({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await apiClient.get('/groups/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // 3. Fetch Routes
  const { data: routes = [] } = useQuery<{ RouteId: number; RouteName: string }[]>({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await apiClient.get('/routes/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // 4. Fetch Statement for Selected Ledger
  const { data: statementData, isLoading: isLoadingStatement, isError: isErrorStatement, refetch: refetchStatement } = useQuery<{
    ledger: any;
    entries: StatementEntry[];
  }>({
    queryKey: ['ledger-statement', selectedLedgerId],
    queryFn: async () => {
      if (!selectedLedgerId) return null;
      const res = await apiClient.get(`/ledgers/${selectedLedgerId}/statement/`);
      return res.data;
    },
    enabled: Boolean(selectedLedgerId),
  });

  // Options for Dropdowns
  const groupOptions = useMemo(() => {
    return groups.map((g) => ({
      value: String(g.GroupId),
      label: `${g.GroupName} (${g.Nature})`,
    }));
  }, [groups]);

  const routeOptions = useMemo(() => {
    return routes.map((r: any) => ({
      value: String(r.RouteId),
      label: r.RouteName,
    }));
  }, [routes]);

  const selectedGroupName = useMemo(() => {
    if (!selectedGroupFilter) return '';
    const g = groups.find((grp) => String(grp.GroupId) === selectedGroupFilter);
    return g ? g.GroupName : '';
  }, [selectedGroupFilter, groups]);

  const selectedRouteName = useMemo(() => {
    if (!selectedRouteFilter) return '';
    const r = routes.find((rt: any) => String(rt.RouteId) === selectedRouteFilter);
    return r ? r.RouteName : '';
  }, [selectedRouteFilter, routes]);

  // Filtered and Sorted Ledgers List (matching Accounts Page capabilities)
  const filteredLedgers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = ledgers.filter((l: any) => {
      const gName = (l.group_name || (typeof l.Group === 'object' ? (l.Group as any)?.GroupName : '') || '').toLowerCase();
      const rName = (l.route_name || l.RouteName || '').toLowerCase();
      const cCode = (l.CustomerCode || '').toLowerCase();

      const matchesSearch =
        !q ||
        l.LedgerName.toLowerCase().includes(q) ||
        gName.includes(q) ||
        rName.includes(q) ||
        cCode.includes(q) ||
        (l.GSTIN || '').toLowerCase().includes(q) ||
        (l.PhoneNumber || l.MobileNumber || '').includes(q);

      const matchesGroup = selectedGroupFilter
        ? String(typeof l.Group === 'object' ? l.Group?.GroupId : l.Group) === selectedGroupFilter
        : true;

      const matchesRoute = selectedRouteFilter
        ? (String(l.Route) === selectedRouteFilter || String(l.RouteId) === selectedRouteFilter)
        : true;

      return matchesSearch && matchesGroup && matchesRoute;
    });

    // Apply Sorting
    list = [...list].sort((a: any, b: any) => {
      if (sortBy === 'name_asc') {
        return a.LedgerName.localeCompare(b.LedgerName);
      }
      if (sortBy === 'name_desc') {
        return b.LedgerName.localeCompare(a.LedgerName);
      }
      if (sortBy === 'balance_desc') {
        return Number(b.CurrentBalance || 0) - Number(a.CurrentBalance || 0);
      }
      if (sortBy === 'balance_asc') {
        return Number(a.CurrentBalance || 0) - Number(b.CurrentBalance || 0);
      }
      if (sortBy === 'route_asc') {
        const rA = a.route_name || a.RouteName || '';
        const rB = b.route_name || b.RouteName || '';
        return rA.localeCompare(rB) || a.LedgerName.localeCompare(b.LedgerName);
      }
      return 0;
    });

    return list;
  }, [ledgers, searchQuery, selectedGroupFilter, selectedRouteFilter, sortBy]);

  // Sliced list for smooth progressive loading (100 accounts at a time)
  const visibleLedgers = useMemo(() => {
    return filteredLedgers.slice(0, visibleCount);
  }, [filteredLedgers, visibleCount]);

  // Overall Financial Totals matching Accounts Page Strip
  const financialTotals = useMemo(() => {
    let totalOpening = 0;
    let netOpening = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    let totalCurrent = 0;

    filteredLedgers.forEach((l) => {
      const op = Number(l.OpeningBalance || 0);
      totalOpening += Math.abs(op);
      netOpening += l.OpeningBalanceType === 'CR' ? -Math.abs(op) : Math.abs(op);
      totalDebit += Number(l.DebitBalance || 0);
      totalCredit += Number(l.CreditBalance || 0);
      totalCurrent += Number(l.CurrentBalance || 0);
    });

    return {
      totalOpening,
      netOpening,
      totalDebit,
      totalCredit,
      totalCurrent,
    };
  }, [filteredLedgers]);

  // Compute Statement Running Balances and Filters
  const statementCalculations = useMemo(() => {
    if (!statementData || !statementData.ledger) {
      return { entries: [], effectiveOpening: 0, totDebit: 0, totCredit: 0, totFullQty: 0, totEmptyQty: 0, closingBal: 0 };
    }

    const l = statementData.ledger;
    const rawEntries = statementData.entries || [];
    const isDrNormal = (l.group_nature || '').toLowerCase() === 'asset' || (l.group_nature || '').toLowerCase() === 'expense';

    const opBal = Number(l.OpeningBalance || 0);
    const opType = (l.OpeningBalanceType || 'DR').toUpperCase();
    const initDr = opType === 'DR' ? opBal : 0;
    const initCr = opType === 'CR' ? opBal : 0;

    // Date Bounds
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let fromDate: string | null = null;
    let toDate: string | null = null;

    if (datePreset === 'TODAY') {
      fromDate = todayStr;
      toDate = todayStr;
    } else if (datePreset === 'YESTERDAY') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      fromDate = yStr;
      toDate = yStr;
    } else if (datePreset === 'THIS_WEEK') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d.setDate(diff)).toISOString().split('T')[0];
      fromDate = mon;
      toDate = todayStr;
    } else if (datePreset === 'THIS_MONTH') {
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      toDate = todayStr;
    } else if (datePreset === 'CUSTOM') {
      fromDate = customFromDate || null;
      toDate = customToDate || null;
    }

    let priorDr = initDr;
    let priorCr = initCr;
    const periodEntries: StatementEntry[] = [];

    rawEntries.forEach((tx) => {
      const txDate = tx.date;
      if (fromDate && txDate && txDate < fromDate) {
        priorDr += Number(tx.debit || 0);
        priorCr += Number(tx.credit || 0);
      } else if (toDate && txDate && txDate > toDate) {
        // Excluded
      } else {
        periodEntries.push(tx);
      }
    });

    // Opening Balance for period
    const effectiveOpening = isDrNormal ? (priorDr - priorCr) : (priorCr - priorDr);
    const finalEntries: StatementEntry[] = [];

    if (paymentModeFilter === 'ALL' && (fromDate || opBal > 0 || effectiveOpening !== 0)) {
      finalEntries.push({
        date: fromDate || '—',
        ref: 'OP-BAL',
        voucher_type: 'OPENING',
        particulars: 'Opening Balance (b/f)',
        debit: effectiveOpening > 0 && isDrNormal ? Math.abs(effectiveOpening) : (!isDrNormal && effectiveOpening < 0 ? Math.abs(effectiveOpening) : 0),
        credit: effectiveOpening > 0 && !isDrNormal ? Math.abs(effectiveOpening) : (isDrNormal && effectiveOpening < 0 ? Math.abs(effectiveOpening) : 0),
      });
    }

    // Filter by Payment Mode and Text search
    const q = stmtSearch.toLowerCase().trim();
    periodEntries.forEach((tx) => {
      // Payment Mode Filter
      if (paymentModeFilter === 'CASH') {
        const pLower = (tx.particulars || '').toLowerCase();
        const vLower = (tx.voucher_type || '').toLowerCase();
        if (!pLower.includes('cash') && !vLower.includes('cash')) {
          return;
        }
      } else if (paymentModeFilter === 'BANK') {
        const pLower = (tx.particulars || '').toLowerCase();
        const isBank = (
          pLower.includes('bank') ||
          pLower.includes('sbi') ||
          pLower.includes('paytm') ||
          pLower.includes('upi') ||
          pLower.includes('online') ||
          pLower.includes('cheque')
        );
        if (!isBank) {
          return;
        }
      }

      if (
        !q ||
        tx.ref.toLowerCase().includes(q) ||
        tx.voucher_type.toLowerCase().includes(q) ||
        tx.particulars.toLowerCase().includes(q)
      ) {
        finalEntries.push(tx);
      }
    });

    // Compute running balance
    let runBal = 0;
    let sumDebit = 0;
    let sumCredit = 0;

    finalEntries.forEach((tx, idx) => {
      const d = Number(tx.debit || 0);
      const c = Number(tx.credit || 0);
      sumDebit += d;
      sumCredit += c;

      if (idx === 0 && tx.ref === 'OP-BAL') {
        runBal = effectiveOpening;
      } else {
        runBal += isDrNormal ? (d - c) : (c - d);
      }
      tx.runningBalance = runBal;
    });

    let totFullQty = 0;
    let totEmptyQty = 0;
    finalEntries.forEach((tx) => {
      if (tx.ref !== 'OP-BAL') {
        const isCyl = tx.is_cylinder !== undefined ? tx.is_cylinder : (
          tx.item_name ? (
            /04KG|12KG|17KG|19KG|CYLINDER|LPG|KG/i.test(tx.item_name) &&
            !/REGULAT|PIPE|STOVE|BURNER|HOSE|SERVICE|OTHER/i.test(tx.item_name)
          ) : false
        );
        if (isCyl) {
          if (tx.full_qty !== undefined && tx.full_qty !== null && tx.full_qty !== '' && tx.full_qty !== '—') {
            const f = Number(tx.full_qty);
            if (!isNaN(f)) totFullQty += f;
          }
          if (tx.empty_qty !== undefined && tx.empty_qty !== null && tx.empty_qty !== '' && tx.empty_qty !== '—') {
            const e = Number(tx.empty_qty);
            if (!isNaN(e)) totEmptyQty += e;
          }
        }
      }
    });

    return {
      entries: finalEntries,
      effectiveOpening,
      totDebit: sumDebit,
      totCredit: sumCredit,
      totFullQty,
      totEmptyQty,
      closingBal: runBal,
    };
  }, [statementData, datePreset, customFromDate, customToDate, paymentModeFilter, stmtSearch]);

  // Official PDF Generation for the main Chart of Accounts / Ledger Report
  const handlePrintLedgerReport = async () => {
    try {
      setIsGeneratingReportPdf(true);
      const payload = {
        group_filter: selectedGroupFilter || 'ALL',
        route_filter: selectedRouteFilter || 'ALL',
        group_name: selectedGroupName,
        route_name: selectedRouteName,
        sort_by: sortBy,
        summary_stats: {
          count: ledgers.length,
          filteredCount: filteredLedgers.length,
          totOpening: financialTotals.totalOpening,
          netOpening: financialTotals.netOpening,
          totDebit: financialTotals.totalDebit,
          totCredit: financialTotals.totalCredit,
          totCurrent: financialTotals.totalCurrent,
        },
        ledgers: filteredLedgers,
      };
      const res = await apiClient.post('/ledgers/ledger-report-pdf/', payload, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      notifications.show({
        title: 'PDF Generated',
        message: `${selectedGroupName || selectedRouteName || 'Ledger'} Report opened in new tab.`,
        color: 'burgundy',
      });
    } catch (err: any) {
      notifications.show({
        title: 'Error Generating PDF',
        message: err?.response?.data?.detail || err.message || 'Failed to generate Ledger Report PDF.',
        color: 'red',
      });
    } finally {
      setIsGeneratingReportPdf(false);
    }
  };

  // Official PDF Generation for the selected Account Statement
  const handlePrintStatementPdf = async () => {
    if (!selectedLedgerId || !statementData?.ledger) return;
    try {
      setIsGeneratingStatementPdf(true);
      const payload = {
        from_date: datePreset === 'CUSTOM' ? customFromDate : undefined,
        to_date: datePreset === 'CUSTOM' ? customToDate : undefined,
        summary_stats: {
          effectiveOpening: statementCalculations.effectiveOpening,
          totDebit: statementCalculations.totDebit,
          totCredit: statementCalculations.totCredit,
          totFullQty: statementCalculations.totFullQty,
          totEmptyQty: statementCalculations.totEmptyQty,
          closingBal: statementCalculations.closingBal,
        },
        entries: statementCalculations.entries,
      };
      const res = await apiClient.post(`/ledgers/${selectedLedgerId}/statement-pdf/`, payload, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      notifications.show({
        title: 'Statement Generated',
        message: `Account Statement for ${statementData.ledger.LedgerName} opened in new tab.`,
        color: 'burgundy',
      });
    } catch (err: any) {
      notifications.show({
        title: 'Error Generating Statement',
        message: err?.response?.data?.detail || err.message || 'Failed to generate Statement PDF.',
        color: 'red',
      });
    } finally {
      setIsGeneratingStatementPdf(false);
    }
  };

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

  // ── Render: Dedicated Statement View for a Selected Ledger ──
  if (selectedLedgerId) {
    const l = statementData?.ledger || ledgers.find((x) => x.LedgerId === selectedLedgerId);
    if (!l && isLoadingStatement) {
      return (
        <Stack gap="md" style={{ width: '100%' }}>
          <Center py={80}>
            <Loader color="burgundy" size="md" />
          </Center>
        </Stack>
      );
    }
    if (l) {
      const isDrNormal = (l.group_nature || '').toLowerCase() === 'asset' || (l.group_nature || '').toLowerCase() === 'expense';
      const closingSuffix = statementCalculations.closingBal >= 0 ? (isDrNormal ? 'Dr' : 'Cr') : (isDrNormal ? 'Cr' : 'Dr');

      return (
      <Stack gap="md" style={{ width: '100%' }}>
        {/* Navigation & Header */}
        <Box pt={4} pb={2}>
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div>
              <Group gap="xs" align="center" mb={6}>
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => setSelectedLedgerId(null)}
                  styles={{ root: { paddingLeft: 4, paddingRight: 8, color: '#475569' } }}
                >
                  Back to All Accounts
                </Button>
                <Divider orientation="vertical" style={{ height: 16 }} />
                <Badge variant="light" color="gray" size="xs">
                  {l.group_name || 'General Ledger'}
                </Badge>
              </Group>

              <Group gap={10} align="center">
                <IconScale size={24} color="#800020" />
                <Title order={2} style={{ color: '#800020', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>
                  {l.LedgerName} - Statement of Account
                </Title>
              </Group>
              <Text size="xs" c="dimmed" mt={3}>
                Audit-compliant double-entry ledger &bull; Opening balance, journal vouchers, debits, credits, and running balance.
              </Text>
            </div>

            <Group gap="xs">
              <Button
                variant="default"
                size="xs"
                radius="md"
                leftSection={<IconRefresh size={14} />}
                onClick={() => refetchStatement()}
              >
                Refresh
              </Button>
              <Button
                variant="outline"
                color="burgundy"
                size="xs"
                radius="md"
                loading={isGeneratingStatementPdf}
                leftSection={<IconPrinter size={15} />}
                onClick={handlePrintStatementPdf}
                style={{ borderColor: '#800020', color: '#800020', fontWeight: 600 }}
              >
                Print Statement PDF
              </Button>
            </Group>
          </Group>
        </Box>

        {/* Account Details & Running Balance Strip */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
          <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Text size="11px" fw={600} c="dimmed" tt="uppercase">ACCOUNT GROUP</Text>
            <Text size="md" fw={700} c="#0f172a" mt={3}>{l.group_name || 'General Ledger'}</Text>
            <Text size="xs" c="dimmed">{l.group_nature || 'Balance Sheet'}</Text>
          </Paper>

          <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Text size="11px" fw={600} c="dimmed" tt="uppercase">OPENING BALANCE</Text>
            <Text size="md" fw={700} c="#0f172a" mt={3}>
              ₹{Math.abs(Number(l.OpeningBalance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              <Text component="span" size="xs" fw={700} c="dimmed" ml={6}>
                {l.OpeningBalanceType || 'DR'}
              </Text>
            </Text>
            <Text size="xs" c="dimmed">Initial opening balance</Text>
          </Paper>

          <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Text size="11px" fw={600} c="dimmed" tt="uppercase">PERIOD TURNOVER</Text>
            <Group gap="sm" mt={3}>
              <Text size="sm" fw={600} c="#0f172a">
                Dr: ₹{statementCalculations.totDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <Text size="sm" fw={600} c="#0f172a">
                Cr: ₹{statementCalculations.totCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </Group>
            <Text size="xs" c="dimmed">Selected period turnover</Text>
          </Paper>

          <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#800020', borderLeftWidth: 4 }}>
            <Text size="11px" fw={700} style={{ color: '#800020' }} tt="uppercase">CLOSING BALANCE</Text>
            <Text size="lg" fw={800} style={{ color: '#800020' }} mt={2}>
              ₹{Math.abs(statementCalculations.closingBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              <Badge
                size="sm"
                variant="light"
                color="burgundy"
                ml={8}
                style={{ fontWeight: 700 }}
              >
                {closingSuffix}
              </Badge>
            </Text>
            <Text size="xs" c="dimmed">Live net account balance</Text>
          </Paper>
        </SimpleGrid>

        {/* Filter Toolbar & Statement Table */}
        <Paper radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
          <Group justify="space-between" align="center" p="sm" style={{ borderBottom: '1px solid #f1f5f9' }} wrap="wrap" gap="sm">
            <Group gap="xs" wrap="wrap">
              <Select
                size="xs"
                radius="md"
                leftSection={<IconCalendar size={14} color="#64748b" />}
                value={datePreset}
                onChange={(val) => setDatePreset(val || 'ALL')}
                data={[
                  { label: 'All Time', value: 'ALL' },
                  { label: 'Today', value: 'TODAY' },
                  { label: 'Yesterday', value: 'YESTERDAY' },
                  { label: 'This Week', value: 'THIS_WEEK' },
                  { label: 'This Month', value: 'THIS_MONTH' },
                  { label: 'Custom Date Range', value: 'CUSTOM' },
                ]}
                style={{ width: 170 }}
              />

              {datePreset === 'CUSTOM' && (
                <Group gap="xs">
                  <DateInputDDMMYY
                    placeholder="From Date"
                    value={customFromDate}
                    onChange={setCustomFromDate}
                    size="xs"
                    style={{ width: 125 }}
                  />
                  <DateInputDDMMYY
                    placeholder="To Date"
                    value={customToDate}
                    onChange={setCustomToDate}
                    size="xs"
                    style={{ width: 125 }}
                  />
                </Group>
              )}

              {/* Payment Mode Selector: All, Cash, Bank / UPI */}
              <Select
                size="xs"
                radius="md"
                leftSection={<IconCash size={14} color="#64748b" />}
                value={paymentModeFilter}
                onChange={(val) => setPaymentModeFilter(val || 'ALL')}
                data={[
                  { label: 'All Payment Modes', value: 'ALL' },
                  { label: 'Cash Only', value: 'CASH' },
                  { label: 'Bank / UPI', value: 'BANK' },
                ]}
                style={{ width: 165 }}
              />


            </Group>

            <TextInput
              placeholder="Filter voucher #, ref, particulars..."
              leftSection={<IconSearch size={14} color="#94a3b8" />}
              value={stmtSearch}
              onChange={(e) => setStmtSearch(e.currentTarget.value)}
              size="xs"
              radius="md"
              style={{ width: 230 }}
            />
          </Group>

          {isLoadingStatement ? (
            <Center py={60}>
              <Loader color="burgundy" size="md" />
            </Center>
          ) : isErrorStatement ? (
            <Center py={60}>
              <Stack align="center" gap="xs">
                <Text size="sm" c="red" fw={500}>Failed to load statement transactions.</Text>
                <Button size="xs" variant="outline" color="burgundy" onClick={() => refetchStatement()}>
                  Retry
                </Button>
              </Stack>
            </Center>
          ) : statementCalculations.entries.length === 0 ? (
            <Center py={60}>
              <Text size="sm" c="dimmed">No transactions recorded for this ledger in the selected period.</Text>
            </Center>
          ) : (
            <Table.ScrollContainer minWidth={1050}>
              <Table verticalSpacing="xs" horizontalSpacing="md" highlightOnHover>
                <Table.Thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <Table.Tr>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11.5, width: 90 }}>DATE</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11.5, minWidth: 140 }}>PARTICULARS</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11.5, minWidth: 130 }}>ITEM NAME</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11.5, width: 75, textAlign: 'center' }}>FULL QTY</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11.5, width: 80, textAlign: 'center' }}>EMPTY QTY</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11.5, width: 85 }}>VCH TYPE</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11.5, width: 95 }}>VCH NO.</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11.5, width: 105, textAlign: 'right' }}>DEBIT</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11.5, width: 105, textAlign: 'right' }}>CREDIT</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11.5, width: 120, textAlign: 'right' }}>BALANCE</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {statementCalculations.entries.map((tx, idx) => {
                    const isOp = tx.ref === 'OP-BAL';
                    const runVal = Number(tx.runningBalance || 0);
                    const runSuffix = runVal >= 0 ? (isDrNormal ? 'Dr' : 'Cr') : (isDrNormal ? 'Cr' : 'Dr');

                    return (
                      <Table.Tr key={`${tx.ref}-${idx}`} style={{ backgroundColor: isOp ? '#f8fafc' : undefined }}>
                        <Table.Td style={{ whiteSpace: 'nowrap', fontSize: 12, fontWeight: isOp ? 600 : 500, color: '#475569' }}>
                          {formatDateDDMMYY(tx.date)}
                        </Table.Td>
                        <Table.Td style={{ fontSize: 12, color: '#0f172a', fontWeight: isOp ? 600 : 500, whiteSpace: 'pre-line', lineHeight: 1.4 }}>
                          {tx.particulars}
                        </Table.Td>
                        <Table.Td style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>
                          {tx.item_name
                            ? tx.item_name
                                .replace(/LPG\s*/gi, '')
                                .replace(/\s*GAS\s*CYLINDER/gi, '')
                                .replace(/\s*CYLINDER/gi, '')
                                .trim()
                            : '—'}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: tx.full_qty ? '#0f172a' : '#94a3b8' }}>
                          {tx.full_qty !== undefined && tx.full_qty !== null && tx.full_qty !== '' ? tx.full_qty : '—'}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: tx.empty_qty ? '#0f172a' : '#94a3b8' }}>
                          {tx.empty_qty !== undefined && tx.empty_qty !== null && tx.empty_qty !== '' ? tx.empty_qty : '—'}
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="xs"
                            variant="light"
                            color={
                              tx.voucher_type === 'SALES' || tx.voucher_type === 'SALE'
                                ? 'burgundy'
                                : tx.voucher_type === 'RECEIPT'
                                ? 'teal'
                                : tx.voucher_type === 'PURCHASE'
                                ? 'blue'
                                : tx.voucher_type === 'PAYMENT'
                                ? 'orange'
                                : 'gray'
                            }
                            radius="sm"
                          >
                            {tx.voucher_type || 'VOUCHER'}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ fontWeight: 600, fontSize: 12, color: '#800020' }}>
                          {tx.vch_no || tx.ref}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 12, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {tx.debit > 0 ? `₹${Number(tx.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 12, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          {tx.credit > 0 ? `₹${Number(tx.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          ₹{Math.abs(runVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} <Text component="span" size="11px" fw={600} c="dimmed">{runSuffix}</Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
                <Table.Tfoot style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                  <Table.Tr>
                    <Table.Td colSpan={3} style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>
                      PERIOD TOTALS
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#0f172a' }}>
                      {statementCalculations.totFullQty > 0 ? statementCalculations.totFullQty : '—'}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#0f172a' }}>
                      {statementCalculations.totEmptyQty > 0 ? statementCalculations.totEmptyQty : '—'}
                    </Table.Td>
                    <Table.Td colSpan={2} />
                    <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{statementCalculations.totDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12.5, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{statementCalculations.totCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, color: '#94a3b8' }}>
                      —
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr style={{ backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0' }}>
                    <Table.Td colSpan={9} style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>
                      CLOSING BALANCE
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 12.5, color: '#800020', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{Math.abs(statementCalculations.closingBal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} <Text component="span" size="11px" fw={700} c="dimmed">{closingSuffix}</Text>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tfoot>
              </Table>
            </Table.ScrollContainer>
          )}
        </Paper>
      </Stack>
    );
    }
  }

  // ── Render: Main Ledger Analysis List View ──
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
                {viewMode === 'trial_balance' ? 'Trial Balance' : 'Ledger Analysis'}
              </Title>
              {viewMode === 'trial_balance' && (
                <Badge color="burgundy" variant="light" size="sm" radius="sm">
                  Tally / ERP Double-Entry
                </Badge>
              )}
            </Group>
            <Text size="xs" c="dimmed" mt={2}>
              {viewMode === 'trial_balance'
                ? 'Standard accounting trial balance • Opening balances, period debits/credits, closing balances, and equality verification.'
                : 'Chart of accounts, trial balances, and running statements • Select any ledger to open its statement.'}
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

            {/* Trial Balance toggle right next to Refresh button */}
            <Button
              variant={viewMode === 'trial_balance' ? 'filled' : 'outline'}
              color="burgundy"
              size="xs"
              radius="md"
              leftSection={<IconScale size={15} />}
              onClick={() => setViewMode(viewMode === 'trial_balance' ? 'ledgers' : 'trial_balance')}
              style={
                viewMode === 'trial_balance'
                  ? { backgroundColor: '#800020', color: '#ffffff', fontWeight: 600 }
                  : { borderColor: '#800020', color: '#800020', fontWeight: 600 }
              }
            >
              {viewMode === 'trial_balance' ? 'Ledger List' : 'Trial Balance'}
            </Button>

            {viewMode === 'ledgers' ? (
              <Button
                variant="outline"
                color="burgundy"
                size="xs"
                radius="md"
                loading={isGeneratingReportPdf}
                leftSection={<IconPrinter size={15} />}
                onClick={handlePrintLedgerReport}
                style={{ borderColor: '#800020', color: '#800020', fontWeight: 600 }}
              >
                Print Ledger Report
              </Button>
            ) : (
              <Group gap="xs">
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
            )}
          </Group>
        </Group>
      </Box>

      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: TRADITIONAL ERP / TALLY TRIAL BALANCE VIEW
         ───────────────────────────────────────────────────────────── */}
      {viewMode === 'trial_balance' && (
        <Stack gap="md" style={{ width: '100%' }}>
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
                                  style={{ cursor: 'pointer', backgroundColor: '#ffffff' }}
                                  onClick={() => setSelectedLedgerId(ledger.LedgerId)}
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
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedLedgerId(ledger.LedgerId);
                                          }}
                                        >
                                          View
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
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedLedgerId(ledger.LedgerId);
                                          }}
                                        >
                                          View
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
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedLedgerId(ledger.LedgerId)}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLedgerId(ledger.LedgerId);
                                    }}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLedgerId(ledger.LedgerId);
                                    }}
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
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 2: ORIGINAL LEDGER ANALYSIS & CHARTS LIST VIEW
          (100% Preserved with All Original Functionality Intact)
         ───────────────────────────────────────────────────────────── */}
      {viewMode === 'ledgers' && (
        <>
          {/* Financial Balances Quick Overview Strip matching Accounts Page */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mb="xs">
            <Paper p="xs" px="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="11px" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px' }}>
                Total Opening Bal
              </Text>
              <Text size="md" fw={700} c="#1e293b" style={{ fontVariantNumeric: 'tabular-nums' }}>
                ₹{Math.abs(financialTotals.netOpening).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                <Text component="span" size="xs" c={financialTotals.netOpening >= 0 ? '#0f172a' : '#dc2626'} fw={600}>
                  {financialTotals.netOpening >= 0 ? 'DR' : 'CR'}
                </Text>
              </Text>
            </Paper>

            <Paper p="xs" px="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="11px" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px' }}>
                Total Debits (Dr)
              </Text>
              <Text size="md" fw={700} c="#1e293b" style={{ fontVariantNumeric: 'tabular-nums' }}>
                ₹{financialTotals.totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </Paper>

            <Paper p="xs" px="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="11px" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px' }}>
                Total Credits (Cr)
              </Text>
              <Text size="md" fw={700} c="#1e293b" style={{ fontVariantNumeric: 'tabular-nums' }}>
                ₹{financialTotals.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </Paper>

            <Paper p="xs" px="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="11px" fw={600} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px' }}>
                Net Current Balance
              </Text>
              <Text size="md" fw={700} c={financialTotals.totalCurrent >= 0 ? '#000000' : '#dc2626'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                ₹{Math.abs(financialTotals.totalCurrent).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                <Text component="span" size="xs" c={financialTotals.totalCurrent >= 0 ? '#0f172a' : '#dc2626'} fw={600}>
                  {financialTotals.totalCurrent >= 0 ? 'Dr' : 'Cr'}
                </Text>
              </Text>
            </Paper>
          </SimpleGrid>

          {/* Main Table Container matching Accounts Page */}
          <Paper radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
            {/* Filter & Search Toolbar */}
            <Group justify="space-between" align="center" p="sm" style={{ borderBottom: '1px solid #f1f5f9' }} wrap="wrap" gap="sm">
              <Group gap="xs" wrap="wrap" style={{ flexGrow: 1 }}>
                {/* Account Group Filter */}
                <Select
                  placeholder="All Account Groups"
                  data={groupOptions}
                  value={selectedGroupFilter}
                  onChange={(val) => setSelectedGroupFilter(val)}
                  clearable
                  searchable
                  size="sm"
                  radius="md"
                  style={{ width: 190, minWidth: 150 }}
                />

                {/* Route Filter */}
                <Select
                  placeholder="All Routes"
                  data={routeOptions}
                  value={selectedRouteFilter}
                  onChange={(val) => setSelectedRouteFilter(val)}
                  clearable
                  searchable
                  size="sm"
                  radius="md"
                  style={{ width: 160, minWidth: 130 }}
                />

                {/* Sort Filter */}
                <Select
                  placeholder="Sort by"
                  data={[
                    { value: 'name_asc', label: 'Name (A to Z)' },
                    { value: 'name_desc', label: 'Name (Z to A)' },
                    { value: 'balance_desc', label: 'Balance (High to Low)' },
                    { value: 'balance_asc', label: 'Balance (Low to High)' },
                    { value: 'route_asc', label: 'Route (A to Z)' },
                  ]}
                  value={sortBy}
                  onChange={(val) => setSortBy(val || 'name_asc')}
                  size="sm"
                  radius="md"
                  style={{ width: 170, minWidth: 140 }}
                />

                {/* Search Box */}
                <TextInput
                  placeholder="Search accounts..."
                  leftSection={<IconSearch size={16} stroke={1.5} color="#800020" />}
                  rightSection={
                    searchQuery ? (
                      <CloseButton size="sm" aria-label="Clear search" onClick={() => setSearchQuery('')} />
                    ) : null
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  size="sm"
                  radius="md"
                  style={{ width: 220, minWidth: 160 }}
                />
              </Group>

              <Text size="xs" c="dimmed">
                {filteredLedgers.length} account{filteredLedgers.length !== 1 ? 's' : ''} • Click any row to view ledger statement
              </Text>
            </Group>

            {/* Ledgers Table matching Accounts Page UI */}
            {isLoading ? (
              <Center py={60}>
                <Loader color="burgundy" size="md" />
              </Center>
            ) : filteredLedgers.length === 0 ? (
              <Center py={60}>
                <Stack align="center" gap="xs">
                  <IconBook2 size={38} color="#800020" stroke={1.5} />
                  <Text fw={600} size="sm" c="dimmed">
                    {searchQuery ? 'No accounts matching your search.' : 'No accounts available.'}
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Table.ScrollContainer minWidth={950}>
                <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
                  <Table.Thead style={{ backgroundColor: '#fbf0f2', borderBottom: '1px solid #e2e8f0' }}>
                    <Table.Tr>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, minWidth: 220 }}>Ledger Account</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, minWidth: 130, textAlign: 'right' }}>Opening Balance</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, minWidth: 110, textAlign: 'right' }}>Debit (Dr)</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, minWidth: 110, textAlign: 'right' }}>Credit (Cr)</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12, minWidth: 140, textAlign: 'right' }}>Current Balance</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, minWidth: 130 }}>Contact / Tax</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, minWidth: 100, textAlign: 'center' }}>Status</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 12, minWidth: 110, textAlign: 'center' }}>Statement</Table.Th>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    {visibleLedgers.map((ledger) => {
                      const currVal = Number(ledger.CurrentBalance || 0);
                      const isZero = currVal === 0;
                      const isDr = currVal >= 0;

                      return (
                        <Table.Tr
                          key={ledger.LedgerId}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedLedgerId(ledger.LedgerId)}
                        >
                          {/* 1. Ledger Name + Group & Nature Subtitle */}
                          <Table.Td style={{ minWidth: 220 }}>
                            <Group gap="xs" wrap="nowrap" align="flex-start">
                              <IconBook2 size={16} color="#800020" stroke={1.75} style={{ flexShrink: 0, marginTop: 2 }} />
                              <div>
                                <Text fw={600} size="sm" c="#1e293b" style={{ whiteSpace: 'nowrap' }}>
                                  {ledger.LedgerName}
                                </Text>
                                <Text size="xs" c="dimmed" mt={2} style={{ whiteSpace: 'nowrap' }}>
                                  {ledger.group_name || 'General'}
                                </Text>
                              </div>
                            </Group>
                          </Table.Td>

                          {/* 2. Opening Balance */}
                          <Table.Td style={{ minWidth: 130, textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <Text size="sm" fw={600} c="#334155" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              ₹{Math.abs(Number(ledger.OpeningBalance || 0)).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              <Text component="span" size="xs" c={ledger.OpeningBalanceType === 'CR' ? '#dc2626' : '#0f172a'} fw={600}>
                                {ledger.OpeningBalanceType || 'DR'}
                              </Text>
                            </Text>
                          </Table.Td>

                          {/* 3. Debit Balance */}
                          <Table.Td style={{ minWidth: 110, textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <Text size="sm" fw={500} c="#334155" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {Number(ledger.DebitBalance || 0) !== 0
                                ? `₹${Number(ledger.DebitBalance).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                : '—'}
                            </Text>
                          </Table.Td>

                          {/* 4. Credit Balance */}
                          <Table.Td style={{ minWidth: 110, textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <Text size="sm" fw={500} c="#334155" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {Number(ledger.CreditBalance || 0) !== 0
                                ? `₹${Number(ledger.CreditBalance).toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                : '—'}
                            </Text>
                          </Table.Td>

                          {/* 5. Current Balance */}
                          <Table.Td style={{ minWidth: 140, textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <Text
                              size="sm"
                              fw={700}
                              c={isZero ? '#64748b' : isDr ? '#0f172a' : '#b91c1c'}
                              style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              ₹{Math.abs(currVal).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              {!isZero && (
                                <Text component="span" size="xs" c={isDr ? '#0f172a' : '#dc2626'} fw={700}>
                                  {isDr ? 'Dr' : 'Cr'}
                                </Text>
                              )}
                            </Text>
                          </Table.Td>

                          {/* 6. Contact / Tax Details */}
                          <Table.Td style={{ minWidth: 130 }}>
                            {ledger.MobileNumber || ledger.PhoneNumber ? (
                              <Text size="xs" fw={500} c="#475569" style={{ whiteSpace: 'nowrap' }}>
                                {ledger.MobileNumber || ledger.PhoneNumber}
                              </Text>
                            ) : null}
                            {ledger.GSTIN ? (
                              <Text size="10px" ff="monospace" fw={600} c="#0f172a" style={{ whiteSpace: 'nowrap' }}>
                                {ledger.GSTIN}
                              </Text>
                            ) : null}
                            {!ledger.MobileNumber && !ledger.PhoneNumber && !ledger.GSTIN && (
                              <Text size="xs" c="dimmed">—</Text>
                            )}
                          </Table.Td>

                          {/* 7. Status */}
                          <Table.Td style={{ minWidth: 100, textAlign: 'center' }}>
                            <Badge
                              size="sm"
                              variant="outline"
                              style={{
                                borderColor: (ledger as any).IsActive !== false ? '#800020' : '#dc2626',
                                color: (ledger as any).IsActive !== false ? '#800020' : '#dc2626',
                                backgroundColor: 'transparent',
                                fontWeight: 600,
                                letterSpacing: '0.4px',
                              }}
                            >
                              {(ledger as any).IsActive !== false ? 'ACTIVE' : 'INACTIVE'}
                            </Badge>
                          </Table.Td>

                          {/* 8. Action (Open Statement) */}
                          <Table.Td style={{ minWidth: 110, textAlign: 'center' }}>
                            <Button
                              variant="light"
                              color="burgundy"
                              size="xs"
                              radius="md"
                              leftSection={<IconFileText size={14} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLedgerId(ledger.LedgerId);
                              }}
                              styles={{
                                root: {
                                  backgroundColor: '#fdf2f4',
                                  color: '#800020',
                                  fontWeight: 600,
                                },
                              }}
                            >
                              Statement
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}

                    {filteredLedgers.length > visibleCount && (
                      <Table.Tr style={{ backgroundColor: '#fbf0f2' }}>
                        <Table.Td colSpan={8} style={{ textAlign: 'center', padding: '14px 16px' }}>
                          <Group justify="center" gap="md" wrap="wrap">
                            <Text size="xs" fw={600} c="#800020">
                              Showing {visibleLedgers.length} of {filteredLedgers.length} accounts
                            </Text>
                            <Button
                              size="xs"
                              variant="filled"
                              color="burgundy"
                              radius="md"
                              onClick={() => setVisibleCount((prev) => prev + 100)}
                              style={{ backgroundColor: '#800020', fontWeight: 600 }}
                            >
                              Load Next 100 Accounts
                            </Button>
                            {filteredLedgers.length - visibleCount > 100 && (
                              <Button
                                size="xs"
                                variant="subtle"
                                color="gray"
                                radius="md"
                                onClick={() => setVisibleCount(filteredLedgers.length)}
                              >
                                Show All ({filteredLedgers.length})
                              </Button>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Paper>
        </>
      )}
    </Stack>
  );
};
