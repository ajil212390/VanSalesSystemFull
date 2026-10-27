import React, { useState, useEffect, useMemo } from 'react';
import {
  Title,
  Paper,
  TextInput,
  NumberInput,
  Select,
  Button,
  Group,
  Stack,
  Table,
  Loader,
  Center,
  Text,
  ActionIcon,
  Divider,
  SimpleGrid,
  Modal,
  Box,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconCurrencyRupee,
  IconInfoCircle,
  IconTruckDelivery,
  IconCheck,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';

interface LedgerOption {
  LedgerId: number;
  LedgerName: string;
  StateId?: number | null;
  GSTIN?: string | null;
  AddressLine1?: string | null;
  City?: string | null;
  Pincode?: string | null;
  PhoneNumber?: string | null;
  MobileNumber?: string | null;
  Group?: number | { GroupId?: number; GroupName?: string };
  group_name?: string;
}

interface ProductOption {
  ProductId: number;
  ProductName: string;
  ProductCode?: string | null;
  Unit: number;
  unit_name?: string | null;
  AltUnit?: number | null;
  alt_unit_name?: string | null;
  UnitConversion?: number | null;
  PurchasePrice: number | string;
  GSTPercentage: number | string;
}

interface LineItem {
  id: string;
  ProductId: number | null;
  ProductName: string;
  Quantity: number | string;
  AltQuantity: number | string;
  UnitId: number | null;
  UnitName: string;
  AltUnitId: number | null;
  AltUnitName: string;
  UnitConversion: number;
  Rate: number | string;
  GSTPercent: number;
  TaxableAmount: number;
  CGSTPercent: number;
  CGSTAmount: number;
  SGSTPercent: number;
  SGSTAmount: number;
  IGSTPercent: number;
  IGSTAmount: number;
  Total: number;
}

interface ExtraDetails {
  partyName: string;
  partyPhone: string;
  partyAddress: string;
  partyState: string;
  partyPincode: string;
  salesOrderNo: string;
  salesOrderDate: string;
  deliveryNo: string;
  deliveryDate: string;
  modeOfTransport: string;
  truckNo: string;
  transporterName: string;
  tankerSealNo: string;
  eWayBillNo: string;
  eWayBillValidDate: string;
}

const makeId = () => Math.random().toString(36).substring(2, 9);

const emptyLine = (): LineItem => ({
  id: makeId(),
  ProductId: null,
  ProductName: '',
  Quantity: '',
  AltQuantity: 0,
  UnitId: null,
  UnitName: '',
  AltUnitId: null,
  AltUnitName: '',
  UnitConversion: 1,
  Rate: '',
  GSTPercent: 0,
  TaxableAmount: 0,
  CGSTPercent: 0,
  CGSTAmount: 0,
  SGSTPercent: 0,
  SGSTAmount: 0,
  IGSTPercent: 0,
  IGSTAmount: 0,
  Total: 0,
});

const recalc = (line: LineItem, intra: boolean): LineItem => {
  const qty = Number(line.Quantity) || 0;
  const rate = Number(line.Rate) || 0;
  const hasAlt = Boolean(line.AltUnitId || line.AltUnitName) && Number(line.UnitConversion) > 0;
  const altQty = hasAlt
    ? Number((qty * Number(line.UnitConversion)).toFixed(2))
    : (Number(line.AltQuantity) || 0);

  // When alternate unit conversion exists (e.g. 4 cylinders x 4 = 16 kg), rate applies to converted quantity (16)
  const calcQty = (hasAlt && altQty > 0) ? altQty : qty;
  const taxable = calcQty * rate;
  const gst = Number(line.GSTPercent) || 0;

  let cgstPct = 0, cgstAmt = 0, sgstPct = 0, sgstAmt = 0, igstPct = 0, igstAmt = 0;

  if (intra) {
    cgstPct = gst / 2;
    sgstPct = gst / 2;
    cgstAmt = (taxable * cgstPct) / 100;
    sgstAmt = (taxable * sgstPct) / 100;
  } else {
    igstPct = gst;
    igstAmt = (taxable * igstPct) / 100;
  }

  return {
    ...line,
    TaxableAmount: Number(taxable.toFixed(2)),
    CGSTPercent: cgstPct,
    CGSTAmount: Number(cgstAmt.toFixed(2)),
    SGSTPercent: sgstPct,
    SGSTAmount: Number(sgstAmt.toFixed(2)),
    IGSTPercent: igstPct,
    IGSTAmount: Number(igstAmt.toFixed(2)),
    AltQuantity: altQty,
    Total: Number((taxable + cgstAmt + sgstAmt + igstAmt).toFixed(2)),
  };
};

export const PurchaseFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const [purchaseNo, setPurchaseNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [manualRoundOff, setManualRoundOff] = useState<number | null>(null);
  const [items, setItems] = useState<LineItem[]>([emptyLine()]);

  // "More Details" Modal State
  const [moreDetailsOpened, setMoreDetailsOpened] = useState(false);
  const [extraDetails, setExtraDetails] = useState<ExtraDetails>({
    partyName: '',
    partyPhone: '',
    partyAddress: '',
    partyState: '',
    partyPincode: '',
    salesOrderNo: '',
    salesOrderDate: '',
    deliveryNo: '',
    deliveryDate: '',
    modeOfTransport: '',
    truckNo: '',
    transporterName: '',
    tankerSealNo: '',
    eWayBillNo: '',
    eWayBillValidDate: '',
  });

  const { data: ledgers = [] } = useQuery<LedgerOption[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<ProductOption[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const selectedSupplier = useMemo(
    () => ledgers.find((l) => String(l.LedgerId) === selectedLedgerId) || null,
    [selectedLedgerId, ledgers]
  );

  // Auto-populate extra details from selected supplier ledger
  useEffect(() => {
    if (selectedSupplier) {
      setExtraDetails((prev) => ({
        ...prev,
        partyName: selectedSupplier.LedgerName || prev.partyName,
        partyPhone: selectedSupplier.PhoneNumber || selectedSupplier.MobileNumber || prev.partyPhone,
        partyAddress: [selectedSupplier.AddressLine1, selectedSupplier.City].filter(Boolean).join(', ') || prev.partyAddress,
        partyPincode: selectedSupplier.Pincode || prev.partyPincode,
        partyState: (selectedSupplier.StateId === 12 || selectedSupplier.StateId === 32) ? 'Kerala' : prev.partyState,
      }));
    }
  }, [selectedSupplier]);

  // Fetch purchases list to auto-calculate next purchase number when creating new
  const { data: purchasesList = [] } = useQuery<any[]>({
    queryKey: ['purchases'],
    queryFn: async () => {
      const res = await apiClient.get('/purchases/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
    enabled: !isEditing,
  });

  // Auto-generate numeric counter (e.g. 001, 002) if creating a new purchase
  useEffect(() => {
    if (!isEditing && !purchaseNo && purchasesList.length >= 0) {
      let maxNum = 0;
      purchasesList.forEach((p: any) => {
        const nums = String(p.PurchaseNo || '').replace(/\D/g, '');
        if (nums) {
          const val = parseInt(nums, 10);
          if (!isNaN(val) && val > maxNum) maxNum = val;
        }
      });
      const nextFormatted = String(maxNum + 1).padStart(3, '0');
      setPurchaseNo(nextFormatted);
    }
  }, [isEditing, purchasesList, purchaseNo]);

  // Kerala = StateId 12 (GST State Code 32)
  const isIntraState = useMemo(() => {
    if (!selectedSupplier?.StateId) return true;
    return selectedSupplier.StateId === 12 || selectedSupplier.StateId === 32;
  }, [selectedSupplier]);

  // Re-calc all rows whenever tax mode changes
  useEffect(() => {
    setItems((prev) => prev.map((line) => recalc(line, isIntraState)));
  }, [isIntraState]);

  // Party Selection: ONLY Bank, Cash, Sundry Debtors, and Sundry Creditors allowed
  const ALLOWED_PARTY_GROUPS = [16, 17, 21, 24, 25];

  const ledgerOptions = useMemo(() => {
    return ledgers
      .filter((l) => {
        const gId = typeof l.Group === 'number' ? l.Group : (l.Group as any)?.GroupId;
        if (gId && ALLOWED_PARTY_GROUPS.includes(Number(gId))) return true;
        const gName = (l.group_name || (typeof l.Group === 'object' ? (l.Group as any)?.GroupName : '') || '').toLowerCase();
        return gName.includes('cash') || gName.includes('bank') || gName.includes('creditor') || gName.includes('debtor');
      })
      .map((l) => ({ value: String(l.LedgerId), label: l.LedgerName }));
  }, [ledgers]);

  const productOptions = useMemo(
    () => products.map((p) => ({
      value: String(p.ProductId),
      label: p.ProductName + (p.ProductCode ? ` (${p.ProductCode})` : ''),
    })),
    [products]
  );

  const updateField = (index: number, field: keyof LineItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      let item = { ...copy[index], [field]: value };

      if (field === 'ProductId') {
        const prod = products.find((p) => p.ProductId === Number(value));
        if (prod) {
          item.ProductName = prod.ProductName;
          item.UnitId = prod.Unit;
          item.UnitName = prod.unit_name || 'Nos';
          item.AltUnitId = prod.AltUnit || null;
          item.AltUnitName = prod.alt_unit_name || '';
          item.UnitConversion = prod.UnitConversion !== undefined && prod.UnitConversion !== null
            ? Number(prod.UnitConversion)
            : 1;
          item.Rate = Number(prod.PurchasePrice) || '';
          item.GSTPercent = Number(prod.GSTPercentage) || 18;
        } else {
          item.ProductName = '';
          item.UnitId = null;
          item.UnitName = '';
          item.AltUnitId = null;
          item.AltUnitName = '';
          item.UnitConversion = 1;
          item.Rate = '';
          item.GSTPercent = 0;
        }
      }

      copy[index] = recalc(item, isIntraState);
      return copy;
    });
  };

  const addRow = () => setItems((prev) => [...prev, recalc(emptyLine(), isIntraState)]);

  const removeRow = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // If editing an existing purchase, fetch its details
  useEffect(() => {
    if (isEditing && id) {
      apiClient
        .get(`/purchases/${id}/`)
        .then((res) => {
          const p = res.data;
          setPurchaseNo(p.PurchaseNo || '');
          if (p.PurchaseDate) setPurchaseDate(p.PurchaseDate.split('T')[0]);
          setInvoiceNo(p.InvoiceNo || '');
          if (p.InvoiceDate) setInvoiceDate(p.InvoiceDate.split('T')[0]);
          if (p.SupplierLedgerId) setSelectedLedgerId(String(p.SupplierLedgerId));
          if (p.Notes) setNotes(p.Notes);
          if (p.RoundOff !== undefined && p.RoundOff !== null) setManualRoundOff(Number(p.RoundOff));

          setExtraDetails({
            partyName: p.PartyName || '',
            partyPhone: p.PartyPhone || '',
            partyAddress: p.PartyAddress || '',
            partyState: p.PartyState || '',
            partyPincode: p.PartyPincode || '',
            salesOrderNo: p.SalesOrderNo || '',
            salesOrderDate: p.SalesOrderDate ? p.SalesOrderDate.split('T')[0] : '',
            deliveryNo: p.DeliveryNo || '',
            deliveryDate: p.DeliveryDate ? p.DeliveryDate.split('T')[0] : '',
            modeOfTransport: p.ModeOfTransport || 'By Truck',
            truckNo: p.TruckNo || '',
            transporterName: p.TransporterName || '',
            tankerSealNo: p.TankerSealNo || '',
            eWayBillNo: p.EWayBillNo || '',
            eWayBillValidDate: p.EWayBillValidDate ? p.EWayBillValidDate.split('T')[0] : '',
          });

          if (Array.isArray(p.lines) && p.lines.length > 0) {
            setItems(
              p.lines.map((l: any) => {
                const prodId = l.Product || l.ProductId || null;
                const lineItem: LineItem = {
                  id: makeId(),
                  ProductId: prodId ? Number(prodId) : null,
                  ProductName: l.ProductName || '',
                  Quantity: l.Quantity !== undefined && l.Quantity !== null && l.Quantity !== '' ? Number(l.Quantity) : '',
                  AltQuantity: l.AltQuantity !== undefined && l.AltQuantity !== null && l.AltQuantity !== '' ? Number(l.AltQuantity) : 0,
                  UnitId: l.Unit || l.UnitId || null,
                  UnitName: l.unit_name || '',
                  AltUnitId: l.AltUnitId || null,
                  AltUnitName: l.alt_unit_name || '',
                  UnitConversion: Number(l.UnitConversion) || 1,
                  Rate: l.CostPrice !== undefined && l.CostPrice !== null && l.CostPrice !== '' ? Number(l.CostPrice) : '',
                  GSTPercent: Number(l.TaxPercent) || 0,
                  TaxableAmount: 0,
                  CGSTPercent: 0,
                  CGSTAmount: 0,
                  SGSTPercent: 0,
                  SGSTAmount: 0,
                  IGSTPercent: 0,
                  IGSTAmount: 0,
                  Total: 0,
                };
                return recalc(lineItem, isIntraState);
              })
            );
          }
        })
        .catch(() => {
          notifications.show({ title: 'Error', message: 'Could not load purchase details.', color: 'red' });
        });
    }
  }, [isEditing, id, isIntraState]);

  // Enrich lines with product details when products query resolves
  useEffect(() => {
    if (products.length > 0) {
      setItems((prev) =>
        prev.map((item) => {
          if (!item.ProductId) return item;
          const prod = products.find((p) => p.ProductId === Number(item.ProductId));
          if (!prod) return item;
          const updated = {
            ...item,
            ProductName: item.ProductName || prod.ProductName,
            UnitName: prod.unit_name || item.UnitName || '',
            AltUnitName: prod.alt_unit_name || item.AltUnitName || '',
            UnitConversion: prod.UnitConversion !== undefined && prod.UnitConversion !== null
              ? Number(prod.UnitConversion)
              : (Number(item.UnitConversion) || 1),
            GSTPercent: item.GSTPercent || Number(prod.GSTPercentage) || 0,
          };
          return recalc(updated, isIntraState);
        })
      );
    }
  }, [products, isIntraState]);

  const totals = useMemo(() => {
    let subTotal = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalQty = 0;

    items.forEach((line) => {
      subTotal += line.TaxableAmount;
      totalCGST += line.CGSTAmount;
      totalSGST += line.SGSTAmount;
      totalIGST += line.IGSTAmount;
      totalQty += Number(line.Quantity) || 0;
    });

    const totalTax = totalCGST + totalSGST + totalIGST;
    const rawTotal = subTotal + totalTax;
    const autoRoundOff = Number((Math.round(rawTotal) - rawTotal).toFixed(2));
    const roundOff = manualRoundOff !== null ? manualRoundOff : autoRoundOff;
    const grandTotal = Number((rawTotal + roundOff).toFixed(2));

    return {
      subTotal: Number(subTotal.toFixed(2)),
      totalCGST: Number(totalCGST.toFixed(2)),
      totalSGST: Number(totalSGST.toFixed(2)),
      totalIGST: Number(totalIGST.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalQty,
      roundOff,
      grandTotal,
    };
  }, [items, manualRoundOff]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLedgerId) throw new Error('Please select a Supplier / Party ledger.');
      const validLines = items.filter((i) => Boolean(i.ProductId));
      if (validLines.length === 0) throw new Error('Please select at least one product.');

      const payload = {
        PurchaseNo: purchaseNo,
        PurchaseDate: purchaseDate,
        InvoiceNo: invoiceNo,
        InvoiceDate: invoiceDate,
        SupplierLedgerId: Number(selectedLedgerId),
        Notes: notes,
        SubTotal: totals.subTotal,
        CGSTAmount: totals.totalCGST,
        SGSTAmount: totals.totalSGST,
        IGSTAmount: totals.totalIGST,
        TaxAmount: totals.totalTax,
        RoundOff: totals.roundOff,
        GrandTotal: totals.grandTotal,

        // Extra & Transport Details
        PartyName: extraDetails.partyName,
        PartyPhone: extraDetails.partyPhone,
        PartyAddress: extraDetails.partyAddress,
        PartyState: extraDetails.partyState,
        PartyPincode: extraDetails.partyPincode,
        SalesOrderNo: extraDetails.salesOrderNo,
        SalesOrderDate: extraDetails.salesOrderDate || null,
        DeliveryNo: extraDetails.deliveryNo,
        DeliveryDate: extraDetails.deliveryDate || null,
        ModeOfTransport: extraDetails.modeOfTransport,
        TruckNo: extraDetails.truckNo,
        TransporterName: extraDetails.transporterName,
        TankerSealNo: extraDetails.tankerSealNo,
        EWayBillNo: extraDetails.eWayBillNo,
        EWayBillValidDate: extraDetails.eWayBillValidDate || null,

        lines: validLines.map((line, idx) => ({
          LineNo: idx + 1,
          ProductId: line.ProductId,
          ProductName: line.ProductName,
          Quantity: Number(line.Quantity) || 0,
          AltQuantity: Number(line.AltQuantity) || 0,
          UnitId: line.UnitId,
          AltUnitId: line.AltUnitId,
          UnitConversion: line.UnitConversion,
          CostPrice: Number(line.Rate) || 0,
          TaxPercent: line.GSTPercent,
          TaxableAmount: line.TaxableAmount,
          TaxAmount: Number((line.CGSTAmount + line.SGSTAmount + line.IGSTAmount).toFixed(2)),
          CGSTPercent: line.CGSTPercent,
          CGSTAmount: line.CGSTAmount,
          SGSTPercent: line.SGSTPercent,
          SGSTAmount: line.SGSTAmount,
          IGSTPercent: line.IGSTPercent,
          IGSTAmount: line.IGSTAmount,
          Total: line.Total,
        })),
      };

      if (isEditing) return apiClient.put(`/purchases/${id}/`, payload);
      return apiClient.post('/purchases/', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      notifications.show({ title: 'Success', message: 'Purchase invoice saved successfully.', color: 'green' });
      navigate('/purchases');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.message || 'Failed to save purchase.';
      notifications.show({ title: 'Error', message: String(msg), color: 'red' });
    },
  });

  const handleSave = React.useCallback(() => {
    if (!selectedLedgerId) {
      notifications.show({ title: 'Validation', message: 'Please select a Party / Supplier above.', color: 'red' });
      return;
    }
    const validLines = items.filter((i) => Boolean(i.ProductId));
    if (validLines.length === 0) {
      notifications.show({ title: 'Validation', message: 'Please select at least one product.', color: 'red' });
      return;
    }
    saveMutation.mutate();
  }, [selectedLedgerId, items, saveMutation]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleSave]);

  return (
    <Stack gap={4} style={{ minHeight: 'calc(100vh - 82px)', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Ultra-Compact Top Header — minimal height, maximum screen space */}
      <Group justify="space-between" align="center" wrap="wrap" gap={4}>
        <Group gap={6} align="center">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => navigate('/purchases')}
            title="Back to Purchases"
            style={{ color: '#1e293b' }}
          >
            <IconArrowLeft size={18} />
          </ActionIcon>
          <Title order={3} style={{ color: '#800020', fontWeight: 700, fontSize: 18 }}>
            {isEditing ? 'Edit Purchase' : 'New Purchase Invoice'}
          </Title>
        </Group>
      </Group>

      {/* 2. Invoice Details Card with Party Selection & "More Details" Button */}
      <Paper p={8} radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
        <Group wrap="wrap" gap={8} align="flex-start">
          {/* Party / Supplier + More Details */}
          <div style={{ flex: '2 1 240px', minWidth: 220 }}>
            <Group justify="space-between" align="center" mb={2}>
              <Text size="xs" fw={600} c="#334155">Party / Supplier *</Text>
              <Button
                variant="subtle"
                color="burgundy"
                size="compact-xs"
                leftSection={<IconInfoCircle size={14} />}
                onClick={() => setMoreDetailsOpened(true)}
              >
                More Details
              </Button>
            </Group>
            <Select
              placeholder="Select supplier ledger..."
              data={ledgerOptions}
              value={selectedLedgerId}
              onChange={(val) => setSelectedLedgerId(val ? String(val) : null)}
              searchable
              clearable
              radius="md"
              size="sm"
            />
            {selectedSupplier?.GSTIN && (
              <Text size="xs" c="dimmed" mt={3}>
                GSTIN: <span style={{ fontWeight: 600, color: '#334155' }}>{selectedSupplier.GSTIN}</span>
              </Text>
            )}
          </div>

          {/* Purchase No */}
          <div style={{ flex: '1 1 140px', minWidth: 130 }}>
            <Text size="xs" fw={600} c="#334155" mb={2}>Purchase No</Text>
            <TextInput
              placeholder="001"
              value={purchaseNo}
              onChange={(e) => {
                const numericOnly = e.currentTarget.value.replace(/\D/g, '');
                setPurchaseNo(numericOnly);
              }}
              radius="md"
              size="sm"
            />
          </div>

          {/* Purchase Date */}
          <div style={{ flex: '1 1 140px', minWidth: 130 }}>
            <Text size="xs" fw={600} c="#334155" mb={2}>Purchase Date *</Text>
            <TextInput
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.currentTarget.value)}
              radius="md"
              size="sm"
            />
          </div>

          {/* Supplier Invoice No */}
          <div style={{ flex: '1 1 140px', minWidth: 130 }}>
            <Text size="xs" fw={600} c="#334155" mb={2}>Invoice No</Text>
            <TextInput
              placeholder="Supplier Inv No"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.currentTarget.value)}
              radius="md"
              size="sm"
            />
          </div>

          {/* Supplier Invoice Date */}
          <div style={{ flex: '1 1 140px', minWidth: 130 }}>
            <Text size="xs" fw={600} c="#334155" mb={2}>Invoice Date</Text>
            <TextInput
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.currentTarget.value)}
              radius="md"
              size="sm"
            />
          </div>
        </Group>
      </Paper>

      {/* 3. Products Table & Bottom Dock — Completely unified in ONE single white section */}
      <Paper
        radius="sm"
        withBorder
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        {isLoadingProducts ? (
          <Center py={30} style={{ flex: 1 }}><Loader color="burgundy" size="md" /></Center>
        ) : (
          <Box style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', backgroundColor: '#ffffff', minHeight: 320 }}>
            <Table.ScrollContainer minWidth={880}>
            <Table
              verticalSpacing={0}
              horizontalSpacing={4}
              highlightOnHover
              style={{ tableLayout: 'fixed', width: '100%', minWidth: 880 }}
              styles={{
                td: { paddingTop: 1, paddingBottom: 1, paddingLeft: 4, paddingRight: 4 },
                th: { paddingTop: 3, paddingBottom: 3, paddingLeft: 4, paddingRight: 4 },
              }}
            >
              <colgroup>
                <col style={{ width: 38 }} />
                <col style={{ width: 235 }} /> {/* Product: fits 220px select */}
                <col style={{ width: '21%' }} /> {/* Qty & Unit */}
                <col style={{ width: '15%' }} /> {/* Rate */}
                <col style={{ width: '16%' }} /> {/* Taxable */}
                <col style={{ width: '19%' }} /> {/* GST */}
                <col style={{ width: '19%' }} /> {/* Total */}
                <col style={{ width: 51 }} /> {/* Delete Action */}
              </colgroup>
              <Table.Thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <Table.Tr style={{ height: 24 }}>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11, textAlign: 'left' }}>#</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11, textAlign: 'left' }}>Product</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11, textAlign: 'left' }}>Qty</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11, textAlign: 'right', paddingRight: 6 }}>Rate (₹)</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11, textAlign: 'right', paddingRight: 6 }}>Taxable (₹)</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11, textAlign: 'right', paddingRight: 6 }}>GST (₹)</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 11, textAlign: 'right', paddingRight: 6 }}>Total (₹)</Table.Th>
                  <Table.Th style={{ padding: '2px' }} />
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {items.map((line, index) => (
                  <Table.Tr key={line.id}>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Text size="xs" fw={600} c="dimmed">{index + 1}</Text>
                    </Table.Td>

                    {/* Product Select (Gated by selected supplier ledger) */}
                    <Table.Td>
                      <Select
                        placeholder={selectedLedgerId ? "Select product..." : "Select supplier first"}
                        data={selectedLedgerId ? productOptions : []}
                        value={line.ProductId ? String(line.ProductId) : null}
                        onChange={(val) => updateField(index, 'ProductId', val ? Number(val) : null)}
                        disabled={!selectedLedgerId}
                        searchable
                        size="xs"
                        radius="sm"
                        style={{ width: 220, maxWidth: '100%' }}
                        comboboxProps={{ width: 220 }}
                        nothingFoundMessage={selectedLedgerId ? "No products found" : "Please select supplier first"}
                        styles={{ input: { height: 24, minHeight: 24, fontSize: 12 } }}
                      />
                    </Table.Td>

                    {/* Qty & Unit combined in one clean cell */}
                    <Table.Td style={{ paddingLeft: 4, paddingRight: 4 }}>
                      <Group gap={6} wrap="nowrap" align="center">
                        <NumberInput
                          size="xs"
                          radius="sm"
                          min={0}
                          hideControls
                          placeholder="0"
                          disabled={!line.ProductId}
                          value={
                            line.Quantity === '' || line.Quantity === null || line.Quantity === undefined
                              ? ''
                              : typeof line.Quantity === 'string' && !isNaN(Number(line.Quantity)) && !line.Quantity.endsWith('.')
                              ? Number(line.Quantity)
                              : line.Quantity
                          }
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(val) => updateField(index, 'Quantity', val)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSave();
                            }
                          }}
                          style={{ width: 42, flexShrink: 0 }}
                          styles={{
                            input: {
                              height: 24,
                              minHeight: 24,
                              paddingLeft: 2,
                              paddingRight: 2,
                              textAlign: 'center',
                              fontWeight: 600,
                              fontSize: 13,
                              fontVariantNumeric: 'tabular-nums',
                            },
                          }}
                        />
                        {line.ProductId && line.UnitName && (() => {
                          const hasAlt = Number(line.AltQuantity) > 0 && line.AltUnitName;
                          if (!hasAlt) {
                            return (
                              <Text size="xs" fw={700} c="#1e293b" style={{ whiteSpace: 'nowrap' }}>
                                {line.UnitName}
                              </Text>
                            );
                          }
                          const isAltNos = line.AltUnitName.toUpperCase() === 'NOS';
                          const bracketQty = line.AltQuantity;
                          const bracketUnit = isAltNos ? line.UnitName : line.AltUnitName;
                          const outerUnit = isAltNos ? line.AltUnitName : line.UnitName;
                          return (
                            <Text size="xs" fw={700} c="#1e293b" style={{ whiteSpace: 'nowrap' }}>
                              ({bracketQty}) {outerUnit}/{bracketUnit}
                            </Text>
                          );
                        })()}
                      </Group>
                    </Table.Td>

                    {/* Rate */}
                    <Table.Td style={{ textAlign: 'right', paddingRight: 4 }}>
                      <Box style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <NumberInput
                          size="xs"
                          radius="sm"
                          min={0}
                          decimalScale={2}
                          hideControls
                          prefix="₹ "
                          placeholder="0.00"
                          disabled={!line.ProductId}
                          value={line.Rate}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(val) => updateField(index, 'Rate', val)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSave();
                            }
                          }}
                          style={{ width: 115 }}
                          styles={{
                            input: {
                              height: 24,
                              minHeight: 24,
                              fontWeight: 600,
                              fontSize: 13,
                              backgroundColor: '#ffffff',
                              borderColor: '#cbd5e1',
                              color: '#0f172a',
                              textAlign: 'right',
                              paddingLeft: 4,
                              paddingRight: 6,
                              fontVariantNumeric: 'tabular-nums',
                            },
                          }}
                        />
                      </Box>
                    </Table.Td>

                    {/* Taxable Amount */}
                    <Table.Td style={{ textAlign: 'right', paddingRight: 6 }}>
                      {line.ProductId ? (
                        <Text fw={600} style={{ fontSize: 13, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          ₹{line.TaxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      ) : (
                        <Text size="xs" c="dimmed">—</Text>
                      )}
                    </Table.Td>

                    {/* GST: Percentage on left of amount, both aligned to the right side */}
                    <Table.Td style={{ textAlign: 'right', paddingRight: 6 }}>
                      {line.ProductId ? (() => {
                        const lineTax = (line.CGSTAmount || 0) + (line.SGSTAmount || 0) + (line.IGSTAmount || 0);
                        return (
                          <Group justify="flex-end" wrap="nowrap" align="center" gap={6}>
                            <Text style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                              ({line.GSTPercent}%)
                            </Text>
                            <Text fw={600} style={{ fontSize: 13, color: '#0f766e', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                              ₹{lineTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                          </Group>
                        );
                      })() : (
                        <Text size="xs" c="dimmed" style={{ textAlign: 'right' }}>—</Text>
                      )}
                    </Table.Td>

                    {/* Total (₹) */}
                    <Table.Td style={{ textAlign: 'right', paddingRight: 6 }}>
                      {line.ProductId ? (
                        <Text fw={700} style={{ fontSize: 13, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          ₹{line.Total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      ) : (
                        <Text size="xs" c="dimmed">—</Text>
                      )}
                    </Table.Td>

                    {/* Delete Icon — tabIndex={-1} skips focus during Tab */}
                    <Table.Td style={{ textAlign: 'center', padding: '2px' }}>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        tabIndex={-1}
                        onClick={() => removeRow(index)}
                      >
                        <IconTrash size={15} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {/* Add Row Action inside Tbody */}
                <Table.Tr>
                  <Table.Td colSpan={8} style={{ padding: '2px 6px', backgroundColor: '#ffffff' }}>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      leftSection={<IconPlus size={14} />}
                      onClick={addRow}
                    >
                      Add Row
                    </Button>
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Box>
      )}

      {/* Footer Section — FIXED AT THE BOTTOM OF THE CARD */}
      <Box
        style={{
          marginTop: 'auto',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          overflowX: 'auto',
        }}
      >
        {/* Row 1: Totals Row — mathematically aligned with items table columns */}
        <Table
          verticalSpacing={1}
          horizontalSpacing="xs"
          style={{ tableLayout: 'fixed', width: '100%', minWidth: 880, borderBottom: 'none' }}
          styles={{
            td: { border: 'none', paddingTop: 3, paddingBottom: 3, paddingLeft: 4, paddingRight: 4 },
          }}
        >
          <colgroup>
            <col style={{ width: 38 }} />
            <col style={{ width: 235 }} /> {/* Product */}
            <col style={{ width: '21%' }} /> {/* Qty & Unit */}
            <col style={{ width: '15%' }} /> {/* Rate */}
            <col style={{ width: '16%' }} /> {/* Taxable */}
            <col style={{ width: '19%' }} /> {/* GST */}
            <col style={{ width: '19%' }} /> {/* Total */}
            <col style={{ width: 38 }} /> {/* Delete Action */}
          </colgroup>
          <Table.Tbody>
            <Table.Tr style={{ height: 28, backgroundColor: '#ffffff', border: 'none' }}>
              <Table.Td style={{ textAlign: 'center', border: 'none' }} />
              <Table.Td style={{ textAlign: 'right', color: '#475569', fontWeight: 700, fontSize: 13, border: 'none', paddingRight: 8 }}>
                Total:
              </Table.Td>
              {/* Total Qty directly under the 44px Qty box */}
              <Table.Td style={{ border: 'none', paddingLeft: 4, paddingRight: 4 }}>
                <div style={{ width: 42, textAlign: 'center' }}>
                  <Text fw={700} style={{ fontSize: 13, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {totals.totalQty}
                  </Text>
                </div>
              </Table.Td>
              <Table.Td style={{ border: 'none' }} />
              {/* Taxable total */}
              <Table.Td style={{ textAlign: 'right', border: 'none', paddingRight: 6 }}>
                <Text fw={700} style={{ fontSize: 13, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  ₹{totals.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </Table.Td>
              {/* GST total */}
              <Table.Td style={{ textAlign: 'right', border: 'none', paddingRight: 6 }}>
                <Text fw={700} style={{ fontSize: 13, color: '#0f766e', fontVariantNumeric: 'tabular-nums' }}>
                  ₹{totals.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </Table.Td>
              {/* Raw Total */}
              <Table.Td style={{ textAlign: 'right', border: 'none', paddingRight: 6 }}>
                <Text fw={700} style={{ fontSize: 13, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                  ₹{(totals.subTotal + totals.totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </Table.Td>
              <Table.Td style={{ padding: '4px', border: 'none' }} />
            </Table.Tr>
          </Table.Tbody>
        </Table>

        {/* Row 2: Action Bar (Notes, Round Off, Grand Total, Buttons) — NO extra top line */}
        <Box pt={3} pb={6} px="sm">
          <Group justify="space-between" align="center" wrap="wrap" gap="md">
            {/* Left: Notes Input */}
            <div style={{ flex: '1 1 240px', maxWidth: 460 }}>
              <TextInput
                placeholder="Add invoice notes or instructions..."
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                radius="md"
                size="xs"
              />
            </div>

            {/* Right: Round Off, Grand Total, and Action Buttons */}
            <Group gap="sm" align="center" wrap="wrap">
              {/* Round Off */}
              <Group gap={6} align="center" wrap="nowrap">
                <Text size="xs" fw={500} c="dimmed">Round Off (₹):</Text>
                <NumberInput
                  size="xs"
                  radius="sm"
                  decimalScale={2}
                  step={0.01}
                  hideControls
                  placeholder="0.00"
                  value={manualRoundOff !== null ? manualRoundOff : totals.roundOff}
                  onChange={(val) => setManualRoundOff(val === '' || val === undefined ? null : Number(val))}
                  style={{ width: 62 }}
                  styles={{ input: { textAlign: 'right', fontWeight: 600, height: 28, minHeight: 28 } }}
                />
              </Group>

              <Divider orientation="vertical" visibleFrom="xs" />

              {/* Grand Total */}
              <Group gap={6} align="baseline" wrap="nowrap">
                <Text size="xs" fw={600} c="dimmed">Grand Total:</Text>
                <Text fw={800} size="lg" c="#800020" style={{ whiteSpace: 'nowrap' }}>
                  ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </Group>

              <Divider orientation="vertical" visibleFrom="xs" />

              {/* Action Buttons */}
              <Group gap="xs" wrap="wrap">
                <Button variant="default" size="xs" radius={8} onClick={() => navigate('/purchases')}>
                  Cancel
                </Button>
                <Button
                  color="burgundy"
                  radius={8}
                  size="xs"
                  leftSection={<IconCurrencyRupee size={15} />}
                  loading={saveMutation.isPending}
                  disabled={!selectedLedgerId || items.every((i) => !i.ProductId)}
                  onClick={handleSave}
                >
                  Save Purchase Invoice
                </Button>
              </Group>
            </Group>
          </Group>
        </Box>
      </Box>
    </Paper>

      {/* 5. "More Details" Modal: Transport & Party Extra Details */}
      <Modal
        opened={moreDetailsOpened}
        onClose={() => setMoreDetailsOpened(false)}
        title={
          <Group gap="xs">
            <IconTruckDelivery size={20} color="#800020" />
            <Text fw={700} c="#800020" size="md">
              Transport & Party Extra Details
            </Text>
          </Group>
        }
        size="lg"
        radius="md"
      >
        <Stack gap="md">
          {/* Party Details Section */}
          <div>
            <Text size="xs" fw={700} c="#800020" tt="uppercase" mb="xs">
              Party / Consignor Details
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <TextInput
                label="Party / Consignor Name"
                placeholder="Supplier / Company Name"
                value={extraDetails.partyName}
                onChange={(e) => setExtraDetails({ ...extraDetails, partyName: e.currentTarget.value })}
                radius="md"
                size="xs"
              />
              <TextInput
                label="Phone / Mobile No"
                placeholder="Contact Number"
                value={extraDetails.partyPhone}
                onChange={(e) => setExtraDetails({ ...extraDetails, partyPhone: e.currentTarget.value })}
                radius="md"
                size="xs"
              />
              <TextInput
                label="Address"
                placeholder="Street / Building Address"
                value={extraDetails.partyAddress}
                onChange={(e) => setExtraDetails({ ...extraDetails, partyAddress: e.currentTarget.value })}
                radius="md"
                size="xs"
                style={{ gridColumn: 'span 2' }}
              />
              <TextInput
                label="State"
                placeholder="e.g. Kerala"
                value={extraDetails.partyState}
                onChange={(e) => setExtraDetails({ ...extraDetails, partyState: e.currentTarget.value })}
                radius="md"
                size="xs"
              />
              <TextInput
                label="PIN Code"
                placeholder="e.g. 682001"
                value={extraDetails.partyPincode}
                onChange={(e) => setExtraDetails({ ...extraDetails, partyPincode: e.currentTarget.value })}
                radius="md"
                size="xs"
              />
            </SimpleGrid>
          </div>

          <Divider />

          {/* Transport Details Section (from slip) */}
          <div>
            <Text size="xs" fw={700} c="#800020" tt="uppercase" mb="xs">
              Transport & Delivery Order Details
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <TextInput
                label="Sales Order No"
                placeholder="e.g. 6934315"
                value={extraDetails.salesOrderNo}
                onChange={(e) => setExtraDetails({ ...extraDetails, salesOrderNo: e.currentTarget.value })}
                radius="md"
                size="xs"
              />
              <TextInput
                label="Sales Order Date"
                type="date"
                value={extraDetails.salesOrderDate}
                onChange={(e) => setExtraDetails({ ...extraDetails, salesOrderDate: e.currentTarget.value })}
                radius="md"
                size="xs"
              />
              <TextInput
                label="Delivery No"
                placeholder="e.g. 23652988"
                value={extraDetails.deliveryNo}
                onChange={(e) => setExtraDetails({ ...extraDetails, deliveryNo: e.currentTarget.value })}
                radius="md"
                size="xs"
              />
              <TextInput
                label="Delivery Date"
                type="date"
                value={extraDetails.deliveryDate}
                onChange={(e) => setExtraDetails({ ...extraDetails, deliveryDate: e.currentTarget.value })}
                radius="md"
                size="xs"
              />
              <TextInput
                label="Mode of Transport"
                placeholder="e.g. By Truck"
                value={extraDetails.modeOfTransport}
                onChange={(e) => setExtraDetails({ ...extraDetails, modeOfTransport: e.currentTarget.value })}
                radius="md"
                size="xs"
              />
              <TextInput
                label="Truck No / Vehicle No"
                placeholder="e.g. KL18V4921"
                value={extraDetails.truckNo}
                onChange={(e) => setExtraDetails({ ...extraDetails, truckNo: e.currentTarget.value })}
                radius="md"
                size="xs"
              />
              <TextInput
                label="Transporter Name"
                placeholder="e.g. OWNTRANSPORT"
                value={extraDetails.transporterName}
                onChange={(e) => setExtraDetails({ ...extraDetails, transporterName: e.currentTarget.value })}
                radius="md"
                size="xs"
              />
              <TextInput
                label="Tanker Seal No"
                placeholder="Seal No"
                value={extraDetails.tankerSealNo}
                onChange={(e) => setExtraDetails({ ...extraDetails, tankerSealNo: e.currentTarget.value })}
                radius="md"
                size="xs"
              />
              <TextInput
                label="e-Waybill No"
                placeholder="e.g. 152386828957"
                value={extraDetails.eWayBillNo}
                onChange={(e) => setExtraDetails({ ...extraDetails, eWayBillNo: e.currentTarget.value })}
                radius="md"
                size="xs"
              />
              <TextInput
                label="e-Waybill Valid Date"
                type="date"
                value={extraDetails.eWayBillValidDate}
                onChange={(e) => setExtraDetails({ ...extraDetails, eWayBillValidDate: e.currentTarget.value })}
                radius="md"
                size="xs"
              />
            </SimpleGrid>
          </div>

          <Group justify="flex-end" mt="sm">
            <Button
              color="burgundy"
              size="xs"
              radius="md"
              leftSection={<IconCheck size={16} />}
              onClick={() => setMoreDetailsOpened(false)}
            >
              Done
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
