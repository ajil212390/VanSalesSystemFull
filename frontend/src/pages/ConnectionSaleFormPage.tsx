import React, { useState, useMemo, useEffect } from 'react';
import {
  Title,
  Text,
  Paper,
  SimpleGrid,
  Group,
  Stack,
  Button,
  Badge,
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
  IconPackage,
  IconFlame,
  IconTools,
  IconReceipt2,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';

export const ConnectionSaleFormPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [salesDate, setSalesDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState<string>('');
  const [godownId, setGodownId] = useState<string>('1');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [notes, setNotes] = useState<string>('');
  const [customTotal, setCustomTotal] = useState<number | ''>('');

  // 1. Fetch Connection Packages
  const { data: packages = [], isLoading: isLoadingPackages } = useQuery<any[]>({
    queryKey: ['connection-packages'],
    queryFn: async () => {
      const res = await apiClient.get('/connection-packages/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 2. Fetch Godowns
  const { data: godowns = [] } = useQuery<any[]>({
    queryKey: ['godowns'],
    queryFn: async () => {
      const res = await apiClient.get('/godowns/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // 3. Fetch Routes (POS)
  const { data: routes = [] } = useQuery<any[]>({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await apiClient.get('/routes/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // 4. Fetch Customers (Sundry Debtors)
  const { data: ledgers = [] } = useQuery<any[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // Auto-select "Office Sale Point" or first route
  useEffect(() => {
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

  // Selected package object
  const activePackage = useMemo(() => {
    if (!selectedPackageId) return null;
    return packages.find((p: any) => String(p.PackageId) === selectedPackageId) || null;
  }, [packages, selectedPackageId]);

  // Auto-update custom total when package changes
  useEffect(() => {
    if (activePackage) {
      setCustomTotal(Number(activePackage.TotalAmount || 0));
    }
  }, [activePackage]);

  // Package dropdown options
  const packageOptions = useMemo(() => {
    return packages
      .filter((p: any) => p.IsActive !== false)
      .map((p: any) => ({
        value: String(p.PackageId),
        label: `${p.PackageName} — ₹${Number(p.TotalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      }));
  }, [packages]);

  // Route dropdown options
  const routeOptions = useMemo(() => {
    return routes.map((r: any) => ({
      value: String(r.RouteId),
      label: r.RouteName || `Route #${r.RouteId}`,
    }));
  }, [routes]);

  // Customer dropdown options (Registered customer accounts only - no generic walk-in)
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

  // Mutation: Create Connection Sale
  const createSaleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/sales/', payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['connection-packages'] });
      queryClient.invalidateQueries({ queryKey: ['stock-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['godowns'] });
      queryClient.invalidateQueries({ queryKey: ['van-stock'] });
      queryClient.invalidateQueries({ queryKey: ['godown-stock'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      notifications.show({
        title: 'New Connection Sale Completed',
        message: `Invoice ${data.InvoiceNo || data.SalesNo} recorded. Stock decremented from ${godowns.find((g: any) => String(g.GodownId) === godownId)?.GodownName || 'Main Godown'}.`,
        color: 'teal',
      });
      navigate('/sales');
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error Creating Sale',
        message: err.response?.data?.detail || err.message || 'Failed to complete connection sale.',
        color: 'red',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePackage) {
      notifications.show({
        title: 'Package Required',
        message: 'Please select a Connection Package to sell.',
        color: 'red',
      });
      return;
    }

    if (!customerId) {
      notifications.show({
        title: 'Customer Required',
        message: 'Please choose a customer account to register this new connection.',
        color: 'red',
      });
      return;
    }

    // Build lines: Cylinder + Included Accessories
    const lines: any[] = [];

    // 1. Cylinder Line
    if (activePackage.CylinderProduct) {
      lines.push({
        Product: activePackage.CylinderProduct,
        Quantity: Number(activePackage.CylinderQty || 1),
        SalesPrice: Number(activePackage.CylinderRate || 0),
        EmptyQuantity: 0,
      });
    }

    // 2. Accessory Lines
    (activePackage.items || []).forEach((it: any) => {
      lines.push({
        Product: it.Product,
        Quantity: Number(it.Quantity || 1),
        SalesPrice: Number(it.UnitPrice || 0),
        EmptyQuantity: 0,
      });
    });

    const finalTotal = customTotal !== '' ? Number(customTotal) : Number(activePackage.TotalAmount || 0);

    const payload = {
      SalesDate: salesDate,
      RouteId: routeId ? Number(routeId) : undefined,
      godown_id: Number(godownId) || 1,
      CustomerLedger: customerId ? Number(customerId) : null,
      PaymentMethod: paymentMethod,
      Notes: `New Connection: ${activePackage.PackageName}${notes ? ` | ${notes}` : ''}`,
      GrandTotal: finalTotal,
      TotalEmptyQty: 0,
      lines: lines,
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
              Add New Connection Sale
            </Title>
            <Text size="xs" c="dimmed" mt={2}>
              Issue a new cylinder connection package with bundled accessories, automatic inventory deduction, and instant billing
            </Text>
          </div>

          <Group gap="sm">
            <Button variant="default" onClick={() => navigate('/sales')}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              loading={createSaleMutation.isPending}
              leftSection={<IconReceipt2 size={16} />}
              style={{ backgroundColor: '#800020', fontWeight: 600 }}
            >
              Complete Connection Sale
            </Button>
          </Group>
        </Group>
      </Box>

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* ── Package Selection & Details Card ── */}
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Group justify="space-between" align="center" mb="sm">
              <Group gap="xs">
                <IconPackage size={20} color="#800020" />
                <Text fw={700} size="sm" c="#800020" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                  1. Select Connection Package
                </Text>
              </Group>
              {activePackage && (
                <Badge size="sm" color="burgundy" variant="light" style={{ backgroundColor: '#fdf2f4', color: '#800020', fontWeight: 700 }}>
                  Active Package Bundle
                </Badge>
              )}
            </Group>

            {/* Visual Package Quick-Select Cards */}
            {packages.length > 0 && (
              <Box mb="md">
                <Text size="xs" fw={600} c="dimmed" mb={6}>
                  Quick Select Package:
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                  {packages
                    .filter((p: any) => p.IsActive !== false)
                    .map((pkg: any) => {
                      const isSelected = String(pkg.PackageId) === selectedPackageId;
                      return (
                        <Paper
                          key={pkg.PackageId}
                          p="sm"
                          radius="md"
                          withBorder
                          onClick={() => setSelectedPackageId(String(pkg.PackageId))}
                          style={{
                            cursor: 'pointer',
                            borderColor: isSelected ? '#800020' : '#e2e8f0',
                            borderWidth: isSelected ? 2 : 1,
                            backgroundColor: isSelected ? '#fdf2f4' : '#fafafa',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Group justify="space-between" align="flex-start" wrap="nowrap">
                            <Group gap="xs" wrap="nowrap">
                              <IconFlame size={20} color={isSelected ? '#800020' : '#64748b'} />
                              <div>
                                <Text size="xs" fw={700} style={{ color: isSelected ? '#800020' : '#1e293b' }}>
                                  {pkg.PackageName}
                                </Text>
                                <Text size="11px" c="dimmed">
                                  {pkg.cylinder_name || 'Gas Cylinder Bundle'}
                                </Text>
                              </div>
                            </Group>
                            <Badge
                              size="sm"
                              variant={isSelected ? 'filled' : 'light'}
                              color="burgundy"
                              style={isSelected ? { backgroundColor: '#800020' } : undefined}
                            >
                              ₹{Number(pkg.TotalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Badge>
                          </Group>
                        </Paper>
                      );
                    })}
                </SimpleGrid>
              </Box>
            )}

            <Select
              label="Or Search Connection Package"
              placeholder={isLoadingPackages ? 'Loading packages...' : 'Choose connection package to issue...'}
              data={packageOptions}
              value={selectedPackageId}
              onChange={(val) => setSelectedPackageId(val)}
              searchable
              required
              styles={{
                input: {
                  borderColor: selectedPackageId ? '#800020' : undefined,
                  fontWeight: 600,
                  fontSize: 14,
                },
              }}
            />

            {activePackage && (
              <Box mt="md" p="md" style={{ backgroundColor: '#fdf2f4', borderRadius: 8, border: '1px solid #f5c2cb' }}>
                <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                  <div>
                    <Text fw={800} size="sm" style={{ color: '#800020' }}>
                      {activePackage.PackageName}
                    </Text>
                    {activePackage.Description && (
                      <Text size="xs" c="dimmed" mt={2}>
                        {activePackage.Description}
                      </Text>
                    )}
                  </div>
                  <Text fw={800} size="lg" style={{ color: '#800020' }}>
                    ₹{Number(activePackage.TotalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </Group>

                <Divider my="sm" color="#f5c2cb" />

                {/* Breakdown Grid */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                  {/* Cylinder Component */}
                  <Paper p="xs" radius="sm" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                    <Group gap={6} align="center" mb={4}>
                      <IconFlame size={16} color="#800020" />
                      <Text size="xs" fw={700} style={{ color: '#800020' }}>
                        Cylinder Bundled
                      </Text>
                    </Group>
                    <Text size="xs" fw={600} style={{ color: '#0f172a' }}>
                      {activePackage.cylinder_name || 'Standard Cylinder'} &times; {activePackage.CylinderQty || 1}
                    </Text>
                    <Text size="11px" c="dimmed">
                      Deposit / Rate: ₹{Number(activePackage.CylinderRate || 0).toFixed(2)}
                    </Text>
                  </Paper>

                  {/* Accessories Component */}
                  <Paper p="xs" radius="sm" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                    <Group gap={6} align="center" mb={4}>
                      <IconPackage size={16} color="#800020" />
                      <Text size="xs" fw={700} style={{ color: '#800020' }}>
                        Accessories Included ({(activePackage.items || []).length})
                      </Text>
                    </Group>
                    {(activePackage.items || []).length === 0 ? (
                      <Text size="xs" c="dimmed">No accessories bundled</Text>
                    ) : (
                      <Stack gap={2}>
                        {activePackage.items.map((it: any, idx: number) => (
                          <Text key={idx} size="11px" fw={500} style={{ color: '#334155' }}>
                            &bull; {it.product_name || `Product #${it.Product}`} &times; {parseFloat(String(it.Quantity || 1))}
                          </Text>
                        ))}
                      </Stack>
                    )}
                  </Paper>

                  {/* Fitting / Labor Fee */}
                  <Paper p="xs" radius="sm" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                    <Group gap={6} align="center" mb={4}>
                      <IconTools size={16} color="#800020" />
                      <Text size="xs" fw={700} style={{ color: '#800020' }}>
                        Installation Tariff
                      </Text>
                    </Group>
                    <Text size="xs" fw={600} style={{ color: '#0f172a' }}>
                      ₹{Number(activePackage.LaborCharge || 0).toFixed(2)}
                    </Text>
                    <Text size="11px" c="dimmed">
                      {activePackage.LaborDescription || 'Fitting Charge'}
                    </Text>
                  </Paper>
                </SimpleGrid>
              </Box>
            )}
          </Paper>

          {/* ── Transaction Parameters Card ── */}
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Text fw={700} size="sm" c="#475569" tt="uppercase" mb="sm" style={{ letterSpacing: '0.5px' }}>
              2. Transaction &amp; Customer Details
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
              <TextInput
                label="Sales Date"
                type="date"
                required
                value={salesDate}
                onChange={(e) => setSalesDate(e.currentTarget.value)}
              />

              <Select
                label="Dispensing Godown"
                
                data={(godowns.length > 0 ? godowns : [
                  { GodownId: 1, GodownName: 'Main Godown (Central)', IsCentral: true },
                  { GodownId: 2, GodownName: 'Thalassery Godown', IsCentral: false },
                ]).map((g: any) => ({
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
                placeholder="Choose Customer..."
                data={customerOptions}
                value={customerId}
                onChange={(val) => setCustomerId(val)}
                searchable
                required
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

          {/* ── Summary & Final Submission ── */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Card p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <Text size="xs" fw={700} c="#64748b" tt="uppercase" mb="xs">
                Additional Delivery Notes
              </Text>
              <Textarea
                placeholder="Consumer address, gas connection book reference, remarks..."
                minRows={4}
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
              />
            </Card>

            <Paper p="md" radius="md" style={{ backgroundColor: '#fdf2f4', border: '1px solid #fce7ec' }}>
              <Stack gap="xs">
                <Text size="xs" fw={700} c="#800020" tt="uppercase">
                  Connection Billing Summary
                </Text>

                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Package Subtotal:</Text>
                  <Text size="xs" fw={600}>
                    ₹{activePackage ? Number(activePackage.TotalAmount || 0).toFixed(2) : '0.00'}
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Payment Method:</Text>
                  <Badge size="xs" variant="outline" color="burgundy">
                    {paymentMethod}
                  </Badge>
                </Group>

                <Divider my={4} color="#fce7ec" />

                <Group justify="space-between" align="center">
                  <Text size="sm" fw={800} style={{ color: '#800020' }}>
                    Total Billed (₹):
                  </Text>
                  <NumberInput
                    hideControls
                    size="sm"
                    decimalScale={2}
                    value={customTotal}
                    onChange={(val) => setCustomTotal(val !== '' ? Number(val) : '')}
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

export default ConnectionSaleFormPage;
