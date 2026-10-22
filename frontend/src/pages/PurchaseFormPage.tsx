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
  Textarea,
  Grid,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconCurrencyRupee,
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

const makeId = () => Math.random().toString(36).substring(2, 9);

const emptyLine = (): LineItem => ({
  id: makeId(),
  ProductId: null,
  ProductName: '',
  Quantity: 1,
  AltQuantity: 0,
  UnitId: null,
  UnitName: '',
  AltUnitId: null,
  UnitConversion: 1,
  Rate: 0,
  GSTPercent: 18,
  TaxableAmount: 0,
  CGSTPercent: 9,
  CGSTAmount: 0,
  SGSTPercent: 9,
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
  const [items, setItems] = useState<LineItem[]>([emptyLine()]);

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

  // Auto-generate purchase number
  useEffect(() => {
    if (!isEditing) {
      const y = new Date().getFullYear();
      const n = String(Math.floor(1000 + Math.random() * 9000));
      setPurchaseNo(`PUR-${y}-${n}`);
    }
  }, [isEditing]);

  const selectedSupplier = useMemo(
    () => ledgers.find((l) => String(l.LedgerId) === selectedLedgerId) || null,
    [selectedLedgerId, ledgers]
  );

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
          item.UnitConversion = Number(prod.UnitConversion) || 1;
          item.Rate = Number(prod.PurchasePrice) || 0;
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

  const totals = useMemo(() => {
    const totalQty   = items.reduce((s, i) => s + (Number(i.Quantity) || 0), 0);
    const totalAlt   = items.reduce((s, i) => s + (Number(i.AltQuantity) || 0), 0);
    const subTotal   = items.reduce((s, i) => s + i.TaxableAmount, 0);
    const totalCGST  = items.reduce((s, i) => s + i.CGSTAmount, 0);
    const totalSGST  = items.reduce((s, i) => s + i.SGSTAmount, 0);
    const totalIGST  = items.reduce((s, i) => s + i.IGSTAmount, 0);
    const totalTax   = totalCGST + totalSGST + totalIGST;
    const raw        = subTotal + totalTax;
    const roundOff   = Number((Math.round(raw) - raw).toFixed(2));
    const grandTotal = Math.round(raw);
    return {
      totalQty, totalAlt,
      subTotal: +subTotal.toFixed(2),
      totalCGST: +totalCGST.toFixed(2),
      totalSGST: +totalSGST.toFixed(2),
      totalIGST: +totalIGST.toFixed(2),
      totalTax: +totalTax.toFixed(2),
      roundOff, grandTotal,
    };
  }, [items]);

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
        lines: items.map((line, idx) => ({
          LineNo: idx + 1,
          ProductId: line.ProductId,
          ProductName: line.ProductName,
          Quantity: Number(line.Quantity),
          AltQuantity: Number(line.AltQuantity),
          UnitId: line.UnitId,
          AltUnitId: line.AltUnitId,
          UnitConversion: line.UnitConversion,
          CostPrice: Number(line.Rate),
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
    <Stack gap="lg">
      {/* Top Header */}
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <div>
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
          </Group>
          <Title order={2} style={{ color: '#800020', fontWeight: 700, marginTop: 4 }}>
            {isEditing ? `Edit Purchase` : 'New Purchase Invoice'}
          </Title>
          <Text size="sm" c="dimmed">
            Record supplier invoice, product quantities, and GST details.
          </Text>
        </div>

        <Badge
          size="md"
          variant="light"
          color={isIntraState ? 'teal' : 'blue'}
          radius="sm"
        >
          {isIntraState ? 'Intra-State GST (CGST + SGST)' : 'Inter-State GST (IGST)'}
        </Badge>
      </Group>

      {/* Invoice Details Card - Responsive and never cut off */}
      <Paper p="md" radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
        <Grid gutter="md" align="flex-start">
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Select
              label="Party / Supplier"
              placeholder="Select supplier ledger..."
              data={ledgerOptions}
              value={selectedLedgerId}
              onChange={(val) => setSelectedLedgerId(val ? String(val) : null)}
              searchable
              clearable
              required
              radius="md"
              size="sm"
              description={selectedSupplier?.GSTIN ? `GSTIN: ${selectedSupplier.GSTIN}` : undefined}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3, md: 2 }}>
            <TextInput
              label="Purchase No"
              value={purchaseNo}
              onChange={(e) => setPurchaseNo(e.currentTarget.value)}
              radius="md"
              size="sm"
              required
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3, md: 2 }}>
            <TextInput
              label="Purchase Date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.currentTarget.value)}
              radius="md"
              size="sm"
              required
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3, md: 2 }}>
            <TextInput
              label="Invoice No"
              placeholder="Supplier Inv No"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.currentTarget.value)}
              radius="md"
              size="sm"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 6, sm: 3, md: 2 }}>
            <TextInput
              label="Invoice Date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.currentTarget.value)}
              radius="md"
              size="sm"
            />
          </Grid.Col>
        </Grid>
      </Paper>

      {/* Main Items Table — mirrors PriceUpdatePage Paper + Table */}
      <Paper radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
        {isLoadingProducts ? (
          <Center py={60}><Loader color="burgundy" size="md" /></Center>
        ) : (
          <Table.ScrollContainer minWidth={980}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, width: 40, textAlign: 'center' }}>#</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 220 }}>Product</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 100 }}>Qty</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 100 }}>Alt Qty</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 70 }}>Unit</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 120 }}>Rate (₹)</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 120, textAlign: 'right' }}>Taxable (₹)</Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 110, textAlign: 'right' }}>
                    {isIntraState ? 'CGST (₹)' : 'IGST (₹)'}
                  </Table.Th>
                  {isIntraState && (
                    <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 110, textAlign: 'right' }}>SGST (₹)</Table.Th>
                  )}
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 130, textAlign: 'right' }}>Total (₹)</Table.Th>
                  <Table.Th style={{ width: 50 }} />
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {items.map((line, index) => (
                  <Table.Tr key={line.id}>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Text size="xs" fw={600} c="dimmed">{index + 1}</Text>
                    </Table.Td>

                    <Table.Td>
                      <Select
                        placeholder="Select product..."
                        data={productOptions}
                        value={line.ProductId ? String(line.ProductId) : null}
                        onChange={(val) => updateField(index, 'ProductId', val ? Number(val) : null)}
                        searchable
                        size="sm"
                        radius="sm"
                      />
                    </Table.Td>

                    <Table.Td>
                      <NumberInput
                        size="sm"
                        radius="sm"
                        min={0}
                        hideControls
                        value={line.Quantity}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(val) => updateField(index, 'Quantity', val)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (index === items.length - 1) addRow();
                          }
                        }}
                      />
                    </Table.Td>

                    <Table.Td>
                      <NumberInput
                        size="sm"
                        radius="sm"
                        min={0}
                        hideControls
                        value={line.AltQuantity}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(val) => updateField(index, 'AltQuantity', val)}
                      />
                    </Table.Td>

                    <Table.Td>
                      <Badge size="xs" variant="outline" color="gray">{line.UnitName || 'Nos'}</Badge>
                    </Table.Td>

                    <Table.Td>
                      <NumberInput
                        size="sm"
                        radius="sm"
                        min={0}
                        decimalScale={2}
                        hideControls
                        prefix="₹ "
                        value={line.Rate}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(val) => updateField(index, 'Rate', val)}
                        styles={{
                          input: {
                            fontWeight: 600,
                            backgroundColor: Number(line.Rate) > 0 ? '#fdf2f4' : '#ffffff',
                            borderColor: Number(line.Rate) > 0 ? '#800020' : '#cbd5e1',
                            color: '#0f172a',
                          },
                        }}
                      />
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text fw={600} size="sm" c="#334155">
                        ₹{line.TaxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>

                    {isIntraState ? (
                      <>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="sm" c="#334155" fw={500}>₹{line.CGSTAmount.toFixed(2)}</Text>
                          <Text size="10px" c="dimmed">@{line.CGSTPercent}%</Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="sm" c="#334155" fw={500}>₹{line.SGSTAmount.toFixed(2)}</Text>
                          <Text size="10px" c="dimmed">@{line.SGSTPercent}%</Text>
                        </Table.Td>
                      </>
                    ) : (
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" c="#800020" fw={500}>₹{line.IGSTAmount.toFixed(2)}</Text>
                        <Text size="10px" c="dimmed">@{line.IGSTPercent}%</Text>
                      </Table.Td>
                    )}

                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text fw={700} size="sm" c="#800020">
                        ₹{line.Total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'center' }}>
                      <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeRow(index)}>
                        <IconTrash size={15} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}

        {/* Add Row bar inside Paper */}
        <Group p="xs" px="md" style={{ borderTop: '1px solid #f1f5f9' }}>
          <Button
            size="xs"
            variant="subtle"
            color="burgundy"
            leftSection={<IconPlus size={14} />}
            onClick={addRow}
          >
            Add Row
          </Button>
          <Text size="xs" c="dimmed">Press <kbd style={{ fontFamily: 'monospace', fontSize: 11, backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>Enter</kbd> in Qty to add a new row.</Text>
        </Group>
      </Paper>

      {/* Bottom Footer — mirrors PriceUpdatePage footer */}
      <Group justify="space-between" align="flex-end" pt="xs" pb="md">
        {/* Left: notes + totals summary */}
        <Stack gap="xs" style={{ flex: 1, maxWidth: 480 }}>
          <Textarea
            placeholder="Notes / Vehicle / Transport details..."
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            rows={2}
            radius="md"
            size="sm"
          />
          <Group gap="xl">
            <div>
              <Text size="xs" c="dimmed">Total Qty</Text>
              <Text size="sm" fw={700} c="#1e293b">{totals.totalQty}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">Taxable</Text>
              <Text size="sm" fw={700} c="#1e293b">₹{totals.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </div>
            {isIntraState ? (
              <>
                <div>
                  <Text size="xs" c="dimmed">CGST</Text>
                  <Text size="sm" fw={700} c="#334155">₹{totals.totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">SGST</Text>
                  <Text size="sm" fw={700} c="#334155">₹{totals.totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                </div>
              </>
            ) : (
              <div>
                <Text size="xs" c="dimmed">IGST</Text>
                <Text size="sm" fw={700} c="#800020">₹{totals.totalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </div>
            )}
          </Group>
        </Stack>

        {/* Right: Grand Total + Save */}
        <Stack gap="xs" align="flex-end">
          <div style={{ textAlign: 'right' }}>
            <Text size="xs" c="dimmed">Round Off: ₹{totals.roundOff.toFixed(2)}</Text>
            <Divider my={4} />
            <Text size="xs" c="dimmed" fw={500}>Grand Total</Text>
            <Text fw={800} size="xl" c="#800020">
              ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
          </div>

          <Group gap="sm">
            <Button variant="default" size="sm" radius={10} onClick={() => navigate('/purchases')}>
              Cancel
            </Button>
            <Button
              color="burgundy"
              radius={10}
              size="sm"
              leftSection={<IconCurrencyRupee size={16} />}
              loading={saveMutation.isPending}
              disabled={items.every((i) => !i.ProductId)}
              onClick={() => saveMutation.mutate()}
            >
              Save Purchase Invoice
            </Button>
          </Group>
        </Stack>
      </Group>
    </Stack>
  );
};
