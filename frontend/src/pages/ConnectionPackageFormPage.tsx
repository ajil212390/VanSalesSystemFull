import React, { useState, useEffect, useMemo } from 'react';
import {
  Title,
  Text,
  Paper,
  SimpleGrid,
  Group,
  Stack,
  Button,
  Table,
  Badge,
  ActionIcon,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Switch,
  Divider,
  Box,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconPlus,
  IconTrashX,
  IconPackages,
  IconFlame,
  IconTools,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';

interface PackageItemPayload {
  Product: number;
  Quantity: number;
  UnitPrice: number;
  TaxPercent?: number;
  TotalAmount: number;
}

interface PackagePayload {
  PackageName: string;
  Description?: string;
  CylinderProduct?: number | null;
  CylinderQty: number;
  CylinderRate: number;
  LaborCharge: number;
  LaborDescription: string;
  TotalAmount: number;
  IsActive: boolean;
  items: PackageItemPayload[];
}

export const ConnectionPackageFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const queryClient = useQueryClient();

  // Form State
  const [cylinderProductId, setCylinderProductId] = useState<string | null>(null);
  const [cylinderQty, setCylinderQty] = useState<number>(1);
  const [cylinderRate, setCylinderRate] = useState<number>(0);

  const [packageName, setPackageName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Dynamic Accessories / Items
  const [items, setItems] = useState<
    { Product: string; Quantity: number; UnitPrice: number; TotalAmount: number }[]
  >([]);

  // Labor / Installation charge: DEFAULT 0 (user explicitly requested no auto-added labor fee)
  const [laborCharge, setLaborCharge] = useState<number>(0);
  const [laborDesc, setLaborDesc] = useState('Fitting & Installation Charge');

  // Custom Total Override
  const [customTotal, setCustomTotal] = useState<number | ''>('');

  // 1. Fetch Products for selection
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // Product map for quick lookup
  const productMap = useMemo(() => {
    const map = new Map<number, any>();
    products.forEach((p: any) => map.set(p.ProductId, p));
    return map;
  }, [products]);

  // Cylinder/Main Products Options (searchable, clean)
  const cylinderOptions = useMemo(() => {
    return products
      .filter((p: any) => p.IsActive !== false)
      .map((p: any) => ({
        value: String(p.ProductId),
        label: `${p.ProductName} ${p.SalesPrice ? `(₹${Number(p.SalesPrice).toFixed(2)})` : ''}`,
        price: Number(p.SalesPrice || p.PurchasePrice || 0),
        isCylinder: Boolean(p.IsCylinder || /cylinder|lpg|kg/i.test(p.ProductName)),
      }))
      .sort((a, b) => (b.isCylinder ? 1 : 0) - (a.isCylinder ? 1 : 0));
  }, [products]);

  // Accessory / Item Products Options
  const accessoryOptions = useMemo(() => {
    return products
      .filter((p: any) => p.IsActive !== false)
      .map((p: any) => ({
        value: String(p.ProductId),
        label: `${p.ProductName} (₹${Number(p.SalesPrice || 0).toFixed(2)})`,
        price: Number(p.SalesPrice || 0),
      }));
  }, [products]);

  // 2. Fetch existing package data if edit mode
  const { data: existingPackage } = useQuery<any>({
    queryKey: ['connection-package', id],
    queryFn: async () => {
      const res = await apiClient.get(`/connection-packages/${id}/`);
      return res.data;
    },
    enabled: isEdit,
  });

  // Populate form if edit mode
  useEffect(() => {
    if (existingPackage && isEdit) {
      setPackageName(existingPackage.PackageName || '');
      setDescription(existingPackage.Description || '');
      setCylinderProductId(
        existingPackage.CylinderProduct ? String(existingPackage.CylinderProduct) : null
      );
      setCylinderQty(Number(existingPackage.CylinderQty || 1));
      setCylinderRate(Number(existingPackage.CylinderRate || 0));
      setLaborCharge(Number(existingPackage.LaborCharge || 0));
      setLaborDesc(existingPackage.LaborDescription || 'Fitting & Installation Charge');
      setCustomTotal(Number(existingPackage.TotalAmount || 0));
      setIsActive(existingPackage.IsActive !== false);
      setItems(
        (existingPackage.items || []).map((it: any) => ({
          Product: String(it.Product),
          Quantity: Number(it.Quantity || 1),
          UnitPrice: Number(it.UnitPrice || 0),
          TotalAmount: Number(it.TotalAmount || 0),
        }))
      );
    }
  }, [existingPackage, isEdit]);

  // Handle Cylinder Selection: User picks product FIRST
  const handleCylinderChange = (val: string | null) => {
    setCylinderProductId(val);
    if (val) {
      const prod = productMap.get(Number(val));
      if (prod) {
        const rate = Number(prod.SalesPrice || prod.PurchasePrice || 0);
        setCylinderRate(rate);

        // Auto-suggest package name if currently empty
        if (!packageName.trim()) {
          setPackageName(`${prod.ProductName} Connection Package`);
        }
      }
    } else {
      setCylinderRate(0);
    }
  };

  // Add Item Line (Starts completely empty for user to choose product)
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        Product: '',
        Quantity: 1,
        UnitPrice: 0,
        TotalAmount: 0,
      },
    ]);
  };

  // Update Item Line: When user picks product, fetch normal sales price and allow user to edit
  const handleItemProductChange = (index: number, pId: string) => {
    const prod = productMap.get(Number(pId));
    const normalPrice = prod ? Number(prod.SalesPrice || prod.PurchasePrice || 0) : 0;
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const qty = it.Quantity || 1;
        return {
          ...it,
          Product: pId,
          UnitPrice: normalPrice,
          TotalAmount: Number((qty * normalPrice).toFixed(2)),
        };
      })
    );
  };

  const handleItemQtyChange = (index: number, qty: number) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const rate = it.UnitPrice || 0;
        return {
          ...it,
          Quantity: qty,
          TotalAmount: Number((qty * rate).toFixed(2)),
        };
      })
    );
  };

  const handleItemPriceChange = (index: number, price: number) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const qty = it.Quantity || 1;
        return {
          ...it,
          UnitPrice: price,
          TotalAmount: Number((qty * price).toFixed(2)),
        };
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial Calculations
  const calculatedCylinderDeposit = (cylinderQty || 0) * (cylinderRate || 0);
  const calculatedItemsTotal = items.reduce((sum, it) => sum + (it.TotalAmount || 0), 0);
  const autoSumTotal = calculatedCylinderDeposit + calculatedItemsTotal + (laborCharge || 0);
  const effectiveTotal = customTotal !== '' ? Number(customTotal) : autoSumTotal;

  // Mutation: Save Package
  const saveMutation = useMutation({
    mutationFn: async (payload: PackagePayload) => {
      if (isEdit) {
        const res = await apiClient.put(`/connection-packages/${id}/`, payload);
        return res.data;
      }
      const res = await apiClient.post('/connection-packages/', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connection-packages'] });
      notifications.show({
        title: 'Connection Package Saved',
        message: `Package "${packageName}" successfully ${isEdit ? 'updated' : 'created'}.`,
        color: 'teal',
      });
      navigate('/connection-packages');
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Error Saving Package',
        message:
          err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          'Could not save connection package.',
        color: 'red',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!cylinderProductId) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please select a primary cylinder / product for this connection package first.',
        color: 'red',
      });
      return;
    }

    if (!packageName.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Package name is required.',
        color: 'red',
      });
      return;
    }

    const payload: PackagePayload = {
      PackageName: packageName.trim(),
      Description: description.trim() || undefined,
      CylinderProduct: cylinderProductId ? Number(cylinderProductId) : null,
      CylinderQty: cylinderQty || 1,
      CylinderRate: cylinderRate || 0,
      LaborCharge: laborCharge || 0,
      LaborDescription: laborDesc.trim() || 'Fitting & Installation Charge',
      TotalAmount: effectiveTotal,
      IsActive: isActive,
      items: items
        .filter((it) => it.Product)
        .map((it) => {
          const prod = productMap.get(Number(it.Product));
          return {
            Product: Number(it.Product),
            Quantity: it.Quantity,
            UnitPrice: it.UnitPrice,
            TaxPercent: prod ? Number(prod.GSTPercentage || 0) : 0,
            TotalAmount: it.TotalAmount,
          };
        }),
    };

    saveMutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="lg" style={{ width: '100%' }}>
        {/* ── Top Header with Back Navigation ── */}
        <Box pt={4} pb={2}>
          <Group justify="space-between" align="center" wrap="wrap">
            <div>
              <Group gap="xs" align="center" mb={4}>
                <Button
                  variant="subtle"
                  color="gray"
                  size="compact-sm"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => navigate('/connection-packages')}
                  style={{ paddingLeft: 0 }}
                >
                  Back to Connection Packages
                </Button>
              </Group>
              <Title
                order={2}
                style={{ color: '#800020', fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em' }}
              >
                {isEdit ? 'Edit Connection Package' : 'New Connection Package'}
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Configure bundled cylinders, accessory line items, optional installation fee, and package pricing
              </Text>
            </div>

            <Group gap="sm">
              <Button
                variant="default"
                onClick={() => navigate('/connection-packages')}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                leftSection={<IconDeviceFloppy size={18} />}
                loading={saveMutation.isPending}
                style={{ backgroundColor: '#800020', fontWeight: 600 }}
              >
                {isEdit ? 'Update Package' : 'Save Connection Package'}
              </Button>
            </Group>
          </Group>
        </Box>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
          {/* ── Left / Main 2 Columns: Forms ── */}
          <Box style={{ gridColumn: 'span 2' }}>
            <Stack gap="lg">
              {/* ── 1. PACKAGE DETAILS & IDENTITY (FIRST) ── */}
              <Paper
                p="md"
                radius="md"
                withBorder
                style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
              >
                <Group justify="space-between" align="center" mb="xs">
                  <Group gap="xs">
                    <IconPackages size={20} color="#800020" stroke={2} />
                    <Text fw={700} style={{ color: '#800020', fontSize: 15 }}>
                      1. Package Details
                    </Text>
                  </Group>
                  <Switch
                    label="Active for Sales"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.currentTarget.checked)}
                    color="burgundy"
                    size="sm"
                  />
                </Group>

                <Stack gap="sm">
                  <TextInput
                    label="Package Name"
                    placeholder="e.g. Standard Domestic LPG New Connection"
                    value={packageName}
                    onChange={(e) => setPackageName(e.currentTarget.value)}
                    required
                    styles={{ label: { fontWeight: 600, fontSize: 13, marginBottom: 4 } }}
                  />

                  <Textarea
                    label="Description / Marketing Pitch (Optional)"
                    placeholder="Includes cylinder, ISI low pressure regulator, 1.5m reinforced hose, safety check..."
                    minRows={2}
                    value={description}
                    onChange={(e) => setDescription(e.currentTarget.value)}
                    styles={{ label: { fontWeight: 600, fontSize: 13, marginBottom: 4 } }}
                  />
                </Stack>
              </Paper>

              {/* ── 2. CYLINDER SELECTION (SECOND) ── */}
              <Paper
                p="md"
                radius="md"
                withBorder
                style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
              >
                <Group justify="space-between" align="center" mb="xs">
                  <Group gap="xs">
                    <IconFlame size={20} color="#800020" stroke={2} />
                    <Text fw={700} style={{ color: '#800020', fontSize: 15 }}>
                      2. Cylinder Selection
                    </Text>
                  </Group>
                </Group>
                <Text size="xs" c="dimmed" mb="md">
                  Select the cylinder or gas product included with this connection package.
                </Text>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Select
                    label="Select Cylinder / Product"
                    placeholder="Choose cylinder / product..."
                    data={cylinderOptions}
                    value={cylinderProductId}
                    onChange={handleCylinderChange}
                    searchable
                    clearable
                    required
                    style={{ gridColumn: 'span 2' }}
                    styles={{
                      label: { fontWeight: 600, fontSize: 13, marginBottom: 4 },
                      input: {
                        borderColor: cylinderProductId ? '#800020' : undefined,
                        fontWeight: 500,
                      },
                    }}
                  />

                  <NumberInput
                    label="Cylinder Quantity"
                    hideControls
                    min={1}
                    value={cylinderQty}
                    onChange={(val) => setCylinderQty(typeof val === 'number' ? val : 1)}
                    required
                    styles={{ label: { fontWeight: 600, fontSize: 13, marginBottom: 4 } }}
                  />

                  <NumberInput
                    label="Cylinder Deposit / Rate (₹)"
                    hideControls
                    min={0}
                    decimalScale={2}
                    value={cylinderRate === 0 ? '' : cylinderRate}
                    placeholder="0.00"
                    onChange={(val) => setCylinderRate(typeof val === 'number' ? val : 0)}
                    required
                    styles={{ label: { fontWeight: 600, fontSize: 13, marginBottom: 4 } }}
                  />
                </SimpleGrid>

                {cylinderProductId && (
                  <Paper
                    mt="md"
                    p="xs"
                    radius="sm"
                    style={{ backgroundColor: '#fdf2f4', border: '1px solid #f5c2cb' }}
                  >
                    <Group justify="space-between" align="center">
                      <Text size="xs" fw={600} c="#800020">
                        Cylinder Subtotal: {cylinderQty} × ₹{Number(cylinderRate || 0).toFixed(2)}
                      </Text>
                      <Text size="sm" fw={700} c="#800020">
                        ₹{calculatedCylinderDeposit.toFixed(2)}
                      </Text>
                    </Group>
                  </Paper>
                )}
              </Paper>

              {/* ── 3. INCLUDED ACCESSORIES (NO COUNTER, BURGUNDY ADD BUTTON) ── */}
              <Paper
                p="md"
                radius="md"
                withBorder
                style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
              >
                <Group justify="space-between" align="center" mb="xs">
                  <Group gap="xs">
                    <IconPlus size={18} color="#800020" stroke={2} />
                    <Text fw={700} style={{ color: '#800020', fontSize: 15 }}>
                      Included Accessories
                    </Text>
                  </Group>
                  <Button
                    size="xs"
                    style={{ backgroundColor: '#800020', fontWeight: 600 }}
                    leftSection={<IconPlus size={14} />}
                    onClick={handleAddItem}
                  >
                    Add Accessories
                  </Button>
                </Group>
                <Text size="xs" c="dimmed" mb="sm">
                  Add bundled accessories such as regulators, gas hoses, safety caps, or 2-burner stoves.
                </Text>

                {items.length === 0 ? (
                  <Box
                    p="xl"
                    style={{
                      border: '1px dashed #cbd5e1',
                      borderRadius: 8,
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <Text size="sm" c="dimmed">
                      No extra accessories added. Click <b>"Add Accessories"</b> if this package includes regulators, hoses, or stoves.
                    </Text>
                  </Box>
                ) : (
                  <Table.ScrollContainer minWidth={500}>
                    <Table verticalSpacing="xs">
                      <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                        <Table.Tr>
                          <Table.Th style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                            PRODUCT / ACCESSORY
                          </Table.Th>
                          <Table.Th style={{ fontSize: 12, fontWeight: 700, color: '#64748b', width: 90 }}>
                            QTY
                          </Table.Th>
                          <Table.Th style={{ fontSize: 12, fontWeight: 700, color: '#64748b', width: 120 }}>
                            RATE (₹)
                          </Table.Th>
                          <Table.Th style={{ fontSize: 12, fontWeight: 700, color: '#64748b', width: 110, textAlign: 'right' }}>
                            TOTAL (₹)
                          </Table.Th>
                          <Table.Th style={{ width: 45 }} />
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {items.map((it, idx) => (
                          <Table.Tr key={idx}>
                            <Table.Td>
                              <Select
                                placeholder="Choose accessory / product..."
                                data={accessoryOptions}
                                value={it.Product || null}
                                onChange={(val) => handleItemProductChange(idx, val || '')}
                                searchable
                                clearable
                                size="xs"
                                styles={{ input: { fontSize: 13, borderColor: '#cbd5e1' } }}
                              />
                            </Table.Td>
                            <Table.Td>
                              <NumberInput
                                hideControls
                                min={1}
                                value={it.Quantity}
                                onChange={(val) => handleItemQtyChange(idx, typeof val === 'number' ? val : 1)}
                                size="xs"
                                styles={{ input: { fontSize: 13, fontWeight: 600, textAlign: 'center', borderColor: '#cbd5e1' } }}
                              />
                            </Table.Td>
                            <Table.Td>
                              <NumberInput
                                hideControls
                                min={0}
                                decimalScale={2}
                                placeholder="0.00"
                                value={it.UnitPrice === 0 && !it.Product ? '' : it.UnitPrice}
                                onChange={(val) => handleItemPriceChange(idx, typeof val === 'number' ? val : 0)}
                                size="xs"
                                styles={{ input: { fontSize: 13, fontWeight: 600, borderColor: '#cbd5e1' } }}
                              />
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                              ₹{(it.TotalAmount || 0).toFixed(2)}
                            </Table.Td>
                            <Table.Td>
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                size="sm"
                                onClick={() => handleRemoveItem(idx)}
                              >
                                <IconTrashX size={16} />
                              </ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                )}
              </Paper>

              {/* ── 4. INSTALLATION & LABOR FEE (NO COUNTER BADGE) ── */}
              <Paper
                p="md"
                radius="md"
                withBorder
                style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
              >
                <Group justify="space-between" align="center" mb="xs">
                  <Group gap="xs">
                    <IconTools size={18} color="#800020" stroke={2} />
                    <Text fw={700} style={{ color: '#800020', fontSize: 15 }}>
                      Installation &amp; Labor Fee
                    </Text>
                  </Group>
                </Group>
                <Text size="xs" c="dimmed" mb="md">
                  Labor and installation is ₹0 by default. Enter an amount only if you want to bill an additional labor charge.
                </Text>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <TextInput
                    label="Labor Description"
                    placeholder="Fitting & Installation Charge"
                    value={laborDesc}
                    onChange={(e) => setLaborDesc(e.currentTarget.value)}
                    styles={{ label: { fontWeight: 600, fontSize: 13, marginBottom: 4 } }}
                  />

                  <NumberInput
                    label="Labor / Fitting Fee (₹)"
                    hideControls
                    min={0}
                    decimalScale={2}
                    value={laborCharge === 0 ? '' : laborCharge}
                    onChange={(val) => setLaborCharge(typeof val === 'number' ? val : 0)}
                    placeholder="0.00"
                    styles={{ label: { fontWeight: 600, fontSize: 13, marginBottom: 4 } }}
                  />
                </SimpleGrid>
              </Paper>
            </Stack>
          </Box>

          {/* ── Right Column: Package Pricing Summary (NO COUNTERS) ── */}
          <Box>
            <Paper
              p="md"
              radius="md"
              withBorder
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                position: 'sticky',
                top: 20,
              }}
            >
              <Text fw={700} style={{ color: '#800020', fontSize: 16 }} mb="xs">
                Package Pricing Summary
              </Text>
              <Text size="xs" c="dimmed" mb="md">
                Live breakdown of bundled items and final selling tariff
              </Text>

              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Cylinder Deposit:
                  </Text>
                  <Text size="sm" fw={600}>
                    ₹{calculatedCylinderDeposit.toFixed(2)}
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Included Accessories:
                  </Text>
                  <Text size="sm" fw={600}>
                    ₹{calculatedItemsTotal.toFixed(2)}
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Labor / Fitting Fee:
                  </Text>
                  <Text size="sm" fw={600} c={laborCharge > 0 ? '#0f172a' : 'dimmed'}>
                    ₹{(laborCharge || 0).toFixed(2)}
                  </Text>
                </Group>

                <Divider my="xs" />

                <Group justify="space-between">
                  <Text size="sm" fw={700} c="#0f172a">
                    Calculated Total:
                  </Text>
                  <Text size="sm" fw={700} c="#0f172a">
                    ₹{autoSumTotal.toFixed(2)}
                  </Text>
                </Group>

                <Box mt="sm">
                  <NumberInput
                    label="Package Selling Price Override (₹)"
                    hideControls
                    description="Leave empty to use calculated total"
                    placeholder={`₹${autoSumTotal.toFixed(2)}`}
                    min={0}
                    decimalScale={2}
                    value={customTotal}
                    onChange={(val) => setCustomTotal(typeof val === 'number' ? val : '')}
                    styles={{
                      label: { fontWeight: 600, fontSize: 13, marginBottom: 2 },
                      description: { fontSize: 11, marginBottom: 4 },
                    }}
                  />
                </Box>

                <Paper
                  p="sm"
                  radius="md"
                  mt="sm"
                  style={{
                    backgroundColor: '#fdf2f4',
                    border: '1px solid #f5c2cb',
                    textAlign: 'center',
                  }}
                >
                  <Text size="xs" fw={700} c="#800020" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                    Final Customer Tariff
                  </Text>
                  <Text fw={800} style={{ color: '#800020', fontSize: 28 }}>
                    ₹{effectiveTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  {customTotal !== '' && customTotal !== autoSumTotal && (
                    <Badge color="burgundy" variant="outline" size="xs" mt={4}>
                      Manual Override Applied
                    </Badge>
                  )}
                </Paper>

                <Button
                  type="submit"
                  fullWidth
                  mt="md"
                  size="md"
                  leftSection={<IconDeviceFloppy size={18} />}
                  loading={saveMutation.isPending}
                  style={{ backgroundColor: '#800020', fontWeight: 600 }}
                >
                  {isEdit ? 'Update Package' : 'Save Connection Package'}
                </Button>

                <Button
                  variant="subtle"
                  fullWidth
                  color="gray"
                  size="xs"
                  onClick={() => navigate('/connection-packages')}
                  disabled={saveMutation.isPending}
                >
                  Cancel &amp; Return to List
                </Button>
              </Stack>
            </Paper>
          </Box>
        </SimpleGrid>
      </Stack>
    </form>
  );
};
