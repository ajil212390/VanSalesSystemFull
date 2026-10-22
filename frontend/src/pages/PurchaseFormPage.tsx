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
  Badge,
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
  Group?: { GroupName: string };
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
  const taxable = qty * rate;
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

  const altQty = line.UnitConversion > 0
    ? Number((qty * line.UnitConversion).toFixed(2))
    : Number(line.AltQuantity) || 0;

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
        partyState: selectedSupplier.StateId === 32 ? 'Kerala' : prev.partyState,
      }));
    }
  }, [selectedSupplier]);

  // Kerala = StateId 32 (standard GST state code for Kerala)
  const isIntraState = useMemo(() => {
    if (!selectedSupplier?.StateId) return true;
    return selectedSupplier.StateId === 32;
  }, [selectedSupplier]);

  // Re-calc all rows whenever tax mode changes
  useEffect(() => {
    setItems((prev) => prev.map((line) => recalc(line, isIntraState)));
  }, [isIntraState]);

  const ledgerOptions = useMemo(
    () => ledgers.map((l) => ({ value: String(l.LedgerId), label: l.LedgerName })),
    [ledgers]
  );

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
          item.UnitConversion = Number(prod.UnitConversion) || 1;
          item.Rate = Number(prod.PurchasePrice) || '';
          item.GSTPercent = Number(prod.GSTPercentage) || 18;
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
              p.lines.map((l: any) => ({
                id: makeId(),
                ProductId: l.ProductId,
                ProductName: l.ProductName || '',
                Quantity: l.Quantity || '',
                AltQuantity: l.AltQuantity || 0,
                UnitId: l.UnitId,
                UnitName: l.unit_name || 'Nos',
                AltUnitId: l.AltUnitId || null,
                AltUnitName: l.alt_unit_name || '',
                UnitConversion: Number(l.UnitConversion) || 1,
                Rate: l.CostPrice || '',
                GSTPercent: Number(l.TaxPercent) || 18,
                TaxableAmount: Number(l.TaxableAmount) || 0,
                CGSTPercent: Number(l.CGSTPercent) || 0,
                CGSTAmount: Number(l.CGSTAmount) || 0,
                SGSTPercent: Number(l.SGSTPercent) || 0,
                SGSTAmount: Number(l.SGSTAmount) || 0,
                IGSTPercent: Number(l.IGSTPercent) || 0,
                IGSTAmount: Number(l.IGSTAmount) || 0,
                Total: Number(l.Total) || 0,
              }))
            );
          }
        })
        .catch(() => {
          notifications.show({ title: 'Error', message: 'Could not load purchase details.', color: 'red' });
        });
    }
  }, [isEditing, id]);

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
      if (items.some((i) => !i.ProductId)) throw new Error('Select a product for every row.');

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

        lines: items.map((line, idx) => ({
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

  return (
    <Stack gap="sm" style={{ minHeight: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Ultra-Compact Top Header — minimal height, maximum screen space */}
      <Group justify="space-between" align="center" wrap="wrap" gap="xs">
        <Group gap="xs" align="center">
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/purchases')}
            styles={{ root: { paddingLeft: 4, paddingRight: 8 } }}
          >
            Back to Purchases
          </Button>
          <Divider orientation="vertical" h={18} />
          <Title order={3} style={{ color: '#800020', fontWeight: 700, fontSize: 18 }}>
            {isEditing ? 'Edit Purchase' : 'New Purchase Invoice'}
          </Title>
        </Group>
      </Group>

      {/* 2. Invoice Details Card with Party Selection & "More Details" Button */}
      <Paper p="sm" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
        <Group wrap="wrap" gap="sm" align="flex-start">
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
              placeholder="e.g. PUR-001"
              value={purchaseNo}
              onChange={(e) => setPurchaseNo(e.currentTarget.value)}
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
          <Center py={60} style={{ flex: 1 }}><Loader color="burgundy" size="md" /></Center>
        ) : (
          <Box style={{ flex: 1, overflowX: 'auto', backgroundColor: '#ffffff' }}>
            <Table.ScrollContainer minWidth={880}>
            <Table
              verticalSpacing={1}
              horizontalSpacing="xs"
              highlightOnHover
              styles={{
                td: { paddingTop: 2, paddingBottom: 2, paddingLeft: 6, paddingRight: 6 },
                th: { paddingTop: 4, paddingBottom: 4, paddingLeft: 6, paddingRight: 6 },
              }}
            >
              <Table.Thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <Table.Tr style={{ height: 28 }}>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 12, width: 36, textAlign: 'center' }}>#</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 12, width: 160, minWidth: 140, maxWidth: 180 }}>Product</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 12, width: 65, minWidth: 55 }}>Qty</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 12, width: 60, minWidth: 55, textAlign: 'center' }}>Unit</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 12, width: 110, minWidth: 110 }}>Rate (₹)</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 12, minWidth: 100, textAlign: 'right' }}>Taxable (₹)</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 12, minWidth: 115, textAlign: 'right' }}>GST (₹)</Table.Th>
                  <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: 12, minWidth: 110, textAlign: 'right' }}>Total (₹)</Table.Th>
                  <Table.Th style={{ width: 36, padding: '4px' }} />
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {items.map((line, index) => (
                  <Table.Tr key={line.id}>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Text size="xs" fw={600} c="dimmed">{index + 1}</Text>
                    </Table.Td>

                    {/* Product Select (Compact width) */}
                    <Table.Td style={{ width: 160, maxWidth: 180 }}>
                      <Select
                        placeholder="Select product..."
                        data={productOptions}
                        value={line.ProductId ? String(line.ProductId) : null}
                        onChange={(val) => updateField(index, 'ProductId', val ? Number(val) : null)}
                        searchable
                        size="xs"
                        radius="sm"
                        style={{ width: 160 }}
                        comboboxProps={{ width: 240 }}
                        styles={{ input: { height: 26, minHeight: 26 } }}
                      />
                    </Table.Td>

                    {/* Qty with Calculated Alt Qty in Brackets (compact width, no gap with unit) */}
                    <Table.Td style={{ width: 65, minWidth: 55 }}>
                      <Group gap={4} wrap="nowrap" align="center">
                        <NumberInput
                          size="xs"
                          radius="sm"
                          min={0}
                          hideControls
                          placeholder="0"
                          value={line.Quantity}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(val) => updateField(index, 'Quantity', val)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (index === items.length - 1) addRow();
                            }
                          }}
                          style={{ width: 44 }}
                          styles={{
                            input: {
                              height: 26,
                              minHeight: 26,
                              paddingLeft: 2,
                              paddingRight: 2,
                              textAlign: 'center',
                              fontWeight: 600,
                            },
                          }}
                        />
                        {Number(line.AltQuantity) > 0 && (
                          <Text size="11px" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                            ({line.AltQuantity} {line.AltUnitName || ''})
                          </Text>
                        )}
                      </Group>
                    </Table.Td>

                    {/* Unit (Full name visible, compact, no gap) */}
                    <Table.Td style={{ width: 60, minWidth: 55, textAlign: 'center' }}>
                      {line.ProductId && line.UnitName ? (
                        <Badge size="xs" variant="outline" color="gray" style={{ whiteSpace: 'nowrap', textOverflow: 'clip', minWidth: 42 }}>
                          {line.UnitName}
                        </Badge>
                      ) : (
                        <Text size="xs" c="dimmed">—</Text>
                      )}
                    </Table.Td>

                    {/* Rate (clean neutral styling, no clipping) */}
                    <Table.Td style={{ minWidth: 110 }}>
                      <NumberInput
                        size="xs"
                        radius="sm"
                        min={0}
                        decimalScale={2}
                        hideControls
                        prefix="₹ "
                        placeholder="0.00"
                        value={line.Rate}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(val) => updateField(index, 'Rate', val)}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab' && !e.shiftKey) {
                            if (index === items.length - 1) {
                              e.preventDefault();
                              addRow();
                            }
                          }
                        }}
                        style={{ width: '100%', minWidth: 95 }}
                        styles={{
                          input: {
                            height: 26,
                            minHeight: 26,
                            fontWeight: 600,
                            backgroundColor: '#ffffff',
                            borderColor: '#cbd5e1',
                            color: '#0f172a',
                            paddingLeft: 6,
                            paddingRight: 6,
                          },
                        }}
                      />
                    </Table.Td>

                    {/* Taxable Amount */}
                    <Table.Td style={{ textAlign: 'right' }}>
                      {line.ProductId ? (
                        <Text fw={600} size="sm" c="#334155">
                          ₹{line.TaxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      ) : (
                        <Text size="xs" c="dimmed">—</Text>
                      )}
                    </Table.Td>

                    {/* GST: Percentage on left of amount, both aligned to the right side */}
                    <Table.Td style={{ textAlign: 'right' }}>
                      {line.ProductId ? (() => {
                        const lineTax = (line.CGSTAmount || 0) + (line.SGSTAmount || 0) + (line.IGSTAmount || 0);
                        return (
                          <Group justify="flex-end" wrap="nowrap" align="center" gap={6}>
                            <Text size="11px" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                              ({line.GSTPercent}%)
                            </Text>
                            <Text fw={600} size="sm" c="#0f766e" style={{ whiteSpace: 'nowrap' }}>
                              ₹{lineTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                          </Group>
                        );
                      })() : (
                        <Text size="xs" c="dimmed" style={{ textAlign: 'right' }}>—</Text>
                      )}
                    </Table.Td>

                    {/* Total (₹) — Clean neutral dark text, completely visible */}
                    <Table.Td style={{ textAlign: 'right' }}>
                      {line.ProductId ? (
                        <Text fw={700} size="sm" c="#0f172a">
                          ₹{line.Total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      ) : (
                        <Text size="xs" c="dimmed">—</Text>
                      )}
                    </Table.Td>

                    {/* Delete Icon — tabIndex={-1} skips focus during Tab */}
                    <Table.Td style={{ textAlign: 'center' }}>
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
                  <Table.Td colSpan={9} style={{ padding: '3px 8px', backgroundColor: '#ffffff' }}>
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

      {/* Bottom Dock inside the SAME unified section — completely in one section, blending white */}
      <Box
        style={{
          marginTop: 'auto',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Row 1: Totals Row — Clean single borders, zero unwanted lines */}
        <Table.ScrollContainer minWidth={880}>
          <Table
            verticalSpacing={2}
            horizontalSpacing="xs"
            styles={{
              td: { border: 'none', paddingTop: 6, paddingBottom: 6, paddingLeft: 6, paddingRight: 6 },
            }}
          >
            <Table.Tbody>
              <Table.Tr style={{ height: 34, backgroundColor: '#ffffff', border: 'none' }}>
                <Table.Td style={{ width: 36, textAlign: 'center', border: 'none' }} />
                <Table.Td style={{ width: 160, minWidth: 140, maxWidth: 180, textAlign: 'right', color: '#475569', fontWeight: 700, fontSize: 13, border: 'none' }}>
                  Total:
                </Table.Td>
                {/* Total Qty directly below Qty column */}
                <Table.Td style={{ width: 65, minWidth: 55, textAlign: 'left', border: 'none' }}>
                  <Text size="xs" fw={700} c="#0f172a" pl={4}>
                    {totals.totalQty}
                  </Text>
                </Table.Td>
                <Table.Td style={{ width: 60, minWidth: 55, border: 'none' }} />
                <Table.Td style={{ width: 110, minWidth: 110, border: 'none' }} />
                {/* Taxable total directly below Taxable column */}
                <Table.Td style={{ minWidth: 100, textAlign: 'right', color: '#0f172a', fontWeight: 700, fontSize: 13, border: 'none' }}>
                  ₹{totals.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Table.Td>
                {/* GST total directly below GST column */}
                <Table.Td style={{ minWidth: 115, textAlign: 'right', color: '#0f766e', fontWeight: 700, fontSize: 13, border: 'none' }}>
                  ₹{totals.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Table.Td>
                {/* Raw Total directly below Total column */}
                <Table.Td style={{ minWidth: 110, textAlign: 'right', color: '#0f172a', fontWeight: 800, fontSize: 14, border: 'none' }}>
                  ₹{(totals.subTotal + totals.totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Table.Td>
                <Table.Td style={{ width: 36, padding: '4px', border: 'none' }} />
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {/* Row 2: Action Bar (Notes, Round Off, Grand Total, Buttons) — seamless with Totals row */}
        <Box pt={4} pb="xs" px="md">
          <Group justify="space-between" align="center" wrap="wrap" gap="md">
            {/* Left: Notes Input */}
            <div style={{ flex: '1 1 300px', maxWidth: 460 }}>
              <TextInput
                placeholder="Add invoice notes or instructions..."
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                radius="md"
                size="xs"
              />
            </div>

            {/* Right: Round Off, Grand Total, and Action Buttons on One Clean Line */}
            <Group gap="md" align="center" wrap="nowrap">
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

              <Divider orientation="vertical" />

              {/* Grand Total */}
              <Group gap={6} align="baseline" wrap="nowrap">
                <Text size="xs" fw={600} c="dimmed">Grand Total:</Text>
                <Text fw={800} size="lg" c="#800020" style={{ whiteSpace: 'nowrap' }}>
                  ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </Group>

              <Divider orientation="vertical" />

              {/* Action Buttons */}
              <Group gap="xs" wrap="nowrap">
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
                  onClick={() => saveMutation.mutate()}
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
