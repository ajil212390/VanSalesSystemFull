import React, { useState, useMemo } from 'react';
import {
  Title,
  Text,
  Paper,
  SimpleGrid,
  Group,
  Stack,
  Badge,
  Button,
  Table,
  Loader,
  Center,
  TextInput,
  CloseButton,
  Select,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconSearch,
  IconPackage,
  IconCylinder,
  IconBuildingFactory2,
  IconArrowUpRight,
  IconRefresh,
  IconLayersLinked,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export const InventoryByProductPage: React.FC = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Live Stock Analysis Query (5s refresh)
  const {
    data: stockAnalysis,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<any>({
    queryKey: ['stock-analysis'],
    queryFn: async () => {
      const res = await apiClient.get('/delivery-notes/stock-analysis/');
      return res.data;
    },
    refetchInterval: 5000,
  });

  const products: any[] = useMemo(() => {
    return stockAnalysis?.products || [];
  }, [stockAnalysis]);

  // Extract unique category options
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.CategoryName) cats.add(p.CategoryName);
    });
    return Array.from(cats)
      .sort()
      .map((cat) => ({ value: cat, label: cat }));
  }, [products]);

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        (p.ProductName && p.ProductName.toLowerCase().includes(q)) ||
        (p.AppProductName && p.AppProductName.toLowerCase().includes(q)) ||
        (p.ProductCode && p.ProductCode.toLowerCase().includes(q));

      const matchCategory = !selectedCategory || p.CategoryName === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Summary Metrics
  const totalFilled = useMemo(() => {
    return products.reduce(
      (sum, p) => sum + (Number(p.FilledQty ?? (p.GodownQty + (p.AllocatedQty || 0))) || 0),
      0
    );
  }, [products]);

  const totalEmpty = useMemo(() => {
    return products.reduce((sum, p) => sum + (Number(p.EmptyQty) || 0), 0);
  }, [products]);

  const totalGodownFilled = useMemo(() => {
    return products.reduce((sum, p) => sum + (Number(p.GodownQty) || 0), 0);
  }, [products]);

  const totalAllocatedFilled = useMemo(() => {
    return products.reduce((sum, p) => sum + (Number(p.AllocatedQty) || 0), 0);
  }, [products]);

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* 1. Header with Back Button and Quick Actions */}
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <div>
          <Group gap="xs" align="center" mb={6}>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/')}
              styles={{ root: { paddingLeft: 4, paddingRight: 8 } }}
            >
              Back to Dashboard
            </Button>
          </Group>
          <Title order={2} style={{ color: '#800020', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Inventory by Product
          </Title>
          <Text size="sm" c="dimmed">
            Real-time stock breakdown by filled merchandise, empty cylinders, and distribution hubs.
          </Text>
        </div>

        <Group gap="xs" align="center" wrap="wrap">
          <Tooltip label="Refresh live data" withArrow position="top">
            <ActionIcon
              variant="default"
              size="lg"
              radius="md"
              loading={isFetching}
              onClick={() => refetch()}
              style={{ borderColor: '#cbd5e1' }}
            >
              <IconRefresh size={18} color="#475569" />
            </ActionIcon>
          </Tooltip>

          <Button
            variant="outline"
            color="burgundy"
            radius="md"
            size="sm"
            fw={600}
            leftSection={<IconLayersLinked size={16} />}
            rightSection={<IconArrowUpRight size={14} />}
            onClick={() => navigate('/stock-analysis')}
            style={{
              backgroundColor: '#ffffff',
              borderColor: '#800020',
              color: '#800020',
            }}
          >
            Detailed Stock Analysis
          </Button>
        </Group>
      </Group>

      {/* 2. Top Summary KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Card 1: Total Filled Cylinders */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Filled Stock
            </Text>
            <IconPackage size={20} color="#800020" stroke={1.75} />
          </Group>
          <Group align="baseline" gap={6} mb={4}>
            <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {totalFilled.toLocaleString()}
            </Text>
            <Text size="sm" fw={500} c="#64748b">
              filled
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {totalGodownFilled.toLocaleString()} godown · {totalAllocatedFilled.toLocaleString()} vans
          </Text>
        </Paper>

        {/* Card 2: Total Empty Cylinders */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Empty Cylinders
            </Text>
            <IconCylinder size={20} color="#800020" stroke={1.75} />
          </Group>
          <Group align="baseline" gap={6} mb={4}>
            <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {totalEmpty.toLocaleString()}
            </Text>
            <Text size="sm" fw={500} c="#64748b">
              empty
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            Available return bottles in system
          </Text>
        </Paper>

        {/* Card 3: Total System Stock */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Units
            </Text>
            <IconBuildingFactory2 size={20} color="#800020" stroke={1.75} />
          </Group>
          <Group align="baseline" gap={6} mb={4}>
            <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {(totalFilled + totalEmpty).toLocaleString()}
            </Text>
            <Text size="sm" fw={500} c="#64748b">
              units
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            Filled cylinders &amp; empty returns combined
          </Text>
        </Paper>

        {/* Card 4: Catalogued Products */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Catalogued Items
            </Text>
            <IconPackage size={20} color="#800020" stroke={1.75} />
          </Group>
          <Group align="baseline" gap={6} mb={4}>
            <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
              {products.length}
            </Text>
            <Text size="sm" fw={500} c="#64748b">
              items
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {categoryOptions.length} active categor{categoryOptions.length !== 1 ? 'ies' : 'y'}
          </Text>
        </Paper>
      </SimpleGrid>

      {/* 3. Product Inventory Table Container */}
      <Paper
        radius="md"
        withBorder
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Table Filter Toolbar */}
        <Group justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #f1f5f9' }} wrap="wrap" gap="sm">
          <Group gap="sm" align="center" style={{ flexGrow: 1, minWidth: 260 }}>
            <TextInput
              placeholder="Search product code, name..."
              size="sm"
              radius="md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={15} color="#64748b" />}
              rightSection={searchQuery ? <CloseButton size="xs" onClick={() => setSearchQuery('')} /> : null}
              style={{ minWidth: 240, flexGrow: 1 }}
            />

            {categoryOptions.length > 0 && (
              <Select
                placeholder="All Categories"
                data={categoryOptions}
                value={selectedCategory}
                onChange={setSelectedCategory}
                clearable
                size="sm"
                radius="md"
                style={{ width: 180 }}
              />
            )}
          </Group>

          <Badge
            variant="light"
            color="burgundy"
            size="md"
            radius="sm"
            styles={{
              root: {
                backgroundColor: '#fdf2f4',
                color: '#800020',
                fontWeight: 700,
              },
            }}
          >
            {filteredProducts.length} of {products.length} Items
          </Badge>
        </Group>

        {/* Product Table */}
        {isLoading ? (
          <Center py={60}>
            <Loader color="burgundy" size="md" />
          </Center>
        ) : filteredProducts.length === 0 ? (
          <Center py={60}>
            <Stack align="center" gap={6}>
              <IconPackage size={36} color="#cbd5e1" stroke={1.5} />
              <Text size="sm" c="#64748b" fw={600}>
                No products found
              </Text>
              <Text size="xs" c="dimmed">
                Try adjusting your search query or category filter.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={700}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover style={{ tableLayout: 'auto' }}>
              <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', width: 110 }}>
                    Code
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Product Name
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', width: 140 }}>
                    Category
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 115 }}>
                    Godown
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 115 }}>
                    Vans
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 125 }}>
                    Filled Total
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 115 }}>
                    Empty
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'right', width: 125, paddingRight: 20 }}>
                    Total Stock
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredProducts.map((p) => {
                  const isCyl = p.IsCylinder !== false && (p.IsCylinder === true || /cylinder|lpg|kg/i.test(p.ProductName || ''));
                  const filled = Number(p.FilledQty ?? (p.GodownQty + (p.AllocatedQty || 0))) || 0;
                  const godown = Number(p.GodownQty || 0);
                  const allocated = Number(p.AllocatedQty || 0);
                  const empty = Number(p.EmptyQty || 0);
                  const total = filled + (isCyl ? empty : 0);

                  return (
                    <Table.Tr
                      key={p.ProductId}
                      style={{ cursor: 'pointer', height: 46 }}
                      onClick={() => navigate(`/stock-analysis?product=${p.ProductId}`)}
                    >
                      <Table.Td>
                        <Badge
                          variant="outline"
                          color="gray"
                          size="sm"
                          radius="xs"
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#1e293b',
                            borderColor: '#e2e8f0',
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          {p.ProductCode || '—'}
                        </Badge>
                      </Table.Td>

                      <Table.Td>
                        <Group gap={6} align="center" wrap="nowrap">
                          <Text size="sm" fw={700} c="#0f172a">
                            {p.ProductName}
                          </Text>
                          {p.AppProductName && p.AppProductName !== p.ProductName && (
                            <Text size="xs" c="#64748b">
                              ({p.AppProductName})
                            </Text>
                          )}
                        </Group>
                      </Table.Td>

                      <Table.Td>
                        <Text size="xs" fw={600} c="#475569">
                          {p.CategoryName || 'General'}
                        </Text>
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                        {godown.toLocaleString()}
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'right', fontWeight: 500, fontSize: 13.5, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                        {allocated.toLocaleString()}
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                        {filled.toLocaleString()}
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13.5, color: isCyl ? '#64748b' : '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                        {isCyl ? empty.toLocaleString() : '—'}
                      </Table.Td>

                      <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#800020', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                        {total.toLocaleString()}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>

              {/* Total Footer Row */}
              <Table.Tfoot style={{ borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                <Table.Tr style={{ height: 46 }}>
                  <Table.Td colSpan={3}>
                    <Text fw={800} style={{ color: '#800020', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      TOTAL ({filteredProducts.length} ITEMS)
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {filteredProducts.reduce((s, p) => s + (Number(p.GodownQty) || 0), 0).toLocaleString()}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {filteredProducts.reduce((s, p) => s + (Number(p.AllocatedQty) || 0), 0).toLocaleString()}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {filteredProducts.reduce((s, p) => s + (Number(p.FilledQty ?? (p.GodownQty + (p.AllocatedQty || 0))) || 0), 0).toLocaleString()}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                    {filteredProducts.reduce((s, p) => s + (Number(p.EmptyQty) || 0), 0).toLocaleString()}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right', fontWeight: 900, fontSize: 15, color: '#800020', fontVariantNumeric: 'tabular-nums', paddingRight: 20 }}>
                    {filteredProducts.reduce((s, p) => {
                      const isCyl = p.IsCylinder !== false && (p.IsCylinder === true || /cylinder|lpg|kg/i.test(p.ProductName || ''));
                      const f = Number(p.FilledQty ?? (p.GodownQty + (p.AllocatedQty || 0))) || 0;
                      const e = Number(p.EmptyQty) || 0;
                      return s + f + (isCyl ? e : 0);
                    }, 0).toLocaleString()}
                  </Table.Td>
                </Table.Tr>
              </Table.Tfoot>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>
    </Stack>
  );
};

export default InventoryByProductPage;
