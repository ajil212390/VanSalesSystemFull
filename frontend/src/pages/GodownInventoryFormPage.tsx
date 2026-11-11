import React, { useState, useMemo } from 'react';
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
  NumberInput,
  Select,
  Box,
  Divider,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconBuildingFactory2,
  IconFlame,
  IconClipboardCheck,
  IconDeviceFloppy,
  IconCheck,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';

export const GodownInventoryFormPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [filledQuantity, setFilledQuantity] = useState<number | ''>('');
  const [emptyQuantity, setEmptyQuantity] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('Initial Godown Opening Stock');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products/');
      return Array.isArray(res.data) ? res.data : res.data.results || [];
    },
  });

  // Selected product details
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => String(p.ProductId) === String(selectedProductId));
  }, [products, selectedProductId]);

  const productOptions = useMemo(() => {
    return products.map((p) => ({
      value: String(p.ProductId),
      label: `${p.ProductName} ${p.ProductCode ? `(${p.ProductCode})` : ''}`,
    }));
  }, [products]);

  const fQty = Number(filledQuantity) || 0;
  const eQty = Number(emptyQuantity) || 0;
  const totalUnits = fQty + eQty;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedProductId) {
      notifications.show({
        title: 'Validation',
        message: 'Please select a product or cylinder.',
        color: 'red',
      });
      return;
    }

    if (fQty <= 0 && eQty <= 0) {
      notifications.show({
        title: 'Validation',
        message: 'Please enter at least a filled or empty quantity.',
        color: 'red',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient.post('/delivery-notes/add-godown-stock/', {
        product_id: Number(selectedProductId),
        filled_quantity: fQty,
        empty_quantity: eQty,
        remarks: remarks.trim() || 'Initial Godown Opening Stock',
      });

      notifications.show({
        title: 'Stock Added to Godown',
        message: res.data?.message || 'Successfully deposited inventory to Central Godown.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      queryClient.invalidateQueries({ queryKey: ['stock-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['godown-stock'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      navigate('/stock-analysis');
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.detail || err?.response?.data?.message || 'Failed to add godown stock.',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* ── Top Header with Back Navigation & Action Buttons ── */}
      <Box pt={4} pb={2}>
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="sm">
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/stock-analysis')}
              style={{ fontWeight: 600, color: '#475569' }}
            >
              Back to Stock Analysis
            </Button>
            <Divider orientation="vertical" h={20} />
            <div>
              <Title order={2} style={{ color: '#800020', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>
                Add Godown Inventory (Opening Stock)
              </Title>
              <Text size="xs" c="dimmed" mt={2}>
                Directly deposit filled cylinders or empties into Central Godown without needing a purchase invoice
              </Text>
            </div>
          </Group>

          <Group gap="xs">
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/stock-analysis')}
              disabled={isSubmitting}
              style={{ borderColor: '#cbd5e1', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              color="burgundy"
              size="sm"
              leftSection={<IconDeviceFloppy size={17} />}
              loading={isSubmitting}
              onClick={handleSubmit}
              style={{ backgroundColor: '#800020', fontWeight: 600 }}
            >
              Deposit to Godown
            </Button>
          </Group>
        </Group>
      </Box>

      {/* ── Main Form Grid ── */}
      <form onSubmit={handleSubmit}>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" style={{ alignItems: 'flex-start' }}>
          {/* ── Left 2 Columns: Input Sections ── */}
          <Box style={{ gridColumn: 'span 2' }}>
            <Stack gap="lg">
              {/* Section 1: Product Selection */}
              <Paper p="lg" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                <Group justify="space-between" align="center" mb="xs">
                  <Group gap="xs">
                    <IconFlame size={20} color="#800020" stroke={2} />
                    <Text fw={700} style={{ color: '#800020', fontSize: 15 }}>
                      1. Product / Cylinder Selection
                    </Text>
                  </Group>
                  <Badge color="burgundy" variant="light" size="sm" style={{ fontWeight: 600 }}>
                    Central Godown
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed" mb="md">
                  Choose the cylinder or inventory item to deposit directly into central warehouse stock.
                </Text>

                <Select
                  label="Select Product / Cylinder"
                  placeholder={isLoadingProducts ? 'Loading inventory products...' : 'Choose a product...'}
                  data={productOptions}
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                  searchable
                  clearable
                  required
                  nothingFoundMessage="No products found"
                  styles={{
                    label: { fontWeight: 600, fontSize: 13, marginBottom: 5, color: '#334155' },
                    input: { height: 42, fontSize: 13.5, borderColor: '#cbd5e1' },
                  }}
                />
              </Paper>

              {/* Section 2: Quantities (Full Stock & Empty) */}
              <Paper p="lg" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                <Group gap="xs" mb="xs">
                  <IconBuildingFactory2 size={20} color="#800020" stroke={2} />
                  <Text fw={700} style={{ color: '#800020', fontSize: 15 }}>
                    2. Quantity Allocation
                  </Text>
                </Group>
                <Text size="xs" c="dimmed" mb="md">
                  Specify how many full (filled) units and empty cylinders should be credited to Central Godown.
                </Text>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <NumberInput
                    label="Filled Quantity (Full Stock)"
                    placeholder="0"
                    min={0}
                    hideControls
                    value={filledQuantity}
                    onChange={(val) => setFilledQuantity(val === '' ? '' : Number(val))}
                    description="Number of filled cylinders ready for distribution"
                    styles={{
                      label: { fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#334155' },
                      description: { fontSize: 11.5, marginBottom: 6 },
                      input: { height: 42, fontSize: 14, fontWeight: 600, borderColor: '#cbd5e1' },
                    }}
                  />

                  <NumberInput
                    label="Empty Cylinders Quantity"
                    placeholder="0"
                    min={0}
                    hideControls
                    value={emptyQuantity}
                    onChange={(val) => setEmptyQuantity(val === '' ? '' : Number(val))}
                    description="Number of empty cylinders on hand in warehouse"
                    styles={{
                      label: { fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#334155' },
                      description: { fontSize: 11.5, marginBottom: 6 },
                      input: { height: 42, fontSize: 14, fontWeight: 600, borderColor: '#cbd5e1' },
                    }}
                  />
                </SimpleGrid>
              </Paper>

              {/* Section 3: Audit Remarks */}
              <Paper p="lg" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                <Group gap="xs" mb="xs">
                  <IconClipboardCheck size={20} color="#800020" stroke={2} />
                  <Text fw={700} style={{ color: '#800020', fontSize: 15 }}>
                    3. Audit Reference &amp; Remarks
                  </Text>
                </Group>
                <Text size="xs" c="dimmed" mb="md">
                  Reference reason for inventory addition (e.g. Opening Balance, Physical Stock Count Adjustment).
                </Text>

                <TextInput
                  label="Remarks / Reference Note"
                  placeholder="e.g. Initial Opening Stock Count"
                  value={remarks}
                  onChange={(e) => setRemarks(e.currentTarget.value)}
                  styles={{
                    label: { fontWeight: 600, fontSize: 13, marginBottom: 5, color: '#334155' },
                    input: { height: 42, fontSize: 13.5, borderColor: '#cbd5e1' },
                  }}
                />
              </Paper>
            </Stack>
          </Box>

          {/* ── Right 1 Column: Live Deposit Summary ── */}
          <Box>
            <Paper
              p="lg"
              radius="md"
              withBorder
              style={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                position: 'sticky',
                top: 80,
              }}
            >
              <Text fw={700} style={{ color: '#800020', fontSize: 15 }} mb="xs">
                Godown Deposit Summary
              </Text>
              <Text size="xs" c="dimmed" mb="md">
                Live preview of stock being added into central warehouse inventory.
              </Text>

              <Stack gap="sm">
                <Box p="xs" style={{ backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                    Target Warehouse
                  </Text>
                  <Text fw={700} size="sm" c="#0f172a" mt={2}>
                    Central Godown
                  </Text>
                </Box>

                <Box p="xs" style={{ backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                    Selected Product
                  </Text>
                  <Text fw={700} size="sm" c="#0f172a" mt={2} lineClamp={1}>
                    {selectedProduct ? selectedProduct.ProductName : 'None Selected'}
                  </Text>
                  {selectedProduct?.ProductCode && (
                    <Text size="11px" c="dimmed" ff="monospace">
                      Code: {selectedProduct.ProductCode}
                    </Text>
                  )}
                </Box>

                <Divider my={4} />

                <Group justify="space-between" align="center">
                  <Text size="sm" c="#475569">
                    Filled Cylinders:
                  </Text>
                  <Text fw={700} size="sm" c="#0f172a">
                    {fQty}
                  </Text>
                </Group>

                <Group justify="space-between" align="center">
                  <Text size="sm" c="#475569">
                    Empty Cylinders:
                  </Text>
                  <Text fw={700} size="sm" c="#475569">
                    {eQty}
                  </Text>
                </Group>

                <Divider my={4} />

                <Group justify="space-between" align="center">
                  <Text fw={800} size="md" style={{ color: '#800020' }}>
                    Total Units Added:
                  </Text>
                  <Badge size="lg" color="burgundy" variant="filled" style={{ backgroundColor: '#800020', fontWeight: 800 }}>
                    {totalUnits}
                  </Badge>
                </Group>

                <Box mt="md" p="xs" style={{ backgroundColor: '#fdf2f4', borderRadius: 8, border: '1px solid #fecdd3' }}>
                  <Text size="xs" style={{ color: '#800020', lineHeight: 1.4 }}>
                    &bull; Stock will be immediately reflected in <b>Stock Analysis</b> and available for van route loading.
                  </Text>
                </Box>

                <Button
                  color="burgundy"
                  fullWidth
                  mt="md"
                  size="md"
                  leftSection={<IconCheck size={18} />}
                  loading={isSubmitting}
                  onClick={handleSubmit}
                  style={{ backgroundColor: '#800020', fontWeight: 700 }}
                >
                  Confirm &amp; Deposit
                </Button>
              </Stack>
            </Paper>
          </Box>
        </SimpleGrid>
      </form>
    </Stack>
  );
};

export default GodownInventoryFormPage;

