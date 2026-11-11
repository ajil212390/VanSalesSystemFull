import React, { useState, useMemo, useEffect } from 'react';
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
  Box,
  Tooltip,
  ActionIcon,
  Alert,
} from '@mantine/core';
import {
  IconSearch,
  IconCylinder,
  IconCurrencyRupee,
  IconArrowLeft,
  IconUser,
  IconTags,
  IconCheck,
  IconRefresh,
} from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const initialCustomerId = searchParams.get('customer') || null;
  const [mode, setMode] = useState<'standard' | 'customer'>(initialCustomerId ? 'customer' : 'standard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Standard prices draft: Record<ProductId, draftPrice>
  const [newPrices, setNewPrices] = useState<Record<number, number | string>>({});

  // Customer-specific special prices draft: Record<ProductId, specialPrice | ''>
  const [custPricesDraft, setCustPricesDraft] = useState<Record<number, number | string>>({});

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

  // 3. Fetch Customers (Sundry Debtors)
  const { data: ledgers = [] } = useQuery<any[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  const customerOptions = useMemo(() => {
    return ledgers
      .filter((l: any) => {
        const gName = (l.group_name || l.GroupName || '').toLowerCase();
        const gid = Number(l.GroupId ?? l.Group ?? 0);
        return gid === 21 || gName.includes('debtor') || gName.includes('customer');
      })
      .map((l: any) => ({
        value: String(l.LedgerId),
        label: `${l.LedgerName}${l.MobileNumber ? ` (${l.MobileNumber})` : ''}`,
      }));
  }, [ledgers]);

  const selectedCustomerObj = useMemo(() => {
    return ledgers.find((l: any) => String(l.LedgerId) === String(selectedCustomerId));
  }, [ledgers, selectedCustomerId]);

  // 4. Fetch Customer-Specific Special Prices when customer is selected
  const { data: customerSpecialPrices = [], isLoading: isLoadingCustPrices } = useQuery<any[]>({
    queryKey: ['customer-prices', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return [];
      const res = await apiClient.get(`/customer-prices/?customer=${selectedCustomerId}`);
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
    enabled: mode === 'customer' && !!selectedCustomerId,
  });

  // Initialize standard prices draft when products load
  useEffect(() => {
    if (products.length > 0 && Object.keys(newPrices).length === 0) {
      const initial: Record<number, number | string> = {};
      products.forEach((p) => {
        initial[p.ProductId] = p.SalesPrice !== null && p.SalesPrice !== undefined ? p.SalesPrice : '';
      });
      setNewPrices(initial);
    }
  }, [products]);

  // Sync customer prices draft when customerSpecialPrices loads or customer changes
  useEffect(() => {
    if (mode === 'customer' && selectedCustomerId) {
      const initial: Record<number, number | string> = {};
      customerSpecialPrices.forEach((cp: any) => {
        if (cp.SpecialPrice !== undefined && cp.SpecialPrice !== null) {
          initial[Number(cp.Product)] = cp.SpecialPrice;
        }
      });
      setCustPricesDraft(initial);
    } else {
      setCustPricesDraft({});
    }
  }, [mode, selectedCustomerId, customerSpecialPrices]);

  // Dropdown Category Options
  const categoryOptions = useMemo(() => {
    return categories.map((c) => ({
      value: String(c.CategoryId),
      label: c.CategoryName,
    }));
  }, [categories]);

  // Filtered Products
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

  // Count modified items for standard mode
  const modifiedStandardProducts = useMemo(() => {
    return products.filter((p) => {
      const current = Number(p.SalesPrice || 0);
      const draft = newPrices[p.ProductId];
      if (draft === undefined || draft === '') return false;
      return Number(draft) !== current;
    });
  }, [products, newPrices]);

  // Existing saved customer price map for comparison
  const savedCustPriceMap = useMemo(() => {
    const map = new Map<number, number>();
    customerSpecialPrices.forEach((cp: any) => {
      if (cp.SpecialPrice !== undefined && cp.SpecialPrice !== null) {
        map.set(Number(cp.Product), Number(cp.SpecialPrice));
      }
    });
    return map;
  }, [customerSpecialPrices]);

  // Count modified items for customer mode
  const modifiedCustomerProducts = useMemo(() => {
    return products.filter((p) => {
      const saved = savedCustPriceMap.get(p.ProductId);
      const draft = custPricesDraft[p.ProductId];
      const draftNum = draft !== undefined && draft !== '' ? Number(draft) : undefined;
      return draftNum !== saved;
    });
  }, [products, custPricesDraft, savedCustPriceMap]);

  // Standard Prices Bulk Save Mutation
  const saveStandardMutation = useMutation({
    mutationFn: async () => {
      if (modifiedStandardProducts.length === 0) {
        throw new Error('No price changes detected.');
      }
      await Promise.all(
        modifiedStandardProducts.map((p) => {
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
        title: 'Prices Updated',
        message: `${modifiedStandardProducts.length} standard catalogue price(s) saved successfully.`,
        color: 'green',
      });
      navigate('/products');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to update standard prices.';
      notifications.show({
        title: 'Update Error',
        message: String(msg),
        color: 'red',
      });
    },
  });

  // Customer Special Prices Bulk Save Mutation
  const saveCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId) {
        throw new Error('Please select a customer first.');
      }
      const pricesPayload = products.map((p) => {
        const val = custPricesDraft[p.ProductId];
        return {
          product_id: p.ProductId,
          special_price: val !== undefined && val !== '' ? Number(val) : null,
        };
      });

      const res = await apiClient.post('/customer-prices/bulk_update/', {
        customer_id: Number(selectedCustomerId),
        prices: pricesPayload,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-prices', selectedCustomerId] });
      notifications.show({
        title: 'Special Prices Saved',
        message: `Custom cylinder rates updated for ${selectedCustomerObj?.LedgerName || 'customer'}.`,
        color: 'green',
      });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to save customer prices.';
      notifications.show({
        title: 'Save Failed',
        message: String(msg),
        color: 'red',
      });
    },
  });

  const handleResetStandard = () => {
    const initial: Record<number, number | string> = {};
    products.forEach((p) => {
      initial[p.ProductId] = p.SalesPrice !== null && p.SalesPrice !== undefined ? p.SalesPrice : '';
    });
    setNewPrices(initial);
  };

  const handleResetCustomer = () => {
    const initial: Record<number, number | string> = {};
    customerSpecialPrices.forEach((cp: any) => {
      if (cp.SpecialPrice !== undefined && cp.SpecialPrice !== null) {
        initial[Number(cp.Product)] = cp.SpecialPrice;
      }
    });
    setCustPricesDraft(initial);
  };

  return (
    <Stack gap="lg" style={{ width: '100%' }}>
      {/* ── Top Navigation & Page Title ── */}
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
          <Title order={2} style={{ color: '#800020', fontWeight: 800, marginTop: 4, fontSize: 24, letterSpacing: '-0.02em' }}>
            {mode === 'customer' ? 'Customer-Specific Pricing' : 'Product Price Master'}
          </Title>
          <Text size="xs" c="dimmed">
            {mode === 'customer'
              ? 'Configure custom cylinder rates for individual commercial buyers, hotels, or bulk accounts.'
              : 'Update standard catalogue selling prices across all cylinders and products.'}
          </Text>
        </div>

        {/* Pricing Mode Switcher */}
        <Box
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 9999,
            padding: 4,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <Group gap={4}>
            <Button
              variant={mode === 'standard' ? 'filled' : 'subtle'}
              size="xs"
              radius="xl"
              leftSection={<IconTags size={14} />}
              style={{
                backgroundColor: mode === 'standard' ? '#800020' : 'transparent',
                color: mode === 'standard' ? '#ffffff' : '#64748b',
                fontWeight: mode === 'standard' ? 700 : 500,
              }}
              onClick={() => setMode('standard')}
            >
              Standard Catalogue
            </Button>
            <Button
              variant={mode === 'customer' ? 'filled' : 'subtle'}
              size="xs"
              radius="xl"
              leftSection={<IconUser size={14} />}
              style={{
                backgroundColor: mode === 'customer' ? '#800020' : 'transparent',
                color: mode === 'customer' ? '#ffffff' : '#64748b',
                fontWeight: mode === 'customer' ? 700 : 500,
              }}
              onClick={() => setMode('customer')}
            >
              Customer-Specific Rates
            </Button>
          </Group>
        </Box>
      </Group>

      {/* ── Customer Mode Header Notice & Customer Selector ── */}
      {mode === 'customer' && (
        <Paper p="md" radius="md" style={{ backgroundColor: '#fcf8f9', border: '1px solid #f7d6dc' }}>
          <Group justify="space-between" align="center" wrap="wrap" gap="md">
            <Group gap="sm" align="center" style={{ flexGrow: 1, minWidth: 280, maxWidth: 500 }}>
              <Box style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#fdf2f4', color: '#800020', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconUser size={18} stroke={2} />
              </Box>
              <div style={{ flex: 1 }}>
                <Text size="xs" fw={700} c="#800020" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                  Select Customer / Buyer
                </Text>
                <Select
                  placeholder="Choose customer (e.g. Sreelesh, Hotel Grand...)"
                  data={customerOptions}
                  value={selectedCustomerId}
                  onChange={(val) => setSelectedCustomerId(val)}
                  searchable
                  clearable
                  radius="md"
                  size="sm"
                  mt={4}
                  style={{ width: '100%' }}
                />
              </div>
            </Group>

            {selectedCustomerObj && (
              <Group gap="lg">
                <Box>
                  <Text size="xs" c="dimmed">Customer Contact</Text>
                  <Text size="sm" fw={600} c="#1e293b">{selectedCustomerObj.MobileNumber || selectedCustomerObj.PhoneNumber || 'No Phone'}</Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed">Credit Movement Term</Text>
                  <Badge variant="light" color="burgundy" size="sm">
                    {selectedCustomerObj.CreditPeriodDays || 15} Days
                  </Badge>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed">Active Special Rates</Text>
                  <Text size="sm" fw={700} c="#800020">
                    {Object.values(custPricesDraft).filter((v) => v !== undefined && v !== '' && Number(v) > 0).length} Product(s)
                  </Text>
                </Box>
              </Group>
            )}
          </Group>
        </Paper>
      )}

      {/* ── Search Bar & Category Filters ── */}
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Group gap="xs" style={{ flexGrow: 1, maxWidth: 600 }}>
          <TextInput
            placeholder="Search cylinders / products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            leftSection={<IconSearch size={16} stroke={1.5} color="#800020" />}
            rightSection={searchQuery ? <CloseButton size="sm" onClick={() => setSearchQuery('')} /> : null}
            radius="md"
            size="sm"
            style={{ flexGrow: 1, minWidth: 200 }}
          />

          <Select
            placeholder="All Categories"
            data={categoryOptions}
            value={selectedCategoryFilter}
            onChange={(val) => setSelectedCategoryFilter(val ? String(val) : null)}
            clearable
            radius="md"
            size="sm"
            style={{ width: 170 }}
          />
        </Group>

        {mode === 'customer' && !selectedCustomerId && (
          <Alert color="burgundy" variant="light" p="xs" style={{ padding: '6px 14px' }}>
            <Text size="xs" fw={600} c="#800020">
              Please choose a customer above to view and set their custom rates.
            </Text>
          </Alert>
        )}
      </Group>

      {/* ── Main Full-Screen Table Container ── */}
      <Paper radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden' }}>
        {isLoadingProducts || (mode === 'customer' && isLoadingCustPrices) ? (
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
              <Table.Thead style={{ backgroundColor: '#fcf8f9', borderBottom: '1px solid #f1f5f9' }}>
                <Table.Tr>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12.5, minWidth: 260 }}>
                    PRODUCT NAME
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12.5, minWidth: 140 }}>
                    CATEGORY
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12.5, minWidth: 160, textAlign: 'right' }}>
                    STANDARD PRICE (₹)
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12.5, minWidth: 220 }}>
                    {mode === 'customer' ? 'SPECIAL CUSTOMER PRICE (₹)' : 'NEW SALES PRICE (₹)'}
                  </Table.Th>
                  <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12.5, minWidth: 140, textAlign: 'center' }}>
                    PRICING STATUS
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredProducts.map((p, index) => {
                  const standardPrice = Number(p.SalesPrice || 0);

                  if (mode === 'customer') {
                    // Customer Mode Logic
                    const savedSpecial = savedCustPriceMap.get(p.ProductId);
                    const draftVal = custPricesDraft[p.ProductId];
                    const hasSpecial = draftVal !== undefined && draftVal !== '' && Number(draftVal) > 0;
                    const isModified = (draftVal !== undefined && draftVal !== '' ? Number(draftVal) : undefined) !== savedSpecial;

                    return (
                      <Table.Tr
                        key={p.ProductId}
                        style={{
                          backgroundColor: isModified ? '#fdf2f4' : hasSpecial ? '#fffcfc' : undefined,
                          transition: 'background-color 200ms ease',
                        }}
                      >
                        {/* Product */}
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <IconCylinder size={18} color="#800020" style={{ flexShrink: 0 }} />
                            <div>
                              <Text fw={650} size="sm" c="#1e293b" style={{ whiteSpace: 'nowrap' }}>
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

                        {/* Standard Default Price */}
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text fw={600} size="sm" c="#64748b">
                            ₹{standardPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        </Table.Td>

                        {/* Special Price Input */}
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <NumberInput
                              data-price-index={index}
                              size="sm"
                              radius="md"
                              min={0}
                              decimalScale={2}
                              hideControls
                              prefix="₹ "
                              disabled={!selectedCustomerId}
                              placeholder={`Standard (₹${standardPrice.toFixed(2)})`}
                              value={draftVal !== undefined ? draftVal : ''}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(val) => {
                                setCustPricesDraft((prev) => ({
                                  ...prev,
                                  [p.ProductId]: val === '' ? '' : val,
                                }));
                              }}
                              styles={{
                                input: {
                                  fontWeight: 650,
                                  backgroundColor: isModified ? '#fdf2f4' : hasSpecial ? '#fef6f7' : '#ffffff',
                                  borderColor: isModified ? '#800020' : hasSpecial ? '#f5b5c2' : '#cbd5e1',
                                  color: hasSpecial ? '#800020' : '#0f172a',
                                },
                              }}
                            />
                            {hasSpecial && (
                              <Tooltip label="Reset to Standard Price" withArrow position="top">
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  color="gray"
                                  onClick={() => {
                                    setCustPricesDraft((prev) => ({
                                      ...prev,
                                      [p.ProductId]: '',
                                    }));
                                  }}
                                >
                                  <IconRefresh size={14} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </Group>
                        </Table.Td>

                        {/* Status */}
                        <Table.Td style={{ textAlign: 'center' }}>
                          {hasSpecial ? (
                            <Badge size="xs" variant="filled" color="burgundy">
                              Special Rate
                            </Badge>
                          ) : (
                            <Badge size="xs" variant="light" color="gray">
                              Standard Rate
                            </Badge>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    );
                  }

                  // Standard Mode Logic
                  const draftVal = newPrices[p.ProductId];
                  const isModified = draftVal !== undefined && draftVal !== '' && Number(draftVal) !== standardPrice;

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
                            <Text fw={650} size="sm" c="#1e293b" style={{ whiteSpace: 'nowrap' }}>
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
                        <Text fw={600} size="sm" c="#64748b">
                          ₹{standardPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>

                      {/* New Sales Price Input */}
                      <Table.Td>
                        <NumberInput
                          data-price-index={index}
                          size="sm"
                          radius="md"
                          min={0}
                          decimalScale={2}
                          hideControls
                          prefix="₹ "
                          value={draftVal !== undefined ? draftVal : p.SalesPrice}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(val) => {
                            setNewPrices((prev) => ({
                              ...prev,
                              [p.ProductId]: val === '' ? '' : val,
                            }));
                          }}
                          styles={{
                            input: {
                              fontWeight: 650,
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

      {/* ── Bottom Action Footer ── */}
      <Group justify="space-between" align="center" pt="xs" pb="md" wrap="wrap" gap="md">
        <Text size="xs" c="dimmed">
          {mode === 'customer'
            ? selectedCustomerObj
              ? `${modifiedCustomerProducts.length} rate modification(s) for ${selectedCustomerObj.LedgerName}. Leave empty to use standard catalogue price.`
              : 'Select a customer above to manage their contracted rates.'
            : modifiedStandardProducts.length > 0
            ? `${modifiedStandardProducts.length} product(s) modified.`
            : `Showing ${filteredProducts.length} catalogue items.`}
        </Text>

        <Group gap="sm" wrap="wrap">
          {mode === 'customer' ? (
            <>
              {modifiedCustomerProducts.length > 0 && (
                <Button variant="default" size="sm" radius="md" onClick={handleResetCustomer}>
                  Reset
                </Button>
              )}
              <Button
                color="burgundy"
                radius="md"
                size="sm"
                leftSection={<IconCheck size={16} />}
                loading={saveCustomerMutation.isPending}
                disabled={!selectedCustomerId || modifiedCustomerProducts.length === 0}
                onClick={() => saveCustomerMutation.mutate()}
                style={{ backgroundColor: '#800020' }}
              >
                {modifiedCustomerProducts.length > 0
                  ? `Save ${modifiedCustomerProducts.length} Special Rate(s)`
                  : 'Save Special Rates'}
              </Button>
            </>
          ) : (
            <>
              {modifiedStandardProducts.length > 0 && (
                <Button variant="default" size="sm" radius="md" onClick={handleResetStandard}>
                  Reset
                </Button>
              )}
              <Button
                color="burgundy"
                radius="md"
                size="sm"
                leftSection={<IconCurrencyRupee size={16} />}
                loading={saveStandardMutation.isPending}
                disabled={modifiedStandardProducts.length === 0}
                onClick={() => saveStandardMutation.mutate()}
                style={{ backgroundColor: '#800020' }}
              >
                {modifiedStandardProducts.length > 0
                  ? `Save ${modifiedStandardProducts.length} Changes`
                  : 'Save Changes'}
              </Button>
            </>
          )}
        </Group>
      </Group>
    </Stack>
  );
};
