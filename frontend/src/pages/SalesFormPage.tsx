import React, { useState, useMemo, useEffect } from 'react';
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
  Select,
  NumberInput,
  Textarea,
  Divider,
  Card,
  Box,
  Badge,
  Modal,
  Switch,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconPlus,
  IconTrashX,
  IconReceipt2,
  IconPackage,
  IconPrinter,
  IconCheck,
  IconCash,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DateInputDDMMYY } from '../components/DateInputDDMMYY';

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
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const queryClient = useQueryClient();

  const [salesDate, setSalesDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [routeId, setRouteId] = useState<string>('');
  const [godownId, setGodownId] = useState<string>('1');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedConnectionPackage, setSelectedConnectionPackage] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [splitCashAmount, setSplitCashAmount] = useState<number | ''>('');
  const [splitUpiAmount, setSplitUpiAmount] = useState<number | ''>('');
  const [amountPaidNow, setAmountPaidNow] = useState<number | ''>('');
  const [isPaidUserEdited, setIsPaidUserEdited] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [totalEmptyQty, setTotalEmptyQty] = useState<number>(0);
  const [customGrandTotal, setCustomGrandTotal] = useState<number | ''>('');

  // Post-sale completion modal state
  const [completionModalOpened, setCompletionModalOpened] = useState(false);
  const [createdSaleData, setCreatedSaleData] = useState<any | null>(null);

  // 0. Fetch Sale Data if editing
  const { data: existingSale } = useQuery<any>({
    queryKey: ['sale', id],
    queryFn: async () => {
      const res = await apiClient.get(`/sales/${id}/`);
      return res.data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingSale) {
      if (existingSale.SalesDate) setSalesDate(existingSale.SalesDate.split('T')[0]);
      if (existingSale.InvoiceNo || existingSale.SalesNo) setInvoiceNo(existingSale.InvoiceNo || existingSale.SalesNo);
      if (existingSale.CustomerLedger) setCustomerId(String(existingSale.CustomerLedger));
      if (existingSale.RouteVehicleDriver) setRouteId(String(existingSale.RouteVehicleDriver));
      if (existingSale.Notes) setNotes(existingSale.Notes);
      if (existingSale.PaymentMethod) {
        setPaymentMethod(existingSale.PaymentMethod.toUpperCase());
      }
      if (existingSale.PaymentMethod?.toUpperCase() === 'SPLIT') {
        const cVal = Number(existingSale.cash_amount || 0);
        const uVal = Number(existingSale.upi_amount || 0);
        setSplitCashAmount(cVal > 0 ? cVal : '');
        setSplitUpiAmount(uVal > 0 ? uVal : '');
      }
      if (existingSale.PaidAmount !== undefined && existingSale.PaidAmount !== null) {
        setAmountPaidNow(Number(existingSale.PaidAmount));
        setIsPaidUserEdited(true);
      }
      if (existingSale.TotalEmptyQty) setTotalEmptyQty(Number(existingSale.TotalEmptyQty));
      if (Array.isArray(existingSale.lines) && existingSale.lines.length > 0) {
        setLines(
          existingSale.lines.map((l: any) => ({
            Product: String(l.Product || l.ProductId || ''),
            Quantity: Number(l.Quantity || 1),
            EmptyQuantity: Number(l.EmptyQuantity || 0),
            SalesPrice: Number(l.SalesPrice || 0),
            TaxPercent: Number(l.TaxPercent || 0),
            Total: Number(l.Total || (Number(l.Quantity || 1) * Number(l.SalesPrice || 0))),
          }))
        );
      }
    }
  }, [existingSale]);

  // 1. Fetch Routes (to select Point of Sale, defaults to Office Sale Point)
  const { data: routes = [] } = useQuery<any[]>({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await apiClient.get('/routes/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 1b. Fetch Godowns (to select dispensing warehouse depot)
  const { data: godowns = [] } = useQuery<any[]>({
    queryKey: ['godowns'],
    queryFn: async () => {
      const res = await apiClient.get('/godowns/');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // 1c. Fetch Connection Packages
  const { data: connectionPackages = [] } = useQuery<any[]>({
    queryKey: ['connection-packages'],
    queryFn: async () => {
      const res = await apiClient.get('/connection-packages/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
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

  // 3b. Fetch Live Stock based on selected Godown
  const { data: dispensingStock = [] } = useQuery<any[]>({
    queryKey: ['godown-stock', godownId],
    queryFn: async () => {
      const res = await apiClient.get(`/delivery-notes/godown-stock/?godown_id=${godownId}`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const stockByProductMap = useMemo(() => {
    const map = new Map<number, number>();
    dispensingStock.forEach((item: any) => {
      map.set(Number(item.ProductId), Number(item.AvailableGodownQty || 0));
    });
    return map;
  }, [dispensingStock]);

  // 4. Fetch Customer Special Prices if customer is selected
  const { data: customerSpecialPrices = [] } = useQuery<any[]>({
    queryKey: ['customer-prices', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const res = await apiClient.get(`/customer-prices/?customer=${customerId}`);
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
    enabled: !!customerId,
  });

  const customerPriceMap = useMemo(() => {
    const map = new Map<number, number>();
    customerSpecialPrices.forEach((cp: any) => {
      if (cp.SpecialPrice !== undefined && cp.SpecialPrice !== null) {
        map.set(Number(cp.Product), Number(cp.SpecialPrice));
      }
    });
    return map;
  }, [customerSpecialPrices]);

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

  // Customer options (Direct customer ledgers only - no walk-in item)
  const customerOptions = useMemo(() => {
    const debtors = ledgers.filter((l: any) => {
      const gName = (l.group_name || l.GroupName || '').toLowerCase();
      const gid = Number(l.GroupId ?? l.Group ?? 0);
      return gid === 21 || gName.includes('debtor') || gName.includes('customer');
    });

    return debtors.map((c: any) => ({
      value: String(c.LedgerId),
      label: `${c.LedgerName}${c.Mobile ? ` (${c.Mobile})` : ''}`,
    }));
  }, [ledgers]);

  // Handle applying a Connection Package into line items
  const handleApplyConnectionPackage = (pkgId: string | null) => {
    setSelectedConnectionPackage(pkgId);
    if (!pkgId) return;

    const pkg = connectionPackages.find((p: any) => String(p.PackageId) === pkgId);
    if (!pkg) return;

    const newLines: SaleLineItem[] = [];

    // 1. Primary Cylinder
    if (pkg.CylinderProduct) {
      const cProd = productMap.get(Number(pkg.CylinderProduct));
      const cRate = Number(pkg.CylinderRate || cProd?.SalesPrice || 0);
      const cQty = Number(pkg.CylinderQty || 1);
      newLines.push({
        Product: String(pkg.CylinderProduct),
        Quantity: cQty,
        EmptyQuantity: 0,
        SalesPrice: cRate,
        TaxPercent: Number(cProd?.GSTPercentage || 0),
        Total: Number((cQty * cRate).toFixed(2)),
      });
    }

    // 2. Bundled Accessories
    (pkg.items || []).forEach((it: any) => {
      const aProd = productMap.get(Number(it.Product));
      const aRate = Number(it.UnitPrice || aProd?.SalesPrice || 0);
      const aQty = Number(it.Quantity || 1);
      newLines.push({
        Product: String(it.Product),
        Quantity: aQty,
        EmptyQuantity: 0,
        SalesPrice: aRate,
        TaxPercent: Number(aProd?.GSTPercentage || 0),
        Total: Number((aQty * aRate).toFixed(2)),
      });
    });

    if (newLines.length > 0) {
      setLines(newLines);
      if (!notes) {
        setNotes(`New Connection: ${pkg.PackageName}`);
      }
      notifications.show({
        title: 'Connection Package Applied',
        message: `Loaded ${pkg.PackageName} (${newLines.length} items) at ₹${Number(pkg.TotalAmount || 0).toFixed(2)}.`,
        color: 'burgundy',
      });
    }
  };

  // Product options (incorporating Customer-Specific Rates & Live Stock)
  const productOptions = useMemo(() => {
    return products
      .filter((p: any) => p.IsActive !== false)
      .map((p: any) => {
        const specialRate = customerPriceMap.get(p.ProductId);
        const hasSpecial = specialRate !== undefined && specialRate > 0;
        const effectiveRate = hasSpecial ? specialRate : Number(p.SalesPrice || 0);
        const availStock = stockByProductMap.get(p.ProductId) ?? 0;

        return {
          value: String(p.ProductId),
          label: p.ProductName,
          displayLabel: `${p.ProductName} • ₹${effectiveRate.toFixed(2)} (Stock: ${availStock})`,
          price: effectiveRate,
          tax: Number(p.GSTPercentage || 0),
          stock: availStock,
        };
      });
  }, [products, customerPriceMap, stockByProductMap]);

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
    const specialRate = customerPriceMap.get(Number(pId));
    const rate = specialRate !== undefined && specialRate > 0 ? specialRate : (prod ? Number(prod.SalesPrice || 0) : 0);
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

  // Automatically update prices on existing lines if customer changes
  useEffect(() => {
    setLines((prev) =>
      prev.map((ln) => {
        if (!ln.Product) return ln;
        const pId = Number(ln.Product);
        const prod = productMap.get(pId);
        const specialRate = customerPriceMap.get(pId);
        const rate = specialRate !== undefined && specialRate > 0 ? specialRate : (prod ? Number(prod.SalesPrice || 0) : 0);
        return {
          ...ln,
          SalesPrice: rate,
          Total: Number((ln.Quantity * rate).toFixed(2)),
        };
      })
    );
  }, [customerPriceMap, productMap]);

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

  // Fetch Customer Available Advance Balance
  const { data: customerAdvanceData } = useQuery({
    queryKey: ['customer-advance', customerId],
    queryFn: async () => {
      if (!customerId) return { available_advance: 0 };
      const res = await apiClient.get(`/ledgers/${customerId}/advance-balance/`);
      return res.data;
    },
    enabled: !!customerId,
  });

  const availableAdvance = Number(customerAdvanceData?.available_advance || 0);
  const [applyAdvance, setApplyAdvance] = useState(false);

  useEffect(() => {
    if (availableAdvance > 0) {
      setApplyAdvance(true);
    } else {
      setApplyAdvance(false);
    }
  }, [availableAdvance, customerId]);

  const finalGrandTotal = customGrandTotal !== '' ? Number(customGrandTotal) : autoGrandTotal;
  const advanceAdjustAmount = applyAdvance ? Math.min(availableAdvance, finalGrandTotal) : 0;
  const netAfterAdvance = Math.max(0, finalGrandTotal - advanceAdjustAmount);

  const paidVal = Number(amountPaidNow !== '' ? amountPaidNow : (paymentMethod === 'CREDIT' ? 0 : netAfterAdvance));
  const balanceDue = Math.max(0, finalGrandTotal - paidVal - advanceAdjustAmount);

  useEffect(() => {
    // Auto-sync amountPaidNow to net remaining amount if CASH/UPI, user hasn't manually edited
    if (!isPaidUserEdited) {
      if (paymentMethod === 'CREDIT') {
        setAmountPaidNow(0);
      } else {
        setAmountPaidNow(netAfterAdvance > 0 ? netAfterAdvance : 0);
      }
    }
  }, [netAfterAdvance, paymentMethod, isPaidUserEdited]);

  // Mutation: Apply Advance against Invoice
  const applyAdvanceMutation = useMutation({
    mutationFn: async (salesId: number) => {
      const res = await apiClient.post(`/sales/${salesId}/apply-advance/`);
      return res.data;
    },
    onSuccess: (data: any) => {
      notifications.show({
        title: 'Advance Applied',
        message: data.message || 'Customer advance applied successfully.',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['customer-advance', customerId] });
      if (createdSaleData) {
        setCreatedSaleData({
          ...createdSaleData,
          PaidAmount: data.paid_amount,
        });
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to apply advance.';
      notifications.show({
        title: 'Error',
        message: msg,
        color: 'red',
      });
    },
  });

  // Mutation: Create Sale
  const createSaleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/sales/', payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['stock-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['godowns'] });
      queryClient.invalidateQueries({ queryKey: ['van-stock'] });
      queryClient.invalidateQueries({ queryKey: ['godown-stock'] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-advance', customerId] });
      notifications.show({
        title: 'Sale Invoice Created',
        message: `Invoice #${data.InvoiceNo || data.SalesNo} generated successfully.`,
        color: 'teal',
      });
      // Store created sale and open post-action modal instead of window.confirm
      setCreatedSaleData(data);
      setCompletionModalOpened(true);
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error Creating Sale',
        message: err.response?.data?.detail || err.response?.data?.message || err.message || 'Could not save sale invoice.',
        color: 'red',
      });
    },
  });

  // Mutation: Update Sale
  const updateSaleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.put(`/sales/${id}/`, payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['stock-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['godowns'] });
      queryClient.invalidateQueries({ queryKey: ['van-stock'] });
      queryClient.invalidateQueries({ queryKey: ['godown-stock'] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-advance', customerId] });
      queryClient.invalidateQueries({ queryKey: ['sale', id] });
      notifications.show({
        title: 'Sale Invoice Updated',
        message: `Invoice #${data.InvoiceNo || data.SalesNo} updated successfully.`,
        color: 'teal',
      });
      navigate('/sales');
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error Updating Sale',
        message: err.response?.data?.detail || err.response?.data?.message || err.message || 'Could not update sale invoice.',
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

    const cashVal = Number(splitCashAmount || 0);
    const upiVal = Number(splitUpiAmount || 0);
    const splitTotal = cashVal + upiVal;
    const paidNowAmount = paymentMethod === 'SPLIT'
      ? (splitTotal > 0 ? splitTotal : netAfterAdvance)
      : (amountPaidNow !== '' ? Number(amountPaidNow) : (paymentMethod === 'CREDIT' ? 0 : netAfterAdvance));

    const payload = {
      SalesDate: salesDate,
      RouteId: routeId ? Number(routeId) : 1,
      godown_id: Number(godownId) || 1,
      CustomerLedger: customerId ? Number(customerId) : null,
      PaymentMethod: paymentMethod,
      cash_amount: paymentMethod === 'SPLIT' ? cashVal : undefined,
      upi_amount: paymentMethod === 'SPLIT' ? upiVal : undefined,
      advance_to_adjust: advanceAdjustAmount,
      PaidNow: paidNowAmount,
      PaidAmount: paidNowAmount + advanceAdjustAmount,
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

    if (isEditing) {
      updateSaleMutation.mutate(payload);
    } else {
      createSaleMutation.mutate(payload);
    }
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
                Sales & Invoices
              </Button>
            </Group>
            <Title order={2} style={{ color: '#800020', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em' }}>
              {isEditing ? `Edit Sale Invoice — ${invoiceNo || `#${id}`}` : 'New Sale Invoice'}
            </Title>
            <Text size="xs" c="dimmed" mt={2}>
              {isEditing
                ? 'Modify customer, line items, rates, taxes, and payment settlements'
                : 'Generate direct office sale or route vehicle invoice with official GST calculation'}
            </Text>
          </div>
        </Group>
      </Box>

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* ── Top Parameters Card ── */}
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
              <DateInputDDMMYY
                label="Sales Date"
                required
                value={salesDate}
                onChange={(val) => setSalesDate(val)}
              />

              <Select
                label="Dispensing Godown"
                data={godowns.map((g: any) => ({
                  value: String(g.GodownId),
                  label: `${g.GodownName}${g.IsCentral ? ' (Central)' : ''}`,
                }))}
                value={godownId}
                onChange={(val) => val && setGodownId(val)}
                required
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
                placeholder="Search & select customer..."
                data={customerOptions}
                value={customerId}
                onChange={(val) => {
                  setCustomerId(val);
                  setIsPaidUserEdited(false);
                }}
                searchable
                clearable
                required
              />

              <Select
                label="Payment Method"
                data={[
                  { value: 'CASH', label: 'Cash Payment' },
                  { value: 'UPI', label: 'UPI / Bank Transfer' },
                  { value: 'SPLIT', label: 'Split Payment (Cash + UPI)' },
                  { value: 'CREDIT', label: 'Credit (Unpaid / On Account)' },
                ]}
                value={paymentMethod}
                onChange={(val) => {
                  if (val) {
                    setPaymentMethod(val);
                    if (val === 'SPLIT' && netAfterAdvance > 0) {
                      const half = Math.round(netAfterAdvance / 2);
                      setSplitCashAmount(half);
                      setSplitUpiAmount(netAfterAdvance - half);
                    }
                  }
                }}
                required
              />
            </SimpleGrid>

            {paymentMethod === 'SPLIT' && (
              <SimpleGrid cols={{ base: 1, sm: 2 }} mt="sm" p="sm" style={{ backgroundColor: '#fdf2f4', borderRadius: 8, border: '1px solid #f5c2cb' }}>
                <NumberInput
                  label="Split Cash Portion (₹)"
                  placeholder="0.00"
                  min={0}
                  decimalScale={2}
                  value={splitCashAmount}
                  onChange={(val) => {
                    const num = typeof val === 'number' ? val : 0;
                    setSplitCashAmount(val as any);
                    if (netAfterAdvance > 0) {
                      setSplitUpiAmount(Math.max(0, netAfterAdvance - num));
                    }
                  }}
                  required
                />
                <NumberInput
                  label="Split UPI / Bank Portion (₹)"
                  placeholder="0.00"
                  min={0}
                  decimalScale={2}
                  value={splitUpiAmount}
                  onChange={(val) => {
                    const num = typeof val === 'number' ? val : 0;
                    setSplitUpiAmount(val as any);
                    if (netAfterAdvance > 0) {
                      setSplitCashAmount(Math.max(0, netAfterAdvance - num));
                    }
                  }}
                  required
                />
              </SimpleGrid>
            )}

            {availableAdvance > 0 && (
              <Paper p="sm" px="md" radius="sm" withBorder mt="sm" style={{ backgroundColor: '#fdf8f9', borderColor: '#f2ccd3' }}>
                <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                  <div>
                    <Group gap="xs">
                      <Badge color="burgundy" variant="light" size="sm">Available Advance: ₹{availableAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Badge>
                      <Text size="xs" fw={700} c="#800020">
                        {applyAdvance
                          ? `₹${advanceAdjustAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} will be adjusted against this bill`
                          : 'Customer has unallocated advance balance.'}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" mt={2}>
                      Standard ERP adjustment: Links directly to this bill without editing past bank entries.
                    </Text>
                  </div>
                  <Switch
                    label="Apply Advance to Bill"
                    checked={applyAdvance}
                    onChange={(event) => setApplyAdvance(event.currentTarget.checked)}
                    color="burgundy"
                    size="sm"
                  />
                </Group>
              </Paper>
            )}
          </Paper>

          {/* ── Line Items Card ── */}
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            {/* Quick Connection Package Autofill Banner */}
            {connectionPackages.length > 0 && (
              <Paper p="xs" px="sm" radius="sm" withBorder mb="md" style={{ backgroundColor: '#fcf8f9', borderColor: '#f7d6dc' }}>
                <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                  <Group gap="xs">
                    <IconPackage size={17} color="#800020" />
                    <div>
                      <Text size="xs" fw={700} c="#800020">
                        Select Connection Package Bundle:
                      </Text>
                      <Text size="11px" c="dimmed">
                        Auto-fills cylinder and bundled accessories at tariff price
                      </Text>
                    </div>
                  </Group>
                  <Select
                    size="xs"
                    placeholder="Choose connection package to auto-fill..."
                    data={connectionPackages
                      .filter((p: any) => p.IsActive !== false)
                      .map((pkg: any) => ({
                        value: String(pkg.PackageId),
                        label: `${pkg.PackageName} (₹${Number(pkg.TotalAmount || 0).toFixed(2)})`,
                      }))}
                    value={selectedConnectionPackage}
                    onChange={handleApplyConnectionPackage}
                    clearable
                    searchable
                    style={{ minWidth: 280 }}
                  />
                </Group>
              </Paper>
            )}

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
                          data={productOptions.map((opt) => ({
                            value: opt.value,
                            label: opt.label,
                          }))}
                          value={ln.Product}
                          onChange={(val) => val && handleProductChange(idx, val)}
                          searchable
                          size="xs"
                          renderOption={({ option }) => {
                            const opt = productOptions.find((p) => p.value === option.value);
                            const stock = opt?.stock ?? 0;
                            const price = opt?.price ?? 0;
                            return (
                              <Group justify="space-between" wrap="nowrap" style={{ width: '100%' }}>
                                <Text size="xs" fw={600}>{option.label}</Text>
                                <Group gap={8} wrap="nowrap">
                                  <Text size="xs" c="dimmed">₹{price.toFixed(2)}</Text>
                                  <Badge
                                    size="xs"
                                    variant="light"
                                    color={stock > 0 ? 'burgundy' : 'gray'}
                                    styles={{
                                      root: {
                                        backgroundColor: stock > 0 ? '#fdf2f4' : '#f1f5f9',
                                        color: stock > 0 ? '#800020' : '#94a3b8',
                                        fontWeight: 700,
                                      },
                                    }}
                                  >
                                    Stock: {stock}
                                  </Badge>
                                </Group>
                              </Group>
                            );
                          }}
                          rightSection={
                            ln.Product ? (
                              <Group gap={6} mr="xs" wrap="nowrap">
                                <Text size="11px" c="dimmed">
                                  ₹{(productOptions.find((p) => p.value === ln.Product)?.price ?? 0).toFixed(2)}
                                </Text>
                                <Badge
                                  size="xs"
                                  variant="light"
                                  styles={{
                                    root: {
                                      backgroundColor: '#fdf2f4',
                                      color: '#800020',
                                      fontWeight: 700,
                                      padding: '0 6px',
                                      height: 18,
                                    },
                                  }}
                                >
                                  Stock: {stockByProductMap.get(Number(ln.Product)) ?? 0}
                                </Badge>
                              </Group>
                            ) : null
                          }
                          rightSectionWidth={ln.Product ? 145 : undefined}
                          rightSectionPointerEvents="none"
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
                    placeholder="0.00"
                    value={customGrandTotal !== '' ? customGrandTotal : (autoGrandTotal > 0 ? autoGrandTotal : '')}
                    onChange={(val) => {
                      const nextVal = val !== '' ? Number(val) : '';
                      setCustomGrandTotal(nextVal);
                    }}
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

                <Group justify="space-between" align="center">
                  <Text size="xs" c="dimmed" fw={600}>
                    Amount Paid Now (₹):
                  </Text>
                  <NumberInput
                    hideControls
                    size="sm"
                    decimalScale={2}
                    min={0}
                    placeholder="0.00"
                    value={amountPaidNow !== '' ? amountPaidNow : ''}
                    onChange={(val) => {
                      setIsPaidUserEdited(true);
                      setAmountPaidNow(val !== '' ? Number(val) : '');
                    }}
                    style={{ width: 160 }}
                    styles={{
                      input: {
                        fontWeight: 800,
                        fontSize: 18,
                        textAlign: 'right',
                        borderColor: '#cbd5e1',
                      },
                    }}
                  />
                </Group>

                <Group justify="space-between" align="center">
                  <Text size="xs" fw={700} c={balanceDue > 0 ? 'red.7' : 'teal.7'}>
                    Balance Due / Pending (₹):
                  </Text>
                  <Text size="sm" fw={800} c={balanceDue > 0 ? 'red.7' : 'teal.7'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    ₹{balanceDue.toFixed(2)}
                  </Text>
                </Group>
                {balanceDue > 0 && (
                  <Text size="11px" c="dimmed" ta="right">
                    Pending bill will appear in Billwise Allocation for receipt collection.
                  </Text>
                )}

                <Group justify="flex-end" mt="md" gap="sm">
                  <Button variant="default" onClick={() => navigate('/sales')}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={createSaleMutation.isPending || updateSaleMutation.isPending}
                    leftSection={<IconReceipt2 size={16} />}
                    style={{ backgroundColor: '#800020', fontWeight: 700 }}
                  >
                    {isEditing ? 'Save Changes & Update Invoice' : 'Save & Generate Invoice'}
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>
      </form>

      {/* Post-Sale Action Modal */}
      <Modal
        opened={completionModalOpened}
        onClose={() => {
          setCompletionModalOpened(false);
          navigate('/sales');
        }}
        title={
          <Group gap={8}>
            <Box
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: '#fdf2f4',
                color: '#800020',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconCheck size={18} stroke={2.5} />
            </Box>
            <Text fw={700} size="md" c="#800020">
              Sale Recorded Successfully
            </Text>
          </Group>
        }
        centered
        radius="md"
        padding="lg"
        overlayProps={{ blur: 2, backgroundOpacity: 0.35 }}
      >
        <Stack gap="md">
          <Paper p="sm" radius="md" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">Invoice Reference</Text>
              <Text size="xs" fw={700} c="#0f172a">
                {createdSaleData?.InvoiceNo || createdSaleData?.SalesNo || 'INV-NEW'}
              </Text>
            </Group>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">Customer</Text>
              <Text size="xs" fw={700} c="#0f172a">
                {customerOptions.find((c) => c.value === String(customerId))?.label || 'Selected Customer'}
              </Text>
            </Group>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">Invoice Total</Text>
              <Text size="xs" fw={700} c="#0f172a">
                ₹{Number(createdSaleData?.GrandTotal || finalGrandTotal).toFixed(2)}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">Balance Due</Text>
              <Text
                size="xs"
                fw={800}
                c={
                  Number(createdSaleData?.BalanceAmount ?? (finalGrandTotal - (amountPaidNow !== '' ? Number(amountPaidNow) : 0))) > 0
                    ? '#800020'
                    : 'teal.7'
                }
              >
                ₹{Number(createdSaleData?.BalanceAmount ?? (finalGrandTotal - (amountPaidNow !== '' ? Number(amountPaidNow) : 0))).toFixed(2)}
              </Text>
            </Group>
          </Paper>

          <Text size="xs" c="dimmed">
            Choose your next action for this transaction:
          </Text>

          <Stack gap="xs">
            {/* If bill has balance due and customer has available advance, offer 1-click Apply Advance */}
            {Number(createdSaleData?.GrandTotal || finalGrandTotal) > Number(createdSaleData?.PaidAmount || 0) && availableAdvance > 0 && (
              <Button
                variant="filled"
                fullWidth
                color="burgundy"
                leftSection={<IconCheck size={16} />}
                loading={applyAdvanceMutation.isPending}
                styles={{ root: { backgroundColor: '#800020', fontWeight: 700, height: 42 } }}
                onClick={() => {
                  if (createdSaleData?.SalesId) {
                    applyAdvanceMutation.mutate(createdSaleData.SalesId);
                  }
                }}
              >
                Apply Advance (₹{Math.min(availableAdvance, Number(createdSaleData?.GrandTotal || finalGrandTotal) - Number(createdSaleData?.PaidAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })})
              </Button>
            )}

            {/* Action 1: Record Receipt Now */}
            {Number(createdSaleData?.GrandTotal || finalGrandTotal) > Number(createdSaleData?.PaidAmount || 0) && (
              <Button
                variant="light"
                color="burgundy"
                fullWidth
                leftSection={<IconCash size={16} />}
                styles={{
                  root: {
                    backgroundColor: '#fdf2f4',
                    color: '#800020',
                    borderColor: '#fce7ec',
                    fontWeight: 600,
                    height: 42,
                  },
                }}
                onClick={() => {
                  setCompletionModalOpened(false);
                  const custParam = customerId ? `&party_id=${customerId}` : '';
                  const saleParam = createdSaleData?.SalesId ? `&sale_id=${createdSaleData.SalesId}` : '';
                  const bal = Number(createdSaleData?.GrandTotal || finalGrandTotal) - Number(createdSaleData?.PaidAmount || 0);
                  const amtParam = bal > 0 ? `&amount=${bal}` : '';
                  navigate(`/receipts/new?return_to=sales${custParam}${saleParam}${amtParam}&auto_open_alloc=true`);
                }}
              >
                Add Cash / Bank Receipt Now
              </Button>
            )}

            {/* Action 2: View / Print GST Invoice */}
            <Button
              variant="outline"
              color="gray"
              fullWidth
              leftSection={<IconPrinter size={16} />}
              styles={{
                root: {
                  color: '#0f172a',
                  borderColor: '#cbd5e1',
                  fontWeight: 600,
                  height: 42,
                },
              }}
              onClick={() => {
                if (createdSaleData?.SalesId) {
                  const url = `${apiClient.defaults.baseURL}/sales/${createdSaleData.SalesId}/invoice-pdf/?_t=${Date.now()}`;
                  window.open(url, '_blank');
                }
              }}
            >
              Generate GST Invoice PDF
            </Button>

            {/* Action 3: Close / Done */}
            <Button
              variant="subtle"
              color="gray"
              fullWidth
              styles={{
                root: {
                  color: '#64748b',
                  fontWeight: 500,
                  height: 36,
                },
              }}
              onClick={() => {
                setCompletionModalOpened(false);
                navigate('/sales');
              }}
            >
              Close &amp; Return to Sales
            </Button>
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default SalesFormPage;
