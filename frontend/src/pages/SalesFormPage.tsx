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
  ActionIcon,
  TextInput,
  Select,
  NumberInput,
  Textarea,
  Divider,
  Card,
  Box,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconPlus,
  IconTrashX,
  IconReceipt2,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';

interface SaleLineItem {
  Product: string;
  Quantity: number;
  EmptyQuantity: number;
  SalesPrice: number;
  TaxPercent: number;
  Total: number;
}

export const SalesFormPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [salesDate, setSalesDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [routeId, setRouteId] = useState<string>('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [notes, setNotes] = useState<string>('');
  const [totalEmptyQty, setTotalEmptyQty] = useState<number>(0);
  const [customGrandTotal, setCustomGrandTotal] = useState<number | ''>('');

  // 1. Fetch Routes (to select Point of Sale, defaults to Office Sale Point)
  const { data: routes = [] } = useQuery<any[]>({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await apiClient.get('/routes/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 2. Fetch Customers (Ledgers in Debtors group)
  const { data: ledgers = [] } = useQuery<any[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 3. Fetch Products
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // Product map
  const productMap = useMemo(() => {
    const map = new Map<number, any>();
    products.forEach((p: any) => map.set(p.ProductId, p));
    return map;
  }, [products]);

  // Route dropdown options
  const routeOptions = useMemo(() => {
    return routes.map((r: any) => ({
      value: String(r.RouteId),
      label: r.RouteName || `Route #${r.RouteId}`,
    }));
  }, [routes]);

  // Auto-select "Office Sale Point" or first route
  React.useEffect(() => {
    if (routes.length > 0 && !routeId) {
      const officeRoute = routes.find((r: any) =>
        (r.RouteName || '').toLowerCase().includes('office')
      );
      if (officeRoute) {
        setRouteId(String(officeRoute.RouteId));
      } else {
        setRouteId(String(routes[0].RouteId));
      }
    }
  }, [routes, routeId]);

  // Customer options
  const customerOptions = useMemo(() => {
    const debtors = ledgers.filter((l: any) => {
      const gName = (l.group_name || l.GroupName || '').toLowerCase();
      const gid = Number(l.GroupId ?? l.Group ?? 0);
      return gid === 21 || gName.includes('debtor') || gName.includes('customer');
    });

    const list = debtors.map((c: any) => ({
      value: String(c.LedgerId),
      label: `${c.LedgerName}${c.Mobile ? ` (${c.Mobile})` : ''}`,
    }));

    // Prepend Walk-in Cash Customer
    return [{ value: '', label: 'Walk-in Cash Customer' }, ...list];
  }, [ledgers]);

  // Product options
  const productOptions = useMemo(() => {
    return products
      .filter((p: any) => p.IsActive !== false)
      .map((p: any) => ({
        value: String(p.ProductId),
        label: `${p.ProductName} (Rate: ₹${Number(p.SalesPrice || 0).toFixed(2)})`,
        price: Number(p.SalesPrice || 0),
        tax: Number(p.GSTPercentage || 0),
      }));
  }, [products]);

  // Dynamic Line Items (starts unselected / empty by default)
  const [lines, setLines] = useState<SaleLineItem[]>([
    {
      Product: '',
      Quantity: 1,
      EmptyQuantity: 0,
      SalesPrice: 0,
      TaxPercent: 0,
      Total: 0,
    },
  ]);

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        Product: '',
        Quantity: 1,
        EmptyQuantity: 0,
        SalesPrice: 0,
        TaxPercent: 0,
        Total: 0,
      },
    ]);
  };

  const handleProductChange = (index: number, pId: string) => {
    const prod = productMap.get(Number(pId));
    const rate = prod ? Number(prod.SalesPrice || 0) : 0;
    const tax = prod ? Number(prod.GSTPercentage || 0) : 0;

    setLines((prev) =>
      prev.map((ln, i) =>
        i === index
          ? {
              ...ln,
              Product: pId,
              SalesPrice: rate,
              TaxPercent: tax,
              Total: Number((ln.Quantity * rate).toFixed(2)),
            }
          : ln
      )
    );
  };

  const handleQtyChange = (index: number, qty: number) => {
    setLines((prev) =>
      prev.map((ln, i) =>
        i === index
          ? {
              ...ln,
              Quantity: qty,
              Total: Number((qty * ln.SalesPrice).toFixed(2)),
            }
          : ln
      )
    );
  };

  const handleEmptyQtyChange = (index: number, emptyQty: number) => {
    setLines((prev) =>
      prev.map((ln, i) => (i === index ? { ...ln, EmptyQuantity: emptyQty } : ln))
    );
  };

  const handlePriceChange = (index: number, price: number) => {
    setLines((prev) =>
      prev.map((ln, i) =>
        i === index
          ? {
              ...ln,
              SalesPrice: price,
              Total: Number((ln.Quantity * price).toFixed(2)),
            }
          : ln
      )
    );
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) {
      notifications.show({ title: 'Validation', message: 'At least one product line is required.', color: 'red' });
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Live Totals Calculations
  const { subTotal, taxTotal, autoGrandTotal, totalCylindersDelivered } = useMemo(() => {
    let sub = 0;
    let tax = 0;
    let grand = 0;
    let deliv = 0;

    lines.forEach((ln) => {
      const gross = ln.Total || 0;
      const gst = ln.TaxPercent || 0;
      deliv += ln.Quantity || 0;

      if (gst > 0 && gross > 0) {
        const factor = 1 + gst / 100;
        const taxable = gross / factor;
        sub += taxable;
        tax += gross - taxable;
      } else {
        sub += gross;
      }
      grand += gross;
    });

    return {
      subTotal: sub,
      taxTotal: tax,
      autoGrandTotal: grand,
      totalCylindersDelivered: deliv,
    };
  }, [lines]);

  const finalGrandTotal = customGrandTotal !== '' ? Number(customGrandTotal) : autoGrandTotal;

  // Mutation: Create Sale
  const createSaleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/sales/', payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      notifications.show({
        title: 'Sale Invoice Created',
        message: `Invoice #${data.InvoiceNo || data.SalesNo} generated successfully.`,
        color: 'teal',
      });
      // Optionally prompt to print
      if (window.confirm('Sale recorded successfully! Would you like to view/print the GST Tax Invoice now?')) {
        const url = `${apiClient.defaults.baseURL}/sales/${data.SalesId}/invoice-pdf/`;
        window.open(url, '_blank');
      }
      navigate('/sales');
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error Creating Sale',
        message: err.response?.data?.detail || err.response?.data?.message || err.message || 'Could not save sale invoice.',
        color: 'red',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0 || !lines[0].Product) {
      notifications.show({ title: 'Validation', message: 'Please add at least one valid product line.', color: 'red' });
      return;
    }

    const payload = {
      SalesDate: salesDate,
      RouteId: routeId ? Number(routeId) : 1,
      CustomerLedger: customerId ? Number(customerId) : null,
      PaymentMethod: paymentMethod,
      Notes: notes.trim(),
      TotalEmptyQty: totalEmptyQty,
      GrandTotal: finalGrandTotal,
      lines: lines
        .filter((l) => l.Product)
        .map((l) => ({
          Product: Number(l.Product),
          Quantity: l.Quantity,
          EmptyQuantity: l.EmptyQuantity || 0,
          SalesPrice: l.SalesPrice,
          TaxPercent: l.TaxPercent,
          Total: l.Total,
        })),
    };

    createSaleMutation.mutate(payload);
  };

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* ── Top Header ── */}
      <Box pt={4} pb={2}>
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center" mb={4}>
              <Button
                variant="subtle"
                color="gray"
                size="compact-sm"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => navigate('/sales')}
                style={{ paddingLeft: 0 }}
              >
                Back to Sales
              </Button>
            </Group>
            <Title order={2} style={{ color: '#800020', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em' }}>
              New Sale Invoice
            </Title>
            <Text size="xs" c="dimmed" mt={2}>
              Generate direct office sale or route vehicle invoice with official GST calculation
            </Text>
          </div>
        </Group>
      </Box>

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* ── Top Parameters Card ── */}
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              <TextInput
                label="Sales Date"
                type="date"
                required
                value={salesDate}
                onChange={(e) => setSalesDate(e.currentTarget.value)}
              />

              <Select
                label="Route / Point of Sale"
                placeholder="Choose Point of Sale..."
                data={routeOptions}
                value={routeId}
                onChange={(val) => val && setRouteId(val)}
                searchable
                required
              />

              <Select
                label="Customer / Buyer"
                placeholder="Choose Customer..."
                data={customerOptions}
                value={customerId}
                onChange={(val) => setCustomerId(val)}
                searchable
                clearable
              />

              <Select
                label="Payment Method"
                data={[
                  { value: 'CASH', label: 'Cash' },
                  { value: 'UPI', label: 'UPI / Bank Transfer' },
                ]}
                value={paymentMethod}
                onChange={(val) => val && setPaymentMethod(val)}
                required
              />
            </SimpleGrid>
          </Paper>

          {/* ── Line Items Card ── */}
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Group justify="space-between" align="center" mb="sm">
              <Text fw={700} size="sm" c="#475569" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                Delivered Products &amp; Cylinders ({lines.length})
              </Text>

              <Button
                size="compact-sm"
                variant="light"
                color="burgundy"
                leftSection={<IconPlus size={14} />}
                onClick={handleAddLine}
              >
                Add Item
              </Button>
            </Group>

            <Table.ScrollContainer minWidth={700}>
              <Table verticalSpacing="xs">
                <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                  <Table.Tr>
                    <Table.Th style={{ fontSize: 11, width: '40%' }}>PRODUCT</Table.Th>
                    <Table.Th style={{ fontSize: 11, textAlign: 'center', width: 90 }}>QTY</Table.Th>
                    <Table.Th style={{ fontSize: 11, textAlign: 'center', width: 100 }}>EMPTY RET.</Table.Th>
                    <Table.Th style={{ fontSize: 11, textAlign: 'right', width: 130 }}>PRICE (₹)</Table.Th>
                    <Table.Th style={{ fontSize: 11, textAlign: 'right', width: 80 }}>GST %</Table.Th>
                    <Table.Th style={{ fontSize: 11, textAlign: 'right', width: 130 }}>LINE TOTAL (₹)</Table.Th>
                    <Table.Th style={{ width: 40 }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {lines.map((ln, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td>
                        <Select
                          placeholder="Select product..."
                          data={productOptions}
                          value={ln.Product}
                          onChange={(val) => val && handleProductChange(idx, val)}
                          searchable
                          size="xs"
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          hideControls
                          min={1}
                          value={ln.Quantity}
                          onChange={(val) => handleQtyChange(idx, Number(val) || 1)}
                          size="xs"
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          hideControls
                          min={0}
                          value={ln.EmptyQuantity}
                          onChange={(val) => handleEmptyQtyChange(idx, Number(val) || 0)}
                          size="xs"
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          hideControls
                          min={0}
                          decimalScale={2}
                          value={ln.SalesPrice}
                          onChange={(val) => handlePriceChange(idx, Number(val) || 0)}
                          size="xs"
                        />
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="xs" fw={600} style={{ paddingRight: 8 }}>
                          {ln.TaxPercent}%
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={700} style={{ color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                          ₹{ln.Total.toFixed(2)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          size="sm"
                          onClick={() => handleRemoveLine(idx)}
                        >
                          <IconTrashX size={15} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Paper>

          {/* ── Summary & Actions ── */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Card p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" mb="xs">
                Additional Delivery Notes
              </Text>
              <Textarea
                placeholder="Remarks, vehicle log, customer PO reference..."
                minRows={3}
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
              />

              <NumberInput
                hideControls
                label="Total Empty Cylinders Collected (Shift Return)"
                min={0}
                value={totalEmptyQty}
                onChange={(val) => setTotalEmptyQty(Number(val) || 0)}
                mt="md"
              />
            </Card>

            <Paper p="md" radius="md" style={{ backgroundColor: '#fdf2f4', border: '1px solid #fce7ec' }}>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Total Delivered Units:
                  </Text>
                  <Text size="xs" fw={700}>
                    {totalCylindersDelivered} unit{totalCylindersDelivered !== 1 ? 's' : ''}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Taxable Subtotal:
                  </Text>
                  <Text size="xs" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    ₹{subTotal.toFixed(2)}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Total GST Amount (CGST + SGST):
                  </Text>
                  <Text size="xs" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    ₹{taxTotal.toFixed(2)}
                  </Text>
                </Group>
                <Divider my={4} color="#fce7ec" />
                <Group justify="space-between" align="center">
                  <Text size="sm" fw={800} style={{ color: '#800020' }}>
                    Grand Total (₹):
                  </Text>
                  <NumberInput
                    hideControls
                    size="sm"
                    decimalScale={2}
                    value={customGrandTotal !== '' ? customGrandTotal : autoGrandTotal}
                    onChange={(val) => setCustomGrandTotal(val !== '' ? Number(val) : '')}
                    style={{ width: 160 }}
                    styles={{
                      input: {
                        fontWeight: 800,
                        color: '#800020',
                        fontSize: 18,
                        textAlign: 'right',
                      },
                    }}
                  />
                </Group>

                <Group justify="flex-end" mt="md" gap="sm">
                  <Button variant="default" onClick={() => navigate('/sales')}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={createSaleMutation.isPending}
                    leftSection={<IconReceipt2 size={16} />}
                    style={{ backgroundColor: '#800020', fontWeight: 700 }}
                  >
                    Save &amp; Generate Invoice
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>
      </form>
    </Stack>
  );
};

export default SalesFormPage;
