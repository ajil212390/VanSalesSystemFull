import React, { useState, useMemo } from 'react';
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
  Collapse,
  SimpleGrid,
  CloseButton,
  Switch,
  ActionIcon,
  Box,
  Transition,
  Tooltip,
} from '@mantine/core';
import { IconPencil, IconTrash, IconSearch, IconCylinder, IconCurrencyRupee } from '@tabler/icons-react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface ProductItem {
  ProductId: number;
  ProductCode: string | null;
  ProductName: string;
  AppProductName?: string | null;
  Category: number;
  category_name?: string | null;
  Unit: number;
  unit_name?: string | null;
  AltUnit: number | null;
  alt_unit_name?: string | null;
  UnitConversion: string | number | null;
  HSNCode: string | null;
  GSTPercentage: string | number;
  SalesPrice: string | number;
  PurchasePrice: string | number;
  MRP: string | number;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string;
  CompanyId: number;
  delete_block_reason?: string | null;
}

interface CategoryOption {
  CategoryId: number;
  CategoryName: string;
}

interface UnitOption {
  UnitId: number;
  UnitName: string;
}

interface ProductFormValues {
  ProductName: string;
  AppProductName: string;
  ProductCode: string;
  Category: string;
  Unit: string;
  AltUnit: string | null;
  UnitConversion: number | string;
  HSNCode: string;
  GSTPercentage: number | string;
  SalesPrice: number | string;
  PurchasePrice: number | string;
  MRP: number | string;
  IsActive: boolean;
}

const defaultProductValues: ProductFormValues = {
  ProductName: '',
  AppProductName: '',
  ProductCode: '',
  Category: '',
  Unit: '',
  AltUnit: null,
  UnitConversion: '',
  HSNCode: '',
  GSTPercentage: '',
  SalesPrice: '',
  PurchasePrice: '',
  MRP: '',
  IsActive: true,
};

export const ProductsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [formOpened, setFormOpened] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Fetch Products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<ProductItem[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // 2. Fetch Categories for dropdown
  const { data: categories = [] } = useQuery<CategoryOption[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // 3. Fetch Units for dropdown
  const { data: units = [] } = useQuery<UnitOption[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await apiClient.get('/units/');
      return Array.isArray(res.data) ? res.data : (res.data.results || []);
    },
  });

  // Form management
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    defaultValues: defaultProductValues,
  });

  // Save / Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const payload = {
        ProductName: data.ProductName.trim(),
        AppProductName: data.AppProductName?.trim() || null,
        ProductCode: data.ProductCode.trim() || null,
        Category: Number(data.Category),
        Unit: Number(data.Unit),
        AltUnit: data.AltUnit ? Number(data.AltUnit) : null,
        UnitConversion: data.UnitConversion !== '' && data.UnitConversion !== null ? Number(data.UnitConversion) : null,
        HSNCode: data.HSNCode.trim() || null,
        GSTPercentage: data.GSTPercentage !== '' && data.GSTPercentage !== null ? Number(data.GSTPercentage) : 0,
        SalesPrice: data.SalesPrice !== '' && data.SalesPrice !== null ? Number(data.SalesPrice) : 0,
        PurchasePrice: data.PurchasePrice !== '' && data.PurchasePrice !== null ? Number(data.PurchasePrice) : 0,
        MRP: data.MRP !== '' && data.MRP !== null ? Number(data.MRP) : 0,
        IsActive: data.IsActive,
      };

      if (editingProduct) {
        const res = await apiClient.patch(`/products/${editingProduct.ProductId}/`, payload);
        return res.data;
      } else {
        const res = await apiClient.post('/products/', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      notifications.show({
        title: 'Success',
        message: editingProduct
          ? 'Product updated successfully.'
          : 'Product created successfully.',
        color: 'teal',
      });
      setFormOpened(false);
      setEditingProduct(null);
      reset(defaultProductValues);
    },
    onError: (err: any) => {
      const detail =
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})
          .flat()
          .join(', ') ||
        'Failed to save product.';
      notifications.show({
        title: 'Error',
        message: String(detail),
        color: 'red',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (productId: number) => {
      await apiClient.delete(`/products/${productId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      notifications.show({
        title: 'Deleted',
        message: 'Product deleted successfully.',
        color: 'teal',
      });
      setProductToDelete(null);
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || 'Failed to delete product.';
      notifications.show({
        title: 'Error',
        message: String(detail),
        color: 'red',
      });
      setProductToDelete(null);
    },
  });

  const onSubmit = (data: ProductFormValues) => {
    saveMutation.mutate(data);
  };

  const handleCloseForm = () => {
    setFormOpened(false);
    setEditingProduct(null);
    reset(defaultProductValues);
  };

  const handleAddNew = () => {
    if (formOpened && !editingProduct) {
      handleCloseForm();
      return;
    }
    setEditingProduct(null);
    reset(defaultProductValues);
    setFormOpened(true);
  };

  const handleEdit = (product: ProductItem) => {
    setEditingProduct(product);
    reset({
      ProductName: product.ProductName,
      AppProductName: product.AppProductName || '',
      ProductCode: product.ProductCode || '',
      Category: String(product.Category),
      Unit: String(product.Unit),
      AltUnit: product.AltUnit ? String(product.AltUnit) : null,
      UnitConversion: product.UnitConversion ?? '',
      HSNCode: product.HSNCode || '',
      GSTPercentage: product.GSTPercentage !== null && product.GSTPercentage !== undefined ? Number(product.GSTPercentage) : '',
      SalesPrice: product.SalesPrice !== null && product.SalesPrice !== undefined ? Number(product.SalesPrice) : '',
      PurchasePrice: product.PurchasePrice !== null && product.PurchasePrice !== undefined ? Number(product.PurchasePrice) : '',
      MRP: product.MRP !== null && product.MRP !== undefined ? Number(product.MRP) : '',
      IsActive: product.IsActive,
    });
    setFormOpened(true);
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.ProductName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.AppProductName && p.AppProductName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.ProductCode && p.ProductCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category_name && p.category_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.HSNCode && p.HSNCode.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategoryFilter
        ? String(p.Category) === selectedCategoryFilter
        : true;

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategoryFilter]);

  // Options for Dropdowns
  const categoryOptions = useMemo(() => {
    return categories.map((c) => ({
      value: String(c.CategoryId),
      label: c.CategoryName,
    }));
  }, [categories]);

  const unitOptions = useMemo(() => {
    return units.map((u) => ({
      value: String(u.UnitId),
      label: u.UnitName,
    }));
  }, [units]);

  return (
    <Stack gap="lg">
      {/* Page Header */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Products
          </Title>
          <Text size="sm" c="dimmed">
            Manage LPG gas cylinders, accessories, and pricing catalogs.
          </Text>
        </div>

        {/* Right Actions: Category Filter + Search Bar + Add Button */}
        <Group gap="xs" align="center" wrap="wrap" style={{ flexGrow: 1, justifyContent: 'flex-end' }}>
          <Transition mounted={!formOpened} transition="fade" duration={200}>
            {(catFilterStyles) => (
              <Box style={{ ...catFilterStyles, width: 140, flexGrow: 1, minWidth: 130 }}>
                <Select
                  placeholder="All Categories"
                  data={categoryOptions}
                  value={selectedCategoryFilter}
                  onChange={(val) => setSelectedCategoryFilter(val ? String(val) : null)}
                  clearable
                  size="sm"
                  radius="md"
                />
              </Box>
            )}
          </Transition>

          <Transition mounted={!formOpened} transition="fade" duration={200}>
            {(searchStyles) => (
              <Box style={{ ...searchStyles, width: 190, flexGrow: 1, minWidth: 160 }}>
                <TextInput
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  leftSection={<IconSearch size={16} stroke={1.5} color="#800020" />}
                  rightSection={
                    searchQuery ? (
                      <CloseButton
                        size="sm"
                        aria-label="Clear search"
                        onClick={() => setSearchQuery('')}
                      />
                    ) : null
                  }
                  radius="md"
                  size="sm"
                />
              </Box>
            )}
          </Transition>

          <Transition mounted={!formOpened} transition="fade" duration={200}>
            {(btnStyles) => (
              <Group gap="xs" style={btnStyles} wrap="wrap">
                <Button
                  variant="outline"
                  color="burgundy"
                  radius={10}
                  leftSection={<IconCurrencyRupee size={16} stroke={1.5} />}
                  onClick={() => navigate('/price-update')}
                >
                  Price Update
                </Button>
                <Button color="burgundy" radius={10} onClick={handleAddNew}>
                  + Add Product
                </Button>
              </Group>
            )}
          </Transition>
        </Group>
      </Group>

      {/* Seamless Form & Table Container */}
      <Box>
        {/* Smooth Slide-Down Form Panel */}
        <Collapse expanded={formOpened} transitionDuration={250} transitionTimingFunction="ease">
          <Paper
            p="lg"
            radius="sm"
            withBorder
            style={{
              backgroundColor: '#ffffff',
              borderColor: '#f5c2cb',
              borderLeft: '4px solid #800020',
            }}
          >
            <Group justify="space-between" align="flex-start" mb="md">
              <div>
                <Text fw={700} style={{ color: '#800020' }}>
                  {editingProduct ? `Edit Product: ${editingProduct.ProductName}` : 'New Product Details'}
                </Text>
                <Text size="xs" c="dimmed">
                  {editingProduct
                    ? 'Update product catalog information, category classification, units, and commercial pricing.'
                    : 'Specify product name, category, measurement unit, tax details, and commercial pricing.'}
                </Text>
              </div>
              <CloseButton
                size="md"
                onClick={handleCloseForm}
              />
            </Group>

            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack gap="md">
                {/* Row 1: Product Name, Mobile App Name & Product Code */}
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                  <TextInput
                    label="Product Name (ERP & Invoices)"
                    placeholder="e.g. 19 KG Commercial Gas Cylinder"
                    required
                    {...register('ProductName', { required: 'Product name is required' })}
                    error={errors.ProductName?.message}
                  />

                  <TextInput
                    label="Display Name"
                    placeholder="e.g. 19 Kg Commercial"
      
                    {...register('AppProductName')}
                  />

                  <TextInput
                    label="Product Code / PLU (Optional)"
                    placeholder="e.g. LPG-19KG"
                    {...register('ProductCode')}
                  />
                </SimpleGrid>

                {/* Row 2: Measurement Units (Main Unit, Alternate Unit, Unit Conversion) */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <Controller
                    name="Unit"
                    control={control}
                    rules={{ required: 'Main unit is required' }}
                    render={({ field }) => (
                      <Select
                        label="Main Unit"
                        placeholder="Select Unit"
                        required
                        data={unitOptions}
                        value={field.value || null}
                        onChange={(val) => field.onChange(val || '')}
                        searchable
                        clearable
                        nothingFoundMessage="No units found"
                        error={errors.Unit?.message}
                      />
                    )}
                  />

                  <Controller
                    name="AltUnit"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Alternate Unit (Optional)"
                        placeholder="Leave empty if none"
                        data={unitOptions}
                        value={field.value || null}
                        onChange={(val) => field.onChange(val || null)}
                        clearable
                        searchable
                      />
                    )}
                  />

                  <Controller
                    name="UnitConversion"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label="Unit Conversion (Optional)"
                        placeholder="e.g. 19.00 (1 Base = X Alt)"
                        min={0}
                        decimalScale={2}
                        hideControls
                        value={field.value === '' || field.value === null || field.value === undefined ? '' : field.value}
                        onChange={(val) => field.onChange(val === '' ? '' : val)}
                      />
                    )}
                  />
                </SimpleGrid>

                {/* Row 3: Classification & Tax (Category, HSN Code, GST Rate) */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <Controller
                    name="Category"
                    control={control}
                    rules={{ required: 'Category is required' }}
                    render={({ field }) => (
                      <Select
                        label="Category"
                        placeholder="Select Category"
                        required
                        data={categoryOptions}
                        value={field.value || null}
                        onChange={(val) => field.onChange(val || '')}
                        searchable
                        clearable
                        nothingFoundMessage="No categories found"
                        error={errors.Category?.message}
                      />
                    )}
                  />

                  <TextInput
                    label="HSN Code (Optional)"
                    placeholder="e.g. 27111200"
                    {...register('HSNCode')}
                  />

                  <Controller
                    name="GSTPercentage"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label="GST Rate"
                        placeholder="0.00"
                        min={0}
                        max={100}
                        decimalScale={2}
                        suffix=" %"
                        hideControls
                        value={field.value === '' || field.value === null || field.value === undefined ? '' : field.value}
                        onChange={(val) => field.onChange(val === '' ? '' : val)}
                      />
                    )}
                  />
                </SimpleGrid>

                {/* Row 4: Commercial Pricing (Sales Price, Purchase Price, MRP) */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <Controller
                    name="SalesPrice"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label="Sales Price"
                        placeholder="0.00"
                        min={0}
                        decimalScale={2}
                        prefix="₹ "
                        hideControls
                        value={field.value === '' || field.value === null || field.value === undefined ? '' : field.value}
                        onChange={(val) => field.onChange(val === '' ? '' : val)}
                      />
                    )}
                  />

                  <Controller
                    name="PurchasePrice"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label="Purchase Price"
                        placeholder="0.00"
                        min={0}
                        decimalScale={2}
                        prefix="₹ "
                        hideControls
                        value={field.value === '' || field.value === null || field.value === undefined ? '' : field.value}
                        onChange={(val) => field.onChange(val === '' ? '' : val)}
                      />
                    )}
                  />

                  <Controller
                    name="MRP"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label="MRP"
                        placeholder="0.00"
                        min={0}
                        decimalScale={2}
                        prefix="₹ "
                        hideControls
                        value={field.value === '' || field.value === null || field.value === undefined ? '' : field.value}
                        onChange={(val) => field.onChange(val === '' ? '' : val)}
                      />
                    )}
                  />
                </SimpleGrid>

                {/* Row 5: Status Switch on Left, Action Buttons on Right */}
                <Group justify="space-between" align="center" wrap="wrap" gap="md" mt="xs">
                  <Controller
                    name="IsActive"
                    control={control}
                    render={({ field }) => (
                      <Paper p="xs" px="sm" radius="sm" withBorder style={{ backgroundColor: '#fcfcfc', borderColor: '#e2e8f0' }}>
                        <Switch
                          label={field.value ? 'Product Status: Active' : 'Product Status: Inactive'}
                          description={field.value ? 'Available in sales, stock & van orders' : 'Disabled from product catalog'}
                          checked={field.value}
                          onChange={(e) => field.onChange(e.currentTarget.checked)}
                          color="burgundy"
                          size="sm"
                        />
                      </Paper>
                    )}
                  />

                  <Group gap="sm">
                    <Button
                      variant="default"
                      onClick={handleCloseForm}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      color="burgundy"
                      loading={isSubmitting || saveMutation.isPending}
                    >
                      {editingProduct ? 'Save Changes' : 'Create Product'}
                    </Button>
                  </Group>
                </Group>
              </Stack>
            </form>
          </Paper>
        </Collapse>

        {/* Animated Products Table */}
        <Transition mounted={!formOpened} transition="fade" duration={250} timingFunction="ease">
          {(styles) => (
            <Paper
              radius="sm"
              withBorder
              style={{
                ...styles,
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                overflow: 'hidden',
              }}
            >
              {isLoadingProducts ? (
                <Center p="xl" style={{ minHeight: 250 }}>
                  <Loader color="burgundy" size="md" />
                </Center>
              ) : filteredProducts.length === 0 ? (
                <Center p="xl" style={{ minHeight: 250 }}>
                  <Stack align="center" gap="xs">
                    <IconCylinder size={38} color="#800020" stroke={1.5} />
                    <Text fw={600} size="sm" c="dimmed">
                      {searchQuery || selectedCategoryFilter
                        ? 'No products matching your search filter.'
                        : 'No products added yet. Click "+ Add Product" to create your first item.'}
                    </Text>
                    {!searchQuery && !selectedCategoryFilter && (
                      <Button color="burgundy" size="xs" radius={8} onClick={handleAddNew}>
                        + Add First Product
                      </Button>
                    )}
                  </Stack>
                </Center>
              ) : (
                                <Table.ScrollContainer minWidth={900}>
                  <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
                    <Table.Thead style={{ backgroundColor: '#fcfcfc', borderBottom: '1px solid #e2e8f0' }}>
                      <Table.Tr>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13 }}>Code</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13 }}>Product Name</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13 }}>Category</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13 }}>Unit</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>Sales Price</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>MRP</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>GST</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Status</Table.Th>
                        <Table.Th style={{ color: '#800020', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredProducts.map((product) => {
                        const isBlockDelete = Boolean(product.delete_block_reason);
                        return (
                          <Table.Tr key={product.ProductId}>
                            {/* Code */}
                            <Table.Td>
                              <Text size="xs" c="#1e293b" ff="monospace" fw={600}>
                                {product.ProductCode || '—'}
                              </Text>
                            </Table.Td>

                            {/* Product Name */}
                            <Table.Td>
                              <Group gap="xs" wrap="nowrap">
                                <IconCylinder size={16} color="#800020" stroke={1.75} />
                                <Text fw={600} size="sm" c="#1e293b">
                                  {product.ProductName}
                                </Text>
                              </Group>
                            </Table.Td>

                            {/* Category */}
                            <Table.Td>
                              <Text size="sm" fw={500} c="#475569">
                                {product.category_name || '—'}
                              </Text>
                            </Table.Td>

                            {/* Unit */}
                            <Table.Td>
                              <Badge
                                size="xs"
                                variant="outline"
                                style={{
                                  borderColor: '#cbd5e1',
                                  color: '#475569',
                                  backgroundColor: '#f8fafc',
                                  fontWeight: 600,
                                }}
                              >
                                {product.unit_name || '—'}
                              </Badge>
                            </Table.Td>

                            {/* Sales Price */}
                            <Table.Td style={{ textAlign: 'right' }}>
                              <Text fw={600} size="sm" c="#0f172a">
                                ₹{Number(product.SalesPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Text>
                            </Table.Td>

                            {/* MRP */}
                            <Table.Td style={{ textAlign: 'right' }}>
                              <Text fw={600} size="sm" c="#334155">
                                ₹{Number(product.MRP || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Text>
                            </Table.Td>

                            {/* GST */}
                            <Table.Td style={{ textAlign: 'center' }}>
                              <Text size="sm" c="#0f172a" fw={600}>
                                {Number(product.GSTPercentage || 0)}%
                              </Text>
                            </Table.Td>

                            {/* Status */}
                            <Table.Td style={{ textAlign: 'center' }}>
                              <Badge
                                size="sm"
                                variant="outline"
                                style={{
                                  borderColor: product.IsActive ? '#800020' : '#dc2626',
                                  color: product.IsActive ? '#800020' : '#dc2626',
                                  backgroundColor: 'transparent',
                                  fontWeight: 600,
                                  letterSpacing: '0.4px',
                                }}
                              >
                                {product.IsActive ? 'ACTIVE' : 'INACTIVE'}
                              </Badge>
                            </Table.Td>

                            {/* Actions */}
                            <Table.Td style={{ textAlign: 'right' }}>
                              <Group gap={4} justify="flex-end" wrap="nowrap">
                                <ActionIcon
                                  variant="subtle"
                                  color="burgundy"
                                  size="sm"
                                  onClick={() => handleEdit(product)}
                                  title="Edit product"
                                >
                                  <IconPencil size={16} />
                                </ActionIcon>

                                <Tooltip
                                  label={product.delete_block_reason || 'Delete product'}
                                  disabled={!isBlockDelete}
                                  withArrow
                                  color="dark"
                                >
                                  <Box component="span">
                                    <ActionIcon
                                      variant="subtle"
                                      color="burgundy"
                                      size="sm"
                                      disabled={isBlockDelete}
                                      onClick={() => setProductToDelete(product)}
                                      title="Delete product"
                                      style={{ color: isBlockDelete ? undefined : '#800020' }}
                                    >
                                      <IconTrash size={15} />
                                    </ActionIcon>
                                  </Box>
                                </Tooltip>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>

              )}
            </Paper>
          )}
        </Transition>
      </Box>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        opened={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={() => {
          if (productToDelete) {
            deleteMutation.mutate(productToDelete.ProductId);
          }
        }}
        title="Delete Product"
        description={`Are you sure you want to delete "${productToDelete?.ProductName}"? This action cannot be undone.`}
        loading={deleteMutation.isPending}
      />
    </Stack>
  );
};
