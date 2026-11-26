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
  Box,
  Tooltip,
  Modal,
  Checkbox,
  Divider,
  ScrollArea,
} from '@mantine/core';
import {
  IconSearch,
  IconCylinder,
  IconCurrencyRupee,
  IconUser,
  IconTags,
  IconCheck,
  IconRefresh,
  IconTrendingUp,
  IconUpload,
  IconDownload,
  IconHistory,
  IconFileSpreadsheet,
} from '@tabler/icons-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import * as XLSX from 'xlsx';
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

interface PriceHistoryItem {
  HistoryId: number;
  ProductId: number | null;
  ProductName: string;
  HikeAmount: number | string;
  OldBasePrice: number | string;
  NewBasePrice: number | string;
  AffectedCustomersCount: number;
  UpdatedBy: string;
  CreatedTimestamp: string;
}

const EMPTY_ARRAY: any[] = [];

export const PriceUpdatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const initialCustomerId = searchParams.get('customer') || null;
  const [mode, setMode] = useState<'standard' | 'customer' | 'history'>(initialCustomerId ? 'customer' : 'standard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Standard prices draft: Record<ProductId, draftPrice>
  const [newPrices, setNewPrices] = useState<Record<number, number | string>>({});

  // Customer-specific special prices draft: Record<ProductId, specialPrice | ''>
  const [custPricesDraft, setCustPricesDraft] = useState<Record<number, number | string>>({});

  // Bulk Hike Modal State
  const [bulkHikeModalOpened, setBulkHikeModalOpened] = useState(false);
  const [selectedHikeProductIds, setSelectedHikeProductIds] = useState<number[]>([]);
  const [globalHikeAmount, setGlobalHikeAmount] = useState<number | ''>(40);
  const [productHikesDraft, setProductHikesDraft] = useState<Record<number, number | ''>>({});

  // Bulk Import Modal State
  const [bulkImportModalOpened, setBulkImportModalOpened] = useState(false);
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Products
  const { data: products = EMPTY_ARRAY, isLoading: isLoadingProducts } = useQuery<ProductItem[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products/');
      return Array.isArray(res.data) ? res.data : (res.data.results || EMPTY_ARRAY);
    },
  });

  // 2. Fetch Categories
  const { data: categories = EMPTY_ARRAY } = useQuery<CategoryOption[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories/');
      return Array.isArray(res.data) ? res.data : (res.data.results || EMPTY_ARRAY);
    },
  });

  // 3. Fetch Customers (Sundry Debtors)
  const { data: ledgers = EMPTY_ARRAY } = useQuery<any[]>({
    queryKey: ['ledgers'],
    queryFn: async () => {
      const res = await apiClient.get('/ledgers/');
      return Array.isArray(res.data) ? res.data : (res.data.results || EMPTY_ARRAY);
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
  const { data: customerSpecialPrices = EMPTY_ARRAY, isLoading: isLoadingCustPrices } = useQuery<any[]>({
    queryKey: ['customer-prices', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return EMPTY_ARRAY;
      const res = await apiClient.get(`/customer-prices/?customer=${selectedCustomerId}`);
      return Array.isArray(res.data) ? res.data : (res.data.results || EMPTY_ARRAY);
    },
    enabled: mode === 'customer' && !!selectedCustomerId,
  });

  // 5. Fetch Price Update History
  const { data: priceHistory = EMPTY_ARRAY, isLoading: isLoadingHistory } = useQuery<PriceHistoryItem[]>({
    queryKey: ['price-update-history'],
    queryFn: async () => {
      const res = await apiClient.get('/customer-prices/history/');
      return Array.isArray(res.data) ? res.data : EMPTY_ARRAY;
    },
    enabled: mode === 'history' || bulkHikeModalOpened,
  });

  // Initialize standard prices draft when products load
  useEffect(() => {
    if (products.length > 0) {
      setNewPrices((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const initial: Record<number, number | string> = {};
        products.forEach((p) => {
          initial[p.ProductId] = p.SalesPrice !== null && p.SalesPrice !== undefined ? p.SalesPrice : '';
        });
        return initial;
      });
    }
  }, [products]);

  // Sync customer prices draft when customerSpecialPrices loads or customer changes
  useEffect(() => {
    if (mode === 'customer' && selectedCustomerId) {
      const initial: Record<number, number | string> = {};
      if (Array.isArray(customerSpecialPrices)) {
        customerSpecialPrices.forEach((cp: any) => {
          if (cp.SpecialPrice !== undefined && cp.SpecialPrice !== null) {
            initial[Number(cp.Product)] = cp.SpecialPrice;
          }
        });
      }
      setCustPricesDraft(initial);
    } else {
      setCustPricesDraft((prev) => (Object.keys(prev).length === 0 ? prev : {}));
    }
  }, [mode, selectedCustomerId, customerSpecialPrices]);

  // Pre-populate bulk hike products whenever modal opens
  useEffect(() => {
    if (bulkHikeModalOpened && products.length > 0) {
      // Preselect active cylinder products
      const activeIds = products
        .filter((p) => p.IsActive)
        .map((p) => p.ProductId);
      setSelectedHikeProductIds(activeIds);

      const defaultHikes: Record<number, number | ''> = {};
      activeIds.forEach((pid) => {
        defaultHikes[pid] = globalHikeAmount;
      });
      setProductHikesDraft(defaultHikes);
    }
  }, [bulkHikeModalOpened, products, globalHikeAmount]);

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
        color: 'burgundy',
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
        color: 'burgundy',
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

  // Bulk Hike Mutation
  const bulkHikeMutation = useMutation({
    mutationFn: async () => {
      const hikes = selectedHikeProductIds
        .map((pid) => ({
          product_id: pid,
          hike_amount: Number(productHikesDraft[pid] ?? globalHikeAmount ?? 0),
        }))
        .filter((h) => h.hike_amount > 0);

      if (hikes.length === 0) {
        throw new Error('Please specify a positive price increment for at least one cylinder.');
      }

      const res = await apiClient.post('/customer-prices/bulk_hike/', { hikes });
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customer-prices'] });
      queryClient.invalidateQueries({ queryKey: ['price-update-history'] });
      setBulkHikeModalOpened(false);
      notifications.show({
        title: 'Bulk Price Hike Applied',
        message: data?.message || 'Price hike updated across standard prices and customer special rates.',
        color: 'burgundy',
      });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to apply price hike.';
      notifications.show({
        title: 'Bulk Hike Failed',
        message: String(msg),
        color: 'red',
      });
    },
  });

  // Bulk Import Mutation
  const bulkImportMutation = useMutation({
    mutationFn: async () => {
      if (importedRows.length === 0) {
        throw new Error('No rows to import.');
      }
      const res = await apiClient.post('/customer-prices/import_bulk/', { rows: importedRows });
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['customer-prices'] });
      setBulkImportModalOpened(false);
      setImportedRows([]);
      setImportFileName('');
      notifications.show({
        title: 'Bulk Import Successful',
        message: data?.message || `Imported customer special rates successfully.`,
        color: 'burgundy',
      });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to import customer prices.';
      notifications.show({
        title: 'Import Failed',
        message: String(msg),
        color: 'red',
      });
    },
  });

  // Handle CSV/Excel File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!json || json.length < 2) {
          notifications.show({
            title: 'Empty File',
            message: 'The selected file has no data rows.',
            color: 'red',
          });
          return;
        }

        const headers = (json[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
        const custIdIdx = headers.findIndex((h: string) => h.includes('customer id') || h === 'customer_id' || h === 'cust_id');
        const custNameIdx = headers.findIndex((h: string) => h.includes('customer name') || h === 'customer' || h === 'customer_name');
        const prodIdIdx = headers.findIndex((h: string) => h.includes('product id') || h === 'product_id' || h === 'item_id');
        const prodNameIdx = headers.findIndex((h: string) => h.includes('product name') || h === 'product' || h === 'item');
        const priceIdx = headers.findIndex((h: string) => h.includes('special price') || h.includes('price') || h === 'rate');

        const rows: any[] = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;

          const cId = custIdIdx >= 0 ? row[custIdIdx] : undefined;
          const cName = custNameIdx >= 0 ? row[custNameIdx] : undefined;
          const pId = prodIdIdx >= 0 ? row[prodIdIdx] : undefined;
          const pName = prodNameIdx >= 0 ? row[prodNameIdx] : undefined;
          const price = priceIdx >= 0 ? row[priceIdx] : undefined;

          if ((cId || cName) && (pId || pName) && price !== undefined && price !== '') {
            rows.push({
              customer_id: cId,
              customer_name: cName,
              product_id: pId,
              product_name: pName,
              price: price,
            });
          }
        }

        if (rows.length === 0) {
          notifications.show({
            title: 'No Valid Rows',
            message: 'Could not detect customer, product, and price columns. Please download and use our template.',
            color: 'red',
          });
          return;
        }

        setImportedRows(rows);
      } catch (err: any) {
        notifications.show({
          title: 'File Parse Error',
          message: err?.message || 'Failed to read file.',
          color: 'red',
        });
      }
    };

    reader.readAsBinaryString(file);
  };

  // Download CSV Template
  const handleDownloadTemplate = () => {
    const templateData = [
      ['Customer ID', 'Customer Name', 'Product ID', 'Product Name', 'Special Price'],
      ['101', 'Sample Hotel', '4', 'LPG 17KG GAS CYLINDER', '2450.00'],
      ['102', 'Bake 58', '12', 'LPG 12KG GAS CYLINDER', '1800.00'],
      ['', 'Royal Bakers', '', 'LPG 17KG GAS CYLINDER', '2400.00'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CustomerPrices');
    XLSX.writeFile(wb, 'Customer_Special_Prices_Template.xlsx');
  };

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
              onClick={() => navigate('/products')}
              styles={{ root: { paddingLeft: 4, paddingRight: 8 } }}
            >
              Back to Products
            </Button>
          </Group>
          <Title order={2} style={{ color: '#800020', fontWeight: 800, marginTop: 4, fontSize: 24, letterSpacing: '-0.02em' }}>
            {mode === 'customer'
              ? 'Customer-Specific Pricing'
              : mode === 'history'
              ? 'Price Update History'
              : 'Product Price Master'}
          </Title>
          <Text size="xs" c="dimmed">
            {mode === 'customer'
              ? 'Configure custom cylinder rates for individual commercial buyers, hotels, or bulk accounts.'
              : mode === 'history'
              ? 'Audit log of cylinder price increments, base price adjustments, and customer rate updates.'
              : 'Update standard catalogue selling prices across all cylinders and products.'}
          </Text>
        </div>

        {/* Action Controls: Mode Switcher & Bulk Action Buttons */}
        <Group gap="xs" wrap="wrap">
          {/* Mode Switcher */}
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
                Customer Rates
              </Button>
              <Button
                variant={mode === 'history' ? 'filled' : 'subtle'}
                size="xs"
                radius="xl"
                leftSection={<IconHistory size={14} />}
                style={{
                  backgroundColor: mode === 'history' ? '#800020' : 'transparent',
                  color: mode === 'history' ? '#ffffff' : '#64748b',
                  fontWeight: mode === 'history' ? 700 : 500,
                }}
                onClick={() => setMode('history')}
              >
                Update History
              </Button>
            </Group>
          </Box>

          {/* Bulk Hike Button */}
          <Button
            size="xs"
            radius="md"
            leftSection={<IconTrendingUp size={15} />}
            onClick={() => setBulkHikeModalOpened(true)}
            style={{
              backgroundColor: '#800020',
              color: '#ffffff',
              fontWeight: 700,
              boxShadow: '0 1px 2px rgba(128, 0, 32, 0.2)',
            }}
          >
            Bulk Price Update
          </Button>

          {/* Bulk Import Button */}
          <Button
            size="xs"
            radius="md"
            variant="outline"
            leftSection={<IconUpload size={15} color="#800020" />}
            onClick={() => setBulkImportModalOpened(true)}
            style={{
              borderColor: '#800020',
              color: '#800020',
              fontWeight: 700,
              backgroundColor: '#ffffff',
            }}
          >
            Import CSV / Excel
          </Button>
        </Group>
      </Group>

      {/* ── Mode 1 & 2: Standard or Customer Pricing ── */}
      {mode !== 'history' && (
        <>
          {/* Customer Selection Banner (Customer Mode Only) */}
          {mode === 'customer' && (
            <Paper
              p="md"
              radius="md"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
                <Box style={{ flex: 1, minWidth: 280 }}>
                  <Text size="xs" fw={700} c="#800020" mb={4} style={{ letterSpacing: '0.5px' }}>
                    SELECT CUSTOMER TO MANAGE SPECIAL CONTRACTED RATES
                  </Text>
                  <Select
                    placeholder="Search customer by name or phone..."
                    data={customerOptions}
                    value={selectedCustomerId}
                    onChange={(val) => setSelectedCustomerId(val)}
                    searchable
                    clearable
                    size="sm"
                    radius="md"
                    leftSection={<IconUser size={16} color="#800020" />}
                    styles={{
                      input: {
                        borderColor: '#cbd5e1',
                        fontWeight: 600,
                        color: '#0f172a',
                      },
                    }}
                  />
                </Box>

                {selectedCustomerObj && (
                  <Badge
                    size="lg"
                    radius="md"
                    variant="outline"
                    style={{
                      borderColor: '#800020',
                      color: '#800020',
                      backgroundColor: '#fffcfc',
                      padding: '8px 12px',
                      height: 'auto',
                    }}
                  >
                    Contracted Rates for {selectedCustomerObj.LedgerName}
                  </Badge>
                )}
              </Group>
            </Paper>
          )}

          {/* Search & Filter Toolbar */}
          <Paper
            p="sm"
            radius="md"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <Group justify="space-between" wrap="wrap" gap="sm">
              <Group gap="sm" style={{ flex: 1, minWidth: 260 }}>
                <TextInput
                  placeholder="Search cylinder by name or item code..."
                  leftSection={<IconSearch size={16} color="#800020" />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  rightSection={
                    searchQuery ? (
                      <CloseButton size="sm" onClick={() => setSearchQuery('')} />
                    ) : null
                  }
                  size="sm"
                  radius="md"
                  style={{ flex: 1, minWidth: 220 }}
                  styles={{ input: { borderColor: '#cbd5e1' } }}
                />
                <Select
                  placeholder="All Categories"
                  data={[{ value: '', label: 'All Categories' }, ...categoryOptions]}
                  value={selectedCategoryFilter || ''}
                  onChange={(val) => setSelectedCategoryFilter(val || null)}
                  clearable
                  size="sm"
                  radius="md"
                  style={{ width: 180 }}
                  styles={{ input: { borderColor: '#cbd5e1' } }}
                />
              </Group>

              <Group gap="xs">
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  leftSection={<IconRefresh size={14} />}
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['products'] });
                    if (selectedCustomerId) {
                      queryClient.invalidateQueries({ queryKey: ['customer-prices', selectedCustomerId] });
                    }
                  }}
                >
                  Refresh Rates
                </Button>
              </Group>
            </Group>
          </Paper>

          {/* Main Price Table */}
          <Paper
            radius="md"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            {isLoadingProducts || (mode === 'customer' && isLoadingCustPrices) ? (
              <Center p="xl">
                <Stack align="center" gap="xs">
                  <Loader size="md" color="#800020" />
                  <Text size="sm" c="dimmed">
                    Loading cylinder pricing catalogue...
                  </Text>
                </Stack>
              </Center>
            ) : filteredProducts.length === 0 ? (
              <Center p="xl">
                <Stack align="center" gap="xs">
                  <IconCylinder size={32} color="#cbd5e1" />
                  <Text size="sm" c="dimmed">
                    No products found matching criteria.
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Table.ScrollContainer minWidth={700}>
                <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
                  <Table.Thead style={{ backgroundColor: '#fffcfc', borderBottom: '1.5px solid #800020' }}>
                    <Table.Tr>
                      <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12 }}>PRODUCT / CYLINDER</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12 }}>CATEGORY</Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12, textAlign: 'right' }}>
                        STANDARD PRICE (₹)
                      </Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12, minWidth: 160 }}>
                        {mode === 'customer' ? 'CUSTOMER SPECIAL RATE (₹)' : 'NEW CATALOGUE PRICE (₹)'}
                      </Table.Th>
                      <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12, textAlign: 'center' }}>
                        STATUS
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredProducts.map((p, index) => {
                      const standardPrice = Number(p.SalesPrice || 0);

                      if (mode === 'customer') {
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
                            <Table.Td>
                              <Badge size="xs" variant="outline" color="gray">
                                {p.category_name || 'General'}
                              </Badge>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'right' }}>
                              <Text fw={600} size="sm" c="#64748b">
                                ₹{standardPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs" wrap="nowrap">
                                <NumberInput
                                  size="sm"
                                  radius="md"
                                  min={0}
                                  decimalScale={2}
                                  hideControls
                                  prefix="₹ "
                                  placeholder={`Std ₹${standardPrice.toFixed(2)}`}
                                  value={draftVal !== undefined ? draftVal : ''}
                                  disabled={!selectedCustomerId}
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
                                      backgroundColor: isModified ? '#fdf2f4' : '#ffffff',
                                      borderColor: isModified ? '#800020' : '#cbd5e1',
                                      color: '#0f172a',
                                    },
                                  }}
                                />
                                {draftVal !== undefined && draftVal !== '' && (
                                  <Tooltip label="Remove custom rate (fallback to standard price)" withArrow>
                                    <CloseButton
                                      size="sm"
                                      onClick={() => {
                                        setCustPricesDraft((prev) => ({
                                          ...prev,
                                          [p.ProductId]: '',
                                        }));
                                      }}
                                    />
                                  </Tooltip>
                                )}
                              </Group>
                            </Table.Td>
                            <Table.Td style={{ textAlign: 'center' }}>
                              {hasSpecial ? (
                                <Badge
                                  size="xs"
                                  variant="outline"
                                  style={{
                                    borderColor: '#800020',
                                    color: '#800020',
                                    backgroundColor: '#fffcfc',
                                    fontWeight: 700,
                                  }}
                                >
                                  SPECIAL RATE
                                </Badge>
                              ) : (
                                <Badge size="xs" variant="outline" color="gray">
                                  STANDARD
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
                          <Table.Td>
                            <Badge size="xs" variant="outline" color="gray">
                              {p.category_name || 'General'}
                            </Badge>
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text fw={600} size="sm" c="#64748b">
                              ₹{standardPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Text>
                          </Table.Td>
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
        </>
      )}

      {/* ── Mode 3: Price Hike History View ── */}
      {mode === 'history' && (
        <Paper
          radius="md"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          {isLoadingHistory ? (
            <Center p="xl">
              <Stack align="center" gap="xs">
                <Loader size="md" color="#800020" />
                <Text size="sm" c="dimmed">
                  Loading price update history records...
                </Text>
              </Stack>
            </Center>
          ) : priceHistory.length === 0 ? (
            <Center p="xl">
              <Stack align="center" gap="xs">
                <IconHistory size={36} color="#cbd5e1" />
                <Text size="sm" fw={600} c="#64748b">
                  No price hike history records found.
                </Text>
                <Text size="xs" c="dimmed">
                  Any bulk price hike applied will be permanently logged here with date, affected customers count, and old vs new prices.
                </Text>
              </Stack>
            </Center>
          ) : (
            <Table.ScrollContainer minWidth={750}>
              <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
                <Table.Thead style={{ backgroundColor: '#fffcfc', borderBottom: '1.5px solid #800020' }}>
                  <Table.Tr>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12 }}>DATE & TIME</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12 }}>PRODUCT / CYLINDER</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12, textAlign: 'right' }}>HIKE AMOUNT</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12, textAlign: 'right' }}>OLD BASE PRICE</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12, textAlign: 'right' }}>NEW BASE PRICE</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12, textAlign: 'center' }}>CUSTOMERS AFFECTED</Table.Th>
                    <Table.Th style={{ color: '#800020', fontWeight: 700, fontSize: 12 }}>UPDATED BY</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {priceHistory.map((item) => {
                    const dt = new Date(item.CreatedTimestamp);
                    const formattedDate = !isNaN(dt.getTime())
                      ? dt.toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : item.CreatedTimestamp;

                    return (
                      <Table.Tr key={item.HistoryId}>
                        <Table.Td>
                          <Text size="xs" fw={600} c="#1e293b">
                            {formattedDate}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <IconCylinder size={16} color="#800020" />
                            <Text size="sm" fw={650} c="#1e293b">
                              {item.ProductName}
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="sm" fw={800} style={{ color: '#800020' }}>
                            +₹{Number(item.HikeAmount).toFixed(2)}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="sm" c="#64748b">
                            ₹{Number(item.OldBasePrice).toFixed(2)}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Text size="sm" fw={700} c="#0f172a">
                            ₹{Number(item.NewBasePrice).toFixed(2)}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          <Badge
                            size="xs"
                            variant="outline"
                            style={{
                              borderColor: '#800020',
                              color: '#800020',
                              backgroundColor: '#fffcfc',
                              fontWeight: 700,
                            }}
                          >
                            {item.AffectedCustomersCount} Customers
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="#475569" fw={500}>
                            {item.UpdatedBy || 'Admin'}
                          </Text>
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

      {/* ── Modal 1: Bulk Price Hike Modal ── */}
      <Modal
        opened={bulkHikeModalOpened}
        onClose={() => setBulkHikeModalOpened(false)}
        title={
          <Group gap="xs">
            <IconTrendingUp size={20} color="#800020" />
            <Text fw={800} size="md" style={{ color: '#800020' }}>
              Bulk Cylinder Price Update (+₹ Increment)
            </Text>
          </Group>
        }
        size="lg"
        radius="md"
        centered
        styles={{
          header: { borderBottom: '1px solid #f1f5f9', paddingBottom: 12 },
          body: { paddingTop: 16 },
        }}
      >
        <Stack gap="md">
          <Paper p="sm" radius="md" style={{ backgroundColor: '#fffcfc', border: '1px solid #f5c2cb' }}>
            <Text size="xs" c="#800020" fw={600} lh={1.4}>
              This will automatically add the specified hike amount (+₹) to the standard catalogue price AND to all existing customer-specific prices for every selected cylinder.
            </Text>
          </Paper>

          {/* Global Increment Input */}
          <Group justify="space-between" align="center" wrap="wrap" gap="xs">
            <Box style={{ flex: 1, minWidth: 200 }}>
              <NumberInput
                label="Common Update Amount (+₹ or -₹)"
                description="Enter the increase or decrease amount"
                placeholder="40"
                min={0}
                decimalScale={2}
                hideControls
                prefix="₹ "
                value={globalHikeAmount}
                onChange={(val) => {
                  const num = val === '' ? '' : Number(val);
                  setGlobalHikeAmount(num);
                  if (num !== '') {
                    setProductHikesDraft((prev) => {
                      const updated = { ...prev };
                      selectedHikeProductIds.forEach((pid) => {
                        updated[pid] = num;
                      });
                      return updated;
                    });
                  }
                }}
                styles={{
                  input: { fontWeight: 700, fontSize: 16, borderColor: '#800020', color: '#800020' },
                }}
              />
            </Box>

            <Button
              variant="outline"
              size="xs"
              style={{ borderColor: '#800020', color: '#800020', marginTop: 18 }}
              onClick={() => {
                if (selectedHikeProductIds.length === products.length) {
                  setSelectedHikeProductIds([]);
                } else {
                  setSelectedHikeProductIds(products.map((p) => p.ProductId));
                }
              }}
            >
              {selectedHikeProductIds.length === products.length ? 'Deselect All' : 'Select All Cylinders'}
            </Button>
          </Group>

          <Divider my="xs" color="#f1f5f9" />

          {/* Product Selection List with Live New Price Preview */}
          <Text size="xs" fw={700} c="#475569">
            SELECT CYLINDERS TO APPLY HIKE ({selectedHikeProductIds.length} SELECTED)
          </Text>

          <ScrollArea.Autosize mah={320}>
            <Table verticalSpacing="xs" horizontalSpacing="sm">
              <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                <Table.Tr>
                  <Table.Th style={{ width: 40 }}></Table.Th>
                  <Table.Th style={{ fontSize: 11 }}>CYLINDER</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'right' }}>CURRENT BASE</Table.Th>
                  <Table.Th style={{ fontSize: 11, width: 120 }}>HIKE (+₹)</Table.Th>
                  <Table.Th style={{ fontSize: 11, textAlign: 'right' }}>NEW BASE</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {products.map((p) => {
                  const isChecked = selectedHikeProductIds.includes(p.ProductId);
                  const currentBase = Number(p.SalesPrice || 0);
                  const hike = Number(productHikesDraft[p.ProductId] ?? globalHikeAmount ?? 0);
                  const newBase = currentBase + hike;

                  return (
                    <Table.Tr key={p.ProductId} style={{ backgroundColor: isChecked ? '#fffcfc' : undefined }}>
                      <Table.Td>
                        <Checkbox
                          color="burgundy"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.currentTarget.checked) {
                              setSelectedHikeProductIds((prev) => [...prev, p.ProductId]);
                            } else {
                              setSelectedHikeProductIds((prev) => prev.filter((id) => id !== p.ProductId));
                            }
                          }}
                          styles={{ input: { borderColor: '#800020', cursor: 'pointer' } }}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" fw={600} c="#1e293b">
                          {p.ProductName}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="xs" c="#64748b">
                          ₹{currentBase.toFixed(2)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          size="xs"
                          min={0}
                          decimalScale={2}
                          hideControls
                          prefix="₹ "
                          disabled={!isChecked}
                          value={productHikesDraft[p.ProductId] ?? globalHikeAmount}
                          onChange={(val) => {
                            setProductHikesDraft((prev) => ({
                              ...prev,
                              [p.ProductId]: val === '' ? '' : Number(val),
                            }));
                          }}
                          styles={{
                            input: { fontWeight: 700, borderColor: isChecked ? '#800020' : '#cbd5e1' },
                          }}
                        />
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="xs" fw={700} style={{ color: '#800020' }}>
                          ₹{newBase.toFixed(2)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>

          <Group justify="flex-end" mt="md" gap="sm">
            <Button variant="default" size="sm" onClick={() => setBulkHikeModalOpened(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={bulkHikeMutation.isPending}
              disabled={selectedHikeProductIds.length === 0}
              onClick={() => bulkHikeMutation.mutate()}
              style={{ backgroundColor: '#800020', color: '#ffffff', fontWeight: 700 }}
            >
              Apply Hike ({selectedHikeProductIds.length} Cylinders)
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Modal 2: Bulk Import Customer Prices Modal ── */}
      <Modal
        opened={bulkImportModalOpened}
        onClose={() => {
          setBulkImportModalOpened(false);
          setImportedRows([]);
          setImportFileName('');
        }}
        title={
          <Group gap="xs">
            <IconFileSpreadsheet size={20} color="#800020" />
            <Text fw={800} size="md" style={{ color: '#800020' }}>
              Import Customer Special Rates (CSV / Excel)
            </Text>
          </Group>
        }
        size="lg"
        radius="md"
        centered
        styles={{
          header: { borderBottom: '1px solid #f1f5f9', paddingBottom: 12 },
          body: { paddingTop: 16 },
        }}
      >
        <Stack gap="md">
          <Paper p="sm" radius="md" style={{ backgroundColor: '#fffcfc', border: '1px solid #f5c2cb' }}>
            <Group justify="space-between" align="center" wrap="wrap" gap="xs">
              <Box style={{ flex: 1, minWidth: 240 }}>
                <Text size="xs" c="#800020" fw={700}>
                  Download Ready-To-Use Excel Template:
                </Text>
                <Text size="11px" c="dimmed">
                  Columns: Customer ID / Name, Product ID / Name, Special Price.
                </Text>
              </Box>
              <Button
                size="xs"
                variant="outline"
                leftSection={<IconDownload size={14} color="#800020" />}
                onClick={handleDownloadTemplate}
                style={{ borderColor: '#800020', color: '#800020', backgroundColor: '#ffffff' }}
              >
                Download Template (.xlsx)
              </Button>
            </Group>
          </Paper>

          {/* Hidden File Input & Upload Trigger */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          <Paper
            p="xl"
            radius="md"
            style={{
              border: '2px dashed #cbd5e1',
              backgroundColor: '#fafbfc',
              cursor: 'pointer',
              textAlign: 'center',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Stack align="center" gap="xs">
              <IconUpload size={32} color="#800020" />
              <Text size="sm" fw={700} c="#1e293b">
                {importFileName ? importFileName : 'Click to select CSV or Excel file'}
              </Text>
              <Text size="xs" c="dimmed">
                Supports .xlsx, .xls, and .csv files.
              </Text>
            </Stack>
          </Paper>

          {/* Parsed Rows Preview */}
          {importedRows.length > 0 && (
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700} c="#800020">
                  READY TO IMPORT: {importedRows.length} SPECIAL PRICE RECORDS
                </Text>
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={() => {
                    setImportedRows([]);
                    setImportFileName('');
                  }}
                >
                  Clear File
                </Button>
              </Group>

              <ScrollArea.Autosize mah={220}>
                <Table verticalSpacing="xs" horizontalSpacing="sm">
                  <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                    <Table.Tr>
                      <Table.Th style={{ fontSize: 11 }}>#</Table.Th>
                      <Table.Th style={{ fontSize: 11 }}>CUSTOMER</Table.Th>
                      <Table.Th style={{ fontSize: 11 }}>PRODUCT / CYLINDER</Table.Th>
                      <Table.Th style={{ fontSize: 11, textAlign: 'right' }}>SPECIAL RATE (₹)</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {importedRows.slice(0, 50).map((r, i) => (
                      <Table.Tr key={i}>
                        <Table.Td style={{ fontSize: 11 }}>{i + 1}</Table.Td>
                        <Table.Td style={{ fontSize: 11, fontWeight: 600 }}>
                          {r.customer_name || `Customer #${r.customer_id}`}
                        </Table.Td>
                        <Table.Td style={{ fontSize: 11 }}>
                          {r.product_name || `Product #${r.product_id}`}
                        </Table.Td>
                        <Table.Td style={{ fontSize: 11, textAlign: 'right', fontWeight: 700, color: '#800020' }}>
                          ₹{Number(r.price).toFixed(2)}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea.Autosize>
              {importedRows.length > 50 && (
                <Text size="11px" c="dimmed" ta="center">
                  Showing first 50 rows of {importedRows.length}...
                </Text>
              )}
            </Stack>
          )}

          <Group justify="flex-end" mt="md" gap="sm">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setBulkImportModalOpened(false);
                setImportedRows([]);
                setImportFileName('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={bulkImportMutation.isPending}
              disabled={importedRows.length === 0}
              onClick={() => bulkImportMutation.mutate()}
              style={{ backgroundColor: '#800020', color: '#ffffff', fontWeight: 700 }}
            >
              Import {importedRows.length} Special Prices
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
