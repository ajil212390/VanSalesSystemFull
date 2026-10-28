import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  CloseButton,
} from '@mantine/core';
import {
  IconSearch,
  IconCylinder,
  IconCurrencyRupee,
  IconArrowLeft,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';

interface ProductItem {
  ProductId: number;
  ProductCode: string | null;
  ProductName: string;
  Category: number;
  category_name?: string | null;
  Unit: number;
  unit_name?: string | null;
  SalesPrice: number | string;
  PurchasePrice: number | string;
  MRP: number | string;
  IsActive: boolean;
}

interface CategoryOption {
  CategoryId: number;
  CategoryName: string;
}

export const PriceUpdatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [newPrices, setNewPrices] = useState<Record<number, number | string>>({});

  const firstInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<ProductItem[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // 2. Fetch Categories
  const { data: categories = [] } = useQuery<CategoryOption[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // Initialize draft prices when products load
  useEffect(() => {
    if (products.length > 0 && Object.keys(newPrices).length === 0) {
      const initial: Record<number, number | string> = {};
      products.forEach((p) => {
        initial[p.ProductId] = p.SalesPrice !== null && p.SalesPrice !== undefined ? p.SalesPrice : '';
      });
      setNewPrices(initial);
    }
  }, [products]);

  // Automatically focus the first product's price input
  useEffect(() => {
    if (!isLoadingProducts && filteredProducts.length > 0) {
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
        firstInputRef.current?.select?.();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isLoadingProducts, selectedCategoryFilter]);

  // Dropdown Category Options
  const categoryOptions = useMemo(() => {
    return categories.map((c) => ({
      value: String(c.CategoryId),
      label: c.CategoryName,
    }));
  }, [categories]);

  // Filtered Products for Price Update
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.ProductName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.ProductCode && p.ProductCode.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory =
        !selectedCategoryFilter || String(p.Category) === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategoryFilter]);

  // Count modified items
  const modifiedProducts = useMemo(() => {
    return products.filter((p) => {
      const current = Number(p.SalesPrice || 0);
      const draft = newPrices[p.ProductId];
      if (draft === undefined || draft === '') return false;
      return Number(draft) !== current;
    });
  }, [products, newPrices]);

  // Bulk Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (modifiedProducts.length === 0) {
        throw new Error('No price changes detected.');
      }

      await Promise.all(
        modifiedProducts.map((p) => {
          const val = newPrices[p.ProductId];
          const newPrice = val === '' ? 0 : Number(val);
          return apiClient.patch(`/products/${p.ProductId}/`, {
            SalesPrice: newPrice,
          });
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      notifications.show({
        title: 'Success',
        message: 'Product price updated successfully.',
        color: 'green',
      });
      navigate('/products');
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})
          .flat()
          .join(', ') ||
        'Failed to update prices.';
      notifications.show({
        title: 'Error',
        message: String(msg),
        color: 'red',
      });
    },
  });

  const handleReset = () => {
    const initial: Record<number, number | string> = {};
    products.forEach((p) => {
      initial[p.ProductId] = p.SalesPrice !== null && p.SalesPrice !== undefined ? p.SalesPrice : '';
    });
    setNewPrices(initial);
  };

  return (
    <Stack gap="lg">
      {/* Top Header with Category Filter, Search Bar, and Action Buttons */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Group gap="xs" align="center">
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/products')}
              styles={{ root: { paddingLeft: 4, paddingRight: 8 } }}
            >
              Back to Products
            </Button>
          </Group>
          <Title order={2} style={{ color: '#800020', fontWeight: 700, marginTop: 4 }}>
            Price Update
          </Title>
          <Text size="sm" c="dimmed">
            Update sales prices across all LPG cylinders and products.
          </Text>
        </div>

        {/* Right Controls: Category Filter + Search Bar + Reset + Save Buttons */}
        <Group gap="xs" align="center" wrap="wrap" style={{ flexGrow: 1, justifyContent: 'flex-end' }}>
          <Select
            placeholder="All Categories"
            data={categoryOptions}
            value={selectedCategoryFilter}
            onChange={(val) => setSelectedCategoryFilter(val ? String(val) : null)}
            clearable
            radius="md"
            size="sm"
            style={{ width: 160, flexGrow: 1, minWidth: 140 }}
          />

          <TextInput
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && !e.shiftKey) {
                if (firstInputRef.current) {
                  e.preventDefault();
                  firstInputRef.current.focus();
                  firstInputRef.current.select?.();
                }
              }
            }}
            leftSection={<IconSearch size={16} stroke={1.5} color="#800020" />}
            rightSection={searchQuery ? <CloseButton size="sm" onClick={() => setSearchQuery('')} /> : null}
            radius="md"
            size="sm"
            style={{ width: 220, flexGrow: 1, minWidth: 160 }}
          />
        </Group>
      </Group>

      {/* Main Full-Screen Table Container */}
      <Paper radius="sm" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
        {isLoadingProducts ? (
          <Center py={60}>
            <Loader color="burgundy" size="md" />
          </Center>
        ) : filteredProducts.length === 0 ? (
          <Center py={60}>
            <Text c="dimmed" size="sm">
              No products found matching your filter criteria.
            </Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={900}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead style={{ backgroundColor: '#fbf0f2' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 260 }}>
                    Product Name
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 140 }}>
                    Category
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 160, textAlign: 'right' }}>
                    Current Sales Price
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 200 }}>
                    New Sales Price (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, minWidth: 100, textAlign: 'center' }}>
                    Status
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredProducts.map((p, index) => {
                  const currentPrice = Number(p.SalesPrice || 0);
                  const draftVal = newPrices[p.ProductId];
                  const isModified = draftVal !== undefined && draftVal !== '' && Number(draftVal) !== currentPrice;

                  return (
                    <Table.Tr
                      key={p.ProductId}
                      style={{
                        backgroundColor: isModified ? '#fdf2f4' : undefined,
                        transition: 'background-color 200ms ease',
                      }}
                    >
                      {/* Product */}
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <IconCylinder size={18} color="#800020" style={{ flexShrink: 0 }} />
                          <div>
                            <Text fw={600} size="sm" c="#1e293b" style={{ whiteSpace: 'nowrap' }}>
                              {p.ProductName}
                            </Text>
                            {p.ProductCode && (
                              <Text size="xs" c="dimmed">
                                Code: {p.ProductCode}
                              </Text>
                            )}
                          </div>
                        </Group>
                      </Table.Td>

                      {/* Category */}
                      <Table.Td>
                        <Badge size="xs" variant="outline" color="gray">
                          {p.category_name || 'General'}
                        </Badge>
                      </Table.Td>

                      {/* Current Sales Price */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text fw={600} size="sm" c="#475569">
                          ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>

                      {/* New Sales Price Input */}
                      <Table.Td>
                        <NumberInput
                          ref={index === 0 ? firstInputRef : undefined}
                          data-price-index={index}
                          size="sm"
                          radius="sm"
                          min={0}
                          decimalScale={2}
                          hideControls
                          prefix="₹ "
                          value={draftVal !== undefined ? draftVal : p.SalesPrice}
                          onFocus={(e) => e.currentTarget.select()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (e.ctrlKey || e.metaKey || index === filteredProducts.length - 1) {
                                if (modifiedProducts.length > 0 && !saveMutation.isPending) {
                                  saveMutation.mutate();
                                }
                              } else {
                                const nextInput = document.querySelector<HTMLInputElement>(
                                  `input[data-price-index="${index + 1}"]`
                                );
                                if (nextInput) {
                                  nextInput.focus();
                                  nextInput.select?.();
                                }
                              }
                            }
                          }}
                          onChange={(val) => {
                            setNewPrices((prev) => ({
                              ...prev,
                              [p.ProductId]: val === '' ? '' : val,
                            }));
                          }}
                          styles={{
                            input: {
                              fontWeight: 600,
                              backgroundColor: isModified ? '#fdf2f4' : '#ffffff',
                              borderColor: isModified ? '#800020' : '#cbd5e1',
                              color: '#0f172a',
                            },
                          }}
                        />
                      </Table.Td>

                      {/* Status */}
                      <Table.Td style={{ textAlign: 'center' }}>
                        <Badge
                          size="xs"
                          variant="outline"
                          style={{
                            borderColor: p.IsActive ? '#800020' : '#dc2626',
                            color: p.IsActive ? '#800020' : '#dc2626',
                            backgroundColor: 'transparent',
                            fontWeight: 600,
                            letterSpacing: '0.4px',
                          }}
                        >
                          {p.IsActive ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      {/* Bottom Action Footer */}
      <Group justify="space-between" align="center" pt="xs" pb="md" wrap="wrap" gap="md">
        <Text size="sm" c="dimmed">
          {modifiedProducts.length > 0
            ? `${modifiedProducts.length} product(s) modified. Press Enter on the last item or click Save.`
            : `Showing ${filteredProducts.length} product(s).`}
        </Text>

        <Group gap="sm" wrap="wrap">
          {modifiedProducts.length > 0 && (
            <Button variant="default" size="sm" radius={10} onClick={handleReset}>
              Reset
            </Button>
          )}

          <Button
            color="burgundy"
            radius={10}
            size="sm"
            leftSection={<IconCurrencyRupee size={16} />}
            loading={saveMutation.isPending}
            disabled={modifiedProducts.length === 0}
            onClick={() => saveMutation.mutate()}
          >
            {modifiedProducts.length > 0
              ? `Save ${modifiedProducts.length} Changes`
              : 'Save Changes'}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
};
